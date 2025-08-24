import { AgentInfo, ChatHistory, AudioTranscription } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getAgentInfo(): Promise<AgentInfo> {
    const response = await fetch(`${this.baseUrl}/info`);
    if (!response.ok) {
      throw new Error(`Failed to get agent info: ${response.statusText}`);
    }
    return response.json();
  }

  async getChatHistory(threadId: string): Promise<ChatHistory> {
    const response = await fetch(`${this.baseUrl}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thread_id: threadId,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { messages: [] };
      }
      throw new Error(`Failed to get chat history: ${response.statusText}`);
    }
    return response.json();
  }

  async submitFeedback(runId: string, score: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: runId,
        key: 'human-feedback-stars',
        score: score,
        kwargs: { comment: 'In-line human feedback' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<AudioTranscription> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    const response = await fetch(`${this.baseUrl}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to transcribe audio: ${response.statusText}`);
    }

    return response.json();
  }

  async textToSpeech(text: string, voice: string = 'alloy'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: voice,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to convert text to speech: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const apiService = new ApiService();