// ML-based Voice Activity Detection (VAD) using @ricky0123/vad
// This module provides production-ready VAD using Silero VAD model

// ML-VAD variables
let mlVAD = null;
let mlVADActive = false;

// ML-VAD configuration
const mlVADConfig = {
    positiveSpeechThreshold: 0.5,
    negativeSpeechThreshold: 0.35,
    minSpeechFrames: 16,
    redemptionFrames: 8,
    frameSamples: 1536,
};

// Initialize ML-based VAD
async function initializeMLVAD() {
    try {
        // Check if VAD library is loaded
        if (typeof vad === 'undefined' || !vad.MicVAD) {
            throw new Error('VAD library not loaded');
        }

        console.log('Initializing ML-based VAD...');
        
        // Create VAD instance with callbacks
        mlVAD = await vad.MicVAD.new({
            positiveSpeechThreshold: mlVADConfig.positiveSpeechThreshold,
            negativeSpeechThreshold: mlVADConfig.negativeSpeechThreshold,
            minSpeechFrames: mlVADConfig.minSpeechFrames,
            redemptionFrames: mlVADConfig.redemptionFrames,
            frameSamples: mlVADConfig.frameSamples,
            
            // Speech start callback
            onSpeechStart: () => {
                if (isSpeaking) return; // Ignore during AI speech
                
                console.log('ML-VAD: Speech detected');
                speechDetected = true;
                
                // Trigger recording start in main app
                if (window.onMLVADSpeechStart) {
                    window.onMLVADSpeechStart();
                }
            },
            
            // Speech end callback with audio
            onSpeechEnd: async (audio) => {
                if (isSpeaking) return; // Ignore during AI speech
                
                console.log('ML-VAD: Speech ended, samples:', audio.length);
                speechDetected = false;
                
                // Process audio in main app
                if (window.onMLVADSpeechEnd) {
                    await window.onMLVADSpeechEnd(audio);
                }
            },
            
            // Misfire callback
            onVADMisfire: () => {
                console.log('ML-VAD: Misfire detected');
                speechDetected = false;
                
                if (window.onMLVADMisfire) {
                    window.onMLVADMisfire();
                }
            }
        });

        return mlVAD;
        
    } catch (error) {
        console.error('Error initializing ML-VAD:', error);
        throw error;
    }
}

// Start ML-VAD
async function startMLVAD() {
    if (mlVADActive || !mlVAD) {
        return false;
    }
    
    try {
        await mlVAD.start();
        mlVADActive = true;
        console.log('ML-VAD started successfully');
        return true;
    } catch (error) {
        console.error('Error starting ML-VAD:', error);
        throw error;
    }
}

// Stop ML-VAD
async function stopMLVAD() {
    if (!mlVADActive || !mlVAD) {
        return;
    }
    
    try {
        mlVAD.pause();
        mlVADActive = false;
        speechDetected = false;
        console.log('ML-VAD stopped');
    } catch (error) {
        console.error('Error stopping ML-VAD:', error);
    }
}

// Convert Float32Array from VAD to audio blob for transcription
async function convertVADAudioToBlob(audioFloat32Array) {
    try {
        // Create WAV blob from Float32Array
        const sampleRate = 16000;
        const length = audioFloat32Array.length;
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Convert float32 to int16
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, audioFloat32Array[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
        
    } catch (error) {
        console.error('Error converting VAD audio to blob:', error);
        throw error;
    }
}

// Check if ML-VAD is available
function isMLVADAvailable() {
    return typeof vad !== 'undefined' && vad.MicVAD;
}

// Export functions for global access
window.mlVADUtils = {
    initializeMLVAD,
    startMLVAD,
    stopMLVAD,
    convertVADAudioToBlob,
    isMLVADAvailable,
    getStatus: () => ({ active: mlVADActive, speechDetected })
};