import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Modal, Pressable, PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
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
              "FamilyWallet uses notification reading to securely track spending offline. We only look for food and recharge apps. Please enable 'FamilyWallet' in the next screen.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Open Settings", 
                  onPress: () => (FamilywalletNativeModule as any).openNotificationSettings()
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
  lightBg: { backgroundColor: '#f0f4f8' },
  darkBg: { backgroundColor: '#070b14' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 16, color: '#10b981', fontWeight: '800', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  name: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  profileBtn: { padding: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 24 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#070b14' },
  walletsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 24 },
  card: { flex: 1, padding: 20, borderRadius: 28, elevation: 12, shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  familyCard: { backgroundColor: '#10b981', borderWidth: 1, borderColor: '#34d399' },
  personalCard: { backgroundColor: '#0f766e', borderWidth: 1, borderColor: '#14b8a6' },
  cardIcon: { marginBottom: 16 },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardAmount: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  cardSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  
  featureLinksRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  featureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, elevation: 4 },
  featureIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  featureBtnText: { fontSize: 15, fontWeight: '800', flex: 1 },
  badgeCount: { backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  seeAll: { color: '#10b981', fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 12 },
  statsScroll: { marginBottom: 32, overflow: 'visible' },
  statChip: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingRight: 28, borderRadius: 24, marginRight: 16, elevation: 4 },
  statIconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statCatName: { fontSize: 14, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  statCatAmount: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  transactionsCard: { borderRadius: 28, padding: 16, elevation: 6 },
  cardLight: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#ffffff', shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: 'rgba(0,0,0,0.05)' },
  borderDark: { borderBottomColor: 'rgba(255,255,255,0.05)' },
  txIconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txDetails: { flex: 1 },
  txName: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txDate: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeShared: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgePrivate: { backgroundColor: 'rgba(249, 115, 22, 0.15)' },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  badgeTextShared: { color: '#10b981' },
  badgeTextPrivate: { color: '#f97316' },
  txAmount: { fontSize: 18, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 68, height: 68, borderRadius: 34, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'flex-end', paddingBottom: 100, paddingRight: 32 },
  fabMenu: { alignItems: 'flex-end', gap: 16 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fabMenuLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  fabMenuIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
