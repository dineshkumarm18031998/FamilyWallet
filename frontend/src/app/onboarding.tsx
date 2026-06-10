import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to FamilyWallet',
    description: 'Private Spending. Shared Household Intelligence. The modern way to track expenses together.',
    icon: 'wallet-outline'
  },
  {
    id: '2',
    title: 'Your Personal Wallet',
    description: 'Completely private. Visible only to you. Perfect for your personal shopping, food orders, and private expenses.',
    icon: 'person-outline'
  },
  {
    id: '3',
    title: 'The Family Wallet',
    description: 'Shared spending for the whole household. Track groceries, DTH, and rent automatically with your family members.',
    icon: 'people-outline'
  },
  {
    id: '4',
    title: 'Our Privacy Promise',
    description: '',
    icon: 'shield-checkmark-outline',
    bullets: [
      'No passwords ever stored',
      'No OTPs ever stored',
      'No card information stored',
      'You control what gets shared'
    ]
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (currentIndex + 1), animated: true });
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.iconCircle}>
              <Ionicons name={slide.icon as any} size={80} color="#10b981" />
            </View>
            <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
              {slide.title}
            </Text>
            {slide.description ? (
              <Text style={styles.description}>{slide.description}</Text>
            ) : null}
            
            {slide.bullets && (
              <View style={styles.bulletsContainer}>
                {slide.bullets.map((bullet, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <Text style={[styles.bulletText, isDark ? styles.textLight : styles.textDark]}>
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.nextIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkBg: {
    backgroundColor: '#0f172a',
  },
  lightBg: {
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  },
  textLight: {
    color: '#f8fafc',
  },
  textDark: {
    color: '#0f172a',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  bulletsContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bulletText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#10b981',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#cbd5e1',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  nextIcon: {
    marginLeft: 8,
  },
});
