import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { NavigationParamList } from '../types';
import { useCactusContext } from '../context/CactusContext';
import photoService from '../services/photos';
import storageService from '../services/storage';
import ProgressBar from '../components/ProgressBar';

type WelcomeScreenNavigationProp = StackNavigationProp<NavigationParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { modelState, downloadModel, isReady, error } = useCactusContext();
  const [hasExistingResults, setHasExistingResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      const [storageInfo, hasPermissions] = await Promise.all([
        storageService.getStorageInfo(),
        photoService.checkPermissions(),
      ]);

      setHasExistingResults(storageInfo.hasResults);

      if (isReady) {
        console.log('Model already ready');
      }
    } catch (error) {
      console.error('Failed to check initial state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = async () => {
    try {
      const hasPermission = await photoService.checkPermissions();
      if (!hasPermission) {
        const granted = await photoService.requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Camera roll access is required to analyze your photos. Please grant permission in Settings.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await setupModel();
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert(
        'Setup Error',
        'Failed to set up the AI model. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const setupModel = async () => {
    try {
      console.log('Setting up model, current isReady:', isReady);
      
      // Always try to download/verify the model to ensure it's properly initialized
      console.log('Starting model download/verification...');
      // Add a small delay to ensure cactus instance is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await downloadModel((progress) => {
        // Progress tracking is handled by the hook's internal state
        console.log(`Download progress: ${Math.round(progress * 100)}%`);
      });

      await storageService.saveModelState(true);
      console.log('Model setup completed successfully');

      navigation.navigate('Scanning');
    } catch (error) {
      console.error('Model setup error:', error);
      throw error;
    }
  };

  const handleViewResults = async () => {
    try {
      const results = await storageService.loadAnalysisResults();
      if (results) {
        navigation.navigate('Results', { results });
      } else {
        Alert.alert(
          'No Results Found',
          'No previous analysis results found. Please run a new scan.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      Alert.alert('Error', 'Failed to load previous results.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📷 Captura</Text>
        <Text style={styles.subtitle}>Privacy-First Photo Analysis</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>🔐 Your Privacy Matters</Text>
          <Text style={styles.privacyText}>
            • All processing happens on your device{'\n'}
            • No photos are uploaded to the cloud{'\n'}
            • Your data never leaves your phone{'\n'}
            • Powered by on-device AI
          </Text>
        </View>

        {modelState.isDownloading && (
          <View style={styles.downloadSection}>
            <Text style={styles.downloadTitle}>Downloading AI Model...</Text>
            <ProgressBar
              progress={modelState.downloadProgress * 100}
              total={100}
              label="Model Download"
              color="#007AFF"
            />
            <View style={styles.downloadDetails}>
              <Text style={styles.downloadProgress}>
                {Math.round(modelState.downloadProgress * 420)}MB of 420MB
              </Text>
              <Text style={styles.downloadPercent}>
                {Math.round(modelState.downloadProgress * 100)}%
              </Text>
            </View>
            <Text style={styles.downloadNote}>
              ✨ This happens once. Future launches will be instant!
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {!modelState.isDownloading && !error && (
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGetStarted}
            >
              <Text style={styles.primaryButtonText}>
                Start Analysis
              </Text>
            </TouchableOpacity>

            {hasExistingResults && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleViewResults}
              >
                <Text style={styles.secondaryButtonText}>
                  View Previous Results
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Cactus AI • Made with privacy in mind
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  privacySection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  downloadSection: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  downloadSize: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  downloadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginHorizontal: 4,
  },
  downloadProgress: {
    fontSize: 12,
    color: '#666',
  },
  downloadPercent: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  downloadNote: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorSection: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  errorText: {
    fontSize: 14,
    color: '#C53030',
    textAlign: 'center',
  },
  initSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 24,
  },
  initText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  buttonSection: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default WelcomeScreen;