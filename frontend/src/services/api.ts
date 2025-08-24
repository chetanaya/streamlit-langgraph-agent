import { AgentInfo, ChatHistory, AudioTranscription } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getAgentInfo(): Promise<AgentInfo> {
    const response = await fetch(`${this.baseUrl}/api/info`);
    if (!response.ok) {
      throw new Error(`Failed to get agent info: ${response.statusText}`);
    }
    return response.json();
  }

  async getChatHistory(threadId: string): Promise<ChatHistory> {
    const response = await fetch(`${this.baseUrl}/api/history/${threadId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { messages: [] };
      }
      throw new Error(`Failed to get chat history: ${response.statusText}`);
    }
    return response.json();
  }

  async submitFeedback(runId: string, score: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: runId,
        score: score,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<AudioTranscription> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    const response = await fetch(`${this.baseUrl}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to transcribe audio: ${response.statusText}`);
    }

    return response.json();
  }

  async textToSpeech(text: string, voice: string = 'alloy'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/text-to-speech`, {
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