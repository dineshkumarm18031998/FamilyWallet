import { View, Text, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllExpenses } from '../../utils/database';

export default function Expenses() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [expenses, setExpenses] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const data = await getAllExpenses(db);
        setExpenses(data);
      };
      loadData();
    }, [db])
  );

  const renderItem = ({ item }: { item: any }) => {
    const iconMap: any = { Food: 'fast-food', Groceries: 'cart', Recharge: 'phone-portrait' };
    const colorMap: any = { Food: '#ef4444', Groceries: '#f59e0b', Recharge: '#3b82f6' };
    const icon = iconMap[item.category] || 'receipt';
    const color = colorMap[item.category] || '#10b981';
    
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.txItem, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={[styles.txIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.txDetails}>
          <Text style={[styles.txName, isDark ? styles.textLight : styles.textDark]}>{item.merchant}</Text>
          <View style={styles.txRow}>
            <Text style={styles.txDate}>{dateStr}</Text>
            <View style={[styles.badge, item.visibility === 'Shared' ? styles.badgeShared : styles.badgePrivate]}>
              <Text style={[styles.badgeText, item.visibility === 'Shared' ? styles.badgeTextShared : styles.badgeTextPrivate]}>{item.visibility}</Text>
            </View>
          </View>
          {item.notes ? <Text style={styles.txNotes}>{item.notes}</Text> : null}
        </View>
        <Text style={[styles.txAmount, { color: '#ef4444' }]}>-₹{item.amount.toLocaleString('en-IN')}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>All Expenses</Text>
      </View>
      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses recorded yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  header: { padding: 20, paddingTop: 60, backgroundColor: 'transparent' },
  title: { fontSize: 28, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  listContent: { padding: 20, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, backgroundColor: 'transparent' },
  borderLight: { borderBottomColor: '#e5e7eb' },
  borderDark: { borderBottomColor: '#374151' },
  txIconContainer: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txDetails: { flex: 1 },
  txName: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 13, color: '#9ca3af' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeShared: { backgroundColor: '#10b98120' },
  badgePrivate: { backgroundColor: '#f9731620' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextShared: { color: '#10b981' },
  badgeTextPrivate: { color: '#f97316' },
  txAmount: { fontSize: 16, fontWeight: '700' },
  txNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
});
