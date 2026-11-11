import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationParamList, ProcessingProgress, AppError } from '../types';
import { useCactusContext } from '../context/CactusContext';
import processorService from '../services/processor';
import ProgressBar from '../components/ProgressBar';

type ScanningScreenNavigationProp = StackNavigationProp<NavigationParamList, 'Scanning'>;

interface Props {
  navigation: ScanningScreenNavigationProp;
}

const ScanningScreen: React.FC<Props> = ({ navigation }) => {
  const { analyzePhoto, isReady } = useCactusContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress>({
    current: 0,
    total: 5,
    percentage: 0,
  });
  const [currentPhotoName, setCurrentPhotoName] = useState<string>('');
  const [processingTime, setProcessingTime] = useState<string>('');
  const [canCancel, setCanCancel] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    startProcessing();
    startAnimations();

    return () => {
      if (isProcessing) {
        processorService.stopProcessing();
      }
    };
  }, []);

  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime.current;
        setProcessingTime(formatElapsedTime(elapsed));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const startAnimations = () => {
    const fadeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    fadeAnimation.start();
    pulseAnimation.start();
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    setCanCancel(true);
    startTime.current = Date.now();

    try {
      const result = await processorService.startProcessing(
        analyzePhoto, // Use the hook's analyze function
        {
          onProgress: (progressUpdate: ProcessingProgress) => {
            setProgress(progressUpdate);
            
            if (progressUpdate.currentPhotoUri) {
              const photoName = progressUpdate.currentPhotoUri.split('/').pop() || '';
              setCurrentPhotoName(photoName);
            }

            if (progressUpdate.percentage > 80) {
              setCanCancel(false);
            }
          },
          onPhotoComplete: (photoUri: string, analysis) => {
            const photoName = photoUri.split('/').pop() || '';
            console.log(`Completed: ${photoName}`, analysis ? '✅' : '❌');
          },
          onError: (error: AppError) => {
            console.error('Processing error:', error);
            handleProcessingError(error);
          },
        }
      );

      setTimeout(() => {
        navigation.navigate('Results', { results: result.results });
      }, 1000);

    } catch (error) {
      handleProcessingError(error as AppError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessingError = (error: AppError) => {
    let title = 'Processing Error';
    let message = error.message || 'An unknown error occurred during processing.';

    switch (error.type) {
      case 'permission':
        title = 'Permission Error';
        break;
      case 'model':
        title = 'AI Model Error';
        break;
      case 'processing':
        title = 'Analysis Error';
        break;
      case 'storage':
        title = 'Storage Error';
        break;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Try Again',
          onPress: () => navigation.replace('Welcome'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleCancel = () => {
    if (!canCancel) {
      Alert.alert(
        'Almost Done!',
        'Processing is nearly complete. Please wait a moment.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Cancel Analysis?',
      'Are you sure you want to stop the photo analysis? You can always start again later.',
      [
        {
          text: 'Keep Going',
          style: 'cancel',
        },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            processorService.stopProcessing();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatElapsedTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusMessage = (): string => {
    if (progress.current === 0) {
      return 'Preparing to analyze your photos...';
    }
    if (progress.percentage < 25) {
      return 'Getting started with analysis...';
    }
    if (progress.percentage < 50) {
      return 'Making good progress...';
    }
    if (progress.percentage < 75) {
      return 'More than halfway done...';
    }
    if (progress.percentage < 95) {
      return 'Almost finished...';
    }
    return 'Finalizing results...';
  };

  const estimatedTimeRemaining = () => {
    if (progress.current === 0) return '';
    
    const elapsed = Date.now() - startTime.current;
    const averageTimePerPhoto = elapsed / progress.current;
    const remaining = (progress.total - progress.current) * averageTimePerPhoto;
    
    if (remaining < 60000) {
      return `~${Math.ceil(remaining / 1000)}s remaining`;
    }
    return `~${Math.ceil(remaining / 60000)}m remaining`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.Text style={[styles.scanIcon, { opacity: fadeAnim }]}>
            🔍
          </Animated.Text>
        </Animated.View>
        <Text style={styles.title}>Analyzing Photos</Text>
        <Text style={styles.subtitle}>Using on-device AI • Privacy protected</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.progressSection}>
          <ProgressBar
            progress={progress.current}
            total={progress.total}
            percentage={progress.percentage}
            label={getStatusMessage()}
            color="#007AFF"
          />
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              Elapsed: {processingTime}
            </Text>
            <Text style={styles.timeText}>
              {estimatedTimeRemaining()}
            </Text>
          </View>
        </View>

        {currentPhotoName && (
          <View style={styles.currentPhotoSection}>
            <Text style={styles.currentPhotoLabel}>Currently processing:</Text>
            <Text style={styles.currentPhotoName} numberOfLines={1}>
              {currentPhotoName}
            </Text>
          </View>
        )}

        <View style={styles.privacyReminder}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Your photos are being analyzed on this device only.{'\n'}
            No data is sent to the cloud.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerNote}>
          Please keep the app open while processing...
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  scanIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  currentPhotoSection: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  currentPhotoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  currentPhotoName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  privacyReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  privacyIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default ScanningScreen;