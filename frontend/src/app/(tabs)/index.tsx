import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Modal, Pressable, PermissionsAndroid, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { getRecentExpensesForMonth, getWalletTotalsForMonth, getCategoryTotalsForPeriod } from '../../utils/database';
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

  // Month tracking
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        // Only load data for CURRENT MONTH, max 3 to prevent huge scrolling on home page
        const tx = await getRecentExpensesForMonth(db, currentYear, currentMonth, 3);
        setRecentTx(tx);
        
        const t = await getWalletTotalsForMonth(db, currentYear, currentMonth);
        setTotals(t);
        
        // Category totals for this month
        const startStr = `${currentYear}-${currentMonth < 10 ? '0'+currentMonth : currentMonth}-01`;
        const endStr = `${currentYear}-${currentMonth < 10 ? '0'+currentMonth : currentMonth}-31`;
        const stats = await getCategoryTotalsForPeriod(db, startStr, endStr);
        setCategoryStats(stats as any[]);
        
        try {
          const res: any = await db.getFirstAsync("SELECT COUNT(*) as count FROM review_queue WHERE status = 'Pending'");
          setReviewCount(res?.count || 0);
        } catch(e) {}
      };
      loadData();
    }, [db, currentYear, currentMonth])
  );

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        try {
          const hasAsked = await AsyncStorage.getItem('hasAskedNotificationPermission');
          if (hasAsked) return;

          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          ]);
          
          if (granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED) {
            await AsyncStorage.setItem('hasAskedNotificationPermission', 'true');
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
    return map[cat] || '#6b7280';
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 10, 40) }]} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Total Wallet For</Text>
            <Text style={[styles.name, isDark ? styles.textLight : styles.textDark]}>{monthName}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="person-circle" size={44} color={isDark ? "#10b981" : "#059669"} />
          </TouchableOpacity>
        </View>

        {/* Wallets */}
        <View style={styles.walletsContainer}>
          <LinearGradient colors={['#10b981', '#059669']} style={[styles.card, styles.gradientCard]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="people" size={22} color="#ffffff" />
              <Text style={styles.cardLabel}>Shared</Text>
            </View>
            <Text style={styles.cardAmount}>₹{totals.sharedTotal.toLocaleString('en-IN')}</Text>
          </LinearGradient>

          <LinearGradient colors={['#3b82f6', '#2563eb']} style={[styles.card, styles.gradientCard]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="person" size={22} color="#ffffff" />
              <Text style={styles.cardLabel}>Private</Text>
            </View>
            <Text style={styles.cardAmount}>₹{totals.privateTotal.toLocaleString('en-IN')}</Text>
          </LinearGradient>
        </View>

        {/* Feature Links */}
        <View style={styles.featureLinksRow}>
          <TouchableOpacity style={[styles.featureBtn, isDark ? styles.cardDark : styles.cardLight]} onPress={() => router.push('/review-inbox')}>
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#331a00' : '#fef3c7' }]}>
              <Ionicons name="mail-unread" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.featureBtnText, isDark ? styles.textLight : styles.textDark]} numberOfLines={1} adjustsFontSizeToFit>Review Inbox</Text>
            {reviewCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{reviewCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.featureBtn, isDark ? styles.cardDark : styles.cardLight]} onPress={() => router.push('/budgets')}>
            <View style={[styles.featureIconBox, { backgroundColor: isDark ? '#001a33' : '#dbeafe' }]}>
              <Ionicons name="pie-chart" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.featureBtnText, isDark ? styles.textLight : styles.textDark]} numberOfLines={1} adjustsFontSizeToFit>Budgets</Text>
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
                  <View style={[styles.statIconContainer, { backgroundColor: color + (isDark ? '30' : '20') }]}>
                    <Ionicons name={getIconForCategory(stat.category)} size={18} color={color} />
                  </View>
                  <View>
                    <Text style={[styles.statCatName, isDark ? styles.textLightMuted : styles.textDarkMuted]}>{stat.category}</Text>
                    <Text style={[styles.statCatAmount, isDark ? styles.textLight : styles.textDark]}>₹{stat.total.toLocaleString('en-IN')}</Text>
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
          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {recentTx.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No recent transactions.</Text>
            ) : (
              recentTx.map((tx, idx) => {
                const icon = getIconForCategory(tx.category);
                const color = getColorForCategory(tx.category);
                const d = new Date(tx.date);
                const dateStr = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                const isLast = idx === recentTx.length - 1;

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
                    isLast={isLast}
                  />
                )
              })
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* FAB Modal Overlay */}
      <Modal visible={fabOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFabOpen(false)}>
          <View style={styles.fabMenu}>
            <FabMenuItem icon="scan" color="#8b5cf6" label="Scan Receipt" onPress={() => { setFabOpen(false); router.push('/scanner' as any); }} />
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
        <LinearGradient colors={['#10b981', '#059669']} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function FabMenuItem({ icon, color, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.fabMenuItem} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.fabMenuLabel}>{label}</Text>
      <View style={[styles.fabMenuIconCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function TransactionItem({ icon, color, name, amount, date, type, isDark, isLast }: any) {
  return (
    <View style={[styles.txItem, !isLast && (isDark ? styles.borderDark : styles.borderLight)]}>
      <View style={[styles.txIconContainer, { backgroundColor: color + (isDark ? '30' : '15') }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txName, isDark ? styles.textLight : styles.textDark]} numberOfLines={1}>{name}</Text>
        <View style={styles.txRow}>
          <Text style={styles.txDate}>{date}</Text>
          <View style={[styles.badge, type === 'Shared' ? styles.badgeShared : styles.badgePrivate]}>
            <Text style={[styles.badgeText, type === 'Shared' ? styles.badgeTextShared : styles.badgeTextPrivate]}>{type}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isDark ? '#fca5a5' : '#ef4444' }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#FAFAFA' }, // Pure, clean extremely light gray/white
  darkBg: { backgroundColor: '#0A0A0A' }, // Deep pitch black/dark gray for OLED feel
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greeting: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  name: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  profileBtn: { padding: 2 },
  textLight: { color: '#FFFFFF' },
  textDark: { color: '#111827' },
  textLightMuted: { color: '#9CA3AF' },
  textDarkMuted: { color: '#6B7280' },
  
  walletsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 32 },
  card: { flex: 1, padding: 20, borderRadius: 24 },
  gradientCard: { elevation: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardAmount: { color: '#ffffff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  
  featureLinksRow: { flexDirection: 'row', gap: 16, marginBottom: 36 },
  featureBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, minHeight: 76 },
  featureIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  featureBtnText: { fontSize: 15, fontWeight: '700', flex: 1 },
  badgeCount: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: '#fff' },
  badgeCountText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  seeAll: { color: '#10b981', fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 13, marginBottom: 2 },
  statsScroll: { marginBottom: 36, overflow: 'visible' },
  statChip: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingRight: 32, borderRadius: 20, marginRight: 16 },
  statIconContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  statCatName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  statCatAmount: { fontSize: 18, fontWeight: '800' },
  
  transactionsCard: { borderRadius: 24, padding: 12, paddingHorizontal: 16 },
  cardLight: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 5, borderColor: '#F3F4F6', borderWidth: 1 },
  cardDark: { backgroundColor: '#141414', borderColor: '#262626', borderWidth: 1 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
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
  txAmount: { fontSize: 17, fontWeight: '800' },
  
  fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, elevation: 12, shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'flex-end', paddingBottom: 100, paddingRight: 32 },
  fabMenu: { alignItems: 'flex-end', gap: 16 },
  fabMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fabMenuLabel: { color: '#ffffff', fontSize: 15, fontWeight: '700', backgroundColor: '#1F2937', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },
  fabMenuIconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
