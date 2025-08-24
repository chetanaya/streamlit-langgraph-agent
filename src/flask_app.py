import os
import uuid
import asyncio
from typing import Dict, Any, List
from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
import json

# Import existing modules
from client import AgentClient, AgentClientError
from schema import ChatHistory, ChatMessage

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
socketio = SocketIO(app, cors_allowed_origins="*")

# Global agent client
agent_client = None

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
                            socketio.emit('stream_token', {'token': chunk})
                        else:
                            socketio.emit('message_chunk', {
                                'type': chunk.type,
                                'content': chunk.content,
                                'tool_calls': chunk.tool_calls,
                                'tool_call_id': chunk.tool_call_id,
                                'run_id': chunk.run_id,
                                'custom_data': chunk.custom_data
                            })
                    socketio.emit('stream_complete')
                except Exception as e:
                    socketio.emit('error', {'message': f'Streaming error: {e}'})
            
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
                    socketio.emit('message_response', {
                        'type': response.type,
                        'content': response.content,
                        'tool_calls': response.tool_calls,
                        'tool_call_id': response.tool_call_id,
                        'run_id': response.run_id,
                        'custom_data': response.custom_data
                    })
                except Exception as e:
                    socketio.emit('error', {'message': f'Response error: {e}'})
            
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