import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { getCategoryTotals } from '../../utils/database';
import { useFocusEffect } from 'expo-router';

// Mock Budget targets. In V2, these come from backend/sqlite table.
const BUDGET_TARGETS: any = {
  Groceries: 15000,
  Food: 5000,
  Recharge: 2000,
  Utilities: 4000
};

export default function BudgetsScreen() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [stats, setStats] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const catTotals = await getCategoryTotals(db);
        setStats(catTotals as any[]);
      };
      load();
    }, [db])
  );

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Monthly Budgets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Object.keys(BUDGET_TARGETS).map(category => {
          const target = BUDGET_TARGETS[category];
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
                <Text style={styles.catAmount}>₹{actual.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')}</Text>
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
});
