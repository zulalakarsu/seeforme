import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
  backgroundColor?: string;
  large?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = '#007AFF',
  backgroundColor = '#F8F9FA',
  large = false,
}) => {
  return (
    <View style={[
      styles.card, 
      { backgroundColor },
      large && styles.largeCard
    ]}>
      {icon && (
        <Text style={[styles.icon, { color }]}>{icon}</Text>
      )}
      
      <Text style={styles.title}>{title}</Text>
      
      <Text style={[
        styles.value, 
        { color },
        large && styles.largeValue
      ]}>
        {value}
      </Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  largeCard: {
    minHeight: 120,
    paddingVertical: 20,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  largeValue: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default StatCard;