// Global variables
let socket;
// Session handling simplified
let currentThreadId = null;
let isStreaming = false;
let currentStreamingMessage = null;
let agents = [];
let models = [];
let currentSettings = {
    model: 'gpt-4o-mini',
    agent: null,
    stream: true
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    initializeEventListeners();
    loadInitialData();
    
    // Handle URL parameters and initialize chat
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const threadId = urlParams.get('thread_id');
        
        if (threadId) {
            currentThreadId = threadId;
            loadChatFromUrl(threadId);
        } else {
            generateNewThreadId();
            addWelcomeMessage();
        }
    }, 100);
});

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
    });
    
    socket.on('message_response', function(data) {
        handleMessageResponse(data);
    });
    
    // Handle streaming events
    socket.on('stream_token', function(data) {
        handleStreamingToken(data.token);
    });
    
    socket.on('message_chunk', function(data) {
        handleMessageChunk(data);
    });
    
    socket.on('stream_complete', function() {
        handleStreamComplete();
    });
    
    socket.on('error', function(error) {
        console.error('Socket error:', error);
        showError('Connection error occurred');
        hideTypingIndicator();
        isStreaming = false;
        updateSendButton(false);
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Chat input
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
    
    // Sidebar buttons
    document.getElementById('newChatBtn').addEventListener('click', startNewChat);
    document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
    document.getElementById('privacyBtn').addEventListener('click', togglePrivacy);
    document.getElementById('shareBtn').addEventListener('click', showShareModal);
    
    // Resume button
    document.getElementById('resumeBtn').addEventListener('click', showLoadModal);
    
    // Settings
    document.getElementById('modelSelect').addEventListener('change', function(e) {
        currentSettings.model = e.target.value;
    });
    
    document.getElementById('agentSelect').addEventListener('change', function(e) {
        currentSettings.agent = e.target.value || null;
    });
    
    document.getElementById('streamToggle').addEventListener('change', function(e) {
        currentSettings.stream = e.target.checked;
    });
    
    // Modal controls
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModals();
            }
        });
    });
    
    // Load chat button
    document.getElementById('loadChatBtn').addEventListener('click', loadChat);
    
    // Copy URL button
    document.getElementById('copyUrlBtn').addEventListener('click', copyShareUrl);
}

// Load initial data from server
async function loadInitialData() {
    try {
        const response = await fetch('/api/info');
        const data = await response.json();
        
        if (data.agents && data.models) {
            agents = data.agents;
            models = data.models;
            populateSelects();
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
}

// Populate select elements
function populateSelects() {
    const modelSelect = document.getElementById('modelSelect');
    const agentSelect = document.getElementById('agentSelect');
    
    // Clear existing options
    modelSelect.innerHTML = '';
    agentSelect.innerHTML = '<option value="">Select an agent (optional)</option>';
    
    // Populate models
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = model;
        if (model === currentSettings.model) {
            option.selected = true;
        }
        modelSelect.appendChild(option);
    });
    
    // Populate agents
    agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.key;
        option.textContent = agent.description || agent.key;
        agentSelect.appendChild(option);
    });
}

// Generate new thread ID
function generateNewThreadId() {
    currentThreadId = 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Send message
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || isStreaming) {
        return;
    }
    
    // Add user message to chat
    addMessage('human', message);
    
    // Clear input
    chatInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Send to server
    const messageData = {
        message: message,
        thread_id: currentThreadId,
        model: currentSettings.model,
        agent: currentSettings.agent,
        use_streaming: currentSettings.stream
    };
    
    socket.emit('send_message', messageData);
    isStreaming = true;
    updateSendButton(true);
}

// Handle message response from server
function handleMessageResponse(data) {
    hideTypingIndicator();
    
    if (data.error) {
        showError(data.error);
        isStreaming = false;
        updateSendButton(false);
        return;
    }
    
    if (data.type === 'token') {
        handleStreamingToken(data.content);
    } else if (data.type === 'message') {
        handleCompleteMessage(data);
    } else if (data.type === 'tool_call') {
        handleToolCall(data);
    } else if (data.type === 'end') {
        isStreaming = false;
        updateSendButton(false);
        if (currentStreamingMessage) {
            addFeedbackToMessage(currentStreamingMessage);
            currentStreamingMessage = null;
        }
    }
}

