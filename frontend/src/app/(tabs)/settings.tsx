import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Switch, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { syncWithCloud, clearSession } from '../../utils/database';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Settings() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [trackGrocery, setTrackGrocery] = useState(true);
  const [trackFood, setTrackFood] = useState(true);
  const [trackRecharge, setTrackRecharge] = useState(true);
  const [trackDTH, setTrackDTH] = useState(true);
  const [sharePrivate, setSharePrivate] = useState(false);

  const [darkMode, setDarkMode] = useState(isDark);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          const s: any = await db.getFirstAsync('SELECT * FROM tracking_settings WHERE id = 1');
          if (s) {
            setTrackGrocery(s.trackGrocery === 1);
            setTrackFood(s.trackFood === 1);
            setTrackRecharge(s.trackRecharge === 1);
            setTrackDTH(s.trackDTH === 1);
            setSharePrivate(s.sharePrivateDetails === 1);
          }
        } catch(e) {
          console.error(e);
        }
      };
      loadSettings();
    }, [db])
  );

  const updateSetting = async (key: string, value: boolean, setter: any) => {
    setter(value);
    await db.runAsync(`UPDATE tracking_settings SET ${key} = ? WHERE id = 1`, [value ? 1 : 0]);
  };

  const handleLogout = async () => {
    await clearSession(db);
    router.replace('/login');
  };

  const SettingRow = ({ icon, label, type = 'link', value, onToggle }: any) => (
    <TouchableOpacity style={[styles.settingRow, isDark ? styles.borderDark : styles.borderLight]} disabled={type === 'toggle'} onPress={type === 'action' ? onToggle : undefined}>
      <View style={styles.settingRowLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color="#6b7280" />
        </View>
        <Text style={[styles.settingLabel, isDark ? styles.textLight : styles.textDark]}>{label}</Text>
      </View>
      {type === 'link' && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
      {type === 'action' && <Ionicons name="arrow-forward" size={20} color="#9ca3af" />}
      {type === 'toggle' && (
        <Switch
          trackColor={{ false: '#d1d5db', true: '#10b981' }}
          thumbColor={'#ffffff'}
          onValueChange={onToggle}
          value={value}
        />
      )}
      {type === 'text' && <Text style={styles.settingValueText}>{value}</Text>}
    </TouchableOpacity>
  );

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncWithCloud(db);
    setIsSyncing(false);
    
    // In web environment Alert doesn't work perfectly out of the box, but we can fallback to console or window.alert
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(result.message);
    } else {
      Alert.alert('Sync Status', result.message);
    }
  };

  return (
    <ScrollView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 10, 40) }]}>
      {/* ... previous code remains the same until Data & Sync ... */}
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Settings</Text>
      </View>

      <View style={[styles.profileCard, isDark ? styles.cardDark : styles.cardLight]}>
        <View style={styles.profileAvatar}>
          <Text style={styles.avatarText}>D</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, isDark ? styles.textLight : styles.textDark]}>Dinesh</Text>
          <Text style={styles.profilePhone}>+91 6380661637</Text>
        </View>
        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Auto-Detect Tracking</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <SettingRow icon="cart-outline" label="Track Groceries" type="toggle" value={trackGrocery} onToggle={(v:boolean) => updateSetting('trackGrocery', v, setTrackGrocery)} />
        <SettingRow icon="fast-food-outline" label="Track Food" type="toggle" value={trackFood} onToggle={(v:boolean) => updateSetting('trackFood', v, setTrackFood)} />
        <SettingRow icon="phone-portrait-outline" label="Track Mobile Recharge" type="toggle" value={trackRecharge} onToggle={(v:boolean) => updateSetting('trackRecharge', v, setTrackRecharge)} />
        <SettingRow icon="tv-outline" label="Track DTH Recharge" type="toggle" value={trackDTH} onToggle={(v:boolean) => updateSetting('trackDTH', v, setTrackDTH)} />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Privacy & Sharing</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <SettingRow icon="eye-outline" label="Share My Private Details" type="toggle" value={sharePrivate} onToggle={(v:boolean) => updateSetting('sharePrivateDetails', v, setSharePrivate)} />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Appearance</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <SettingRow icon="moon-outline" label="Dark Mode" type="toggle" value={darkMode} onToggle={setDarkMode} />
        <SettingRow icon="language-outline" label="Language" type="text" value="English" />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Data & Sync</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <TouchableOpacity style={[styles.settingRow, isDark ? styles.borderDark : styles.borderLight]} onPress={handleSync} disabled={isSyncing}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-upload-outline" size={20} color="#6b7280" />
            </View>
            <Text style={[styles.settingLabel, isDark ? styles.textLight : styles.textDark]}>Sync Now</Text>
          </View>
          {isSyncing ? <ActivityIndicator color="#10b981" /> : <Ionicons name="arrow-forward" size={20} color="#9ca3af" />}
        </TouchableOpacity>
        <SettingRow icon="download-outline" label="Export CSV" />
        <SettingRow icon="refresh-outline" label="Restore Backup" />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  cardLight: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardDark: { backgroundColor: '#1f2937' },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 32 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  profilePhone: { fontSize: 14, color: '#9ca3af' },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 20 },
  editBtnText: { color: '#374151', fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#f3f4f6' },
  borderDark: { borderBottomColor: '#374151' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  settingValueText: { fontSize: 16, color: '#9ca3af' },
  logoutBtn: { marginTop: 20, alignItems: 'center', padding: 16 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' }
});
