import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Modal, Pressable, PermissionsAndroid, Platform, Alert, Linking, IntentLauncherAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getRecentExpenses, getWalletTotals, getCategoryTotals } from '../../utils/database';
import FamilywalletNativeModule from '../../../modules/familywallet-native/src/FamilywalletNativeModule';

export default function Home() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [totals, setTotals] = useState({ sharedTotal: 0, privateTotal: 0 });
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [fabOpen, setFabOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const tx = await getRecentExpenses(db, 5);
        setRecentTx(tx);
        const t = await getWalletTotals(db);
        setTotals(t);
        const stats = await getCategoryTotals(db);
        setCategoryStats(stats as any[]);
        
        // Dynamic Review Queue Count
        try {
          const res: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM review_queue WHERE status = 'Pending'");
          setReviewCount(res?.count || 0);
        } catch(e) {}
      };
      loadData();
    }, [db])
  );

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          ]);
          
          if (granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED) {
            // Prompt for Notification Service
            Alert.alert(
              "Enable Auto-Detect",
              "To auto-detect expenses from GPay/PhonePe/Swiggy notifications, please allow Notification Access for FamilyWallet in the next screen.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Allow", 
                  onPress: () => {
                    FamilywalletNativeModule.openNotificationSettings();
                  }
                }
              ]
            );
          }
        } catch (err) {
          console.warn(err);
        }
      }
    }
    requestPermissions();
  }, []);

  const getIconForCategory = (cat: string) => {
    const map: any = { Food: 'fast-food', Groceries: 'cart', Recharge: 'phone-portrait', DTH: 'tv', Shopping: 'bag', Utilities: 'flash', Rent: 'home', Fuel: 'car', Medicine: 'medkit', Education: 'school', Travel: 'airplane' };
    return map[cat] || 'receipt';
  };

  const getColorForCategory = (cat: string) => {
    const map: any = { Food: '#ef4444', Groceries: '#f59e0b', Recharge: '#3b82f6', DTH: '#8b5cf6', Shopping: '#ec4899', Utilities: '#06b6d4', Rent: '#14b8a6', Fuel: '#f97316', Medicine: '#10b981', Education: '#6366f1', Travel: '#0ea5e9' };
    return map[cat] || '#64748b';
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 10, 40) }]} showsVerticalScrollIndicator={false}>
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

        {/* Feature Links */}
        <View style={styles.featureLinksRow}>
          <TouchableOpacity style={[styles.featureBtn, isDark ? styles.cardDark : styles.cardLight]} onPress={() => router.push('/review-inbox')}>
            <View style={[styles.featureIconBox, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="mail-unread" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.featureBtnText, isDark ? styles.textLight : styles.textDark]}>Review Inbox</Text>
            {reviewCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{reviewCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.featureBtn, isDark ? styles.cardDark : styles.cardLight]} onPress={() => router.push('/budgets')}>
            <View style={[styles.featureIconBox, { backgroundColor: '#3b82f620' }]}>
              <Ionicons name="pie-chart" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.featureBtnText, isDark ? styles.textLight : styles.textDark]}>Budgets</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Quick Stats</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          {categoryStats.length === 0 ? (
            <View style={[styles.statChip, isDark ? styles.cardDark : styles.cardLight]}>
              <Text style={{color: '#9ca3af'}}>No data yet</Text>
            </View>
          ) : (
            categoryStats.map((stat, i) => {
              const color = getColorForCategory(stat.category);
              return (
                <View key={i} style={[styles.statChip, isDark ? styles.cardDark : styles.cardLight]}>
                  <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                    <Ionicons name={getIconForCategory(stat.category)} size={16} color={color} />
                  </View>
                  <View>
                    <Text style={[styles.statCatName, isDark ? styles.textLight : styles.textDark]}>{stat.category}</Text>
                    <Text style={styles.statCatAmount}>₹{stat.total.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/expenses')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>

        <View style={[styles.transactionsCard, isDark ? styles.cardDark : styles.cardLight]}>
          {recentTx.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No recent transactions.</Text>
          ) : (
            recentTx.map(tx => {
              const icon = getIconForCategory(tx.category);
              const color = getColorForCategory(tx.category);
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

      {/* FAB Modal Overlay */}
      <Modal visible={fabOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFabOpen(false)}>
          <View style={styles.fabMenu}>
            <FabMenuItem icon="scan" color="#8b5cf6" label="Scan Receipt" onPress={() => { setFabOpen(false); alert('Receipt Scanner coming in V2'); }} />
            <FabMenuItem icon="cart" color="#f59e0b" label="Add Grocery" onPress={() => { setFabOpen(false); router.push({ pathname: '/add-expense', params: { category: 'Groceries' }}); }} />
            <FabMenuItem icon="fast-food" color="#ef4444" label="Add Food" onPress={() => { setFabOpen(false); router.push({ pathname: '/add-expense', params: { category: 'Food' }}); }} />
            <FabMenuItem icon="phone-portrait" color="#3b82f6" label="Add Recharge" onPress={() => { setFabOpen(false); router.push({ pathname: '/add-expense', params: { category: 'Recharge' }}); }} />
            <FabMenuItem icon="add" color="#10b981" label="Custom Expense" onPress={() => { setFabOpen(false); router.push('/add-expense'); }} />
          </View>
        </Pressable>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setFabOpen(true)}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

function FabMenuItem({ icon, color, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.fabMenuItem} onPress={onPress}>
      <Text style={styles.fabMenuLabel}>{label}</Text>
      <View style={[styles.fabMenuIconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
    </TouchableOpacity>
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
  lightBg: { backgroundColor: '#f8fafc' },
  darkBg: { backgroundColor: '#0f172a' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 16, color: '#6b7280', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: '800' },
  profileBtn: { padding: 4 },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#0f172a' },
  walletsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 24 },
  card: { flex: 1, padding: 20, borderRadius: 24, elevation: 12, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
  familyCard: { backgroundColor: '#10b981' },
  personalCard: { backgroundColor: '#0f766e' }, // Deep teal instead of orange for a more cohesive premium look
  cardIcon: { marginBottom: 12 },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  cardAmount: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  
  featureLinksRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  featureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  featureIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  featureBtnText: { fontSize: 14, fontWeight: '700', flex: 1 },
  badgeCount: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  seeAll: { color: '#10b981', fontWeight: '600' },
  statsScroll: { marginBottom: 32, overflow: 'visible' },
  statChip: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingRight: 24, borderRadius: 16, marginRight: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  statIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  statCatName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  statCatAmount: { fontSize: 15, fontWeight: '800', color: '#10b981' },
  transactionsCard: { borderRadius: 24, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  cardLight: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9' },
  cardDark: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#f1f5f9' },
  borderDark: { borderBottomColor: '#334155' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'flex-end', paddingBottom: 100, paddingRight: 32 },
  fabMenu: { alignItems: 'flex-end', gap: 16 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fabMenuLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  fabMenuIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
