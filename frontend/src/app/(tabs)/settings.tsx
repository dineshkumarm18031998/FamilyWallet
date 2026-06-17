import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Switch, Alert, ActivityIndicator, Appearance, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { syncWithCloud, clearSession, getSession, getProfile } from '../../utils/database';
import { useRouter, useFocusEffect } from 'expo-router';
import { API_URL } from '../../utils/apiConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function Settings() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [trackGrocery, setTrackGrocery] = useState(true);
  const [trackFood, setTrackFood] = useState(true);
  const [trackRecharge, setTrackRecharge] = useState(true);
  const [trackDTH, setTrackDTH] = useState(true);
  const [trackUtilities, setTrackUtilities] = useState(true);

  // New Privacy Toggles
  const [sharePrivateDetails, setSharePrivateDetails] = useState(false);

  const [darkMode, setDarkMode] = useState(isDark);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileName, setProfileName] = useState('Loading...');
  const [profilePhone, setProfilePhone] = useState('');
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        try {
          const s: any = await db.getFirstAsync('SELECT * FROM tracking_settings WHERE id = 1');
          if (s) {
            setTrackGrocery(s.trackGroceries === 1 || s.trackGrocery === 1);
            setTrackFood(s.trackFood === 1);
            setTrackRecharge(s.trackRecharge === 1);
            setTrackDTH(s.trackDTH === 1);
            setTrackUtilities(s.trackUtilities === 1);
            
            // Privacy Toggles
            setSharePrivateDetails(s.sharePrivateDetails === 1);
          }
        } catch(e) {
          console.error(e);
        }
        try {
          const prof = await getProfile(db);
          if (prof) {
            setProfileName(prof.name || 'User');
            setProfilePhone(prof.phone || '');
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
    
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(result.message);
    } else {
      Alert.alert('Sync Status', result.message);
    }
  };

  const handleExportBackup = async () => {
    try {
      const expenses = await db.getAllAsync('SELECT * FROM expenses');
      const settings = await db.getAllAsync('SELECT * FROM tracking_settings');
      const budgets = await db.getAllAsync('SELECT * FROM budgets');
      
      const backupData = JSON.stringify({ expenses, settings, budgets }, null, 2);
      const fileUri = Paths.document.uri + 'FamilyWallet_Backup.json';
      const file = new File(fileUri);
      await file.write(backupData);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      }
    } catch(e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = new File(result.assets[0].uri);
        const jsonString = await file.text();
        const data = JSON.parse(jsonString);
        
        if (data.expenses && Array.isArray(data.expenses)) {
          for (const exp of data.expenses) {
            await db.runAsync('INSERT OR REPLACE INTO expenses (id, amount, merchant, category, timestamp, month, source) VALUES (?, ?, ?, ?, ?, ?, ?)', 
              [exp.id, exp.amount, exp.merchant, exp.category, exp.timestamp, exp.month, exp.source]
            );
          }
          Alert.alert('Success', 'Backup restored successfully!');
        } else {
          Alert.alert('Error', 'Invalid backup file format');
        }
      }
    } catch(e: any) {
      Alert.alert('Restore Failed', e.message);
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
          <Text style={styles.avatarText}>{profileName[0]}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, isDark ? styles.textLight : styles.textDark]}>{profileName}</Text>
          <Text style={styles.profilePhone}>{profilePhone}</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditModalVisible(true)}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>Edit Profile</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput style={[styles.input, isDark ? styles.textLight : styles.textDark]} value={profileName} onChangeText={setProfileName} />
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={[styles.input, isDark ? styles.textLight : styles.textDark]} value={profilePhone} onChangeText={setProfilePhone} keyboardType="phone-pad" />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={() => { setEditModalVisible(false); Alert.alert('Saved', 'Profile updated successfully!'); }}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Auto-Detect Tracking</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <SettingRow icon="cart-outline" label="Track Groceries" type="toggle" value={trackGrocery} onToggle={(v:boolean) => updateSetting('trackGroceries', v, setTrackGrocery)} />
        <SettingRow icon="fast-food-outline" label="Track Food" type="toggle" value={trackFood} onToggle={(v:boolean) => updateSetting('trackFood', v, setTrackFood)} />
        <SettingRow icon="phone-portrait-outline" label="Track Mobile Recharge" type="toggle" value={trackRecharge} onToggle={(v:boolean) => updateSetting('trackRecharge', v, setTrackRecharge)} />
        <SettingRow icon="tv-outline" label="Track DTH Recharge" type="toggle" value={trackDTH} onToggle={(v:boolean) => updateSetting('trackDTH', v, setTrackDTH)} />
        <SettingRow icon="flash-outline" label="Track Utility Bills" type="toggle" value={trackUtilities} onToggle={(v:boolean) => updateSetting('trackUtilities', v, setTrackUtilities)} />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Privacy Engine</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <SettingRow icon="eye-outline" label="Share My Private Details" type="toggle" value={sharePrivateDetails} onToggle={async (v:boolean) => {
          await updateSetting('sharePrivateDetails', v, setSharePrivateDetails);
          const uid = await getSession(db);
          fetch(`${API_URL}/settings/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, sharePrivateDetails: v })
          });
        }} />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Appearance</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <SettingRow 
          icon="moon-outline" 
          label="Dark Mode" 
          type="toggle" 
          value={darkMode} 
          onToggle={(v: boolean) => {
            setDarkMode(v);
            Appearance.setColorScheme(v ? 'dark' : 'light');
          }} 
        />
        <SettingRow icon="language-outline" label="Language" type="text" value="English" />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Data & Sync</Text>
      <View style={[styles.sectionCard, isDark ? styles.cardDark : styles.cardLight]}>
        <TouchableOpacity style={[styles.settingRow, isDark ? styles.borderDark : styles.borderLight]} onPress={handleSync} disabled={isSyncing}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-upload-outline" size={20} color="#10b981" />
            </View>
            <Text style={[styles.settingLabel, isDark ? styles.textLight : styles.textDark]}>Sync to Cloud</Text>
          </View>
          {isSyncing ? <ActivityIndicator color="#10b981" /> : <Ionicons name="arrow-forward" size={20} color="#9ca3af" />}
        </TouchableOpacity>
        <SettingRow icon="download-outline" label="Export Backup (JSON)" type="action" onToggle={handleExportBackup} />
        <SettingRow icon="refresh-outline" label="Restore Backup (JSON)" type="action" onToggle={handleRestoreBackup} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  lightBg: { backgroundColor: '#FAFAFA' },
  darkBg: { backgroundColor: '#0A0A0A' }, 
  header: { marginBottom: 32 },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#111827' },
  cardLight: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 5, borderColor: '#F3F4F6', borderWidth: 1 },
  cardDark: { backgroundColor: '#141414', borderColor: '#262626', borderWidth: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 36 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  profilePhone: { fontSize: 13, color: '#10b981', fontWeight: '600', letterSpacing: 0.5 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 20 },
  editBtnText: { color: '#10b981', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, marginTop: 8 },
  sectionCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
  subSettingsContainer: { backgroundColor: 'rgba(16, 185, 129, 0.05)', paddingLeft: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: '#F3F4F6' },
  borderDark: { borderBottomColor: '#262626' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  settingLabel: { fontSize: 15, fontWeight: '600' },
  settingValueText: { fontSize: 15, color: '#10b981', fontWeight: '700' },
  logoutBtn: { marginTop: 10, alignItems: 'center', padding: 18, borderRadius: 24, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 32, padding: 32 },
  modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24, color: '#10b981' },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#9ca3af', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#374151', borderRadius: 16, padding: 16, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 16 },
  modalBtnCancel: { padding: 16 },
  cancelText: { color: '#9ca3af', fontWeight: '700', fontSize: 16 },
  modalBtnSave: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16 },
  saveText: { color: '#ffffff', fontWeight: '800', fontSize: 16 }
});
