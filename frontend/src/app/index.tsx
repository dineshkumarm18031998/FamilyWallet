import { Redirect } from 'expo-router';

export default function Index() {
  // For V1, we simply redirect to the login screen or tabs
  // A real app would check auth state here
  const isAuthenticated = false; // Mock state
  
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
