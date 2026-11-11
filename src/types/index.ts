export interface PhotoAnalysis {
  scene: 'indoor' | 'outdoor';
  objects: string[];
  hasPeople: boolean;
  quality: 'good' | 'blurry';
  setting: 'home' | 'work' | 'nature' | 'social' | 'food' | 'travel' | 'other';
}

export interface AggregatedResults {
  totalPhotos: number;
  indoor: number;
  outdoor: number;
  withPeople: number;
  blurry: number;
  topObjects: string[];
  byLocation: {
    home: number;
    work: number;
    nature: number;
    social: number;
    food: number;
    travel: number;
    other: number;
  };
}

export interface ProcessingProgress {
  current: number;
  total: number;
  percentage: number;
  currentPhotoUri?: string;
}

export interface CactusModelState {
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isInitialized: boolean;
}

export interface AppError {
  type: 'permission' | 'model' | 'processing' | 'network' | 'storage';
  message: string;
  code?: string;
}

export type NavigationParamList = {
  Welcome: undefined;
  Scanning: undefined;
  Results: { results: AggregatedResults };
};