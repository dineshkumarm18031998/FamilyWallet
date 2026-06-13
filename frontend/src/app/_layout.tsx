import { useEffect, useState, useRef } from 'react';
import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, View, AppState, Text } from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { initDB, getSession } from '../utils/database';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import { initializeNativeEngine } from '../utils/nativeBridge';

// Keep the native splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function BridgeInitializer({ children }: any) {
  const db = useSQLiteContext();
  useEffect(() => {
    initializeNativeEngine(db);
  }, [db]);
  return children;
}

function SecurityWrapper({ children }: any) {
  const db = useSQLiteContext();
  const [unlocked, setUnlocked] = useState(true);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground! Check if user is logged in
        const userId = await getSession(db);
        if (userId) {
          setUnlocked(false);
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock FamilyWallet',
            fallbackLabel: 'Use Passcode'
          });
          if (result.success) {
            setUnlocked(true);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [db]);

  if (!unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>FamilyWallet Locked</Text>
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
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
          <BridgeInitializer>
            <SecurityWrapper>
              <Stack screenOptions={{ 
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb' }
              }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="otp" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
              </Stack>
            </SecurityWrapper>
          </BridgeInitializer>
        </SQLiteProvider>
      </ThemeProvider>
      
      {!animationFinished && (
        <AnimatedSplashScreen onAnimationFinish={() => setAnimationFinished(true)} />
      )}
    </View>
  );
}
