import { useState, useEffect, useCallback } from 'react';
import { CactusLM } from 'cactus-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PhotoAnalysis, CactusModelState } from '../types';

const CAPTURA_MODEL = 'lfm2-vl-450m';
const MODEL_DOWNLOADED_KEY = `cactus_model_downloaded_${CAPTURA_MODEL}`;
const MODEL_PROGRESS_KEY = `cactus_model_progress_${CAPTURA_MODEL}`;

const CAPTURA_PROMPT = `Look at the image. Return this format:

{"scene":"indoor","setting":"home","hasPeople":false,"objects":["table","chair"],"quality":"good"}

Change the values to match what you see. Nothing else.`;

// Aggressive JSON extraction to handle complex model responses
const extractCleanJson = (rawResponse: string): string => {
  let text = rawResponse;
  
  // Remove code blocks and markers
  text = text.replace(/```json/g, '').replace(/```/g, '').replace(/<\|im_end\|>/g, '');
  
  // Remove HTML-like tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Look for clean JSON patterns, starting with the most specific
  const patterns = [
    // Perfect format: {"scene":"indoor","setting":"home","hasPeople":false,"objects":["table"],"quality":"good"}
    /\{\s*"scene"\s*:\s*"[^"]*"\s*,\s*"setting"\s*:\s*"[^"]*"\s*,\s*"hasPeople"\s*:\s*(true|false)\s*,\s*"objects"\s*:\s*\[[^\]]*\]\s*,\s*"quality"\s*:\s*"[^"]*"\s*\}/,
    
    // Good enough: any object with scene, setting, and quality
    /\{\s*"scene"\s*:\s*"[^"]*"[^}]*"setting"[^}]*"quality"\s*:\s*"[^"]*"[^}]*\}/,
    
    // Basic: just scene field
    /\{\s*"scene"\s*:\s*"[^"]*"[^}]*\}/,
    
    // Last resort: any simple object without nested structures
    /\{\s*"[^"]*"\s*:\s*"[^"]*"[^{}\[\]]*\}/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let jsonStr = match[0];
      
      // Aggressive cleaning for malformed JSON
      jsonStr = jsonStr
        .replace(/,\s*\}/g, '}')  // Remove trailing commas
        .replace(/,\s*\]/g, ']')  // Remove trailing commas in arrays
        .replace(/:\s*null/g, ': false')  // Convert null to false for booleans
        .replace(/\\_/g, '_')  // Fix escaped underscores
        .replace(/\\"/g, '"')  // Fix escaped quotes
        .replace(/\\'/g, "'")  // Fix escaped single quotes
        .replace(/"scene"\s*}\s*:\s*"([^"]*)"/, '"scene": "$1"')  // Fix malformed scene
        .replace(/"setting":\s*"([^"]*\/[^"]*)"/, (match, setting) => {
          // Fix slashed settings like "home/hotel/school"
          const firstSetting = setting.split('/')[0];
          return `"setting": "${firstSetting}"`;
        })
        .replace(/:\s*true\s*,\s*"quality":\s*true/g, ': true, "quality": "good"')
        .replace(/:\s*false\s*,\s*"quality":\s*false/g, ': false, "quality": "blurry"');
      
      return jsonStr;
    }
  }
  
  // If no pattern matches, return a minimal structure that will trigger fallback
  return '{"fallback": true}';
};

// Smart text extraction for fallback analysis
const extractFromText = (text: string): PhotoAnalysis => {
  const lowerText = text.toLowerCase();
  
  return {
    scene: lowerText.includes('outdoor') || lowerText.includes('outside') ? 'outdoor' : 'indoor',
    setting: detectSetting(lowerText),
    hasPeople: lowerText.includes('people') || lowerText.includes('person') || lowerText.includes('individual') || lowerText.includes('woman') || lowerText.includes('man'),
    objects: extractObjects(lowerText),
    quality: lowerText.includes('blurry') || lowerText.includes('unclear') || lowerText.includes('dark') ? 'blurry' : 'good'
  };
};

