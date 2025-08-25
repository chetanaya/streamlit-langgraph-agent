import { useState, useRef, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

interface UseAlwaysOnVoiceOptions {
  enabled?: boolean;
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

// VAD configuration similar to Flask implementation
const VAD_CONFIG = {
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  minSpeechFrames: 16,
  redemptionFrames: 8,
  frameSamples: 1536,
};

export const useAlwaysOnVoice = (options: UseAlwaysOnVoiceOptions = {}) => {
  const { enabled = false, onTranscription, onError, onSpeechStart, onSpeechEnd } = options;
  
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechDetected, setSpeechDetected] = useState(false);
  
  const vadRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  const initialize = useCallback(async () => {
    try {
      // Check if VAD library is available (similar to Flask implementation)
      // This would require the @ricky0123/vad library to be loaded
      if (typeof window !== 'undefined' && (window as any).vad) {
        const vad = (window as any).vad;
        
        vadRef.current = await vad.MicVAD.new({
          ...VAD_CONFIG,
          
          onSpeechStart: () => {
            if (isProcessingRef.current) return;
            
            setSpeechDetected(true);
            setIsListening(true);
            onSpeechStart?.();
          },
          
          onSpeechEnd: async (audio: Float32Array) => {
            if (isProcessingRef.current) return;
            
            setSpeechDetected(false);
            setIsListening(false);
            onSpeechEnd?.();
            
            try {
              isProcessingRef.current = true;
              const audioBlob = await convertVADAudioToBlob(audio);
              
              if (audioBlob.size > 1000) { // Basic size check
                const transcription = await apiService.transcribeAudio(audioBlob);
                
                if (transcription.success && transcription.text.trim()) {
                  onTranscription?.(transcription.text.trim());
                }
              }
            } catch (error) {
              onError?.(error instanceof Error ? error.message : 'Transcription failed');
            } finally {
              isProcessingRef.current = false;
            }
          },
          
          onVADMisfire: () => {
            setSpeechDetected(false);
            setIsListening(false);
          }
        });
        
        return true;
      } else {
        // Fallback to basic MediaRecorder approach if VAD library not available
        return await initializeFallbackVAD();
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to initialize voice detection');
      return false;
    }
  }, [onTranscription, onError, onSpeechStart, onSpeechEnd]);

  const initializeFallbackVAD = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Simple energy-based VAD as fallback
      const analyser = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let speechTimeout: NodeJS.Timeout | null = null;
      let isCurrentlyRecording = false;
      let mediaRecorder: MediaRecorder | null = null;
      let audioChunks: Blob[] = [];
      
      const checkAudioLevel = () => {
        if (!isActive) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average energy
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const energyThreshold = 30; // Adjust based on testing
        
        const hasSpeech = average > energyThreshold;
        
        if (hasSpeech && !isCurrentlyRecording) {
          // Start recording
          setSpeechDetected(true);
          setIsListening(true);
          onSpeechStart?.();
          
          audioChunks = [];
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            if (audioChunks.length === 0) return;
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            if (audioBlob.size > 1000) {
              try {
                isProcessingRef.current = true;
                const transcription = await apiService.transcribeAudio(audioBlob);
                
                if (transcription.success && transcription.text.trim()) {
                  onTranscription?.(transcription.text.trim());
                }
              } catch (error) {
                onError?.(error instanceof Error ? error.message : 'Transcription failed');
              } finally {
                isProcessingRef.current = false;
              }
            }
          };
          
          mediaRecorder.start(1000);
          isCurrentlyRecording = true;
          
          // Clear existing timeout
          if (speechTimeout) {
            clearTimeout(speechTimeout);
          }
        }
        
        if (hasSpeech) {
          // Reset timeout on continued speech
          if (speechTimeout) {
            clearTimeout(speechTimeout);
          }
          
          speechTimeout = setTimeout(() => {
            if (isCurrentlyRecording && mediaRecorder) {
              setSpeechDetected(false);
              setIsListening(false);
              onSpeechEnd?.();
              
              mediaRecorder.stop();
              isCurrentlyRecording = false;
            }
          }, 1500); // Stop recording after 1.5s of silence
        }
        
        requestAnimationFrame(checkAudioLevel);
      };
      
      checkAudioLevel();
      return true;
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to initialize fallback VAD');
      return false;
    }
  }, [isActive, onTranscription, onError, onSpeechStart, onSpeechEnd]);

  const start = useCallback(async () => {
    if (isActive || !enabled) return false;

    try {
      const initialized = await initialize();
      if (!initialized) return false;

      if (vadRef.current && typeof vadRef.current.start === 'function') {
        await vadRef.current.start();
      }
      
      setIsActive(true);
      return true;
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to start voice detection');
      return false;
    }
  }, [enabled, initialize, isActive, onError]);

  const stop = useCallback(() => {
    if (!isActive) return;

    try {
      if (vadRef.current && typeof vadRef.current.pause === 'function') {
        vadRef.current.pause();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setIsActive(false);
      setIsListening(false);
      setSpeechDetected(false);
      isProcessingRef.current = false;
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to stop voice detection');
    }
  }, [isActive, onError]);

  const toggle = useCallback(async () => {
    if (isActive) {
      stop();
    } else {
      await start();
    }
  }, [isActive, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isActive) {
        stop();
      }
    };
  }, [isActive, stop]);

  // Auto-start/stop based on enabled flag
  useEffect(() => {
    if (enabled && !isActive) {
      start();
    } else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, isActive, start, stop]);

  return {
    isActive,
    isListening,
    speechDetected,
    start,
    stop,
    toggle,
  };
};

// Helper function to convert Float32Array to audio blob (same as Flask implementation)
async function convertVADAudioToBlob(audioFloat32Array: Float32Array): Promise<Blob> {
  try {
    const sampleRate = 16000;
    const length = audioFloat32Array.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
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