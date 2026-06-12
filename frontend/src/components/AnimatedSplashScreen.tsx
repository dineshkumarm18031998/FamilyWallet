import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
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
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Logo is already visible from native splash. Fade in the ring.
    opacity.value = withTiming(1, { duration: 800 });

    // Start infinite rotation for the loading ring
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1, // infinite loop
      false
    );

    // Wait 2.5 seconds, then fade out the entire screen
    bgOpacity.value = withDelay(
      2500,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationFinish)();
        }
      })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      // Logo doesn't animate, it stays put while the ring spins
      opacity: 1,
      transform: [{ scale: 1 }],
    };
  });

  const ringAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ rotateZ: `${rotation.value}deg` }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: bgOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]} pointerEvents="none">
      <View style={styles.logoContainer}>
        {/* The spinning loading ring */}
        <Animated.View style={[styles.loaderRing, ringAnimatedStyle]} />
        
        {/* The center logo */}
        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, logoAnimatedStyle]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const LOGO_SIZE = 150;
const RING_SIZE = 180;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827', // Premium dark background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's on top of everything
  },
  logoContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: RING_SIZE / 2,
    borderWidth: 4,
    borderColor: '#10b981', // Emerald green loader
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2, // Circular fit
    overflow: 'hidden',
  },
});
