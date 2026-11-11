import { CactusLM } from 'cactus-react-native';
import { PhotoAnalysis, CactusModelState, AppError } from '../types';

// Use the recommended model from the official docs
const CAPTURA_MODEL = 'lfm2-vl-450m';

const CAPTURA_PROMPT = `Analyze this photo and return ONLY valid JSON:

{
  "scene": "indoor" OR "outdoor",
  "objects": ["object1", "object2", "object3"],
  "hasPeople": true OR false,
  "quality": "good" OR "blurry", 
  "setting": "home" OR "work" OR "nature" OR "social" OR "other"
}

Return ONLY the JSON object.`;

class CactusService {
  private cactus: CactusLM | null = null;
  private modelState: CactusModelState = {
    isDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    isInitialized: false,
  };

  private initializeCactus() {
    if (!this.cactus) {
      this.cactus = new CactusLM({ model: CAPTURA_MODEL });
    }
  }

  async downloadModel(onProgress?: (progress: number) => void): Promise<void> {
    if (this.modelState.isDownloaded || this.modelState.isDownloading) {
      return;
    }

    this.initializeCactus();
    this.modelState.isDownloading = true;
    this.modelState.downloadProgress = 0;

    try {
      // Download model - this also initializes it according to the docs
      await this.cactus!.download();

      this.modelState.isDownloaded = true;
      this.modelState.isInitialized = true; // download() also initializes
      this.modelState.isDownloading = false;
      this.modelState.downloadProgress = 1.0;
    } catch (error) {
      this.modelState.isDownloading = false;
      this.modelState.downloadProgress = 0;
      throw new Error(`Model download failed: ${error}`);
    }
  }

  async initializeModel(): Promise<void> {
    // According to the docs, download() handles initialization
    if (!this.modelState.isDownloaded) {
      await this.downloadModel();
    }
  }

  async analyzePhoto(photoUri: string): Promise<PhotoAnalysis> {
    if (!this.cactus || !this.modelState.isInitialized) {
      throw new Error('Model not initialized. Please initialize the model first.');
    }

    try {
      // Use the vision capability following the official docs pattern
      const result = await this.cactus.complete({
        messages: [{
          role: 'user',
          content: CAPTURA_PROMPT,
          images: [photoUri] // Image URI for vision analysis
        }]
      });

      const cleanResponse = result.response.trim();
      let analysis: PhotoAnalysis;

      try {
        // Parse the JSON response
        analysis = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', cleanResponse);
        
        // Try to extract JSON from response if it has extra text
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            throw new Error('Failed to parse analysis response as JSON');
          }
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      if (!this.validateAnalysis(analysis)) {
        throw new Error('Invalid analysis response format');
      }

      return analysis;
    } catch (error) {
      console.error('Photo analysis error:', error);
      throw error;
    }
  }

  private validateAnalysis(analysis: any): analysis is PhotoAnalysis {
    return (
      analysis &&
      typeof analysis === 'object' &&
      ['indoor', 'outdoor'].includes(analysis.scene) &&
      Array.isArray(analysis.objects) &&
      analysis.objects.length <= 3 &&
      typeof analysis.hasPeople === 'boolean' &&
      ['good', 'blurry'].includes(analysis.quality) &&
      ['home', 'work', 'nature', 'social', 'other'].includes(analysis.setting)
    );
  }

  async resetModel(): Promise<void> {
    // Reset functionality if needed - check if this method exists in the API
    if (this.cactus && this.modelState.isInitialized) {
      // Note: Check if reset() method exists in the official API
      try {
        // await this.cactus.reset(); // Uncomment if available
      } catch (error) {
        console.warn('Reset method not available or failed:', error);
      }
    }
  }

  async destroyModel(): Promise<void> {
    // Clean up resources
    if (this.cactus && this.modelState.isInitialized) {
      this.cactus = null;
      this.modelState.isInitialized = false;
      this.modelState.isDownloaded = false;
    }
  }

  getModelState(): CactusModelState {
    return { ...this.modelState };
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new CactusService();