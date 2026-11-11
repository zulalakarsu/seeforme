import * as MediaLibrary from 'expo-media-library';
import { AppError } from '../types';

interface PhotoAsset {
  id: string;
  uri: string;
  filename: string;
  creationTime: number;
}

class PhotoService {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      throw {
        type: 'permission' as const,
        message: 'Failed to request camera roll permissions'
      } as AppError;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  async getRecentPhotos(count: number = 5): Promise<PhotoAsset[]> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        throw {
          type: 'permission' as const,
          message: 'Camera roll access not granted'
        } as AppError;
      }

      const albumResult = await MediaLibrary.getAssetsAsync({
        first: count,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      if (albumResult.assets.length === 0) {
        throw {
          type: 'processing' as const,
          message: 'No photos found in camera roll'
        } as AppError;
      }

      return albumResult.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename || `photo_${asset.id}`,
        creationTime: asset.creationTime || Date.now(),
      }));

    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        throw error;
      }
      
      console.error('Photo fetch error:', error);
      throw {
        type: 'processing' as const,
        message: 'Failed to fetch photos from camera roll'
      } as AppError;
    }
  }

  async getPhotoInfo(assetId: string): Promise<MediaLibrary.AssetInfo | null> {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
      return assetInfo;
    } catch (error) {
      console.error('Photo info error:', error);
      return null;
    }
  }

  async convertToFileUri(photoUri: string): Promise<string> {
    try {
      // If it's already a file URI, return as is
      if (photoUri.startsWith('file://')) {
        return photoUri;
      }

      // If it's a PhotoKit URI, convert it to file URI
      if (photoUri.startsWith('ph://')) {
        // Extract the asset ID from the PhotoKit URI
        const assetId = photoUri.split('/')[2];
        
        // Get asset info which includes the local URI
        const assetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
        
        if (assetInfo && assetInfo.localUri) {
          console.log(`Converted ${photoUri} to ${assetInfo.localUri}`);
          return assetInfo.localUri;
        } else {
          throw new Error(`Could not get local URI for asset ${assetId}`);
        }
      }

      // For other URI formats, try to use as is
      return photoUri;
    } catch (error) {
      console.error('URI conversion error:', error);
      throw new Error(`Failed to convert URI ${photoUri}: ${error}`);
    }
  }

  validatePhotoUri(uri: string): boolean {
    try {
      if (!uri || typeof uri !== 'string') {
        return false;
      }

      return uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('content://');
    } catch (error) {
      return false;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatCreationDate(timestamp: number): string {
    try {
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  }
}

const photoService = new PhotoService();
export default photoService;