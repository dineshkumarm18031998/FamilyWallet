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
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  content: { padding: 20 },
  card: { padding: 20, borderRadius: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardLight: { backgroundColor: '#ffffff' },
  cardDark: { backgroundColor: '#1f2937' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  catName: { fontSize: 18, fontWeight: '700' },
  catAmount: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  progressBg: { height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 6 },
  alertExceeded: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginTop: 4 },
  alertWarning: { color: '#f97316', fontSize: 12, fontWeight: '600', marginTop: 4 },
  alertCaution: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 24, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 14, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
  modalBtnCancel: { padding: 12 },
  cancelText: { color: '#64748b', fontWeight: '600', fontSize: 16 },
  modalBtnSave: { backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
