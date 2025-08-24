import json
import logging
import os
import tempfile
import warnings
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
import socketio
from openai import OpenAI
from langchain_core._api import LangChainBetaWarning
from langchain_core.messages import AIMessage, AIMessageChunk, AnyMessage, HumanMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.pregel import Pregel
from langgraph.types import Command, Interrupt
from langsmith import Client as LangsmithClient

from agents import DEFAULT_AGENT, get_agent, get_all_agent_info
from core import settings
from memory import initialize_database
from schema import (
    AudioTranscriptionResponse,
    ChatHistory,
    ChatHistoryInput,
    ChatMessage,
    Feedback,
    FeedbackResponse,
    ServiceMetadata,
    StreamInput,
    TextToSpeechRequest,
    UserInput,
)
from service.utils import (
    convert_message_content_to_string,
    langchain_to_chat_message,
    remove_tool_calls,
)

warnings.filterwarnings("ignore", category=LangChainBetaWarning)
logger = logging.getLogger(__name__)


def verify_bearer(
    http_auth: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(HTTPBearer(description="Please provide AUTH_SECRET api key.", auto_error=False)),
    ],
) -> None:
    if not settings.AUTH_SECRET:
        return
    auth_secret = settings.AUTH_SECRET.get_secret_value()
    if not http_auth or http_auth.credentials != auth_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Configurable lifespan that initializes the appropriate database checkpointer based on settings.
    """
    try:
        async with initialize_database() as saver:
            await saver.setup()
            agents = get_all_agent_info()
            for a in agents:
                agent = get_agent(a.key)
                agent.checkpointer = saver
            yield
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    async_mode="asgi"
)

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Initialize OpenAI client (optional for testing)
openai_client = None
if os.getenv('OPENAI_API_KEY'):
    openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

router = APIRouter(dependencies=[Depends(verify_bearer)])

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    """Handle client connection."""
    print(f'Client {sid} connected')

@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    print(f'Client {sid} disconnected')

@sio.event
async def send_message(sid, data):
    """Handle incoming chat messages from clients."""
    try:
        message = data.get('message')
        model = data.get('model', settings.DEFAULT_MODEL)
        thread_id = data.get('thread_id')
        use_streaming = data.get('use_streaming', True)
        agent_id = data.get('agent', DEFAULT_AGENT)
        
        if not message or not thread_id:
            await sio.emit('error', {'message': 'Message and thread_id are required'}, room=sid)
            return
            
        # Create user input
        user_input = StreamInput(
            message=message,
            model=model,
            thread_id=thread_id,
            stream_tokens=use_streaming
        )
        
        if use_streaming:
            # Handle streaming response
            try:
                async for chunk in message_generator(user_input, agent_id):
                    if chunk.startswith('data: '):
                        data_content = chunk[6:].strip()
                        if data_content == '[DONE]':
                            await sio.emit('stream_complete', room=sid)
                            break
                        elif data_content:
                            try:
                                chunk_data = json.loads(data_content)
                                if chunk_data.get('type') == 'token':
                                    await sio.emit('stream_token', {'token': chunk_data.get('content', '')}, room=sid)
                                elif chunk_data.get('type') == 'message':
                                    await sio.emit('message_chunk', chunk_data.get('content'), room=sid)
                                elif chunk_data.get('type') == 'error':
                                    await sio.emit('error', {'message': chunk_data.get('content', 'Unknown error')}, room=sid)
                            except json.JSONDecodeError:
                                continue
            except Exception as e:
                await sio.emit('error', {'message': f'Streaming error: {str(e)}'}, room=sid)
        else:
            # Handle non-streaming response
            try:
                # Convert StreamInput to UserInput for invoke
                invoke_input = UserInput(
                    message=user_input.message,
                    model=user_input.model,
                    thread_id=user_input.thread_id,
                    agent_config=user_input.agent_config
                )
                
                agent: Pregel = get_agent(agent_id)
                kwargs, run_id = await _handle_input(invoke_input, agent)
                
                response_events = await agent.ainvoke(**kwargs, stream_mode=["updates", "values"])
                response_type, response = response_events[-1]
                
                if response_type == "values":
                    output = langchain_to_chat_message(response["messages"][-1])
                elif response_type == "updates" and "__interrupt__" in response:
                    output = langchain_to_chat_message(
                        AIMessage(content=response["__interrupt__"][0].value)
                    )
                else:
                    raise ValueError(f"Unexpected response type: {response_type}")
                
                output.run_id = str(run_id)
                await sio.emit('message_response', output.model_dump(), room=sid)
                
            except Exception as e:
                await sio.emit('error', {'message': f'Response error: {str(e)}'}, room=sid)
                
    except Exception as e:
        await sio.emit('error', {'message': f'Unexpected error: {str(e)}'}, room=sid)


@router.get("/info")
async def info() -> ServiceMetadata:
    models = list(settings.AVAILABLE_MODELS)
    models.sort()
    default_model = settings.DEFAULT_MODEL or models[0] if models else "gpt-4o-mini"
    return ServiceMetadata(
        agents=get_all_agent_info(),
        models=models,
        default_agent=DEFAULT_AGENT,
        default_model=default_model,
    )


async def _handle_input(user_input: UserInput, agent: Pregel) -> tuple[dict[str, Any], UUID]:
    """
    Parse user input and handle any required interrupt resumption.
    Returns kwargs for agent invocation and the run_id.
    """
    run_id = uuid4()
    thread_id = user_input.thread_id or str(uuid4())

    configurable = {"thread_id": thread_id, "model": user_input.model}

    if user_input.agent_config:
        if overlap := configurable.keys() & user_input.agent_config.keys():
            raise HTTPException(
                status_code=422,
                detail=f"agent_config contains reserved keys: {overlap}",
            )
        configurable.update(user_input.agent_config)

    config = RunnableConfig(
        configurable=configurable,
        run_id=run_id,
        recursion_limit=50,  # Increasing recursion limit from default 25
    )

    # Check for interrupts that need to be resumed
    state = await agent.aget_state(config=config)
    interrupted_tasks = [
        task for task in state.tasks if hasattr(task, "interrupts") and task.interrupts
    ]

    input: Command | dict[str, Any]
    if interrupted_tasks:
        # assume user input is response to resume agent execution from interrupt
        input = Command(resume=user_input.message)
    else:
        input = {"messages": [HumanMessage(content=user_input.message)]}

    kwargs = {
        "input": input,
        "config": config,
    }

    return kwargs, run_id


@router.post("/{agent_id}/invoke")
@router.post("/invoke")
async def invoke(user_input: UserInput, agent_id: str = DEFAULT_AGENT) -> ChatMessage:
    """
    Invoke an agent with user input to retrieve a final response.

    If agent_id is not provided, the default agent will be used.
    Use thread_id to persist and continue a multi-turn conversation. run_id kwarg
    is also attached to messages for recording feedback.
    """
    # NOTE: Currently this only returns the last message or interrupt.
    # In the case of an agent outputting multiple AIMessages (such as the background step
    # in interrupt-agent, or a tool step in jira-assistant), it's omitted. Arguably,
    # you'd want to include it. You could update the API to return a list of ChatMessages
    # in that case.
    agent: Pregel = get_agent(agent_id)
    kwargs, run_id = await _handle_input(user_input, agent)
    try:
        response_events: list[tuple[str, Any]] = await agent.ainvoke(**kwargs, stream_mode=["updates", "values"])  # type: ignore # fmt: skip
        response_type, response = response_events[-1]
        if response_type == "values":
            # Normal response, the agent completed successfully
            output = langchain_to_chat_message(response["messages"][-1])
        elif response_type == "updates" and "__interrupt__" in response:
            # The last thing to occur was an interrupt
            # Return the value of the first interrupt as an AIMessage
            output = langchain_to_chat_message(
                AIMessage(content=response["__interrupt__"][0].value)
            )
        else:
            raise ValueError(f"Unexpected response type: {response_type}")

        output.run_id = str(run_id)
        return output
    except Exception as e:
        logger.error(f"An exception occurred: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error")


async def message_generator(
    user_input: StreamInput, agent_id: str = DEFAULT_AGENT
) -> AsyncGenerator[str, None]:
    """
    Generate a stream of messages from the agent.

    This is the workhorse method for the /stream endpoint.
    """
    agent: Pregel = get_agent(agent_id)
    kwargs, run_id = await _handle_input(user_input, agent)

    try:
        # Process streamed events from the graph and yield messages over the SSE stream.
        async for stream_event in agent.astream(
            **kwargs, stream_mode=["updates", "messages", "custom"]
        ):
            if not isinstance(stream_event, tuple):
                continue
            stream_mode, event = stream_event
            new_messages = []
            if stream_mode == "updates":
                for node, updates in event.items():
                    # A simple approach to handle agent interrupts.
                    # In a more sophisticated implementation, we could add
                    # some structured ChatMessage type to return the interrupt value.
                    if node == "__interrupt__":
                        interrupt: Interrupt
                        for interrupt in updates:
                            new_messages.append(AIMessage(content=interrupt.value))
                        continue

                    updates = updates or {}
                    update_messages = updates.get("messages", [])

                    # special cases for using langgraph-supervisor library
                    if node == "supervisor":
                        # Get only the last AIMessage since supervisor includes all previous messages
                        ai_messages = [msg for msg in update_messages if isinstance(msg, AIMessage)]
                        if ai_messages:
                            update_messages = [ai_messages[-1]]
                    # Check if node is a sub-agent (ends with _agent) or is a known sub-agent type
                    elif node.endswith("_agent") or node in getattr(agent, "agents", []):
                        # Only process if there are messages to handle
                        if update_messages and len(update_messages) > 0:
                            # By default the sub-agent output is returned as an AIMessage.
                            # Convert it to a ToolMessage so it displays in the UI as a tool response.
                            msg = ToolMessage(
                                content=update_messages[0].content,
                                name=node,
                                tool_call_id="",
                            )
                            update_messages = [msg]

                    new_messages.extend(update_messages)

            if stream_mode == "custom":
                new_messages = [event]

            for message in new_messages:
                try:
                    chat_message = langchain_to_chat_message(message)
                    chat_message.run_id = str(run_id)
                except Exception as e:
                    logger.error(f"Error parsing message: {e}")
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Unexpected error'})}\n\n"
                    continue
                # LangGraph re-sends the input message, which feels weird, so drop it
                if chat_message.type == "human" and chat_message.content == user_input.message:
                    continue
                yield f"data: {json.dumps({'type': 'message', 'content': chat_message.model_dump()})}\n\n"

            if stream_mode == "messages":
                if not user_input.stream_tokens:
                    continue
                msg, metadata = event
                if "skip_stream" in metadata.get("tags", []):
                    continue
                # For some reason, astream("messages") causes non-LLM nodes to send extra messages.
                # Drop them.
                if not isinstance(msg, AIMessageChunk):
                    continue
                content = remove_tool_calls(msg.content)
                if content:
                    # Empty content in the context of OpenAI usually means
                    # that the model is asking for a tool to be invoked.
                    # So we only print non-empty content.
                    yield f"data: {json.dumps({'type': 'token', 'content': convert_message_content_to_string(content)})}\n\n"
    except Exception as e:
        logger.error(f"Error in message generator: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': 'Internal server error'})}\n\n"
    finally:
        yield "data: [DONE]\n\n"


def _sse_response_example() -> dict[int | str, Any]:
    return {
        status.HTTP_200_OK: {
            "description": "Server Sent Event Response",
            "content": {
                "text/event-stream": {
                    "example": "data: {'type': 'token', 'content': 'Hello'}\n\ndata: {'type': 'token', 'content': ' World'}\n\ndata: [DONE]\n\n",
                    "schema": {"type": "string"},
                }
            },
        }
    }


@router.post(
    "/{agent_id}/stream",
    response_class=StreamingResponse,
    responses=_sse_response_example(),
)
@router.post("/stream", response_class=StreamingResponse, responses=_sse_response_example())
async def stream(user_input: StreamInput, agent_id: str = DEFAULT_AGENT) -> StreamingResponse:
    """
    Stream an agent's response to a user input, including intermediate messages and tokens.

    If agent_id is not provided, the default agent will be used.
    Use thread_id to persist and continue a multi-turn conversation. run_id kwarg
    is also attached to all messages for recording feedback.

    Set `stream_tokens=false` to return intermediate messages but not token-by-token.
    """
    return StreamingResponse(
        message_generator(user_input, agent_id),
        media_type="text/event-stream",
    )


@router.post("/feedback")
async def feedback(feedback: Feedback) -> FeedbackResponse:
    """
    Record feedback for a run to LangSmith.

    This is a simple wrapper for the LangSmith create_feedback API, so the
    credentials can be stored and managed in the service rather than the client.
    See: https://api.smith.langchain.com/redoc#tag/feedback/operation/create_feedback_api_v1_feedback_post
    """
    client = LangsmithClient()
    kwargs = feedback.kwargs or {}
    client.create_feedback(
        run_id=feedback.run_id,
        key=feedback.key,
        score=feedback.score,
        **kwargs,
    )
    return FeedbackResponse()


@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)) -> AudioTranscriptionResponse:
    """
    Transcribe audio to text using OpenAI's Speech-to-Text API.
    """
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
        
    temp_file_path = None
    try:
        # Validate file
        if not audio.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")
        
        # Check file size (limit to 25MB as per OpenAI limits)
        content = await audio.read()
        if len(content) > 25 * 1024 * 1024:  # 25MB limit
            raise HTTPException(status_code=413, detail="Audio file too large. Maximum size is 25MB.")
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Audio file is empty")
        
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(content)
        
        # Validate that the file was saved correctly
        if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
            raise HTTPException(status_code=500, detail="Failed to save audio file")
        
        # Transcribe using OpenAI
        try:
            with open(temp_file_path, 'rb') as audio_data:
                transcription = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_data,
                    response_format="text"
                )
            
            if not transcription or transcription.strip() == '':
                raise HTTPException(status_code=400, detail="No speech detected in audio")
            
            return AudioTranscriptionResponse(
                success=True,
                text=transcription.strip()
            )
            
        except Exception as openai_error:
            logger.error(f"OpenAI API error: {openai_error}")
            if "invalid_request_error" in str(openai_error):
                raise HTTPException(status_code=400, detail="Invalid audio format or corrupted file")
            elif "rate_limit" in str(openai_error).lower():
                raise HTTPException(status_code=429, detail="Service temporarily unavailable. Please try again later.")
            else:
                raise HTTPException(status_code=503, detail="Speech recognition service error")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during transcription")
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup temp file: {cleanup_error}")


@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest) -> FileResponse:
    """
    Convert text to speech using OpenAI's Text-to-Speech API.
    """
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
        
    temp_file_path = None
    try:
        # Validate input
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="No text provided")
        
        # Check text length (OpenAI has a 4096 character limit)
        if len(request.text) > 4096:
            raise HTTPException(status_code=413, detail="Text too long. Maximum length is 4096 characters.")
        
        # Validate voice parameter
        valid_voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        voice = request.voice if request.voice in valid_voices else 'alloy'
        
        # Generate speech using OpenAI
        try:
            response = openai_client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=request.text,
                response_format="mp3"
            )
            
            # Create a temporary file to store the audio
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                temp_file_path = temp_file.name
                response.stream_to_file(temp_file_path)
            
            # Validate that audio was generated
            if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
                raise HTTPException(status_code=500, detail="Failed to generate audio")
            
            return FileResponse(
                path=temp_file_path,
                media_type='audio/mpeg',
                filename='speech.mp3',
                background=None  # Don't delete automatically, we'll handle cleanup
            )
            
        except Exception as openai_error:
            logger.error(f"OpenAI TTS API error: {openai_error}")
            if "invalid_request_error" in str(openai_error):
                raise HTTPException(status_code=400, detail="Invalid text or voice parameter")
            elif "rate_limit" in str(openai_error).lower():
                raise HTTPException(status_code=429, detail="Service temporarily unavailable. Please try again later.")
            else:
                raise HTTPException(status_code=503, detail="Text-to-speech service error")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during speech generation")


@router.post("/history")
async def history(input: ChatHistoryInput) -> ChatHistory:
    """
    Get chat history.
    """
    # TODO: Hard-coding DEFAULT_AGENT here is wonky
    agent: Pregel = get_agent(DEFAULT_AGENT)
    try:
        state_snapshot = await agent.aget_state(
            config=RunnableConfig(
                configurable={
                    "thread_id": input.thread_id,
                }
            )
        )
        messages: list[AnyMessage] = state_snapshot.values.get("messages", [])
        chat_messages: list[ChatMessage] = [langchain_to_chat_message(m) for m in messages]
        return ChatHistory(messages=chat_messages)
    except Exception as e:
        logger.error(f"An exception occurred getting history for thread {input.thread_id}: {e}")
        # Return empty history instead of error for new threads
        return ChatHistory(messages=[])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


app.include_router(router)

# Export the socket app for uvicorn
app = socket_app
