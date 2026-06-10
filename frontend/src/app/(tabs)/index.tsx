import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getRecentExpenses, getWalletTotals } from '../../utils/database';

export default function Home() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [totals, setTotals] = useState({ sharedTotal: 0, privateTotal: 0 });

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const tx = await getRecentExpenses(db, 5);
        setRecentTx(tx);
        const t = await getWalletTotals(db);
        setTotals(t);
      };
      loadData();
    }, [db])
  );

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, isDark ? styles.textLight : styles.textDark]}>Good Morning,</Text>
            <Text style={[styles.name, isDark ? styles.textLight : styles.textDark]}>Dinesh</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle" size={40} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Wallets */}
        <View style={styles.walletsContainer}>
          {/* Family Wallet */}
          <View style={[styles.card, styles.familyCard]}>
            <Ionicons name="people" size={24} color="#ffffff" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Family Wallet</Text>
            <Text style={styles.cardAmount}>₹{totals.sharedTotal.toLocaleString('en-IN')}</Text>
            <Text style={styles.cardSub}>Monthly Shared</Text>
          </View>

          {/* Personal Wallet */}
          <View style={[styles.card, styles.personalCard]}>
            <Ionicons name="person" size={24} color="#ffffff" style={styles.cardIcon} />
            <Text style={styles.cardLabel}>Personal Wallet</Text>
            <Text style={styles.cardAmount}>₹{totals.privateTotal.toLocaleString('en-IN')}</Text>
            <Text style={styles.cardSub}>Private Expenses</Text>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Recent Transactions</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>

        <View style={[styles.transactionsCard, isDark ? styles.cardDark : styles.cardLight]}>
          {recentTx.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No recent transactions.</Text>
          ) : (
            recentTx.map(tx => {
              const iconMap: any = { Food: 'fast-food', Groceries: 'cart', Recharge: 'phone-portrait' };
              const colorMap: any = { Food: '#ef4444', Groceries: '#f59e0b', Recharge: '#3b82f6' };
              const icon = iconMap[tx.category] || 'receipt';
              const color = colorMap[tx.category] || '#10b981';
              
              // Format date properly
              const d = new Date(tx.date);
              const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <TransactionItem 
                  key={tx.id}
                  icon={icon} 
                  color={color} 
                  name={tx.merchant} 
                  amount={`-₹${tx.amount.toLocaleString('en-IN')}`} 
                  date={dateStr} 
                  type={tx.visibility} 
                  isDark={isDark} 
                />
              )
            })
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/add-expense')}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

function TransactionItem({ icon, color, name, amount, date, type, isDark }: any) {
  return (
    <View style={[styles.txItem, isDark ? styles.borderDark : styles.borderLight]}>
      <View style={[styles.txIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txName, isDark ? styles.textLight : styles.textDark]}>{name}</Text>
        <View style={styles.txRow}>
          <Text style={styles.txDate}>{date}</Text>
          <View style={[styles.badge, type === 'Shared' ? styles.badgeShared : styles.badgePrivate]}>
            <Text style={[styles.badgeText, type === 'Shared' ? styles.badgeTextShared : styles.badgeTextPrivate]}>{type}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.txAmount, { color: '#ef4444' }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 16, color: '#6b7280', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: '800' },
  profileBtn: { padding: 4 },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  walletsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 32 },
  card: { flex: 1, padding: 20, borderRadius: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  familyCard: { backgroundColor: '#10b981' },
  personalCard: { backgroundColor: '#f97316' },
  cardIcon: { marginBottom: 12 },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  cardAmount: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  seeAll: { color: '#10b981', fontWeight: '600' },
  transactionsCard: { borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardLight: { backgroundColor: '#ffffff' },
  cardDark: { backgroundColor: '#1f2937' },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#f3f4f6' },
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
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
});
