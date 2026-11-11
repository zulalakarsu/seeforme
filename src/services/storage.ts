import AsyncStorage from '@react-native-async-storage/async-storage';
import { AggregatedResults, PhotoAnalysis } from '../types';

const STORAGE_KEYS = {
  ANALYSIS_RESULTS: '@captura:analysis_results',
  RAW_ANALYSES: '@captura:raw_analyses',
  LAST_SCAN_DATE: '@captura:last_scan_date',
  MODEL_STATE: '@captura:model_state',
  APP_VERSION: '@captura:app_version',
} as const;

interface StoredAnalysisSession {
  results: AggregatedResults;
  rawAnalyses: PhotoAnalysis[];
  scanDate: string;
  photoCount: number;
  processingTime?: number;
}

class StorageService {
  async saveAnalysisResults(
    results: AggregatedResults,
    rawAnalyses: PhotoAnalysis[],
    processingTime?: number
  ): Promise<void> {
    try {
      const session: StoredAnalysisSession = {
        results,
        rawAnalyses,
        scanDate: new Date().toISOString(),
        photoCount: results.totalPhotos,
        processingTime,
      };

      const promises = [
        AsyncStorage.setItem(STORAGE_KEYS.ANALYSIS_RESULTS, JSON.stringify(results)),
        AsyncStorage.setItem(STORAGE_KEYS.RAW_ANALYSES, JSON.stringify(rawAnalyses)),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_SCAN_DATE, new Date().toISOString()),
      ];

      await Promise.all(promises);
      console.log('Analysis results saved successfully');
    } catch (error) {
      console.error('Failed to save analysis results:', error);
      throw new Error('Failed to save analysis results to local storage');
    }
  }

  async loadAnalysisResults(): Promise<AggregatedResults | null> {
    try {
      const resultsString = await AsyncStorage.getItem(STORAGE_KEYS.ANALYSIS_RESULTS);
      
      if (!resultsString) {
        return null;
      }

      const results: AggregatedResults = JSON.parse(resultsString);
      return this.validateAnalysisResults(results) ? results : null;
    } catch (error) {
      console.error('Failed to load analysis results:', error);
      return null;
    }
  }

  async loadRawAnalyses(): Promise<PhotoAnalysis[]> {
    try {
      const rawAnalysesString = await AsyncStorage.getItem(STORAGE_KEYS.RAW_ANALYSES);
      
      if (!rawAnalysesString) {
        return [];
      }

      const rawAnalyses: PhotoAnalysis[] = JSON.parse(rawAnalysesString);
      return Array.isArray(rawAnalyses) ? rawAnalyses : [];
    } catch (error) {
      console.error('Failed to load raw analyses:', error);
      return [];
    }
  }

  async getLastScanDate(): Promise<Date | null> {
    try {
      const dateString = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SCAN_DATE);
      return dateString ? new Date(dateString) : null;
    } catch (error) {
      console.error('Failed to get last scan date:', error);
      return null;
    }
  }

  async clearAnalysisData(): Promise<void> {
    try {
      const keys = [
        STORAGE_KEYS.ANALYSIS_RESULTS,
        STORAGE_KEYS.RAW_ANALYSES,
        STORAGE_KEYS.LAST_SCAN_DATE,
      ];

      await AsyncStorage.multiRemove(keys);
      console.log('Analysis data cleared successfully');
    } catch (error) {
      console.error('Failed to clear analysis data:', error);
      throw new Error('Failed to clear analysis data');
    }
  }

  async saveModelState(isDownloaded: boolean): Promise<void> {
    try {
      const modelState = {
        isDownloaded,
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.MODEL_STATE, JSON.stringify(modelState));
    } catch (error) {
      console.error('Failed to save model state:', error);
    }
  }

  async getModelState(): Promise<{ isDownloaded: boolean; lastUpdated?: string } | null> {
    try {
      const stateString = await AsyncStorage.getItem(STORAGE_KEYS.MODEL_STATE);
      return stateString ? JSON.parse(stateString) : null;
    } catch (error) {
      console.error('Failed to get model state:', error);
      return null;
    }
  }

  async getStorageInfo(): Promise<{
    hasResults: boolean;
    lastScanDate: Date | null;
    photoCount: number;
  }> {
    try {
      const [results, lastScanDate] = await Promise.all([
        this.loadAnalysisResults(),
        this.getLastScanDate(),
      ]);

      return {
        hasResults: !!results,
        lastScanDate,
        photoCount: results?.totalPhotos || 0,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        hasResults: false,
        lastScanDate: null,
        photoCount: 0,
      };
    }
  }

  private validateAnalysisResults(results: any): results is AggregatedResults {
    return (
      results &&
      typeof results === 'object' &&
      typeof results.totalPhotos === 'number' &&
      typeof results.indoor === 'number' &&
      typeof results.outdoor === 'number' &&
      typeof results.withPeople === 'number' &&
      typeof results.blurry === 'number' &&
      Array.isArray(results.topObjects) &&
      results.byLocation &&
      typeof results.byLocation === 'object' &&
      typeof results.byLocation.home === 'number' &&
      typeof results.byLocation.work === 'number' &&
      typeof results.byLocation.nature === 'number' &&
      typeof results.byLocation.social === 'number' &&
      typeof results.byLocation.other === 'number'
    );
  }

  async exportData(): Promise<string> {
    try {
      const [results, rawAnalyses, lastScanDate] = await Promise.all([
        this.loadAnalysisResults(),
        this.loadRawAnalyses(),
        this.getLastScanDate(),
      ]);

      const exportData = {
        results,
        rawAnalyses,
        lastScanDate: lastScanDate?.toISOString(),
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Failed to export analysis data');
    }
  }
}

const storageService = new StorageService();
export default storageService;