const detectSetting = (text: string): 'home' | 'work' | 'nature' | 'social' | 'food' | 'travel' | 'other' => {
  if (text.includes('restaurant') || text.includes('dining') || text.includes('food') || text.includes('wine') || text.includes('meal')) return 'food';
  if (text.includes('office') || text.includes('work') || text.includes('desk') || text.includes('meeting')) return 'work';
  if (text.includes('party') || text.includes('gathering') || text.includes('social') || text.includes('event')) return 'social';
  if (text.includes('nature') || text.includes('park') || text.includes('outdoor') || text.includes('tree') || text.includes('grass')) return 'nature';
  if (text.includes('home') || text.includes('living room') || text.includes('bedroom') || text.includes('house')) return 'home';
  if (text.includes('travel') || text.includes('airport') || text.includes('hotel') || text.includes('vacation')) return 'travel';
  return 'other';
};

const extractObjects = (text: string): string[] => {
  const extractedObjects: string[] = [];
  
  // Enhanced object detection with more specific terms
  const commonObjects = [
    'desk', 'office', 'work', 'phone', 'laptop', 'computer', 'monitor', 'keyboard',
    'table', 'chair', 'sofa', 'couch', 'bed', 'lamp', 'light', 'window', 'door',
    'wine', 'glass', 'bottle', 'cup', 'plate', 'food', 'meal', 'restaurant',
    'car', 'bike', 'tree', 'flower', 'plant', 'garden', 'park', 'nature',
    'book', 'paper', 'pen', 'tv', 'screen', 'camera', 'mirror', 'picture', 'photo',
    'woman', 'man', 'person', 'people', 'child', 'baby', 'family',
    'dog', 'cat', 'pet', 'animal', 'horse', 'bird',
    'building', 'house', 'room', 'kitchen', 'bathroom', 'bedroom',
    'sky', 'grass', 'water', 'ocean', 'lake', 'mountain', 'road', 'street', 'sign'
  ];
  
  for (const obj of commonObjects) {
    if (text.includes(obj)) {
      extractedObjects.push(obj);
      if (extractedObjects.length >= 3) break;
    }
  }
  
  return extractedObjects.length > 0 ? extractedObjects : ['items'];
};

interface UseCactusLMReturn {
  cactus: CactusLM | null;
  modelState: CactusModelState;
  downloadModel: (onProgress?: (progress: number) => void) => Promise<void>;
  analyzePhoto: (photoUri: string) => Promise<PhotoAnalysis>;
  isReady: boolean;
  error: string | null;
}

