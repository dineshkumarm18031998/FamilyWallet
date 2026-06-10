import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface Props {
  onAnimationFinish: () => void;
}

export default function AnimatedSplashScreen({ onAnimationFinish }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const bgOpacity = useSharedValue(1);

  useEffect(() => {
    // Fade in the logo
    opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
    // Scale up the logo with a bounce
    scale.value = withTiming(1, { duration: 1000, easing: Easing.elastic(1.2) });

    // Wait a moment, then fade out the entire screen
    bgOpacity.value = withDelay(
      2000,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationFinish)();
        }
      })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: bgOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.Image
        source={require('../../assets/images/logo.png')}
        style={[styles.logo, logoAnimatedStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff', // Clean white background for the logo
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's on top of everything
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
  },
});
