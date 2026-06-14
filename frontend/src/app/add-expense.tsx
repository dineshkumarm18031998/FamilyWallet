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
  const [category, setCategory] = useState('Groceries');
  const [visibility, setVisibility] = useState('Shared'); // 'Shared' or 'Private'
  const [source, setSource] = useState('Manual');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const CATEGORIES = ['Groceries', 'Food', 'Recharge', 'DTH', 'Shopping', 'Utilities', 'Rent', 'Fuel', 'Medicine', 'Education', 'Travel', 'Other'];
  const SOURCES = ['Manual', 'SMS', 'Notification', 'OCR'];

  const handleSave = async () => {
    if (!amount || !merchant || !category) return;
    setLoading(true);
    try {
      await addExpense(db, parseFloat(amount), merchant, category, visibility, notes, source);
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

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.chip, category === cat ? styles.chipActive : (isDark ? styles.chipInactiveDark : styles.chipInactiveLight)]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat ? styles.chipTextActive : (isDark ? styles.textLight : styles.textDark)]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Source Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.textLight : styles.textDark]}>Source</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {SOURCES.map(src => (
              <TouchableOpacity 
                key={src} 
                style={[styles.chip, source === src ? styles.chipActive : (isDark ? styles.chipInactiveDark : styles.chipInactiveLight)]}
                onPress={() => setSource(src)}
              >
                <Text style={[styles.chipText, source === src ? styles.chipTextActive : (isDark ? styles.textLight : styles.textDark)]}>{src}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  lightBg: { backgroundColor: '#FAFAFA' },
  darkBg: { backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#F3F4F6' },
  borderDark: { borderBottomColor: '#262626' },
  cancelText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  saveText: { fontSize: 17, fontWeight: '800', color: '#10b981' },
  title: { fontSize: 20, fontWeight: '800' },
  textDark: { color: '#111827' },
  textLight: { color: '#ffffff' },
  textWhite: { color: '#ffffff' },
  scrollContent: { padding: 24 },
  amountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  currencySymbol: { fontSize: 40, fontWeight: '700', marginRight: 8, color: '#9ca3af' },
  amountInput: { fontSize: 56, fontWeight: '900' },
  inputGroup: { marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 60 },
  inputWrapperLight: { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  inputWrapperDark: { borderColor: '#262626', backgroundColor: '#141414' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '600' },
  visibilityToggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, gap: 8 },
  toggleActiveShared: { backgroundColor: '#10b981', elevation: 4, shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  toggleActivePrivate: { backgroundColor: '#3b82f6', elevation: 4, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#6b7280' },
  chipsScroll: { flexDirection: 'row', paddingVertical: 4 },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, marginRight: 12, borderWidth: 1 },
  chipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipInactiveLight: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  chipInactiveDark: { backgroundColor: '#141414', borderColor: '#262626' },
  chipText: { fontSize: 14, fontWeight: '700' },
  chipTextActive: { color: '#ffffff' },
});
