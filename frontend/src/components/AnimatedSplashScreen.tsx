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
    // Fade in the logo
    opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) });
    // Scale up the logo with a bounce
    scale.value = withTiming(1, { duration: 1000, easing: Easing.elastic(1.2) });

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
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const ringAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: bgOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
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

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827', // Premium dark background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's on top of everything
  },
  logoContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.6) / 2,
    borderWidth: 4,
    borderColor: '#10b981', // Emerald green loader
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: (width * 0.45) / 2, // Circular fit
    overflow: 'hidden',
  },
});
