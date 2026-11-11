import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { NavigationParamList, AggregatedResults } from '../types';
import StatCard from '../components/StatCard';
import processorService from '../services/processor';
import storageService from '../services/storage';

type ResultsScreenNavigationProp = StackNavigationProp<NavigationParamList, 'Results'>;
type ResultsScreenRouteProp = RouteProp<NavigationParamList, 'Results'>;

interface Props {
  navigation: ResultsScreenNavigationProp;
  route: ResultsScreenRouteProp;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

const ResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { results } = route.params;
  const stats = processorService.getProcessingStats(results);

  const handleScanAgain = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Results',
      'This will permanently delete all analysis results. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await storageService.clearAnalysisData();
              Alert.alert(
                'Data Cleared',
                'All analysis results have been removed.',
                [{ text: 'OK', onPress: handleScanAgain }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getLocationIcon = (location: string): string => {
    const icons: Record<string, string> = {
      home: '🏠',
      work: '💼',
      nature: '🌿',
      social: '👥',
      other: '📍',
    };
    return icons[location] || '📍';
  };

  const formatDate = (): string => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>📊 Your Photo Insights</Text>
          <Text style={styles.subtitle}>Analysis completed on {formatDate()}</Text>
        </View>

        <View style={styles.summaryCard}>
          <StatCard
            title="Photos Analyzed"
            value={results.totalPhotos}
            icon="📷"
            color="#007AFF"
            large
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scene Analysis</Text>
        </View>
        
        <View style={styles.cardRow}>
          <View style={[styles.cardContainer, { width: cardWidth }]}>
            <StatCard
              title="Indoor Photos"
              value={`${stats.indoorPercentage}%`}
              subtitle={`${results.indoor} photos`}
              icon="🏠"
              color="#FF9500"
            />
          </View>
          <View style={[styles.cardContainer, { width: cardWidth }]}>
            <StatCard
              title="Outdoor Photos"
              value={`${stats.outdoorPercentage}%`}
              subtitle={`${results.outdoor} photos`}
              icon="🌅"
              color="#30D158"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Photo Details</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.cardContainer, { width: cardWidth }]}>
            <StatCard
              title="With People"
              value={`${stats.peoplePercentage}%`}
              subtitle={`${results.withPeople} photos`}
              icon="👥"
              color="#FF6B6B"
            />
          </View>
          <View style={[styles.cardContainer, { width: cardWidth }]}>
            <StatCard
              title="Good Quality"
              value={`${stats.qualityPercentage}%`}
              subtitle={`${results.totalPhotos - results.blurry} photos`}
              icon="✨"
              color="#34C759"
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Objects</Text>
        </View>

        <View style={styles.objectsCard}>
          {results.topObjects.length > 0 ? (
            results.topObjects.map((object, index) => (
              <View key={index} style={styles.objectRow}>
                <View style={styles.objectRank}>
                  <Text style={styles.objectRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.objectName}>{object}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noObjectsText}>No objects detected</Text>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Locations</Text>
        </View>

        <View style={styles.locationsGrid}>
          {Object.entries(results.byLocation).map(([location, count]) => (
            <View key={location} style={styles.locationCard}>
              <Text style={styles.locationIcon}>
                {getLocationIcon(location)}
              </Text>
              <Text style={styles.locationName}>
                {location.charAt(0).toUpperCase() + location.slice(1)}
              </Text>
              <Text style={styles.locationCount}>{count}</Text>
              <Text style={styles.locationPercentage}>
                {Math.round((count / results.totalPhotos) * 100)}%
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.privacyReminder}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            All analysis was performed on your device. No data was shared externally.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleScanAgain}
        >
          <Text style={styles.primaryButtonText}>Scan Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleClearData}
        >
          <Text style={styles.secondaryButtonText}>Clear Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
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
  summaryCard: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  cardContainer: {
    flex: 0,
  },
  objectsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  objectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  objectRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  objectRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  objectName: {
    fontSize: 16,
    color: '#1D1D1F',
    textTransform: 'capitalize',
  },
  noObjectsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  locationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  locationCard: {
    width: (width - 48) / 3,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  locationName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  locationCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  locationPercentage: {
    fontSize: 10,
    color: '#999',
  },
  privacyReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  privacyIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ResultsScreen;