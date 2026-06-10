import { View, Text, StyleSheet, ScrollView, useColorScheme, Dimensions } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getWalletTotals } from '../../utils/database';

const screenWidth = Dimensions.get("window").width;

export default function Reports() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [totals, setTotals] = useState({ sharedTotal: 0, privateTotal: 0 });

  useFocusEffect(
    useCallback(() => {
      getWalletTotals(db).then(setTotals);
    }, [db])
  );

  const combinedTotal = totals.sharedTotal + totals.privateTotal;

  const chartConfig = {
    backgroundGradientFrom: isDark ? "#1f2937" : "#ffffff",
    backgroundGradientTo: isDark ? "#1f2937" : "#ffffff",
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
  };

  const pieData = [
    { name: "Food", amount: 4500, color: "#ef4444", legendFontColor: isDark ? "#fff" : "#374151", legendFontSize: 12 },
    { name: "Grocery", amount: 8200, color: "#f59e0b", legendFontColor: isDark ? "#fff" : "#374151", legendFontSize: 12 },
    { name: "Recharge", amount: 1500, color: "#3b82f6", legendFontColor: isDark ? "#fff" : "#374151", legendFontSize: 12 },
    { name: "Other", amount: 2450, color: "#10b981", legendFontColor: isDark ? "#fff" : "#374151", legendFontSize: 12 }
  ];

  const lineData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{ data: [20, 45, 28, 80, 99, 43] }]
  };

  return (
    <ScrollView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Spending Reports</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#10b981' }]}>
          <Text style={styles.summaryLabel}>Family Shared</Text>
          <Text style={styles.summaryAmount}>₹{totals.sharedTotal.toLocaleString('en-IN')}</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#f97316' }]}>
          <Text style={styles.summaryLabel}>Personal Private</Text>
          <Text style={styles.summaryAmount}>₹{totals.privateTotal.toLocaleString('en-IN')}</Text>
        </View>
      </View>
      
      <View style={[styles.totalCard, isDark ? styles.cardDark : styles.cardLight]}>
        <Text style={[styles.totalLabel, isDark ? styles.textLight : styles.textDark]}>Combined Total Spending</Text>
        <Text style={styles.totalValue}>₹{combinedTotal.toLocaleString('en-IN')}</Text>
      </View>

      {/* Charts */}
      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Category Distribution</Text>
      <View style={[styles.chartWrapper, isDark ? styles.cardDark : styles.cardLight]}>
        <PieChart
          data={pieData}
          width={screenWidth - 40}
          height={200}
          chartConfig={chartConfig}
          accessor={"amount"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          center={[10, 0]}
          absolute
        />
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Monthly Trend</Text>
      <View style={[styles.chartWrapper, isDark ? styles.cardDark : styles.cardLight, { paddingLeft: 0, paddingRight: 0 }]}>
        <LineChart
          data={lineData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          }}
          bezier
          style={{ borderRadius: 16 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#111827' },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  summaryBox: { flex: 1, padding: 16, borderRadius: 16, elevation: 2 },
  summaryLabel: { color: '#ffffff', opacity: 0.9, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  summaryAmount: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  cardLight: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardDark: { backgroundColor: '#1f2937' },
  totalCard: { padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 32 },
  totalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#6b7280' },
  totalValue: { fontSize: 36, fontWeight: '900', color: '#3b82f6' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  chartWrapper: { borderRadius: 16, padding: 16, marginBottom: 32, overflow: 'hidden' }
});
