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

// Voice interaction variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let audioContext = null;
let currentAudio = null;
let voiceInteractionEnabled = true;

// ML-based VAD variables
let voiceDetectionActive = false;
let speechDetected = false;
let alwaysOnVoiceEnabled = false;
let isSpeaking = false; // Track if AI is speaking to prevent feedback
let currentRecordingAudio = []; // Store audio chunks during recording

// VAD configuration for ML model
let vadConfig = {
    positiveSpeechThreshold: 0.5, // Confidence threshold for speech detection
    negativeSpeechThreshold: 0.35, // Confidence threshold for silence detection
    minSpeechFrames: 16, // Minimum frames to confirm speech (more stable)
    redemptionFrames: 8, // Frames to wait before stopping on silence
    frameSamples: 1536, // Frame size for VAD model (16kHz * 0.096s)
};

// VAD state tracking
let vadState = {
    isCalibrating: true,
    calibrationFrames: 0,
    maxCalibrationFrames: 100, // 2 seconds of calibration at 50fps
    currentEnergy: 0,
    currentZCR: 0,
    currentSpectralCentroid: 0,
    currentSNR: 0,
    // Recording quality tracking
    recordingStartTime: 0,
    speechFramesDuringRecording: 0,
    totalFramesDuringRecording: 0
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
    const micBtn = document.getElementById('micBtn');
    
    // Auto-resize textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button based on content
        const hasContent = this.value.trim().length > 0;
        sendBtn.disabled = !hasContent;
    });
    
    // Mobile menu handlers
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        });
    }
    
    if (mobileSidebarClose) {
        mobileSidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    if (mobileSettingsBtn) {
        mobileSettingsBtn.addEventListener('click', () => {
            showSettingsModal();
        });
    }
    
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
    micBtn.addEventListener('click', toggleRecording);
    
    // Initialize audio context
    initializeAudioContext();
    
    // Voice toggle
    const voiceToggle = document.getElementById('voiceToggle');
    voiceToggle.addEventListener('change', toggleVoiceInteraction);
    
    // Always-on voice toggle
    const alwaysOnToggle = document.getElementById('alwaysOnVoiceToggle');
    if (alwaysOnToggle) {
        alwaysOnToggle.addEventListener('change', toggleAlwaysOnVoice);
    }
    
    
    // Initialize voice interaction state
    updateVoiceInteractionUI();
    
    // Sidebar buttons
    document.getElementById('newChatBtn').addEventListener('click', startNewChat);
    document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);
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
    const sendBtn = document.getElementById('sendBtn');
    const message = chatInput.value.trim();
    
    if (!message || isStreaming) {
        return;
    }
    
    // Add user message to chat
    addMessage('human', message);
    
    // Clear input and reset height
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    
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
        
        // Generate speech for the completed streaming message
        if (content && content.trim() && voiceInteractionEnabled) {
            generateSpeechWithFeedbackPrevention(content.trim(), currentStreamingMessage);
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
    
    // Generate speech for AI responses
    if (data.content && data.content.trim() && voiceInteractionEnabled) {
        generateSpeechWithFeedbackPrevention(data.content, currentStreamingMessage);
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
    const chatInput = document.getElementById('chatInput');
    
    if (disabled) {
        sendBtn.disabled = true;
    } else {
        // Only enable if there's content in the input
        sendBtn.disabled = !chatInput.value.trim();
    }
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

// Show settings modal
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Show share modal
function showShareModal() {
    const modal = document.getElementById('shareModal');
    const urlElement = document.getElementById('shareUrl');
    
    const shareUrl = `${window.location.origin}?thread_id=${currentThreadId}`;
    urlElement.value = shareUrl;
    
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Show load modal
function showLoadModal() {
    const modal = document.getElementById('loadModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Copy share URL
function copyShareUrl() {
    const urlElement = document.getElementById('shareUrl');
    const url = urlElement.value;
    
    navigator.clipboard.writeText(url).then(() => {
        showSuccess('URL copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        urlElement.select();
        urlElement.setSelectionRange(0, 99999); // For mobile devices
        document.execCommand('copy');
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
    
    
    
    try {
        const response = await fetch(`/api/history/${threadId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            showError(data.error);
            return;
        }
        
        if (data.messages && data.messages.length > 0) {
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
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    
    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    
    // Clear input fields
    const threadInput = document.getElementById('threadIdInput');
    if (threadInput) {
        threadInput.value = '';
    }
}



// Toast notification functions
function showToast(message, type = 'info', duration = 4000) {
    let toastContainer = document.getElementById('toastContainer');
    
    // Create toast container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconMap = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };
    
    toast.innerHTML = `
        <span class="material-icons toast-icon">${iconMap[type] || 'info'}</span>
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

function showWarning(message) {
    showToast(message, 'warning');
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

// Voice interaction functions
function initializeAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        console.error('Audio context not supported:', error);
    }
}

// ML-based VAD integration functions
async function startAlwaysOnVoiceDetection() {
    if (!voiceInteractionEnabled || voiceDetectionActive) {
        return;
    }
    
    try {
        // Check if ML-VAD is available
        if (!window.mlVADUtils || !window.mlVADUtils.isMLVADAvailable()) {
            throw new Error('ML-VAD library not available. Please refresh the page.');
        }
        
        // Setup ML-VAD callbacks
        window.onMLVADSpeechStart = () => {
            console.log('Speech started - beginning recording');
            speechDetected = true;
            if (!isRecording) {
                startMLRecording();
            }
            updateVADStatusUI();
        };
        
        window.onMLVADSpeechEnd = async (audioFloat32Array) => {
            console.log('Speech ended - processing audio');
            speechDetected = false;
            if (isRecording) {
                stopMLRecording();
            }
            updateVADStatusUI();
            
            // Convert and transcribe audio
            try {
                const audioBlob = await window.mlVADUtils.convertVADAudioToBlob(audioFloat32Array);
                if (audioBlob.size > 1000) { // Basic size check
                    await transcribeAudio(audioBlob);
                }
            } catch (error) {
                console.error('Error processing ML-VAD audio:', error);
            }
        };
        
        window.onMLVADMisfire = () => {
            console.log('ML-VAD misfire - ignoring');
            speechDetected = false;
            if (isRecording) {
                stopMLRecording();
            }
            updateVADStatusUI();
        };
        
        // Initialize and start ML-VAD
        await window.mlVADUtils.initializeMLVAD();
        await window.mlVADUtils.startMLVAD();
        
        voiceDetectionActive = true;
        updateAlwaysOnVoiceUI();
        showSuccess('ML-based voice detection started successfully!');
        
    } catch (error) {
        console.error('Error starting ML-based voice detection:', error);
        
        if (error.name === 'NotAllowedError') {
            showError('Microphone access denied. Please allow microphone access.');
        } else if (error.message.includes('ML-VAD library')) {
            showError('ML-VAD library not loaded. Please refresh the page.');
        } else {
            showError('Failed to start voice detection: ' + error.message);
        }
        
        alwaysOnVoiceEnabled = false;
        updateAlwaysOnVoiceUI();
    }
}

function stopAlwaysOnVoiceDetection() {
    voiceDetectionActive = false;
    
    // Stop ML-based VAD
    if (window.mlVADUtils) {
        try {
            window.mlVADUtils.stopMLVAD();
        } catch (error) {
            console.error('Error stopping ML-VAD:', error);
        }
    }
    
    // Stop any ongoing recording
    if (isRecording) {
        stopMLRecording();
    }
    
    // Reset state
    speechDetected = false;
    currentRecordingAudio = [];
    
    // Clear callbacks
    window.onMLVADSpeechStart = null;
    window.onMLVADSpeechEnd = null;
    window.onMLVADMisfire = null;
    
    updateAlwaysOnVoiceUI();
    showInfo('ML-based voice detection disabled');
}

// ML recording functions (simpler than old system)
function startMLRecording() {
    if (isRecording) return;
    
    isRecording = true;
    updateVoiceRecordingUI(true);
    console.log('ML recording started');
}

function stopMLRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    updateVoiceRecordingUI(false);
    console.log('ML recording stopped');
}

// Update VAD status UI for ML-based system
function updateVADStatusUI() {
    const micBtn = document.getElementById('micBtn');
    
    if (speechDetected && !isRecording) {
        micBtn.title = 'ML-VAD: Speech detected';
    } else if (isRecording) {
        micBtn.title = 'ML-VAD: Recording in progress...';
    } else if (alwaysOnVoiceEnabled && voiceDetectionActive) {
        micBtn.title = 'ML-VAD: Listening for speech...';
    } else {
        micBtn.title = 'Voice input';
    }
}

// Old VAD functions removed - now using ML-based VAD

function oldMonitorVoiceActivity() {
    if (!voiceDetectionActive || !voiceAnalyser) {
        return;
    }
    
    const bufferLength = voiceAnalyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeData = new Float32Array(voiceAnalyser.fftSize);
    
    function processAudioFrame() {
        if (!voiceDetectionActive) {
            return;
        }
        
        voiceAnalyser.getByteFrequencyData(frequencyData);
        voiceAnalyser.getFloatTimeDomainData(timeData);
        
        // Calculate multiple audio features
        const features = calculateAudioFeatures(frequencyData, timeData);
        vadState.currentEnergy = features.energy;
        vadState.currentZCR = features.zeroCrossingRate;
        vadState.currentSpectralCentroid = features.spectralCentroid;
        
        // Update noise floor estimation
        updateNoiseFloor(features.energy);
        
        // Calculate SNR
        vadState.currentSNR = calculateSNR(features.energy, vadConfig.noiseFloor);
        
        // Determine if current frame contains speech
        const isSpeechFrame = isSpeechDetected(features) && !isSpeaking;
        
        // Update frame counters
        if (isSpeechFrame) {
            vadConfig.speechFrameCount++;
            vadConfig.silenceFrameCount = 0;
        } else {
            vadConfig.silenceFrameCount++;
            vadConfig.speechFrameCount = 0;
        }
        
        // State machine for speech detection
        handleVADStateTransitions();
        
        // Track speech quality during recording
        if (isRecording) {
            vadState.totalFramesDuringRecording++;
            if (isSpeechFrame) {
                vadState.speechFramesDuringRecording++;
            }
        }
        
        // Continue monitoring at specified frame rate
        setTimeout(processAudioFrame, 1000 / vadConfig.frameRate);
    }
    
    processAudioFrame();
}

// Calculate comprehensive audio features for VAD
function calculateAudioFeatures(frequencyData, timeData) {
    const features = {};
    
    // 1. Energy calculation (RMS)
    let energySum = 0;
    for (let i = 0; i < timeData.length; i++) {
        energySum += timeData[i] * timeData[i];
    }
    features.energy = Math.sqrt(energySum / timeData.length);
    
    // 2. Zero Crossing Rate (ZCR)
    let zeroCrossings = 0;
    for (let i = 1; i < timeData.length; i++) {
        if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) {
            zeroCrossings++;
        }
    }
    features.zeroCrossingRate = zeroCrossings / timeData.length;
    
    // 3. Spectral Centroid (frequency distribution center)
    let weightedSum = 0;
    let magnitudeSum = 0;
    const sampleRate = audioContext.sampleRate;
    
    for (let i = 0; i < frequencyData.length; i++) {
        const frequency = (i * sampleRate) / (2 * frequencyData.length);
        const magnitude = frequencyData[i] / 255.0;
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
    }
    
    features.spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // 4. High frequency energy ratio (speech typically has more HF energy than noise)
    const midPoint = Math.floor(frequencyData.length * 0.5);
    let lowFreqEnergy = 0, highFreqEnergy = 0;
    
    for (let i = 0; i < midPoint; i++) {
        lowFreqEnergy += frequencyData[i];
    }
    for (let i = midPoint; i < frequencyData.length; i++) {
        highFreqEnergy += frequencyData[i];
    }
    
    features.highFreqRatio = lowFreqEnergy > 0 ? highFreqEnergy / lowFreqEnergy : 0;
    
    return features;
}

// Update noise floor estimation using rolling window
function updateNoiseFloor(energy) {
    if (vadState.isCalibrating) {
        // During calibration, collect samples for noise floor estimation
        vadConfig.noiseFloorSamples.push(energy);
        vadState.calibrationFrames++;
        
        if (vadState.calibrationFrames >= vadState.maxCalibrationFrames) {
            // Calculate noise floor as median of collected samples
            const sortedSamples = vadConfig.noiseFloorSamples.slice().sort((a, b) => a - b);
            vadConfig.noiseFloor = sortedSamples[Math.floor(sortedSamples.length * 0.5)];
            vadConfig.energyThreshold = vadConfig.noiseFloor * Math.pow(10, vadConfig.snrThreshold / 20);
            
            vadState.isCalibrating = false;
            console.log(`VAD Calibration complete: Noise floor=${vadConfig.noiseFloor.toFixed(4)}, Threshold=${vadConfig.energyThreshold.toFixed(4)}`);
            showInfo('Voice detection calibrated to your environment');
        }
    } else {
        // Update noise floor with non-speech frames only
        if (vadConfig.speechFrameCount === 0 && vadConfig.silenceFrameCount > 10) {
            // Add to rolling window
            vadConfig.noiseFloorSamples.push(energy);
            if (vadConfig.noiseFloorSamples.length > vadConfig.noiseFloorWindowSize) {
                vadConfig.noiseFloorSamples.shift();
            }
            
            // Update noise floor using exponential moving average
            const avgNoise = vadConfig.noiseFloorSamples.reduce((a, b) => a + b, 0) / vadConfig.noiseFloorSamples.length;
            vadConfig.noiseFloor = vadConfig.adaptationRate * vadConfig.noiseFloor + (1 - vadConfig.adaptationRate) * avgNoise;
            
            // Adapt threshold based on noise floor
            vadConfig.energyThreshold = vadConfig.noiseFloor * Math.pow(10, vadConfig.snrThreshold / 20);
        }
    }
}

// Calculate Signal-to-Noise Ratio
function calculateSNR(signalEnergy, noiseEnergy) {
    if (noiseEnergy <= 0) return 100; // Very high SNR if no noise
    return 20 * Math.log10(signalEnergy / noiseEnergy);
}

// Comprehensive speech detection with noise suppression consideration
function isSpeechDetected(features) {
    if (vadState.isCalibrating) {
        return false; // Don't detect speech during calibration
    }
    
    // Multi-criteria speech detection (adjusted for browser noise suppression)
    const energyCriterion = features.energy > vadConfig.energyThreshold;
    const snrCriterion = vadState.currentSNR > vadConfig.snrThreshold;
    const zcrCriterion = features.zeroCrossingRate > vadConfig.zeroCrossingThreshold && 
                        features.zeroCrossingRate < 0.6; // Tighter range with noise suppression
    const spectralCriterion = features.spectralCentroid > vadConfig.spectralCentroidThreshold && 
                             features.spectralCentroid < 3500; // Adjusted for cleaner audio
    const hfRatioCriterion = features.highFreqRatio > 0.15; // Higher requirement with noise suppression
    
    // Simple moderate approach: energy + one other criterion
    return energyCriterion && [snrCriterion, zcrCriterion, spectralCriterion].filter(Boolean).length >= 1;
}


// Handle VAD state transitions with frame-based confirmation
function handleVADStateTransitions() {
    const wasDetectingSpeech = speechDetected;
    
    // Transition to speech state
    if (!speechDetected && vadConfig.speechFrameCount >= vadConfig.minSpeechFrames) {
        speechDetected = true;
        console.log(`Speech detected: ${vadConfig.speechFrameCount} consecutive frames`);
        
        // Start recording after confirming speech
        if (voiceDetectionActive && !isRecording && !isSpeaking) {
            startAutoRecording();
        }
    }
    
    // Transition to silence state
    if (speechDetected && vadConfig.silenceFrameCount >= vadConfig.minSilenceFrames) {
        speechDetected = false;
        console.log(`Silence detected: ${vadConfig.silenceFrameCount} consecutive frames`);
        
        // Stop recording after confirming silence
        if (isRecording) {
            stopRecording();
        }
    }
    
    // Update UI if state changed
    if (wasDetectingSpeech !== speechDetected) {
        updateVADStatusUI();
    }
}

// Update UI to show VAD status
function updateVADStatusUI() {
    const micBtn = document.getElementById('micBtn');
    
    if (vadState.isCalibrating) {
        micBtn.title = `Calibrating voice detection... ${Math.round((vadState.calibrationFrames / vadState.maxCalibrationFrames) * 100)}%`;
    } else if (speechDetected && !isRecording) {
        micBtn.title = `Speech detected (SNR: ${vadState.currentSNR.toFixed(1)}dB)`;
    } else if (isRecording) {
        micBtn.title = 'Recording in progress...';
    } else {
        micBtn.title = `Voice detection active (Noise: ${(vadConfig.noiseFloor * 1000).toFixed(2)})`;
    }
}

async function startAutoRecording() {
    if (!voiceDetectionActive || isRecording || isSpeaking) {
        return;
    }
    
    try {
        // Use the existing voice stream for recording
        mediaRecorder = new MediaRecorder(voiceStream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 16000 // Lower bitrate for efficiency
        });
        
        audioChunks = [];
        vadState.recordingStartTime = Date.now();
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                // Simple validation - just check minimum duration and size
                const recordingDuration = Date.now() - vadState.recordingStartTime;
                if (recordingDuration > 500 && audioBlob.size > 1000) {
                    await transcribeAudio(audioBlob);
                } else {
                    console.log('Recording too short, ignoring');
                }
            }
        };
        
        mediaRecorder.start(100); // Collect data every 100ms
        isRecording = true;
        
        // Update UI to show recording
        updateVoiceRecordingUI(true);
        
        console.log('Auto-recording started with quality validation');
        
    } catch (error) {
        console.error('Error starting auto-recording:', error);
        isRecording = false;
        updateVoiceRecordingUI(false);
    }
}


function updateVoiceRecordingUI(recording) {
    const micBtn = document.getElementById('micBtn');
    const micIcon = document.getElementById('micIcon');
    
    if (recording) {
        micBtn.classList.add('auto-recording');
        micIcon.textContent = 'mic';
        micBtn.title = 'Auto-recording active';
    } else {
        micBtn.classList.remove('auto-recording');
        micBtn.title = alwaysOnVoiceEnabled ? 'Always-on voice detection active' : 'Voice input';
    }
}

function updateAlwaysOnVoiceUI() {
    const micBtn = document.getElementById('micBtn');
    const alwaysOnToggle = document.getElementById('alwaysOnVoiceToggle');
    
    if (alwaysOnToggle) {
        alwaysOnToggle.checked = alwaysOnVoiceEnabled && voiceDetectionActive;
    }
    
    if (alwaysOnVoiceEnabled && voiceDetectionActive) {
        micBtn.classList.add('always-on-active');
        if (!isRecording) {
            micBtn.title = 'Always-on voice detection active';
        }
    } else {
        micBtn.classList.remove('always-on-active');
        micBtn.title = 'Voice input';
    }
}

function toggleAlwaysOnVoice() {
    const alwaysOnToggle = document.getElementById('alwaysOnVoiceToggle');
    alwaysOnVoiceEnabled = alwaysOnToggle ? alwaysOnToggle.checked : false;
    
    if (alwaysOnVoiceEnabled) {
        if (voiceInteractionEnabled) {
            startAlwaysOnVoiceDetection();
        } else {
            showError('Please enable voice interaction first');
            if (alwaysOnToggle) alwaysOnToggle.checked = false;
            alwaysOnVoiceEnabled = false;
        }
    } else {
        stopAlwaysOnVoiceDetection();
    }
}


async function toggleRecording() {
    if (!voiceInteractionEnabled) {
        showError('Voice interaction is disabled. Enable it in settings to use voice input.');
        return;
    }
    
    // If always-on voice is enabled, toggle that instead
    if (alwaysOnVoiceEnabled) {
        toggleAlwaysOnVoice();
        return;
    }
    
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Microphone access is not supported in this browser');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
            throw new Error('Audio recording is not supported in this browser');
        }
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await transcribeAudio(audioBlob);
            
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            showError('Recording error occurred');
            stopRecording();
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // Update UI
        const micBtn = document.getElementById('micBtn');
        const micIcon = document.getElementById('micIcon');
        micBtn.classList.add('recording');
        micIcon.textContent = 'stop';
        micBtn.title = 'Stop recording';
        
        showInfo('Recording... Click to stop');
        
    } catch (error) {
        console.error('Error starting recording:', error);
        isRecording = false;
        
        // Show user-friendly error messages
        if (error.name === 'NotAllowedError') {
            showError('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
            showError('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotSupportedError') {
            showError('Audio recording is not supported in this browser.');
        } else {
            showError('Failed to start recording: ' + error.message);
        }
        
        // Reset UI
        const micBtn = document.getElementById('micBtn');
        const micIcon = document.getElementById('micIcon');
        micBtn.classList.remove('recording');
        micIcon.textContent = 'mic';
        micBtn.title = 'Voice input';
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Update UI
        const micBtn = document.getElementById('micBtn');
        const micIcon = document.getElementById('micIcon');
        micBtn.classList.remove('recording');
        micIcon.textContent = 'mic';
        micBtn.title = 'Voice input';
        
        showInfo('Processing audio...');
    }
}

async function transcribeAudio(audioBlob) {
    try {
        // Enhanced validation before sending to API
        if (!audioBlob || audioBlob.size === 0) {
            throw new Error('No audio data to transcribe');
        }
        
        // Basic size check
        if (audioBlob.size < 1000) { // Less than 1KB
            console.log('Audio blob too small:', audioBlob.size);
            return;
        }
        
        // Show processing overlay

        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
            timeout: 30000 // 30 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.text) {
            const transcribedText = data.text.trim();
            
            // Basic background noise filtering
            if (transcribedText.length < 2 || isLikelyBackgroundNoise(transcribedText)) {
                console.log('Filtered noise/short transcription:', transcribedText);
                return;
            }
            
            // Insert transcribed text into chat input
            const chatInput = document.getElementById('chatInput');
            chatInput.value = transcribedText;
            chatInput.focus();
            
            showSuccess('Audio transcribed successfully');
            
            // Auto-send if text is meaningful
            if (transcribedText.length > 2) { // More than 2 characters
                setTimeout(() => {
                    sendMessage();
                }, 500);
            }
        } else {
            throw new Error(data.error || 'No transcription text received');
        }
    } catch (error) {
        console.error('Error transcribing audio:', error);
        
        // Show specific error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error: Unable to connect to transcription service');
        } else if (error.message.includes('timeout')) {
            showError('Transcription timed out. Please try again with a shorter recording.');
        } else if (error.message.includes('Server error: 413')) {
            showError('Audio file too large. Please record a shorter message.');
        } else {
            showError('Failed to transcribe audio: ' + error.message);
        }
    } finally {
        // Hide processing overlay
        
    }
}

async function generateSpeech(text, messageElement) {
    try {
        // Validate input
        if (!text || text.trim().length === 0) {
            console.warn('No text provided for speech generation');
            return;
        }
        
        // Limit text length to prevent API issues
        const maxLength = 4000;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }
        
        // Show processing overlay
    
        
        const response = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice: 'alloy'
            }),
            timeout: 30000 // 30 second timeout
        });
        
        if (!response.ok) {
            throw new Error(`Speech generation failed: ${response.status} ${response.statusText}`);
        }
        
        const audioBlob = await response.blob();
        
        if (audioBlob.size === 0) {
            throw new Error('Received empty audio response');
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Add audio player to message and get the audio element
        const audioElement = addAudioPlayerToMessage(messageElement, audioUrl);
        
        // Auto-play the audio using the same element that's visible to the user
        playAudio(audioUrl, audioElement);
        
    } catch (error) {
        console.error('Error generating speech:', error);
        
        // Show user-friendly error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.warn('Network error: Unable to connect to text-to-speech service');
        } else if (error.message.includes('timeout')) {
            console.warn('Speech generation timed out');
        } else if (error.message.includes('413')) {
            console.warn('Text too long for speech generation');
        } else {
            console.warn('Failed to generate speech: ' + error.message);
        }
        
        // Don't show error toast for speech generation failures as it's not critical
    } finally {
        // Hide processing overlay

    }
}

