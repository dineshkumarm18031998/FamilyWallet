import { View, Text, StyleSheet, FlatList, useColorScheme, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllExpenses, deleteExpense, updateExpense } from '../../utils/database';

export default function Expenses() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [expenses, setExpenses] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [mode, setMode] = useState<'My Wallet' | 'Family Wallet'>('My Wallet');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editVisibility, setEditVisibility] = useState('Private');

  const loadData = useCallback(async () => {
    const data = await getAllExpenses(db, mode);
    setExpenses(data);
    const { getSession } = await import('../../utils/database');
    const sid = await getSession(db);
    setCurrentUserId(sid || '');
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData, mode])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to permanently delete this transaction? This will instantly update your wallet totals.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteExpense(db, id);
            loadData();
          }
        }
      ]
    );
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditAmount(item.amount.toString());
    setEditMerchant(item.merchant);
    setEditCategory(item.category);
    setEditSubcategory(item.subcategory || '');
    setEditPaymentMethod(item.paymentMethod || '');
    setEditVisibility(item.visibility || 'Private');
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editAmount || !editMerchant || !editCategory) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Error", "Please enter a valid positive amount");
      return;
    }
    await updateExpense(db, editingItem.id, parsedAmount, editMerchant, editCategory, editSubcategory, editPaymentMethod, editVisibility);
    setEditModalVisible(false);
    loadData();
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconMap: Record<string, any> = { 
      Food: 'fast-food', Groceries: 'cart', Recharge: 'phone-portrait', DTH: 'tv', 
      Shopping: 'bag', Utilities: 'flash', Rent: 'home', Fuel: 'water', 
      Medicine: 'medkit', Education: 'school', Travel: 'airplane', Other: 'receipt' 
    };
    const colorMap: Record<string, string> = { 
      Food: '#ef4444', Groceries: '#f59e0b', Recharge: '#3b82f6', DTH: '#8b5cf6', 
      Shopping: '#ec4899', Utilities: '#eab308', Rent: '#14b8a6', Fuel: '#f97316', 
      Medicine: '#10b981', Education: '#6366f1', Travel: '#0ea5e9', Other: '#9ca3af' 
    };
    const icon = iconMap[item.category] || 'receipt';
    const color = colorMap[item.category] || '#10b981';
    
    const d = new Date(item.date);
    const dateStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return (
      <View style={[styles.txItem, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={[styles.txIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.txDetails}>
          <Text style={[styles.txName, isDark ? styles.textLight : styles.textDark]} numberOfLines={1}>{item.merchant}</Text>
          <View style={styles.txRow}>
            <Text style={styles.txDate}>{dateStr}</Text>
            {item.visibility === 'Shared' ? (
              <View style={[styles.badge, styles.badgeShared]}>
                <Text style={[styles.badgeText, styles.badgeTextShared]}>Shared</Text>
              </View>
            ) : item.userId !== currentUserId ? (
              <View style={[styles.badge, styles.badgePrivate, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Text style={[styles.badgeText, styles.badgeTextPrivate, { color: '#6366f1' }]}>Private (Shared by Permission)</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgePrivate]}>
                <Text style={[styles.badgeText, styles.badgeTextPrivate]}>Private</Text>
              </View>
            )}
          </View>
          {item.notes ? <Text style={styles.txNotes}>{item.notes}</Text> : null}
        </View>
        
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: '#ef4444' }]} numberOfLines={1} adjustsFontSizeToFit>-₹{item.amount.toLocaleString('en-IN')}</Text>
          {item.userId === currentUserId && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                <Ionicons name="pencil" size={16} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>All Expenses</Text>
      </View>

      <View style={[styles.toggleContainer, isDark ? styles.cardDark : styles.cardLight]}>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'My Wallet' && styles.toggleActive]} 
          onPress={() => setMode('My Wallet')}>
          <Text style={[styles.toggleText, mode === 'My Wallet' ? styles.textLight : (isDark ? styles.textLightMuted : styles.textDarkMuted)]}>My Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'Family Wallet' && styles.toggleActive]} 
          onPress={() => setMode('Family Wallet')}>
          <Text style={[styles.toggleText, mode === 'Family Wallet' ? styles.textLight : (isDark ? styles.textLightMuted : styles.textDarkMuted)]}>Shared Expenses</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses recorded yet.</Text>}
      />

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>Edit Transaction</Text>
            
            <Text style={[styles.inputLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Merchant</Text>
            <TextInput style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} value={editMerchant} onChangeText={setEditMerchant} />
            
            <Text style={[styles.inputLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Amount (₹)</Text>
            <TextInput style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" />
            
            <Text style={[styles.inputLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Category</Text>
            <TextInput style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} value={editCategory} onChangeText={setEditCategory} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Subcategory</Text>
                <TextInput style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} value={editSubcategory} onChangeText={setEditSubcategory} placeholder="Optional" placeholderTextColor="#9ca3af" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Payment Method</Text>
                <TextInput style={[styles.input, isDark ? styles.inputDark : styles.inputLight]} value={editPaymentMethod} onChangeText={setEditPaymentMethod} placeholder="Optional" placeholderTextColor="#9ca3af" />
              </View>
            </View>

            <Text style={[styles.inputLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Visibility</Text>
            <View style={styles.visibilityRow}>
              <Text style={[styles.visibilityText, editVisibility === 'Private' && styles.visibilityActive]}>Private</Text>
              <Switch
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor={'#ffffff'}
                onValueChange={(val) => setEditVisibility(val ? 'Shared' : 'Private')}
                value={editVisibility === 'Shared'}
                style={{ marginHorizontal: 8, transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              />
              <Text style={[styles.visibilityText, editVisibility === 'Shared' && styles.visibilityActive]}>Shared</Text>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#FAFAFA' },
  darkBg: { backgroundColor: '#0A0A0A' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: 'transparent' },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#111827' },
  textLightMuted: { color: '#9ca3af' },
  textDarkMuted: { color: '#6b7280' },
  
  toggleContainer: { flexDirection: 'row', borderRadius: 16, padding: 4, marginHorizontal: 24, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  toggleActive: { backgroundColor: '#3b82f6' },
  toggleText: { fontSize: 14, fontWeight: '700' },
  
  listContent: { padding: 24, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, backgroundColor: 'transparent' },
  borderLight: { borderBottomColor: '#F3F4F6' },
  borderDark: { borderBottomColor: '#262626' },
  txIconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txDetails: { flex: 1 },
  txName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeShared: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgePrivate: { backgroundColor: 'rgba(249, 115, 22, 0.15)' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  badgeTextShared: { color: '#10b981' },
  badgeTextPrivate: { color: '#f97316' },
  txRight: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' },
  txAmount: { fontSize: 17, fontWeight: '800', textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  actionBtn: { padding: 4 },
  txNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 24, borderRadius: 20, width: '100%' },
  cardLight: { backgroundColor: '#ffffff' },
  cardDark: { backgroundColor: '#1f2937' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  inputLight: { backgroundColor: '#f3f4f6', color: '#111827' },
  inputDark: { backgroundColor: '#374151', color: '#ffffff' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'flex-start' },
  visibilityText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  visibilityActive: { color: '#10b981', fontWeight: '800' },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#4b5563', alignItems: 'center' },
  saveBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontWeight: '700' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
