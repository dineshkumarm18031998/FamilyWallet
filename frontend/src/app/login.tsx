import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { setSession } from '../utils/database';
import { supabase } from '../utils/supabaseClient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (email.length > 5 && password.length >= 6) {
      setLoading(true);
      try {
        const { error, data } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (error) {
          Alert.alert('Login Failed', error.message);
        } else {
          // Sync local SQLite session state
          await setSession(db, data.session?.access_token || 'supabase_token');
          router.replace('/(tabs)');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to login');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (email.length < 5) {
      Alert.alert('Required', 'Please enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check Email', 'A password reset link has been sent to your email.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="wallet" size={80} color="#10b981" />
          <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
            Family<Text style={styles.highlight}>Wallet</Text>
          </Text>
          <Text style={styles.subtitle}>Smart expense sharing for families</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Email Address</Text>
          <TextInput
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            placeholder="Enter your email"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Password</Text>
          <TextInput
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={styles.forgotPasswordContainer} 
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, email.length > 5 && password.length >= 6 ? styles.buttonActive : styles.buttonInactive]} 
          onPress={handleLogin}
          disabled={email.length <= 5 || password.length < 6 || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/register' as any)}>
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.registerHighlight}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f9fafb' },
  darkBg: { backgroundColor: '#111827' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 36, fontWeight: '800', marginTop: 16, letterSpacing: -1 },
  highlight: { color: '#f97316' }, 
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 8 },
  textDark: { color: '#1f2937' },
  textLight: { color: '#f3f4f6' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  inputLight: { borderColor: '#d1d5db', backgroundColor: '#ffffff', color: '#1f2937' },
  inputDark: { borderColor: '#374151', backgroundColor: '#1f2937', color: '#f3f4f6' },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonActive: { backgroundColor: '#10b981' }, 
  buttonInactive: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  registerLink: { marginTop: 32, alignItems: 'center' },
  registerText: { fontSize: 15, color: '#6b7280' },
  registerHighlight: { color: '#10b981', fontWeight: '700' },
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotPasswordText: { color: '#10b981', fontSize: 14, fontWeight: '600' }
});