// Enhanced speech generation with feedback prevention
async function generateSpeechWithFeedbackPrevention(text, messageElement) {
    // Set speaking flag to prevent recording during playback
    isSpeaking = true;
    
    try {
        await generateSpeech(text, messageElement);
    } finally {
        // Reset speaking flag after a short delay to allow audio to finish
        setTimeout(() => {
            isSpeaking = false;
        }, 1000);
    }
}

function addAudioPlayerToMessage(messageElement, audioUrl) {
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-container';
    
    const audioPlayer = document.createElement('audio');
    audioPlayer.controls = true;
    audioPlayer.src = audioUrl;
    audioPlayer.className = 'message-audio';
    
    // Store reference to this audio element for autoplay control
    audioPlayer.dataset.audioUrl = audioUrl;
    
    audioContainer.appendChild(audioPlayer);
    
    // Add audio player below the message content
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
        messageContent.appendChild(audioContainer);
    } else {
        messageElement.appendChild(audioContainer);
    }
    
    return audioPlayer;
}

function playAudio(audioUrl, audioElement = null) {
    try {
        // Set speaking flag to prevent voice detection feedback
        isSpeaking = true;
        
        // Stop current audio if playing
        if (currentAudio && currentAudio !== audioElement) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        
        // If audioElement is provided, use it; otherwise find it or create new one
        if (audioElement) {
            currentAudio = audioElement;
        } else {
            // Try to find existing audio element with this URL
            const existingAudio = document.querySelector(`audio[data-audio-url="${audioUrl}"]`);
            if (existingAudio) {
                currentAudio = existingAudio;
            } else {
                currentAudio = new Audio(audioUrl);
            }
        }
        
        // Add error handling for audio playback
        currentAudio.onerror = (error) => {
            console.error('Audio playback error:', error);
            isSpeaking = false;
            showError('Failed to play audio');
        };
        
        currentAudio.onloadstart = () => {
            console.log('Audio loading started');
        };
        
        currentAudio.oncanplay = () => {
            console.log('Audio ready to play');
        };
        
        // Reset speaking flag when audio ends
        currentAudio.onended = () => {
            isSpeaking = false;
            console.log('Audio playback ended, voice detection re-enabled');
        };
        
        currentAudio.play().then(() => {
            console.log('Audio playback started');
        }).catch(error => {
            console.error('Error playing audio:', error);
            isSpeaking = false;
            
            // Handle specific audio playback errors
            if (error.name === 'NotAllowedError') {
                showError('Audio playback blocked. Please enable autoplay or click the audio player.');
            } else if (error.name === 'NotSupportedError') {
                showError('Audio format not supported by your browser.');
            } else {
                showError('Failed to play audio: ' + error.message);
            }
        });
    } catch (error) {
        console.error('Error setting up audio playback:', error);
        isSpeaking = false;
        showError('Failed to initialize audio playback');
    }
}

