import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useColorScheme, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { addExpense } from '../utils/database';

export default function AddExpenseModal() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('Shared'); // 'Shared' or 'Private'
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount || !merchant || !category) return;
    setLoading(true);
    try {
      await addExpense(db, parseFloat(amount), merchant, category, visibility, notes);
      router.back();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, isDark ? styles.borderDark : styles.borderLight]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Add Expense</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#10b981" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <Text style={[styles.currencySymbol, isDark ? styles.textLight : styles.textDark]}>₹</Text>
          <TextInput
            style={[styles.amountInput, isDark ? styles.textLight : styles.textDark]}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
          />
        </View>

        {/* Merchant Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Merchant</Text>
          <View style={[styles.inputWrapper, isDark ? styles.inputWrapperDark : styles.inputWrapperLight]}>
            <Ionicons name="storefront-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isDark ? styles.textLight : styles.textDark]}
              placeholder="e.g. Swiggy, Blinkit"
              placeholderTextColor="#9ca3af"
              value={merchant}
              onChangeText={setMerchant}
            />
          </View>
        </View>

        {/* Category Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Category</Text>
          <View style={[styles.inputWrapper, isDark ? styles.inputWrapperDark : styles.inputWrapperLight]}>
            <Ionicons name="pricetag-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isDark ? styles.textLight : styles.textDark]}
              placeholder="e.g. Food, Groceries"
              placeholderTextColor="#9ca3af"
              value={category}
              onChangeText={setCategory}
            />
          </View>
        </View>

        {/* Visibility Toggle */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Visibility</Text>
          <View style={styles.visibilityToggle}>
            <TouchableOpacity 
              style={[styles.toggleBtn, visibility === 'Shared' ? styles.toggleActiveShared : null]}
              onPress={() => setVisibility('Shared')}
            >
              <Ionicons name="people" size={18} color={visibility === 'Shared' ? '#ffffff' : '#6b7280'} />
              <Text style={[styles.toggleText, visibility === 'Shared' ? styles.textWhite : null]}>Family Shared</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.toggleBtn, visibility === 'Private' ? styles.toggleActivePrivate : null]}
              onPress={() => setVisibility('Private')}
            >
              <Ionicons name="lock-closed" size={18} color={visibility === 'Private' ? '#ffffff' : '#6b7280'} />
              <Text style={[styles.toggleText, visibility === 'Private' ? styles.textWhite : null]}>Private</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Notes (Optional)</Text>
          <View style={[styles.inputWrapper, isDark ? styles.inputWrapperDark : styles.inputWrapperLight, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
            <Ionicons name="document-text-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isDark ? styles.textLight : styles.textDark, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Add details..."
              placeholderTextColor="#9ca3af"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f9fafb' },
  darkBg: { backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#e5e7eb' },
  borderDark: { borderBottomColor: '#374151' },
  cancelText: { fontSize: 16, color: '#6b7280' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#10b981' },
  title: { fontSize: 18, fontWeight: '700' },
  textDark: { color: '#1f2937' },
  textLight: { color: '#f3f4f6' },
  textWhite: { color: '#ffffff' },
  scrollContent: { padding: 24 },
  amountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  currencySymbol: { fontSize: 40, fontWeight: '600', marginRight: 8, color: '#9ca3af' },
  amountInput: { fontSize: 56, fontWeight: '800' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 56 },
  inputWrapperLight: { borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  inputWrapperDark: { borderColor: '#374151', backgroundColor: '#1f2937' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  visibilityToggle: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  toggleActiveShared: { backgroundColor: '#10b981', elevation: 2 },
  toggleActivePrivate: { backgroundColor: '#f97316', elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
});
