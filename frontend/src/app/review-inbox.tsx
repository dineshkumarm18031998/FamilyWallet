import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { addExpense } from '../utils/database';

export default function ReviewInboxScreen() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inbox, setInbox] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const fetchQueue = async () => {
        const rows = await db.getAllAsync("SELECT * FROM review_queue WHERE status = 'Pending' ORDER BY date DESC");
        setInbox(rows);
      };
      fetchQueue();
    }, [db])
  );

  const handleApprove = async (item: any) => {
    // Save to real expenses table
    await addExpense(db, item.amount, item.merchant, item.category, 'Private', '', item.source);
    // Mark as approved
    await db.runAsync("UPDATE review_queue SET status = 'Approved' WHERE id = ?", [item.id]);
    setInbox(prev => prev.filter(i => i.id !== item.id));
  };

  const handleIgnore = async (id: number) => {
    // Mark as ignored
    await db.runAsync("UPDATE review_queue SET status = 'Ignored' WHERE id = ?", [id]);
    setInbox(prev => prev.filter(i => i.id !== id));
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 40) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#f9fafb' : '#1f2937'} />
        </TouchableOpacity>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Review Inbox</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {inbox.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={80} color="#10b981" />
            <Text style={[styles.emptyText, isDark ? styles.textLight : styles.textDark]}>You're all caught up!</Text>
            <Text style={styles.emptySub}>No new auto-detected expenses.</Text>
          </View>
        ) : (
          inbox.map(item => {
            const confidenceColor = item.confidence === 100 ? '#10b981' : item.confidence >= 75 ? '#f59e0b' : '#ef4444';
            
            return (
              <View key={item.id} style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={[styles.merchantName, isDark ? styles.textLight : styles.textDark]}>{item.merchant}</Text>
                    <Text style={styles.sourceText}>via {item.source}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountText}>₹{item.amount}</Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
                      <Text style={[styles.confidenceText, { color: confidenceColor }]}>{item.confidence}% Match</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.suggestionBox}>
                  <Ionicons name="bulb" size={16} color="#f59e0b" />
                  <Text style={styles.suggestionText}>Suggested: <Text style={{fontWeight: '700'}}>{item.category}</Text></Text>
                </View>

                <Text style={styles.originalText}>"{item.preview || `Captured securely from ${item.source}`}"</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionBtn, styles.btnIgnore]} onPress={() => handleIgnore(item.id)}>
                    <Ionicons name="close" size={20} color="#ef4444" />
                    <Text style={styles.btnIgnoreText}>Ignore</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, styles.btnApprove]} onPress={() => handleApprove(item)}>
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                    <Text style={styles.btnApproveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f8fafc' },
  darkBg: { backgroundColor: '#0f172a' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#0f172a' },
  content: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 16, color: '#64748b', marginTop: 8 },
  card: { padding: 20, borderRadius: 24, marginBottom: 16, elevation: 8, shadowColor: '#10b981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16 },
  cardLight: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f1f5f9' },
  cardDark: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  merchantName: { fontSize: 18, fontWeight: '700' },
  sourceText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  amountText: { fontSize: 20, fontWeight: '800', color: '#ef4444' },
  suggestionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b20', padding: 10, borderRadius: 8, marginBottom: 12 },
  suggestionText: { color: '#d97706', marginLeft: 8, fontSize: 13 },
  originalText: { fontSize: 12, fontStyle: 'italic', color: '#64748b', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.02)', padding: 8, borderRadius: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12 },
  btnIgnore: { backgroundColor: '#ef444420' },
  btnIgnoreText: { color: '#ef4444', fontWeight: '700', marginLeft: 6 },
  btnApprove: { backgroundColor: '#10b981' },
  btnApproveText: { color: '#ffffff', fontWeight: '700', marginLeft: 6 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  confidenceText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }
});