// Voice interaction toggle functions
function toggleVoiceInteraction() {
    const voiceToggle = document.getElementById('voiceToggle');
    voiceInteractionEnabled = voiceToggle.checked;
    
    // Stop any ongoing recording when disabling voice interaction
    if (!voiceInteractionEnabled) {
        if (isRecording) {
            stopRecording();
        }
        // Also disable always-on voice detection
        if (alwaysOnVoiceEnabled) {
            alwaysOnVoiceEnabled = false;
            stopAlwaysOnVoiceDetection();
            const alwaysOnToggle = document.getElementById('alwaysOnVoiceToggle');
            if (alwaysOnToggle) {
                alwaysOnToggle.checked = false;
            }
        }
    }
    
    updateVoiceInteractionUI();
    
    // Show feedback to user
    if (voiceInteractionEnabled) {
        showInfo('Voice interaction enabled');
    } else {
        showInfo('Voice interaction disabled');
    }
}

function updateVoiceInteractionUI() {
    const micBtn = document.getElementById('micBtn');
    
    if (voiceInteractionEnabled) {
        micBtn.classList.remove('hidden');
    } else {
        micBtn.classList.add('hidden');
    }
    
    // Update always-on voice UI as well
    updateAlwaysOnVoiceUI();
}

// Filter out common background noise transcriptions
function isLikelyBackgroundNoise(text) {
    if (!text || text.length < 1) return true;
    
    // Convert to lowercase for comparison
    const lowerText = text.toLowerCase().trim();
    
    // Common background noise patterns that Whisper might transcribe
    const noisePatterns = [
        '', // Empty
        '.', // Single dot
        '..', // Dots
        '...', // More dots
        'mm', // Humming
        'mmm', // More humming
        'um', // Filler
        'uh', // Filler
        'ah', // Filler
        'eh', // Filler
        'oh', // Filler
        'hm', // Humming
        'hmm', // Humming
        'shh', // Shushing
        'tsk', // Clicking
        'click', // Mouse clicks
        'typing', // Keyboard
        'background', // Background word
        'noise', // Noise word
        'music', // Background music
        'sound', // Generic sound
        '♪', // Music notes
        '♫', // Music notes
        'beep', // System sounds
        'buzz', // Buzzing
        'ring', // Phone ringing
        'ding', // Notification sounds
    ];
    
    // Check exact matches
    if (noisePatterns.includes(lowerText)) {
        return true;
    }
    
    // Check if it's too short and likely meaningless
    if (lowerText.length <= 2 && !/^[a-z]/.test(lowerText)) {
        return true;
    }
    
    // Check for repeated characters (often noise)
    if (/^(..)\1{2,}$/.test(lowerText) || /^(.)\1{3,}$/.test(lowerText)) {
        return true;
    }
    
    // Check for common whisper artifacts
    const artifactPatterns = [
        /^\[.*\]$/, // Bracketed content
        /^\(.*\)$/, // Parenthetical content
        /^thanks for watching$/i, // Common YouTube artifact
        /^subscribe$/i, // YouTube artifact
        /^like and subscribe$/i, // YouTube artifact
    ];
    
    return artifactPatterns.some(pattern => pattern.test(lowerText));
}

// This function is now integrated into the main DOMContentLoaded handler above