export const useCactusLM = (): UseCactusLMReturn => {
  const [cactus, setCactus] = useState<CactusLM | null>(null);
  const [modelState, setModelState] = useState<CactusModelState>({
    isDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    isInitialized: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize Cactus instance and check model status
  useEffect(() => {
    const initializeCactus = async () => {
      try {
        console.log('Initializing Cactus with model:', CAPTURA_MODEL);
        const cactusInstance = new CactusLM({ model: CAPTURA_MODEL });
        setCactus(cactusInstance);
        console.log('Cactus instance created successfully');

        // Check if model is already downloaded - first check local storage, then API
        try {
          console.log('Checking if model is already downloaded...');
          
          // First check our local storage record
          const [locallyDownloaded, savedProgress] = await Promise.all([
            AsyncStorage.getItem(MODEL_DOWNLOADED_KEY),
            AsyncStorage.getItem(MODEL_PROGRESS_KEY)
          ]);
          
          if (locallyDownloaded === 'true') {
            console.log('Model marked as downloaded locally, verifying...');
            
            // Initialize and verify the model actually works
            try {
              console.log('Initializing existing model...');
              await cactusInstance.init();
              console.log('Model initialization successful, verifying...');
              
              const testResult = await cactusInstance.complete({
                messages: [{
                  role: 'user',
                  content: 'test'
                }]
              });
              console.log('Local model verification successful');
              setModelState(prev => ({
                ...prev,
                isDownloaded: true,
                isInitialized: true,
                isDownloading: false,
                downloadProgress: 1.0,
              }));
              return; // Exit early, model is ready
            } catch (verifyError) {
              console.log('Local model verification failed, will re-download:', verifyError);
              await AsyncStorage.removeItem(MODEL_DOWNLOADED_KEY); // Clear invalid record
            }
          }
          
          // Fallback to API check if local storage doesn't indicate download
          const models = await cactusInstance.getModels();
          console.log('Available models from API:', models);
          
          const targetModel = models.find(m => m.slug === CAPTURA_MODEL);
          if (targetModel && targetModel.isDownloaded) {
            console.log('Model is downloaded according to API:', targetModel);
            
            // Initialize the existing downloaded model
            try {
              console.log('Initializing API-verified model...');
              await cactusInstance.init();
              console.log('Model initialization successful');
              
              // Save to local storage for future reference
              await AsyncStorage.setItem(MODEL_DOWNLOADED_KEY, 'true');
              setModelState(prev => ({
                ...prev,
                isDownloaded: true,
                isInitialized: true,
                isDownloading: false,
                downloadProgress: 1.0,
              }));
            } catch (initError) {
              console.error('Failed to initialize API-verified model:', initError);
              // Don't set as initialized if init fails
              setModelState(prev => ({
                ...prev,
                isDownloaded: false,
                isInitialized: false,
              }));
            }
          } else {
            console.log('Model not downloaded yet, will need to download');
            // Restore previous download progress if available
            if (savedProgress) {
              const progress = parseFloat(savedProgress);
              if (progress > 0 && progress < 1) {
                console.log(`Restoring previous download progress: ${Math.round(progress * 100)}%`);
                setModelState(prev => ({
                  ...prev,
                  downloadProgress: progress,
                }));
              }
            }
          }
        } catch (err) {
          console.log('Could not check model status, checking local storage only:', err);
          // If API fails, only trust local storage if we have a record
          const locallyDownloaded = await AsyncStorage.getItem(MODEL_DOWNLOADED_KEY);
          if (locallyDownloaded === 'true') {
            console.log('Using local storage record, model should be downloaded');
            setModelState(prev => ({
              ...prev,
              isDownloaded: true,
              isInitialized: true,
              isDownloading: false,
              downloadProgress: 1.0,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to initialize Cactus:', err);
        setError(`Failed to initialize Cactus: ${err}`);
      }
    };

    if (!cactus) {
      initializeCactus();
    }

    return () => {
      // Cleanup if needed
      setCactus(null);
    };
  }, []);

  const downloadModelWithRetry = useCallback(async (retryCount = 0, maxRetries = 3) => {
    const downloadPromise = cactus!.download();
    const timeoutMs = 60000 + (retryCount * 30000); // 1 min, 1.5 min, 2 min timeouts
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Download timeout (attempt ${retryCount + 1}/${maxRetries + 1})`)), timeoutMs);
    });
    
    try {
      await Promise.race([downloadPromise, timeoutPromise]);
      return true; // Success
    } catch (error) {
      console.log(`Download attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount < maxRetries) {
        const delayMs = Math.min(5000 * Math.pow(2, retryCount), 30000); // 5s, 10s, 20s, max 30s
        console.log(`Retrying in ${delayMs/1000}s... (${retryCount + 1}/${maxRetries})`);
        
        setError(`Download failed, retrying in ${Math.round(delayMs/1000)}s... (attempt ${retryCount + 2}/${maxRetries + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return await downloadModelWithRetry(retryCount + 1, maxRetries);
      } else {
        throw new Error(`Download failed after ${maxRetries + 1} attempts. Please check your internet connection.`);
      }
    }
  }, [cactus]);

  const downloadModel = useCallback(async (onProgress?: (progress: number) => void) => {
    console.log('downloadModel called, current state:', { 
      hasCactus: !!cactus, 
      isDownloaded: modelState.isDownloaded, 
      isDownloading: modelState.isDownloading 
    });

    if (!cactus) {
      setError('Cactus not initialized');
      console.error('Cactus not initialized when trying to download');
      return;
    }

    if (modelState.isDownloaded) {
      console.log('Model already downloaded, skipping');
      return;
    }

    if (modelState.isDownloading) {
      console.log('Model already downloading, skipping');
      return;
    }

    setModelState(prev => ({ ...prev, isDownloading: true }));
    setError(null);
    console.log('Starting model download...');

    try {
      // Download the model with simulated progress - this also initializes it according to the docs
      console.log('Calling cactus.download()...');
      
      // Start progress simulation with resume support
      const progressInterval = setInterval(async () => {
        setModelState(prev => {
          if (prev.downloadProgress < 0.95) { // Stop at 95% until actual download completes
            const increment = Math.random() * 0.05 + 0.01; // Random progress 1-6%
            const newProgress = Math.min(prev.downloadProgress + increment, 0.95);
            
            // Save progress to storage
            AsyncStorage.setItem(MODEL_PROGRESS_KEY, newProgress.toString()).catch(console.error);
            
            return { ...prev, downloadProgress: newProgress };
          }
          return prev;
        });
      }, 1500); // Update every 1.5 seconds
      
      try {
        // Use retry logic with exponential backoff
        await downloadModelWithRetry();
        clearInterval(progressInterval);
        console.log('Model download completed, initializing...');
      } catch (downloadError) {
        clearInterval(progressInterval);
        throw downloadError;
      }

      // CRITICAL: Initialize the model after download
      try {
        console.log('Initializing model...');
        await cactus.init();
        console.log('Model initialization completed, verifying...');
      } catch (initError) {
        console.error('Model initialization failed:', initError);
        throw new Error(`Model initialization failed: ${initError}`);
      }

      // Verify the model is actually ready by testing it
      try {
        const testResult = await cactus.complete({
          messages: [{
            role: 'user',
            content: 'test'
          }]
        });
        console.log('Model verification successful, ready to use');
        
        // Save successful download to local storage and clear progress
        await Promise.all([
          AsyncStorage.setItem(MODEL_DOWNLOADED_KEY, 'true'),
          AsyncStorage.removeItem(MODEL_PROGRESS_KEY) // Clear progress since download is complete
        ]);
        console.log('Model download record saved to local storage');
        
        setModelState(prev => ({
          ...prev,
          isDownloaded: true,
          isInitialized: true,
          isDownloading: false,
          downloadProgress: 1.0,
        }));
      } catch (verifyError) {
        console.error('Model verification failed:', verifyError);
        // Don't save to storage if verification failed
        throw new Error(`Model download completed but verification failed: ${verifyError}`);
      }
    } catch (err) {
      console.error('Model download failed with error:', err);
      setError(`Model download failed: ${err}`);
      setModelState(prev => ({
        ...prev,
        isDownloading: false,
        downloadProgress: 0,
      }));
      throw err;
    }
  }, [cactus, modelState.isDownloaded, modelState.isDownloading]);

  const validateAnalysis = (analysis: any): analysis is PhotoAnalysis => {
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
  };

  const analyzePhoto = useCallback(async (photoUri: string): Promise<PhotoAnalysis> => {
    console.log('analyzePhoto called with state:', {
      hasCactus: !!cactus,
      isInitialized: modelState.isInitialized,
      isDownloaded: modelState.isDownloaded,
      isReady: modelState.isDownloaded && modelState.isInitialized && !modelState.isDownloading
    });
    
    if (!cactus || !modelState.isInitialized) {
      console.error('Cannot analyze photo - missing cactus or not initialized:', {
        hasCactus: !!cactus,
        isInitialized: modelState.isInitialized
      });
      throw new Error('Model not initialized. Please download the model first.');
    }

    setError(null);

    try {
      // Use the vision capability following the official docs pattern
      const result = await cactus.complete({
        messages: [{
          role: 'user',
          content: CAPTURA_PROMPT,
          images: [photoUri] // Image URI for vision analysis
        }]
      });

      let rawResponse = result.response.trim();
      let analysis: PhotoAnalysis;

      // Aggressive JSON extraction for complex responses
      let jsonString = extractCleanJson(rawResponse);

      try {
        // Parse the cleaned JSON response
        const parsed = JSON.parse(jsonString);
        
        // Check if this is the fallback trigger
        if (parsed.fallback) {
          throw new Error('Fallback JSON detected');
        }
        
        analysis = parsed;
        
        // Fix boolean values that should be strings
        if (typeof analysis.quality === 'boolean') {
          analysis.quality = analysis.quality ? 'good' : 'blurry';
        }
        if (typeof analysis.setting === 'boolean') {
          analysis.setting = analysis.setting ? 'home' : 'other';
        }
        if (Array.isArray(analysis.setting)) {
          analysis.setting = analysis.setting[0] || 'other';
        }
        // Fix objects field if it's a string instead of array
        if (typeof analysis.objects === 'string') {
          const objectStr = analysis.objects;
          const objectArray = objectStr
            .split(/[,;]/)
            .map((obj: string) => obj.replace(/^\d+\.?\s*/, '').trim())
            .filter((obj: string) => obj && obj.length > 0)
            .slice(0, 3);
          analysis.objects = objectArray;
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', rawResponse);
        
        // Try multiple strategies to extract valid JSON
        let extractedJson = null;
        
        // Strategy 1: Find the first complete JSON object
        const jsonMatch = rawResponse.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (jsonMatch) {
          try {
            extractedJson = JSON.parse(jsonMatch[0]);
          } catch (e) {
            // Strategy 2: Clean response and extract JSON
            try {
              // Remove the end marker and everything after it
              let cleaned = rawResponse.replace(/<\|im_end\|>.*$/s, '');
              
              // Try to find and extract the main JSON object
              const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
              if (jsonMatch) {
                let jsonStr = jsonMatch[0];
                
                // Fix missing colons
                jsonStr = jsonStr.replace(/"hasPeople"(True|False)/g, '"hasPeople":$1');
                jsonStr = jsonStr.replace(/"hasPeople"(\s*)(true|false)/gi, '"hasPeople":$2');
                
                // Fix True/False to lowercase
                jsonStr = jsonStr.replace(/:\s*True/g, ':true');
                jsonStr = jsonStr.replace(/:\s*False/g, ':false');
                
                // Fix quality field if it's an object instead of string
                jsonStr = jsonStr.replace(/"quality":\s*\{\s*"good":\s*true\s*\}/, '"quality": "good"');
                jsonStr = jsonStr.replace(/"quality":\s*\{\s*"blurry":\s*true\s*\}/, '"quality": "blurry"');
                
                // Fix boolean values that should be strings
                jsonStr = jsonStr.replace(/"quality":\s*true/, '"quality": "good"');
                jsonStr = jsonStr.replace(/"quality":\s*false/, '"quality": "blurry"');
                jsonStr = jsonStr.replace(/"setting":\s*true/, '"setting": "home"');
                jsonStr = jsonStr.replace(/"setting":\s*false/, '"setting": "other"');
                
                // Fix arrays that should be strings
                jsonStr = jsonStr.replace(/"setting":\s*\[(.*?)\]/, (match, content) => {
                  const cleaned = content.replace(/"/g, '').trim();
                  return `"setting": "${cleaned}"`;
                });
                
                // Remove trailing commas
                jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                
                extractedJson = JSON.parse(jsonStr);
                
                // Post-process to fix any remaining issues
                if (extractedJson && typeof extractedJson === 'object') {
                  if (typeof extractedJson.quality === 'boolean') {
                    extractedJson.quality = extractedJson.quality ? 'good' : 'blurry';
                  }
                  if (typeof extractedJson.setting === 'boolean') {
                    extractedJson.setting = extractedJson.setting ? 'home' : 'other';
                  }
                  if (Array.isArray(extractedJson.setting)) {
                    extractedJson.setting = extractedJson.setting[0] || 'other';
                  }
                  // Fix objects field if it's a string instead of array
                  if (typeof extractedJson.objects === 'string') {
                    const objectStr = extractedJson.objects;
                    // Split by common delimiters and clean up
                    const objectArray = objectStr
                      .split(/[,;]/)
                      .map((obj: string) => obj.replace(/^\d+\.?\s*/, '').trim()) // Remove numbers
                      .filter((obj: string) => obj && obj.length > 0)
                      .slice(0, 3); // Limit to 3
                    extractedJson.objects = objectArray;
                  }
                }
              }
            } catch (e2) {
              console.error('JSON cleaning strategy failed:', e2);
            }
            
            // Strategy 3: Handle multiple JSON objects on separate lines
            if (!extractedJson && rawResponse.includes('}\n{')) {
              try {
                const lines = rawResponse.replace(/<\|im_end\|>.*$/s, '').split('\n');
                const jsonObj: any = {};
                
                for (const line of lines) {
                  const match = line.match(/\{.*\}/);
                  if (match) {
                    const partial = JSON.parse(match[0]);
                    Object.assign(jsonObj, partial);
                  }
                }
                
                if (Object.keys(jsonObj).length > 0) {
                  extractedJson = jsonObj;
                }
              } catch (e3) {
                console.error('Multi-line JSON strategy failed:', e3);
              }
            }
          }
        }
        
        if (extractedJson) {
          analysis = extractedJson;
        } else {
          // Fallback: intelligent text extraction
          console.warn('Using fallback text analysis due to JSON parsing failure');
          analysis = extractFromText(rawResponse);
        }
      }

      if (!validateAnalysis(analysis)) {
        throw new Error('Invalid analysis response format');
      }

      return analysis;
    } catch (err) {
      const errorMessage = `Photo analysis failed: ${err}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [cactus, modelState.isInitialized]);

  const isReady = modelState.isDownloaded && modelState.isInitialized && !modelState.isDownloading;

  return {
    cactus,
    modelState,
    downloadModel,
    analyzePhoto,
    isReady,
    error,
  };
};