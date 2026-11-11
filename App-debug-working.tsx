import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [step, setStep] = React.useState(0);

  const testSteps = [
    'App Entry ✅',
    'Testing Navigation Import...',
    'Testing Cactus Import...',
    'Loading Full App...'
  ];

  React.useEffect(() => {
    if (step === 1) {
      // Test navigation import
      setTimeout(async () => {
        try {
          const { NavigationContainer } = await import('@react-navigation/native');
          console.log('Navigation import successful');
          setStep(2);
        } catch (error) {
          console.error('Navigation import failed:', error);
        }
      }, 1000);
    } else if (step === 2) {
      // Test Cactus import
      setTimeout(async () => {
        try {
          const { CactusLM } = await import('cactus-react-native');
          console.log('Cactus import successful');
          setStep(3);
        } catch (error) {
          console.error('Cactus import failed:', error);
        }
      }, 1000);
    }
  }, [step]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌵 Captura Debug</Text>
      <Text style={styles.subtitle}>Entry Point Diagnosis</Text>
      
      {testSteps.slice(0, step + 1).map((test, index) => (
        <Text key={index} style={styles.test}>
          {test}
        </Text>
      ))}
      
      {step === 0 && (
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => setStep(1)}
        >
          <Text style={styles.buttonText}>Start Tests</Text>
        </TouchableOpacity>
      )}
      
      {step === 3 && (
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => {
            // Load full app
            console.log('Ready to load full app!');
          }}
        >
          <Text style={styles.buttonText}>App Components Ready!</Text>
        </TouchableOpacity>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  test: {
    fontSize: 16,
    color: '#333',
    marginVertical: 5,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});