// Handle streaming token
function handleStreamingToken(token) {
    hideTypingIndicator();
    
    if (!currentStreamingMessage) {
        currentStreamingMessage = addMessage('ai', '');
    }
    
    const messageText = currentStreamingMessage.querySelector('.message-text');
    messageText.textContent += token;
    scrollToBottom();
}

// Handle message chunk
function handleMessageChunk(data) {
    hideTypingIndicator();
    
    if (!currentStreamingMessage) {
        currentStreamingMessage = addMessage('ai', data.content || '');
    } else {
        const messageText = currentStreamingMessage.querySelector('.message-text');
        if (data.content) {
            messageText.textContent = data.content;
        }
    }
    
    // Handle tool calls if present
    if (data.tool_calls && data.tool_calls.length > 0) {
        data.tool_calls.forEach(toolCall => {
            addToolCallToMessage(currentStreamingMessage, toolCall);
        });
    }
    
    scrollToBottom();
}

// Handle stream completion
function handleStreamComplete() {
    hideTypingIndicator();
    isStreaming = false;
    updateSendButton(false);
    
    if (currentStreamingMessage) {
        // Convert accumulated text to markdown
        const messageText = currentStreamingMessage.querySelector('.message-text');
        const content = messageText.textContent;
        if (typeof marked !== 'undefined') {
            messageText.innerHTML = marked.parse(content);
        }
        
        addFeedbackToMessage(currentStreamingMessage);
        currentStreamingMessage = null;
    }
}

// Handle complete message
function handleCompleteMessage(data) {
    if (!currentStreamingMessage) {
        currentStreamingMessage = addMessage('ai', data.content);
    } else {
        const messageText = currentStreamingMessage.querySelector('.message-text');
        messageText.textContent = data.content;
    }
    
    // Handle tool calls if present
    if (data.tool_calls && data.tool_calls.length > 0) {
        data.tool_calls.forEach(toolCall => {
            addToolCallToMessage(currentStreamingMessage, toolCall);
        });
    }
    
    scrollToBottom();
}

// Handle tool call
function handleToolCall(data) {
    if (currentStreamingMessage) {
        addToolCallToMessage(currentStreamingMessage, data.tool_call);
    }
}

// Add message to chat
function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'human' ? '<i class="material-icons">person</i>' : '<i class="material-icons">smart_toy</i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Render markdown for AI responses, plain text for human messages
    if (type === 'ai' && typeof marked !== 'undefined') {
        messageText.innerHTML = marked.parse(content);
    } else {
        messageText.textContent = content;
    }
    
    messageContent.appendChild(messageText);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// Add tool call to message
function addToolCallToMessage(messageElement, toolCall) {
    const messageContent = messageElement.querySelector('.message-content');
    
    const toolCallDiv = document.createElement('div');
    toolCallDiv.className = 'tool-call';
    
    const header = document.createElement('div');
    header.className = 'tool-call-header';
    header.textContent = `🔧 ${toolCall.name}`;
    
    const input = document.createElement('div');
    input.className = 'tool-call-input';
    input.innerHTML = `<strong>Input:</strong><div class="tool-call-content">${JSON.stringify(toolCall.input, null, 2)}</div>`;
    
    toolCallDiv.appendChild(header);
    toolCallDiv.appendChild(input);
    
    if (toolCall.output) {
        const output = document.createElement('div');
        output.className = 'tool-call-output';
        output.innerHTML = `<strong>Output:</strong><div class="tool-call-content">${JSON.stringify(toolCall.output, null, 2)}</div>`;
        toolCallDiv.appendChild(output);
    }
    
    messageContent.appendChild(toolCallDiv);
}

// Add feedback to message
function addFeedbackToMessage(messageElement) {
    const messageContent = messageElement.querySelector('.message-content');
    
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-container';
    
    const starRating = document.createElement('div');
    starRating.className = 'star-rating';
    
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = 'star';
        star.innerHTML = '★';
        star.dataset.rating = i;
        star.addEventListener('click', function() {
            submitFeedback(i, messageElement);
        });
        starRating.appendChild(star);
    }
    
    feedbackDiv.appendChild(starRating);
    messageContent.appendChild(feedbackDiv);
}

// Submit feedback
async function submitFeedback(rating, messageElement) {
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                thread_id: currentThreadId,
                rating: rating
            })
        });
        
        if (response.ok) {
            // Update star display
            const stars = messageElement.querySelectorAll('.star');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
            
            // Remove click handlers
            stars.forEach(star => {
                star.style.pointerEvents = 'none';
            });
        }
    } catch (error) {
        console.error('Failed to submit feedback:', error);
    }
}

