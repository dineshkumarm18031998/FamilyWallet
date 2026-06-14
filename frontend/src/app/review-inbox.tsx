import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Switch } from 'react-native';
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
  const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>({});

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
    const visibility = visibilityMap[item.id] ? 'Shared' : 'Private';
    // Save to real expenses table
    await addExpense(db, item.amount, item.merchant, item.category, visibility, '', item.source);
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
                    <Text style={[styles.merchantName, isDark ? styles.textLight : styles.textDark]} numberOfLines={1} adjustsFontSizeToFit>{item.merchant}</Text>
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

                <View style={styles.visibilityRow}>
                  <Text style={[styles.visibilityLabel, isDark ? styles.textLight : styles.textDark]}>Visibility</Text>
                  <View style={styles.visibilityToggle}>
                    <Text style={[styles.visibilityText, !visibilityMap[item.id] && styles.visibilityActive]}>Private</Text>
                    <Switch
                      trackColor={{ false: '#d1d5db', true: '#10b981' }}
                      thumbColor={'#ffffff'}
                      onValueChange={(val) => setVisibilityMap(prev => ({...prev, [item.id]: val}))}
                      value={!!visibilityMap[item.id]}
                      style={{ marginHorizontal: 8, transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                    />
                    <Text style={[styles.visibilityText, visibilityMap[item.id] && styles.visibilityActive]}>Shared</Text>
                  </View>
                </View>

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
  lightBg: { backgroundColor: '#ffffff' },
  darkBg: { backgroundColor: '#0A0A0A' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#0f172a' },
  content: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 22, fontWeight: '800', marginTop: 16 },
  emptySub: { fontSize: 16, color: '#94a3b8', marginTop: 8 },
  card: { padding: 20, borderRadius: 20, marginBottom: 20 },
  cardLight: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  cardDark: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#262626' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  merchantName: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  sourceText: { fontSize: 13, color: '#94a3b8', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  amountText: { fontSize: 24, fontWeight: '900', color: '#ef4444' },
  suggestionBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  suggestionText: { color: '#f59e0b', marginLeft: 8, fontSize: 14, fontWeight: '600' },
  originalText: { fontSize: 13, fontStyle: 'italic', color: '#9ca3af', marginBottom: 24, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(156, 163, 175, 0.2)' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14 },
  btnIgnore: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#ef4444' },
  btnIgnoreText: { color: '#ef4444', fontWeight: '800', marginLeft: 6, letterSpacing: 0.5 },
  btnApprove: { backgroundColor: '#10b981' },
  btnApproveText: { color: '#070b14', fontWeight: '900', marginLeft: 6, letterSpacing: 0.5 },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginTop: 8 },
  confidenceText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  visibilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(156, 163, 175, 0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
  visibilityLabel: { fontSize: 14, fontWeight: '700' },
  visibilityToggle: { flexDirection: 'row', alignItems: 'center' },
  visibilityText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  visibilityActive: { color: '#10b981', fontWeight: '800' }
});
