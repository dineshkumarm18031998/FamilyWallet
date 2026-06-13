import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { getCategoryTotals } from '../utils/database';
import { useFocusEffect } from 'expo-router';

export default function BudgetsScreen() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [stats, setStats] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const load = async () => {
    const catTotals = await getCategoryTotals(db);
    setStats(catTotals as any[]);
    
    const dbBudgets = await db.getAllAsync('SELECT * FROM budgets');
    const budgetMap: Record<string, number> = {};
    for (const b of dbBudgets as any[]) {
      budgetMap[b.category] = b.target;
    }
    setBudgets(budgetMap);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [db])
  );

  const handleSaveBudget = async () => {
    const amount = parseInt(newTarget) || 0;
    if (amount > 0 && selectedCategory) {
      await db.runAsync('INSERT OR REPLACE INTO budgets (category, target) VALUES (?, ?)', [selectedCategory, amount]);
      await load();
    }
    setEditModalVisible(false);
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Monthly Budgets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Object.keys(budgets).map(category => {
          const target = budgets[category];
          const actualObj = stats.find(s => s.category === category);
          const actual = actualObj ? actualObj.total : 0;
          const percentage = Math.min((actual / target) * 100, 100);
          
          let color = '#10b981'; // Green
          if (percentage >= 100) color = '#ef4444'; // Red
          else if (percentage >= 90) color = '#f97316'; // Orange
          else if (percentage >= 80) color = '#f59e0b'; // Yellow

          return (
            <View key={category} style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.catName, isDark ? styles.textLight : styles.textDark]}>{category}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.catAmount}>₹{actual.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}</Text>
                  <TouchableOpacity onPress={() => {
                    setSelectedCategory(category);
                    setNewTarget(target.toString());
                    setEditModalVisible(true);
                  }} style={{ marginLeft: 12, padding: 4 }}>
                    <Ionicons name="pencil" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
              </View>

              {percentage >= 100 && <Text style={styles.alertExceeded}>⚠️ Budget Exceeded</Text>}
              {percentage >= 90 && percentage < 100 && <Text style={styles.alertWarning}>⚠️ Nearing Limit (90%+)</Text>}
              {percentage >= 80 && percentage < 90 && <Text style={styles.alertCaution}>⚠️ Caution (80%+)</Text>}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={editModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={[styles.modalTitle, isDark ? styles.textLight : styles.textDark]}>Edit {selectedCategory} Budget</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Monthly Limit (₹)</Text>
              <TextInput 
                style={[styles.input, isDark ? styles.textLight : styles.textDark]} 
                value={newTarget} 
                onChangeText={setNewTarget} 
                keyboardType="numeric" 
                autoFocus 
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveBudget}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f0f4f8' },
  darkBg: { backgroundColor: '#070b14' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#0f172a' },
  content: { padding: 20 },
  card: { padding: 24, borderRadius: 28, marginBottom: 20, elevation: 5 },
  cardLight: { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#ffffff', shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  cardDark: { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderWidth: 1, borderColor: 'rgba(51, 65, 85, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  catName: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  catAmount: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  progressBg: { height: 16, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 8, shadowColor: '#10b981', shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: {width: 0, height: 0} },
  alertExceeded: { color: '#ef4444', fontSize: 13, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  alertWarning: { color: '#f97316', fontSize: 13, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  alertCaution: { color: '#f59e0b', fontSize: 13, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
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
