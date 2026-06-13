import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { setSession } from '../utils/database';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const db = useSQLiteContext();

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (phone.length >= 10 && password.length >= 6 && name.length >= 3) {
      setLoading(true);
      try {
        // Local offline registration fallback
        setTimeout(() => {
          router.replace('/login');
        }, 500);
      } catch (err) {
        Alert.alert('Error', 'Failed to register locally.');
      } finally {
        setLoading(false);
      }
    }
  };

  const isFormValid = phone.length >= 10 && password.length >= 6 && password === confirmPassword && name.length >= 2;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>
            Create Account
          </Text>
          <Text style={styles.subtitle}>Join FamilyWallet today</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Full Name</Text>
          <TextInput
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            placeholder="John Doe"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />
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
            placeholder="At least 6 characters"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Confirm Password</Text>
          <TextInput
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            placeholder="Re-type your password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, isFormValid ? styles.buttonActive : styles.buttonInactive]} 
          onPress={handleRegister}
          disabled={!isFormValid || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginHighlight}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f9fafb' },
  darkBg: { backgroundColor: '#111827' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  header: { marginBottom: 40, marginTop: 40 },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
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
    marginTop: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonActive: { backgroundColor: '#10b981' }, 
  buttonInactive: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  loginLink: { marginTop: 32, alignItems: 'center' },
  loginText: { fontSize: 15, color: '#6b7280' },
  loginHighlight: { color: '#10b981', fontWeight: '700' }
});
