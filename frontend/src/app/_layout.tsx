import { useEffect, useState } from 'react';
import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { initDB } from '../utils/database';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import { initializeSmsListener } from '../utils/smsListener';

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // Hide the native splash screen, which instantly reveals our custom AnimatedSplashScreen
        await SplashScreen.hideAsync();

        // Initialize SMS Background Listener
        initializeSmsListener(async (amount, merchant, rawText) => {
          console.log('Background SMS triggered an expense!', amount);
          try {
            await fetch('https://familywallet-production-a87d.up.railway.app/api/sync/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: 'user_123_temp', // fallback
                expenses: [{
                  amount,
                  merchant,
                  category: 'Auto-Detected',
                  visibility: 'Shared',
                  date: new Date().toISOString(),
                  notes: rawText,
                  source: 'Bank SMS'
                }]
              })
            });
            console.log('SMS Expense synced to cloud successfully!');
          } catch (e) {
            console.error('Failed to sync SMS expense', e);
          }
        });

      }
    }
    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SQLiteProvider databaseName="familywallet.db" onInit={initDB}>
          <Stack screenOptions={{ 
            headerShown: false,
            animation: 'fade', // Prevents violent sliding/flickering
            contentStyle: { backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb' }
          }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
          </Stack>
        </SQLiteProvider>
      </ThemeProvider>
      
      {!animationFinished && (
        <AnimatedSplashScreen onAnimationFinish={() => setAnimationFinished(true)} />
      )}
    </View>
  );
}
