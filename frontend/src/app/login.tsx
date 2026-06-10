import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleLogin = () => {
    if (phone.length >= 10) {
      router.push({ pathname: '/otp', params: { phone } });
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

        <TouchableOpacity 
          style={[styles.button, phone.length >= 10 ? styles.buttonActive : styles.buttonInactive]} 
          onPress={handleLogin}
          disabled={phone.length < 10}
        >
          <Text style={styles.buttonText}>Get OTP</Text>
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
  highlight: { color: '#f97316' }, // Vibrant Orange
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 8 },
  textDark: { color: '#1f2937' },
  textLight: { color: '#f3f4f6' },
  inputContainer: { marginBottom: 24 },
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
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonActive: { backgroundColor: '#10b981' }, // Emerald Green
  buttonInactive: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
