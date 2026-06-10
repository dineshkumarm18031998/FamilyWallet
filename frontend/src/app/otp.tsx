import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function OTPScreen() {
  const { phone } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleVerify = () => {
    // For V1 local dev, accept '123456' or just any 6 digits
    if (otp.length === 6) {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#f3f4f6' : '#1f2937'} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Verify OTP</Text>
          <Text style={styles.subtitle}>Code sent to +91 {phone}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isDark ? styles.inputDark : styles.inputLight]}
            placeholder="• • • • • •"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            textAlign="center"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, otp.length === 6 ? styles.buttonActive : styles.buttonInactive]} 
          onPress={handleVerify}
          disabled={otp.length < 6}
        >
          <Text style={styles.buttonText}>Verify & Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.resendButton}>
          <Text style={styles.resendText}>Resend Code</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f9fafb' },
  darkBg: { backgroundColor: '#111827' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 48 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280' },
  textDark: { color: '#1f2937' },
  textLight: { color: '#f3f4f6' },
  inputContainer: { marginBottom: 32 },
  input: {
    height: 64,
    borderWidth: 2,
    borderRadius: 16,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
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
  buttonActive: { backgroundColor: '#10b981' },
  buttonInactive: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  resendButton: { marginTop: 24, alignItems: 'center' },
  resendText: { color: '#f97316', fontSize: 16, fontWeight: '600' }
});
