import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function Family() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State: 'no_family', 'create', 'join', 'dashboard'
  const [viewState, setViewState] = useState('no_family');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Mock Family Data
  const familyData = {
    name: "Dinesh's Family",
    code: "ABC123",
    sharedTotal: 12450,
    members: [
      { id: 1, name: 'Dinesh (You)', role: 'Owner', spent: 8000 },
      { id: 2, name: 'Wife', role: 'Member', spent: 4450 }
    ]
  };

  const handleCreate = () => {
    if (familyName) setViewState('dashboard');
  };

  const handleJoin = () => {
    if (inviteCode) setViewState('dashboard');
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
      <TouchableOpacity style={styles.backBtn} onPress={() => setViewState('no_family')}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
      </TouchableOpacity>
      <Text style={[styles.title, isDark ? styles.textLight : styles.textDark, { marginBottom: 30 }]}>Name your Family</Text>
      
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

      <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={handleCreate}>
        <Text style={styles.primaryBtnText}>Create Family</Text>
      </TouchableOpacity>
    </View>
  );

  const renderJoin = () => (
    <View style={styles.centerContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setViewState('no_family')}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
      </TouchableOpacity>
      <Text style={[styles.title, isDark ? styles.textLight : styles.textDark, { marginBottom: 30 }]}>Enter Invite Code</Text>
      
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

      <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={handleJoin}>
        <Text style={styles.primaryBtnText}>Join Family</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView contentContainerStyle={styles.dashboardContainer}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>{familyData.name}</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      <View style={[styles.statsCard, { backgroundColor: '#10b981' }]}>
        <Text style={styles.statsLabel}>Family Shared Total</Text>
        <Text style={styles.statsAmount}>₹{familyData.sharedTotal.toLocaleString('en-IN')}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Members</Text>
        <TouchableOpacity style={styles.inviteBtn}>
          <Ionicons name="person-add" size={16} color="#10b981" />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.membersCard, isDark ? styles.cardDark : styles.cardLight]}>
        {familyData.members.map((m, i) => (
          <View key={m.id} style={[styles.memberRow, i !== familyData.members.length - 1 && (isDark ? styles.borderDark : styles.borderLight)]}>
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>{m.name[0]}</Text>
            </View>
            <View style={styles.memberDetails}>
              <Text style={[styles.memberName, isDark ? styles.textLight : styles.textDark]}>{m.name}</Text>
              <Text style={styles.memberRole}>{m.role}</Text>
            </View>
            <Text style={[styles.memberSpent, isDark ? styles.textLight : styles.textDark]}>₹{m.spent.toLocaleString('en-IN')}</Text>
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
      {viewState === 'no_family' && renderNoFamily()}
      {viewState === 'create' && renderCreate()}
      {viewState === 'join' && renderJoin()}
      {viewState === 'dashboard' && renderDashboard()}
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
  backBtn: { position: 'absolute', top: 60, left: 24 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, height: 56, width: '100%' },
  inputWrapperLight: { borderColor: '#d1d5db', backgroundColor: '#ffffff' },
  inputWrapperDark: { borderColor: '#374151', backgroundColor: '#1f2937' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  dashboardContainer: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  settingsBtn: { padding: 8 },
  statsCard: { padding: 24, borderRadius: 20, marginBottom: 32, elevation: 4, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  statsLabel: { color: '#d1fae5', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  statsAmount: { color: '#ffffff', fontSize: 36, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10b98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  inviteBtnText: { color: '#10b981', fontWeight: '700', fontSize: 14 },
  cardLight: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardDark: { backgroundColor: '#1f2937' },
  membersCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  memberDetails: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600' },
  memberRole: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  memberSpent: { fontSize: 16, fontWeight: '700' },
  codeCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#10b981' },
  codeLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  codeValue: { fontSize: 40, fontWeight: '900', letterSpacing: 8, color: '#10b981', marginBottom: 12 },
  codeSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' }
});
