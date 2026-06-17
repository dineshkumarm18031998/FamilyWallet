import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getSession, clearSession } from '../../utils/database';
import { API_URL } from '../../utils/apiConfig';

export default function Family() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const db = useSQLiteContext();

  const [viewState, setViewState] = useState('loading'); // 'loading', 'no_family', 'create', 'join', 'dashboard'
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [familyData, setFamilyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [sharePrivateDetails, setSharePrivateDetails] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchFamily();
    }, [])
  );

  const fetchFamily = async () => {
    try {
      setViewState('loading');
      const userId = await getSession(db);
      if (!userId) {
        setViewState('no_family');
        return;
      }
      const response = await fetch(`${API_URL}/family/${userId}`);
      const data = await response.json();
      
      // Also fetch personal settings
      const settingsRes = await fetch(`${API_URL}/settings/${userId}`);
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.data) {
        setSharePrivateDetails(settingsData.data.sharePrivateDetails || false);
      }

      if (data.hasFamily) {
        setFamilyData(data.data);
        setViewState('dashboard');
      } else {
        setViewState('no_family');
      }
    } catch (error) {
      console.warn('Error fetching family:', error);
      setViewState('no_family');
    }
  };

  const toggleSharePrivate = async (val: boolean) => {
    setSharePrivateDetails(val);
    try {
      const userId = await getSession(db);
      await fetch(`${API_URL}/settings/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sharePrivateDetails: val })
      });
    } catch (e) {
      console.warn('Failed to update privacy settings', e);
    }
  };

  const handleLeaveFamily = () => {
    Alert.alert(
      "Leave Family",
      "Are you sure you want to leave this family? You will no longer share expenses.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: async () => {
            await clearSession(db);
            setViewState('no_family');
            setFamilyData(null);
          }
        }
      ]
    );
  };

  const handleCreate = async () => {
    if (!familyName) return;
    setLoading(true);
    try {
      const userId = await getSession(db);
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to create a family.');
        return;
      }
      const response = await fetch(`${API_URL}/family/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: familyName })
      });
      const data = await response.json();
      if (data.success) {
        fetchFamily();
      } else {
        Alert.alert('Error', data.error || 'Failed to create family');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      const userId = await getSession(db);
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to join a family.');
        return;
      }
      const response = await fetch(`${API_URL}/family/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, inviteCode })
      });
      const data = await response.json();
      if (data.success) {
        fetchFamily();
      } else {
        Alert.alert('Error', data.error || 'Invalid invite code');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderNoFamily = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="home" size={80} color="#10b981" style={{ marginBottom: 20 }} />
      <Text style={[styles.title, isDark ? styles.textLight : styles.textDark, { textAlign: 'center' }]}>Family Wallet</Text>
      <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 40 }]}>Track household expenses together while keeping personal spending private.</Text>
      
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setViewState('create')}>
        <Text style={styles.primaryBtnText}>Create a Family</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.secondaryBtn, isDark ? styles.borderDark : styles.borderLight]} onPress={() => setViewState('join')}>
        <Text style={[styles.secondaryBtnText, isDark ? styles.textLight : styles.textDark]}>Join a Family</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreate = () => (
    <View style={styles.centerContainer}>
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
        <TouchableOpacity onPress={() => setViewState('no_family')} style={{ paddingRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark, { marginBottom: 0 }]}>Name your Family</Text>
      </View>
      
      <View style={[styles.inputWrapper, isDark ? styles.inputWrapperDark : styles.inputWrapperLight]}>
        <Ionicons name="home-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isDark ? styles.textLight : styles.textDark]}
          placeholder="e.g. The Smiths"
          placeholderTextColor="#9ca3af"
          value={familyName}
          onChangeText={setFamilyName}
          autoFocus
        />
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Family</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderJoin = () => (
    <View style={styles.centerContainer}>
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
        <TouchableOpacity onPress={() => setViewState('no_family')} style={{ paddingRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark, { marginBottom: 0 }]}>Enter Invite Code</Text>
      </View>
      
      <View style={[styles.inputWrapper, isDark ? styles.inputWrapperDark : styles.inputWrapperLight]}>
        <Ionicons name="keypad-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isDark ? styles.textLight : styles.textDark]}
          placeholder="e.g. ABC123"
          placeholderTextColor="#9ca3af"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          autoFocus
        />
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={handleJoin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Join Family</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.dashboardContainer}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>{familyData.name}</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleLeaveFamily}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsCard, { backgroundColor: '#10b981' }]}>
        <Text style={styles.statsLabel}>Family Shared Total</Text>
        <Text style={styles.statsAmount}>₹{(familyData.sharedTotal || 0).toLocaleString('en-IN')}</Text>
        <Text style={styles.syncLabel}>Last synced: Just now</Text>
      </View>

      <View style={[styles.settingsCard, isDark ? styles.cardDark : styles.cardLight]}>
        <View style={styles.settingsRow}>
          <View style={{flex: 1, paddingRight: 10}}>
            <Text style={[styles.settingsTitle, isDark ? styles.textLight : styles.textDark]}>Share My Private Details</Text>
            <Text style={styles.settingsSub}>Allow family to see your personal expenses.</Text>
          </View>
          <Switch 
            value={sharePrivateDetails}
            onValueChange={toggleSharePrivate}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Members</Text>
        <TouchableOpacity style={styles.inviteBtn}>
          <Ionicons name="person-add" size={16} color="#10b981" />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.membersCard, isDark ? styles.cardDark : styles.cardLight]}>
        {familyData.members.map((m: any, i: any) => (
          <View key={m.id}>
            <TouchableOpacity 
              style={[styles.memberRow, i !== familyData.members.length - 1 && !expandedMemberId && (isDark ? styles.borderDark : styles.borderLight)]}
              onPress={() => setExpandedMemberId(expandedMemberId === m.id ? null : m.id)}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{m.name[0]}</Text>
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.memberDetails}>
                <Text style={[styles.memberName, isDark ? styles.textLight : styles.textDark]}>{m.name}</Text>
                <Text style={styles.memberRole}>{m.role}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={[styles.memberSpent, isDark ? styles.textLight : styles.textDark]}>₹{m.spent?.toLocaleString('en-IN')}</Text>
                <Ionicons name={expandedMemberId === m.id ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" style={{marginTop: 4}} />
              </View>
            </TouchableOpacity>
            
            {/* Expanded Detailed View */}
            {expandedMemberId === m.id && (
              <View style={[styles.expandedArea, isDark ? styles.expandedDark : styles.expandedLight]}>
                {m.history ? (
                  <View>
                    <Text style={styles.expandedLabel}>Detailed Spending History</Text>
                    <View style={styles.historyGrid}>
                      <View style={styles.historyBox}>
                        <Text style={styles.historyTime}>This Week</Text>
                        <Text style={styles.historyAmount}>₹{m.history?.week?.toLocaleString('en-IN') || '0'}</Text>
                      </View>
                      <View style={styles.historyBox}>
                        <Text style={styles.historyTime}>This Month</Text>
                        <Text style={styles.historyAmount}>₹{m.history?.month?.toLocaleString('en-IN') || '0'}</Text>
                      </View>
                      <View style={styles.historyBox}>
                        <Text style={styles.historyTime}>This Year</Text>
                        <Text style={styles.historyAmount}>₹{m.history?.year?.toLocaleString('en-IN') || '0'}</Text>
                      </View>
                    </View>
                    {m.history?.recentTransactions?.length > 0 && (
                      <View style={styles.miniTxList}>
                        <Text style={styles.expandedLabel}>Recent Transactions</Text>
                        {m.history.recentTransactions.map((tx: any, idx: number) => (
                          <View key={idx} style={styles.miniTxItem}>
                            <Text style={[styles.miniTxName, isDark ? styles.textLight : styles.textDark]}>{tx.merchant}</Text>
                            <Text style={[styles.miniTxAmount, {color: '#ef4444'}]}>-₹{tx.amount}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.privateMessage}>
                    <Ionicons name="lock-closed" size={24} color="#9ca3af" />
                    <Text style={styles.privateText}>{m.name} has kept their detailed spending private.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.codeCard, isDark ? styles.cardDark : styles.cardLight]}>
        <Text style={[styles.codeLabel, isDark ? styles.textLight : styles.textDark]}>Invite Code</Text>
        <Text style={styles.codeValue}>{familyData.code}</Text>
        <Text style={styles.codeSub}>Share this code with family members to join.</Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      {viewState === 'loading' && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      )}
      {viewState === 'no_family' && renderNoFamily()}
      {viewState === 'create' && renderCreate()}
      {viewState === 'join' && renderJoin()}
      {viewState === 'dashboard' && familyData && renderDashboard()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', lineHeight: 24 },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  primaryBtn: { backgroundColor: '#10b981', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 2, backgroundColor: 'transparent' },
  secondaryBtnText: { fontSize: 18, fontWeight: '700' },
  borderLight: { borderColor: '#d1d5db' },
  borderDark: { borderColor: '#374151' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 56, width: '100%' },
  inputWrapperLight: { borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  inputWrapperDark: { borderColor: '#374151', backgroundColor: '#1f2937' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  dashboardContainer: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  settingsBtn: { padding: 8 },
  statsCard: { padding: 24, borderRadius: 20, marginBottom: 20, elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, position: 'relative' },
  statsLabel: { color: '#d1fae5', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  statsAmount: { color: '#ffffff', fontSize: 36, fontWeight: '800' },
  syncLabel: { color: '#d1fae5', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  
  settingsCard: { padding: 20, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  settingsSub: { fontSize: 13, color: '#9ca3af' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  inviteBtnText: { color: '#10b981', fontWeight: '700', fontSize: 14 },
  cardLight: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardDark: { backgroundColor: '#1f2937' },
  membersCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 12, position: 'relative' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#34d399', borderWidth: 2, borderColor: '#fff' },
  memberDetails: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberRole: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  memberSpent: { fontSize: 16, fontWeight: '700' },
  codeCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#10b981' },
  codeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  codeValue: { fontSize: 40, fontWeight: '900', letterSpacing: 8, color: '#10b981', marginBottom: 12 },
  codeSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  
  expandedArea: { padding: 16, borderTopWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  expandedLight: { borderTopColor: '#e5e7eb' },
  expandedDark: { borderTopColor: '#374151', backgroundColor: 'rgba(255,255,255,0.02)' },
  expandedLabel: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 12 },
  historyGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  historyBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#10b98115', alignItems: 'center' },
  historyTime: { fontSize: 11, fontWeight: '600', color: '#10b981', textTransform: 'uppercase', marginBottom: 4 },
  historyAmount: { fontSize: 15, fontWeight: '800', color: '#10b981' },
  privateMessage: { alignItems: 'center', padding: 20 },
  privateText: { fontSize: 13, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  miniTxList: { marginTop: 8 },
  miniTxItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#374151' },
  miniTxName: { fontSize: 14, fontWeight: '600' },
  miniTxAmount: { fontSize: 14, fontWeight: '700' }
});