// Show/hide typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.id = 'typingIndicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="material-icons">smart_toy</i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    messageContent.appendChild(typingIndicator);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(messageContent);
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Update send button state
function updateSendButton(disabled) {
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = disabled;
}

// Start new chat
function startNewChat() {
    generateNewThreadId();
    document.getElementById('chatMessages').innerHTML = '';
    addWelcomeMessage();
    currentStreamingMessage = null;
    isStreaming = false;
    updateSendButton(false);
    
    // Update URL to remove thread_id parameter
    const url = new URL(window.location);
    url.searchParams.delete('thread_id');
    window.history.replaceState({}, '', url);
}

// Add welcome message
function addWelcomeMessage() {
    const welcomeText = "Hello! I'm your AI assistant. How can I help you today?";
    addMessage('ai', welcomeText);
}

// Toggle settings panel
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    const privacyPanel = document.getElementById('privacyPanel');
    
    privacyPanel.classList.remove('active');
    panel.classList.toggle('active');
}

// Toggle privacy panel
function togglePrivacy() {
    const panel = document.getElementById('privacyPanel');
    const settingsPanel = document.getElementById('settingsPanel');
    
    settingsPanel.classList.remove('active');
    panel.classList.toggle('active');
}

// Show share modal
function showShareModal() {
    const modal = document.getElementById('shareModal');
    const urlElement = document.getElementById('shareUrl');
    
    const shareUrl = `${window.location.origin}?thread_id=${currentThreadId}`;
    urlElement.textContent = shareUrl;
    
    modal.classList.add('active');
}

// Show load modal
function showLoadModal() {
    document.getElementById('loadModal').style.display = 'flex';
}

// Copy share URL
function copyShareUrl() {
    const urlElement = document.getElementById('shareUrl');
    const url = urlElement.textContent;
    
    navigator.clipboard.writeText(url).then(() => {
        showSuccess('URL copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess('URL copied to clipboard!');
    });
}

// Load chat
async function loadChat() {
    const threadInput = document.getElementById('threadIdInput');
    const threadId = threadInput.value.trim();
    
    if (!threadId) {
        showError('Please enter a thread ID');
        return;
    }
    
    showLoading('Loading chat history...');
    
    try {
        const response = await fetch(`/api/history/${threadId}`);
        const data = await response.json();
        
        if (data.success && data.messages.length > 0) {
            currentThreadId = threadId;
            loadChatHistory(data.messages);
            closeModals();
            showSuccess('Chat loaded successfully!');
        } else {
            showError('No chat history found for this thread ID');
        }
    } catch (error) {
        console.error('Failed to load chat:', error);
        showError('Failed to load chat history');
    } finally {
        hideLoading();
    }
}

// Load chat history
function loadChatHistory(messages) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = addMessage(message.type, message.content);
        
        if (message.tool_calls && message.tool_calls.length > 0) {
            message.tool_calls.forEach(toolCall => {
                addToolCallToMessage(messageElement, toolCall);
            });
        }
        
        if (message.type === 'ai') {
            addFeedbackToMessage(messageElement);
        }
    });
}

// Close all modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('p');
    text.textContent = message;
    overlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hidden');
}

// Show error message
function showError(message) {
    const chatMessages = document.getElementById('chatMessages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const chatMessages = document.getElementById('chatMessages');
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    chatMessages.appendChild(successDiv);
    scrollToBottom();
    
    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Scroll to bottom of chat
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle URL parameters on page load
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get('thread_id');
    
    if (threadId) {
        currentThreadId = threadId;
        loadChatFromUrl(threadId);
    } else {
        generateNewThreadId();
        addWelcomeMessage();
    }
}

// Load chat from URL parameter
async function loadChatFromUrl(threadId) {
    try {
        const response = await fetch(`/api/history/${threadId}`);
        const data = await response.json();
        
        console.log('Chat history response:', data);
        
        // Check if we have messages (the API returns messages directly, not wrapped in success)
        if (data.messages && data.messages.length > 0) {
            console.log(`Loading ${data.messages.length} messages from history`);
            loadChatHistory(data.messages);
        } else if (data.error) {
            console.error('API error:', data.error);
            addWelcomeMessage();
        } else {
            console.log('No messages found in history');
            addWelcomeMessage();
        }
    } catch (error) {
        console.error('Failed to load chat from URL:', error);
        addWelcomeMessage();
    }
}

// This function is now integrated into the main DOMContentLoaded handler above