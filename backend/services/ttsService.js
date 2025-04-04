const axios = require('axios');

// Service for Text-to-Speech operations
class TTSService {
  constructor() {
    this.providers = {
      elevenlabs: {
        baseUrl: 'https://api.elevenlabs.io/v1',
        apiKey: process.env.ELEVENLABS_API_KEY
      },
      google: {
        baseUrl: 'https://texttospeech.googleapis.com/v1',
        apiKey: process.env.GOOGLE_CLOUD_API_KEY
      },
      amazon: {
        // Amazon Polly configuration
        region: 'us-east-1',
        accessKey: process.env.AMAZON_POLLY_ACCESS_KEY,
        secretKey: process.env.AMAZON_POLLY_SECRET_KEY
      }
    };
  }

  // Get available voices from a provider
  async getAvailableVoices(provider = 'elevenlabs') {
    try {
      switch (provider) {
        case 'elevenlabs':
          return await this.getElevenLabsVoices();
        case 'google':
          return await this.getGoogleVoices();
        case 'amazon':
          return await this.getAmazonVoices();
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error getting voices from ${provider}:`, error);
      throw error;
    }
  }

  // Generate speech from text
  async generateSpeech(text, voiceId, provider = 'elevenlabs', settings = {}) {
    try {
      switch (provider) {
        case 'elevenlabs':
          return await this.generateElevenLabsSpeech(text, voiceId, settings);
        case 'google':
          return await this.generateGoogleSpeech(text, voiceId, settings);
        case 'amazon':
          return await this.generateAmazonSpeech(text, voiceId, settings);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error(`Error generating speech with ${provider}:`, error);
      throw error;
    }
  }

  // ElevenLabs specific methods
  async getElevenLabsVoices() {
    const config = {
      headers: {
        'xi-api-key': this.providers.elevenlabs.apiKey
      }
    };

    const response = await axios.get(`${this.providers.elevenlabs.baseUrl}/voices`, config);
    return response.data.voices.map(voice => ({
      id: voice.voice_id,
      name: voice.name,
      provider: 'elevenlabs',
      gender: voice.labels?.gender || 'unknown',
      preview_url: voice.preview_url
    }));
  }

  async generateElevenLabsSpeech(text, voiceId, settings = {}) {
    const config = {
      headers: {
        'xi-api-key': this.providers.elevenlabs.apiKey,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    };

    const data = {
      text,
      voice_settings: {
        stability: settings.stability || 0.5,
        similarity_boost: settings.similarity_boost || 0.5
      }
    };

    const response = await axios.post(
      `${this.providers.elevenlabs.baseUrl}/text-to-speech/${voiceId}`,
      data,
      config
    );

    return {
      audioData: `data:audio/mpeg;base64,${Buffer.from(response.data).toString('base64')}`,
      format: 'mp3'
    };
  }

  // Google Cloud TTS specific methods
  async getGoogleVoices() {
    const response = await axios.get(
      `${this.providers.google.baseUrl}/voices?key=${this.providers.google.apiKey}`
    );

    return response.data.voices.map(voice => ({
      id: voice.name,
      name: voice.name.split('-').pop(),
      provider: 'google',
      gender: voice.ssmlGender.toLowerCase(),
      language: voice.languageCodes[0]
    }));
  }

  async generateGoogleSpeech(text, voiceId, settings = {}) {
    const data = {
      input: { text },
      voice: { 
        name: voiceId,
        languageCode: settings.languageCode || 'en-US'
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        pitch: settings.pitch || 0,
        speakingRate: settings.speakingRate || 1.0
      }
    };

    const response = await axios.post(
      `${this.providers.google.baseUrl}/text:synthesize?key=${this.providers.google.apiKey}`,
      data
    );

    return {
      audioData: `data:audio/mpeg;base64,${response.data.audioContent}`,
      format: 'mp3'
    };
  }

  // Amazon Polly specific methods
  async getAmazonVoices() {
    // This would typically use the AWS SDK
    // For simplicity, returning a mock response
    return [
      { id: 'Joanna', name: 'Joanna', provider: 'amazon', gender: 'female', language: 'en-US' },
      { id: 'Matthew', name: 'Matthew', provider: 'amazon', gender: 'male', language: 'en-US' },
      // Add more voices as needed
    ];
  }

  async generateAmazonSpeech(text, voiceId, settings = {}) {
    // This would typically use the AWS SDK
    // For simplicity, returning a mock response
    return {
      audioData: 'mock_base64_audio_data',
      format: 'mp3'
    };
  }
}

module.exports = new TTSService();
