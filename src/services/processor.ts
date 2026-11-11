import { PhotoAnalysis, AggregatedResults, ProcessingProgress, AppError } from '../types';
import cactusService from './cactus';
import photoService from './photos';
import storageService from './storage';

interface ProcessingCallbacks {
  onProgress?: (progress: ProcessingProgress) => void;
  onPhotoComplete?: (photoUri: string, analysis: PhotoAnalysis | null) => void;
  onError?: (error: AppError) => void;
}

class ProcessorService {
  private isProcessing = false;
  private shouldStop = false;

  async processBatch(
    photoUris: string[],
    analyzePhotoFn: (uri: string) => Promise<PhotoAnalysis>,
    callbacks?: ProcessingCallbacks
  ): Promise<{ results: AggregatedResults; rawAnalyses: PhotoAnalysis[] }> {
    if (this.isProcessing) {
      throw new Error('Processing already in progress');
    }

    this.isProcessing = true;
    this.shouldStop = false;

    const startTime = Date.now();
    const results: PhotoAnalysis[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < photoUris.length; i++) {
        if (this.shouldStop) {
          throw new Error('Processing stopped by user');
        }

        const photoUri = photoUris[i];
        const progress: ProcessingProgress = {
          current: i + 1,
          total: photoUris.length,
          percentage: ((i + 1) / photoUris.length) * 100,
          currentPhotoUri: photoUri,
        };

        callbacks?.onProgress?.(progress);

        try {
          if (!photoService.validatePhotoUri(photoUri)) {
            throw new Error('Invalid photo URI');
          }

          // Convert PhotoKit URI to file URI for Cactus SDK
          const fileUri = await photoService.convertToFileUri(photoUri);
          console.log(`Processing photo with URI: ${fileUri}`);

          const analysis = await analyzePhotoFn(fileUri);
          results.push(analysis);
          callbacks?.onPhotoComplete?.(photoUri, analysis);

          await this.sleep(100);

        } catch (error) {
          console.error(`Failed to process photo ${i + 1}:`, error);
          errors.push(`Photo ${i + 1}: ${error}`);
          callbacks?.onPhotoComplete?.(photoUri, null);

          if (errors.length > photoUris.length * 0.5) {
            throw new Error('Too many processing failures');
          }
        }
      }

      if (results.length === 0) {
        throw new Error('No photos were successfully analyzed');
      }

      const aggregatedResults = this.aggregateResults(results);
      const processingTime = Date.now() - startTime;

      await storageService.saveAnalysisResults(
        aggregatedResults,
        results,
        processingTime
      );

      console.log(`Processing completed: ${results.length}/${photoUris.length} photos analyzed`);
      console.log(`Processing time: ${(processingTime / 1000).toFixed(1)}s`);

      return {
        results: aggregatedResults,
        rawAnalyses: results,
      };

    } catch (error) {
      console.error('Batch processing error:', error);
      const appError: AppError = {
        type: 'processing' as const,
        message: error instanceof Error ? error.message : 'Unknown processing error',
      };
      callbacks?.onError?.(appError);
      throw appError;
    } finally {
      this.isProcessing = false;
      this.shouldStop = false;
    }
  }

  private aggregateResults(analyses: PhotoAnalysis[]): AggregatedResults {
    const totalPhotos = analyses.length;
    let indoor = 0;
    let outdoor = 0;
    let withPeople = 0;
    let blurry = 0;

    const locationCounts = {
      home: 0,
      work: 0,
      nature: 0,
      social: 0,
      food: 0,
      travel: 0,
      other: 0,
    };

    const objectFrequency: Record<string, number> = {};

    analyses.forEach(analysis => {
      if (analysis.scene === 'indoor') indoor++;
      else outdoor++;

      if (analysis.hasPeople) withPeople++;
      if (analysis.quality === 'blurry') blurry++;

      locationCounts[analysis.setting]++;

      analysis.objects.forEach(obj => {
        const normalizedObj = obj.toLowerCase().trim();
        if (normalizedObj) {
          objectFrequency[normalizedObj] = (objectFrequency[normalizedObj] || 0) + 1;
        }
      });
    });

    const topObjects = Object.entries(objectFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([obj]) => obj);

    return {
      totalPhotos,
      indoor,
      outdoor,
      withPeople,
      blurry,
      topObjects,
      byLocation: locationCounts,
    };
  }

  async startProcessing(
    analyzePhotoFn: (uri: string) => Promise<PhotoAnalysis>,
    callbacks?: ProcessingCallbacks
  ): Promise<{ results: AggregatedResults; rawAnalyses: PhotoAnalysis[] }> {
    try {
      const hasPermission = await photoService.checkPermissions();
      if (!hasPermission) {
        const granted = await photoService.requestPermissions();
        if (!granted) {
          throw {
            type: 'permission' as const,
            message: 'Camera roll access is required to analyze photos'
          } as AppError;
        }
      }

      // Model state checking is now handled by the useCactusLM hook
      // The analyzePhotoFn will only be available when the model is ready

      const photos = await photoService.getRecentPhotos(5);
      if (photos.length === 0) {
        throw {
          type: 'processing' as const,
          message: 'No photos found in camera roll'
        } as AppError;
      }

      const photoUris = photos.map(photo => photo.uri);
      
      return await this.processBatch(photoUris, analyzePhotoFn, callbacks);

    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      throw {
        type: 'processing' as const,
        message: error instanceof Error ? error.message : 'Unknown error'
      } as AppError;
    }
  }

  stopProcessing(): void {
    this.shouldStop = true;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  calculateEstimatedTime(photoCount: number): number {
    const averageTimePerPhoto = 2500;
    return photoCount * averageTimePerPhoto;
  }

  formatProcessingTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  }

  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getProcessingStats(results: AggregatedResults): {
    indoorPercentage: number;
    outdoorPercentage: number;
    peoplePercentage: number;
    qualityPercentage: number;
    topLocation: string;
  } {
    const total = results.totalPhotos;
    
    return {
      indoorPercentage: Math.round((results.indoor / total) * 100),
      outdoorPercentage: Math.round((results.outdoor / total) * 100),
      peoplePercentage: Math.round((results.withPeople / total) * 100),
      qualityPercentage: Math.round(((total - results.blurry) / total) * 100),
      topLocation: Object.entries(results.byLocation)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'home',
    };
  }
}

const processorService = new ProcessorService();
export default processorService;