import { useState, useRef, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

interface UseVoiceOptions {
  onTranscription?: (text: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export const useVoice = (options: UseVoiceOptions = {}) => {
  const { onTranscription, onError, enabled = true } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (!enabled || isRecording) return;

    // Mark that user has interacted (for audio autoplay policy)
    localStorage.setItem('user-has-interacted', 'true');

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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          onError?.('No audio data recorded');
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size === 0) {
          onError?.('Recorded audio is empty');
          return;
        }

        setIsTranscribing(true);
        
        try {
          const transcription = await apiService.transcribeAudio(audioBlob);
          
          if (transcription.success && transcription.text.trim()) {
            onTranscription?.(transcription.text.trim());
          } else {
            onError?.('No speech detected in audio');
          }
        } catch (error) {
          onError?.(error instanceof Error ? error.message : 'Transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      };
      
      mediaRecorder.onerror = (event) => {
        onError?.('Recording error occurred');
        setIsRecording(false);
        setIsTranscribing(false);
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [enabled, isRecording, onTranscription, onError]);

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    // Stop all tracks to release the microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const playAudio = useCallback(async (text: string, voice: string = 'alloy') => {
    try {
      const audioBlob = await apiService.textToSpeech(text, voice);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        onError?.('Failed to play audio');
      };
      
      try {
        await audio.play();
      } catch (error) {
        URL.revokeObjectURL(audioUrl);
        // Only show error if it's not the common autoplay policy error
        if (error instanceof Error && !error.message.includes("user didn't interact")) {
          onError?.(`Audio playback failed: ${error.message}`);
        }
        throw error;
      }
      
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to generate speech');
    }
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    toggleRecording,
    playAudio,
  };
};