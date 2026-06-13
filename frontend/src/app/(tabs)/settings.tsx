import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Switch, Alert, ActivityIndicator, Appearance, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { syncWithCloud, clearSession } from '../../utils/database';
import { useRouter, useFocusEffect } from 'expo-router';
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
  const [sharePrivate, setSharePrivate] = useState(false);

  const [darkMode, setDarkMode] = useState(isDark);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileName, setProfileName] = useState('Dinesh');
  const [profilePhone, setProfilePhone] = useState('+91 6380661637');
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
  scrollContent: { padding: 20, paddingBottom: 100 },
  lightBg: { backgroundColor: '#f0f4f8' },
  darkBg: { backgroundColor: '#070b14' }, // Deep futuristic space blue
  header: { marginBottom: 24 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#0f172a' },
  cardLight: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#ffffff', shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 28, marginBottom: 32 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width: 0, height: 4} },
  avatarText: { color: '#070b14', fontSize: 28, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  profilePhone: { fontSize: 14, color: '#10b981', fontWeight: '600', letterSpacing: 1 },
  editBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  editBtnText: { color: '#10b981', fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#10b981', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginLeft: 8 },
  sectionCard: { borderRadius: 28, overflow: 'hidden', marginBottom: 28, elevation: 4 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  borderLight: { borderBottomColor: 'rgba(0,0,0,0.05)' },
  borderDark: { borderBottomColor: 'rgba(255,255,255,0.05)' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  settingLabel: { fontSize: 16, fontWeight: '600' },
  settingValueText: { fontSize: 16, color: '#10b981', fontWeight: '600' },
  logoutBtn: { marginTop: 10, alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7, 11, 20, 0.8)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 32, padding: 32, elevation: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 24, color: '#10b981' },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#94a3b8', marginBottom: 8, fontWeight: '700', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', borderRadius: 16, padding: 16, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.2)' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 16 },
  modalBtnCancel: { padding: 16 },
  cancelText: { color: '#94a3b8', fontWeight: '700', fontSize: 16 },
  modalBtnSave: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width: 0, height: 4} },
  saveText: { color: '#070b14', fontWeight: '900', fontSize: 16, letterSpacing: 1 }
});
