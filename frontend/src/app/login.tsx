import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { setSession } from '../utils/database';
import { API_URL } from '../utils/apiConfig';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (phone.length >= 10 && password.length >= 6) {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          Alert.alert('Login Failed', data.error || 'Invalid credentials');
        } else {
          // Sync local SQLite session state with token returned by your API
          await setSession(db, data.token);

          // PULL SYNC: Download cloud data into local SQLite
          try {
            const pullRes = await fetch(`${API_URL}/sync/pull/${data.token}`);
            const pullData = await pullRes.json();
            if (pullData.success && pullData.data) {
              for (const exp of pullData.data) {
                await db.runAsync(
                  'INSERT OR REPLACE INTO expenses (id, amount, merchant, category, visibility, date, notes, source, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [exp.id, exp.amount, exp.merchant, exp.category, exp.visibility, exp.date, exp.notes, exp.source, 'Synced']
                );
              }
            }
          } catch(e) {
            console.warn("Pull sync failed", e);
          }

          router.replace('/(tabs)');
        }
      } catch (err: any) {
        Alert.alert('Error', 'Could not connect to the server. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    Alert.alert(
      'Forgot Password',
      'Password recovery is not yet supported via the API. Please contact the administrator.'
    );
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
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Mobile Number</Text>
          <TextInput
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            placeholder="Enter 10-digit number"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
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
          style={[styles.button, phone.length >= 10 && password.length >= 6 ? styles.buttonActive : styles.buttonInactive]} 
          onPress={handleLogin}
          disabled={phone.length < 10 || password.length < 6 || loading}
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
  lightBg: { backgroundColor: '#FAFAFA' },
  darkBg: { backgroundColor: '#0A0A0A' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 36, fontWeight: '900', marginTop: 16, letterSpacing: -1 },
  highlight: { color: '#f97316' }, 
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 8, fontWeight: '500' },
  textDark: { color: '#111827' },
  textLight: { color: '#ffffff' },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 60,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  inputLight: { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', color: '#111827' },
  inputDark: { borderColor: '#262626', backgroundColor: '#141414', color: '#ffffff' },
  button: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonActive: { backgroundColor: '#10b981' }, 
  buttonInactive: { backgroundColor: '#9ca3af', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  registerLink: { marginTop: 32, alignItems: 'center' },
  registerText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  registerHighlight: { color: '#10b981', fontWeight: '800' },
  forgotPasswordContainer: { alignItems: 'flex-end', marginBottom: 28, marginTop: -8 },
  forgotPasswordText: { color: '#10b981', fontSize: 14, fontWeight: '700' }
});
