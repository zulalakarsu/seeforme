import React, { createContext, useContext, ReactNode } from 'react';
import { useCactusLM } from '../hooks/useCactusLM';
import { CactusLM } from 'cactus-react-native';
import { PhotoAnalysis, CactusModelState } from '../types';

interface CactusContextType {
  cactus: CactusLM | null;
  modelState: CactusModelState;
  downloadModel: (onProgress?: (progress: number) => void) => Promise<void>;
  analyzePhoto: (photoUri: string) => Promise<PhotoAnalysis>;
  isReady: boolean;
  error: string | null;
}

const CactusContext = createContext<CactusContextType | undefined>(undefined);

export const CactusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cactusState = useCactusLM();

  return (
    <CactusContext.Provider value={cactusState}>
      {children}
    </CactusContext.Provider>
  );
};

export const useCactusContext = (): CactusContextType => {
  const context = useContext(CactusContext);
  if (context === undefined) {
    throw new Error('useCactusContext must be used within a CactusProvider');
  }
  return context;
};