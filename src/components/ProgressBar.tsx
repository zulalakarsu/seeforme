import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressBarProps {
  progress: number;
  total: number;
  percentage?: number;
  label?: string;
  showNumbers?: boolean;
  color?: string;
  backgroundColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  total,
  percentage,
  label,
  showNumbers = true,
  color = '#007AFF',
  backgroundColor = '#E5E5EA',
}) => {
  const progressPercentage = percentage || (progress / total) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, progressPercentage));

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <View style={[styles.progressContainer, { backgroundColor }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${clampedPercentage}%`,
              backgroundColor: color,
            }
          ]} 
        />
      </View>

      {showNumbers && (
        <View style={styles.numbersContainer}>
          <Text style={styles.progressText}>
            {Math.round(clampedPercentage)}%
          </Text>
          <Text style={styles.countText}>
            {progress} / {total}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  numbersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  countText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProgressBar;