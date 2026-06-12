import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getSession } from '../utils/database';

export default function Index() {
  const router = useRouter();
  const db = useSQLiteContext();
  
  useEffect(() => {
    async function checkAuth() {
      try {
        const userId = await getSession(db);
        if (userId) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      } catch (e) {
        console.error(e);
        router.replace('/login');
      }
    }
    checkAuth();
  }, [db]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
}
