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
    
    // Modal close buttons
    document.getElementById('closeShareModal').addEventListener('click', closeModals);
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', closeModals);
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModals();
            }
        });
    });
    
    // Copy URL button
    document.getElementById('copyUrlBtn').addEventListener('click', copyShareUrl);
    
    // Load chat button
    document.getElementById('loadChatBtn').addEventListener('click', loadChat);
    
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
    
    // Handle different message types
    if (data.type === 'ai') {
        if (!currentStreamingMessage) {
            currentStreamingMessage = addMessage('ai', data.content || '');
        } else {
            const messageText = currentStreamingMessage.querySelector('.message-text');
            if (data.content) {
                messageText.textContent = data.content;
            }
        }
        
        // Store tool calls for later display but don't show them during streaming
        if (data.tool_calls && data.tool_calls.length > 0) {
            if (!currentStreamingMessage.pendingToolCalls) {
                currentStreamingMessage.pendingToolCalls = [];
            }
            currentStreamingMessage.pendingToolCalls.push(...data.tool_calls);
        }
    } else if (data.type === 'tool') {
        // Tool messages should be consolidated with the current AI message
        if (currentStreamingMessage) {
            // Add tool result to the current AI message instead of creating a new message
            if (!currentStreamingMessage.pendingToolResults) {
                currentStreamingMessage.pendingToolResults = [];
            }
            currentStreamingMessage.pendingToolResults.push({
                tool_call_id: data.tool_call_id,
                content: data.content
            });
        }
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
        
        // Now display any pending tool calls with their results
        if (currentStreamingMessage.pendingToolCalls && currentStreamingMessage.pendingToolCalls.length > 0) {
            currentStreamingMessage.pendingToolCalls.forEach(toolCall => {
                // Find corresponding tool result
                let toolResult = null;
                if (currentStreamingMessage.pendingToolResults) {
                    toolResult = currentStreamingMessage.pendingToolResults.find(
                        result => result.tool_call_id === toolCall.id
                    );
                }
                
                // Add tool call with result to the message
                addToolCallToMessage(currentStreamingMessage, toolCall, toolResult);
            });
            delete currentStreamingMessage.pendingToolCalls;
            delete currentStreamingMessage.pendingToolResults;
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
    
    // Filter out raw dictionary/object content that should be in tool calls
    const filteredContent = filterRawDictionaryContent(content);
    
    // Render markdown for AI responses, plain text for human messages
    if (type === 'ai' && typeof marked !== 'undefined') {
        messageText.innerHTML = marked.parse(filteredContent);
    } else {
        messageText.textContent = filteredContent;
    }
    
    messageContent.appendChild(messageText);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

// Add tool call to message
function addToolCallToMessage(messageElement, toolCall, toolResult = null) {
    const messageContent = messageElement.querySelector('.message-content');
    
    const toolCallDiv = document.createElement('div');
    toolCallDiv.className = 'tool-call';
    
    // Create expandable header
    const header = document.createElement('div');
    header.className = 'tool-call-header';
    header.innerHTML = `
        <div class="tool-call-title">
            <i class="material-icons tool-call-icon">build</i>
            <span class="tool-name">${toolCall.name || 'Tool Call'}</span>
            <i class="material-icons expand-icon">expand_more</i>
        </div>
    `;
    
    // Create collapsible content
    const content = document.createElement('div');
    content.className = 'tool-call-content collapsed';
    
    // Format input parameters (check both 'args' and 'input' for compatibility)
    const inputData = toolCall.args || toolCall.input;
    if (inputData && Object.keys(inputData).length > 0) {
        const inputSection = document.createElement('div');
        inputSection.className = 'tool-call-section';
        inputSection.innerHTML = `
            <div class="section-header">
                <i class="material-icons">input</i>
                <span>Parameters</span>
            </div>
            <div class="section-content">${formatToolCallData(inputData)}</div>
        `;
        content.appendChild(inputSection);
    }
    
    // Format output if available (check both toolCall.output and toolResult)
    const outputData = toolCall.output || (toolResult && toolResult.content);
    if (outputData) {
        const outputSection = document.createElement('div');
        outputSection.className = 'tool-call-section';
        outputSection.innerHTML = `
            <div class="section-header">
                <i class="material-icons">output</i>
                <span>Result</span>
            </div>
            <div class="section-content">${formatToolCallData(outputData)}</div>
        `;
        content.appendChild(outputSection);
    }
    
    // Add click handler for expand/collapse
    header.addEventListener('click', () => {
        const isCollapsed = content.classList.contains('collapsed');
        content.classList.toggle('collapsed');
        const expandIcon = header.querySelector('.expand-icon');
        expandIcon.textContent = isCollapsed ? 'expand_less' : 'expand_more';
    });
    
    toolCallDiv.appendChild(header);
    toolCallDiv.appendChild(content);
    messageContent.appendChild(toolCallDiv);
}

// Helper function to format tool call data
function formatToolCallData(data) {
    if (typeof data === 'string') {
        return `<div class="data-string">${escapeHtml(data)}</div>`;
    }
    
    if (typeof data === 'object' && data !== null) {
        let html = '<div class="data-object">';
        
        for (const [key, value] of Object.entries(data)) {
            html += `
                <div class="data-item">
                    <span class="data-key">${escapeHtml(key)}:</span>
                    <span class="data-value">${formatValue(value)}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    return `<div class="data-primitive">${escapeHtml(String(data))}</div>`;
}

// Helper function to format individual values
function formatValue(value) {
    if (typeof value === 'string') {
        return `<span class="value-string">"${escapeHtml(value)}"</span>`;
    }
    
    if (typeof value === 'number') {
        return `<span class="value-number">${value}</span>`;
    }
    
    if (typeof value === 'boolean') {
        return `<span class="value-boolean">${value}</span>`;
    }
    
    if (Array.isArray(value)) {
        return `<span class="value-array">[${value.length} items]</span>`;
    }
    
    if (typeof value === 'object' && value !== null) {
        return `<span class="value-object">{${Object.keys(value).length} properties}</span>`;
    }
    
    return `<span class="value-other">${escapeHtml(String(value))}</span>`;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filter out raw dictionary content that should be displayed in tool calls
function filterRawDictionaryContent(content) {
    if (!content || typeof content !== 'string') {
        return content || '';
    }
    
    // Check if content looks like a raw dictionary/JSON object
    const trimmedContent = content.trim();
    
    // Pattern to detect dictionary-like content with multiple key-value pairs
    const dictPattern = /^\{[\s\S]*["']\w+["']\s*:\s*[\s\S]*,\s*[\s\S]*["']\w+["']\s*:\s*[\s\S]*\}$/;
    
    // Pattern to detect array-like content with objects
    const arrayPattern = /^\[[\s\S]*\{[\s\S]*["']\w+["']\s*:[\s\S]*\}[\s\S]*\]$/;
    
    // If content matches dictionary or array patterns, return empty string
    if (dictPattern.test(trimmedContent) || arrayPattern.test(trimmedContent)) {
        return '';
    }
    
    return content;
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
    const modal = document.getElementById('loadModal');
    modal.classList.add('active');
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
            
            // Update URL without page reload
            const newUrl = `${window.location.origin}?thread_id=${threadId}`;
            window.history.pushState({threadId}, '', newUrl);
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
    
    let currentAIMessage = null;
    let pendingToolResults = [];
    
    messages.forEach((message, index) => {
        if (message.type === 'ai') {
            // Only create AI message if there's actual content to display
            if (message.content && message.content.trim() !== '') {
                currentAIMessage = addMessage(message.type, message.content);
            } else {
                currentAIMessage = null;
            }
            
            // Add tool calls if present
            if (message.tool_calls && message.tool_calls.length > 0) {
                // If we don't have a message element but have tool calls, create one without content
                if (!currentAIMessage) {
                    const chatMessages = document.getElementById('chatMessages');
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ai-message';
                    
                    const avatar = document.createElement('div');
                    avatar.className = 'message-avatar';
                    avatar.innerHTML = '<i class="material-icons">smart_toy</i>';
                    
                    const messageContent = document.createElement('div');
                    messageContent.className = 'message-content';
                    
                    messageDiv.appendChild(avatar);
                    messageDiv.appendChild(messageContent);
                    chatMessages.appendChild(messageDiv);
                    
                    currentAIMessage = messageDiv;
                }
                
                message.tool_calls.forEach(toolCall => {
                    // Find corresponding tool result from pending results
                    const toolResult = pendingToolResults.find(
                        result => result.tool_call_id === toolCall.id
                    );
                    addToolCallToMessage(currentAIMessage, toolCall, toolResult);
                });
                // Clear used tool results
                pendingToolResults = [];
            }
            
            // Add feedback if this is the last message and we have a message element
            if (index === messages.length - 1 && currentAIMessage) {
                addFeedbackToMessage(currentAIMessage);
            }
        } else if (message.type === 'tool') {
            // Store tool results to be associated with the next AI message
            pendingToolResults.push({
                tool_call_id: message.tool_call_id,
                content: message.content
            });
        } else {
            // Handle human and other message types normally
            addMessage(message.type, message.content);
            currentAIMessage = null;
        }
    });
}

// Close all modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    });
    
    // Clear input fields
    const threadInput = document.getElementById('threadIdInput');
    if (threadInput) {
        threadInput.value = '';
    }
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

// Toast notification functions
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };
    
    toast.innerHTML = `
        <span class="material-icons toast-icon">${iconMap[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">
            <span class="material-icons">close</span>
        </button>
    `;
    
    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showInfo(message) {
    showToast(message, 'info');
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