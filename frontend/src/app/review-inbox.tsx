import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Mock Pending Auto-Detected Expenses for V2 Demo
const PENDING_EXPENSES = [
  { id: '1', merchant: 'Swiggy', amount: 450, suggestedCategory: 'Food', source: 'SMS', confidence: 95, originalText: 'Paid INR 450.00 to Swiggy via HDFC Bank' },
  { id: '2', merchant: 'Jio Prepaid', amount: 299, suggestedCategory: 'Recharge', source: 'Notification', confidence: 88, originalText: 'Recharge of ₹299 successful for Jio' }
];

export default function ReviewInboxScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [inbox, setInbox] = useState(PENDING_EXPENSES);

  const handleApprove = (id: string) => {
    // In final, this calls `addExpense` to DB
    setInbox(prev => prev.filter(item => item.id !== id));
  };

  const handleIgnore = (id: string) => {
    setInbox(prev => prev.filter(item => item.id !== id));
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.header}>
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
          inbox.map(item => (
            <View key={item.id} style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.merchantName, isDark ? styles.textLight : styles.textDark]}>{item.merchant}</Text>
                  <Text style={styles.sourceText}>Detected via {item.source}</Text>
                </View>
                <Text style={styles.amountText}>₹{item.amount}</Text>
              </View>

              <View style={styles.suggestionBox}>
                <Ionicons name="bulb" size={16} color="#f59e0b" />
                <Text style={styles.suggestionText}>Suggested: <Text style={{fontWeight: '700'}}>{item.suggestedCategory}</Text> ({item.confidence}% match)</Text>
              </View>

              <Text style={styles.originalText}>"{item.originalText}"</Text>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnIgnore]} onPress={() => handleIgnore(item.id)}>
                  <Ionicons name="close" size={20} color="#ef4444" />
                  <Text style={styles.btnIgnoreText}>Ignore</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.btnApprove]} onPress={() => handleApprove(item.id)}>
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                  <Text style={styles.btnApproveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  content: { padding: 20 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 16, color: '#64748b', marginTop: 8 },
  card: { padding: 20, borderRadius: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  cardLight: { backgroundColor: '#ffffff' },
  cardDark: { backgroundColor: '#1f2937' },
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
  btnApproveText: { color: '#ffffff', fontWeight: '700', marginLeft: 6 }
});
