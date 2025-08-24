import os
import uuid
import asyncio
import tempfile
from typing import Dict, Any, List
from flask import Flask, render_template, request, jsonify, session, send_file
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import json
from openai import OpenAI

# Import existing modules
from client import AgentClient, AgentClientError
from schema import ChatHistory, ChatMessage

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
socketio = SocketIO(app, cors_allowed_origins="*")

# Global agent client
agent_client = None

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def init_agent_client():
    """Initialize the agent client"""
    global agent_client
    agent_url = os.getenv("AGENT_URL")
    if not agent_url:
        host = os.getenv("HOST", "0.0.0.0")
        port = os.getenv("PORT", 8080)
        agent_url = f"http://{host}:{port}"
    
    try:
        agent_client = AgentClient(base_url=agent_url)
        return True
    except AgentClientError as e:
        print(f"Error connecting to agent service at {agent_url}: {e}")
        return False

@app.route('/')
def index():
    """Main chat interface"""
    if 'thread_id' not in session:
        session['thread_id'] = str(uuid.uuid4())
    
    # Get thread_id from URL params if provided
    thread_id = request.args.get('thread_id')
    if thread_id:
        session['thread_id'] = thread_id
    
    return render_template('index.html', thread_id=session['thread_id'])

@app.route('/api/info')
def get_info():
    """Get agent service information"""
    if not agent_client:
        return jsonify({'error': 'Agent client not initialized'}), 500
    
    try:
        info = agent_client.info
        return jsonify({
            'agents': [{'key': a.key, 'description': a.description} for a in info.agents],
            'models': info.models,
            'default_agent': info.default_agent,
            'default_model': info.default_model
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history/<thread_id>')
def get_history(thread_id):
    """Get chat history for a thread"""
    if not agent_client:
        return jsonify({'error': 'Agent client not initialized'}), 500
    
    try:
        history = agent_client.get_history(thread_id=thread_id)
        return jsonify({
            'messages': [{
                'type': msg.type,
                'content': msg.content,
                'tool_calls': msg.tool_calls,
                'tool_call_id': msg.tool_call_id,
                'run_id': msg.run_id,
                'custom_data': msg.custom_data
            } for msg in history.messages]
        })
    except AgentClientError:
        return jsonify({'messages': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def create_feedback():
    """Create feedback for a message"""
    if not agent_client:
        return jsonify({'error': 'Agent client not initialized'}), 500
    
    data = request.get_json()
    run_id = data.get('run_id')
    score = data.get('score')
    
    try:
        asyncio.run(agent_client.acreate_feedback(
            run_id=run_id,
            key="human-feedback-stars",
            score=score,
            kwargs={"comment": "In-line human feedback"}
        ))
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio to text using OpenAI's Speech-to-Text API"""
    temp_file_path = None
    try:
        # Validate request
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        # Check file size (limit to 25MB as per OpenAI limits)
        audio_file.seek(0, 2)  # Seek to end
        file_size = audio_file.tell()
        audio_file.seek(0)  # Reset to beginning
        
        if file_size > 25 * 1024 * 1024:  # 25MB limit
            return jsonify({'error': 'Audio file too large. Maximum size is 25MB.'}), 413
        
        if file_size == 0:
            return jsonify({'error': 'Audio file is empty'}), 400
        
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file_path = temp_file.name
            audio_file.save(temp_file_path)
        
        # Validate that the file was saved correctly
        if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
            return jsonify({'error': 'Failed to save audio file'}), 500
        
        # Transcribe using OpenAI
        try:
            with open(temp_file_path, 'rb') as audio_data:
                transcription = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_data,
                    response_format="text"
                )
            
            if not transcription or transcription.strip() == '':
                return jsonify({'error': 'No speech detected in audio'}), 400
            
            return jsonify({
                'success': True,
                'text': transcription.strip()
            })
            
        except Exception as openai_error:
            print(f"OpenAI API error: {openai_error}")
            if "invalid_request_error" in str(openai_error):
                return jsonify({'error': 'Invalid audio format or corrupted file'}), 400
            elif "rate_limit" in str(openai_error).lower():
                return jsonify({'error': 'Service temporarily unavailable. Please try again later.'}), 429
            else:
                return jsonify({'error': 'Speech recognition service error'}), 503
            
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return jsonify({'error': 'Internal server error during transcription'}), 500
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as cleanup_error:
                print(f"Failed to cleanup temp file: {cleanup_error}")

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech using OpenAI's Text-to-Speech API"""
    temp_file_path = None
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        text = data.get('text', '').strip()
        voice = data.get('voice', 'alloy')
        
        # Validate text input
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Check text length (OpenAI has a 4096 character limit)
        if len(text) > 4096:
            return jsonify({'error': 'Text too long. Maximum length is 4096 characters.'}), 413
        
        # Validate voice parameter
        valid_voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        if voice not in valid_voices:
            voice = 'alloy'  # Default to alloy if invalid voice
        
        # Generate speech using OpenAI
        try:
            response = openai_client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text,
                response_format="mp3"
            )
            
            # Create a temporary file to store the audio
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                temp_file_path = temp_file.name
                response.stream_to_file(temp_file_path)
            
            # Validate that audio was generated
            if not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
                return jsonify({'error': 'Failed to generate audio'}), 500
            
            return send_file(
                temp_file_path,
                as_attachment=False,
                download_name='speech.mp3',
                mimetype='audio/mpeg'
            )
            
        except Exception as openai_error:
            print(f"OpenAI TTS API error: {openai_error}")
            if "invalid_request_error" in str(openai_error):
                return jsonify({'error': 'Invalid text or voice parameter'}), 400
            elif "rate_limit" in str(openai_error).lower():
                return jsonify({'error': 'Service temporarily unavailable. Please try again later.'}), 429
            else:
                return jsonify({'error': 'Text-to-speech service error'}), 503
            
    except Exception as e:
        print(f"TTS error: {e}")
        return jsonify({'error': 'Internal server error during speech generation'}), 500
    
    finally:
        # Clean up temp file if there was an error
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as cleanup_error:
                print(f"Failed to cleanup temp file: {cleanup_error}")

@socketio.on('send_message')
def handle_message(data):
    """Handle incoming chat messages"""
    if not agent_client:
        emit('error', {'message': 'Agent client not initialized'})
        return
    
    message = data.get('message')
    model = data.get('model')
    thread_id = data.get('thread_id')
    use_streaming = data.get('use_streaming', True)
    agent = data.get('agent')
    
    if agent:
        agent_client.update_agent(agent)
    
    try:
        if use_streaming:
            # Handle streaming response
            def stream_response():
                try:
                    for chunk in agent_client.stream(
                        message=message,
                        model=model,
                        thread_id=thread_id
                    ):
                        if isinstance(chunk, str):
                            emit('stream_token', {'token': chunk})
                        else:
                            emit('message_chunk', {
                                'type': chunk.type,
                                'content': chunk.content,
                                'tool_calls': chunk.tool_calls,
                                'tool_call_id': chunk.tool_call_id,
                                'run_id': chunk.run_id,
                                'custom_data': chunk.custom_data
                            })
                    emit('stream_complete')
                except Exception as e:
                    emit('error', {'message': f'Streaming error: {e}'})
            
            stream_response()
        else:
            # Handle non-streaming response
            def get_response():
                try:
                    response = agent_client.invoke(
                        message=message,
                        model=model,
                        thread_id=thread_id
                    )
                    emit('message_response', {
                        'type': response.type,
                        'content': response.content,
                        'tool_calls': response.tool_calls,
                        'tool_call_id': response.tool_call_id,
                        'run_id': response.run_id,
                        'custom_data': response.custom_data
                    })
                except Exception as e:
                    emit('error', {'message': f'Response error: {e}'})
            
            get_response()
            
    except AgentClientError as e:
        emit('error', {'message': f'Error generating response: {e}'})
    except Exception as e:
        emit('error', {'message': f'Unexpected error: {e}'})

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('Client disconnected')

if __name__ == '__main__':
    if init_agent_client():
        print("Agent client initialized successfully")
        socketio.run(app, debug=True, host='0.0.0.0', port=5001)
    else:
        print("Failed to initialize agent client")