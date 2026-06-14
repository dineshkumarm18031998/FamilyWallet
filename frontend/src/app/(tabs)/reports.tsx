import { View, Text, StyleSheet, ScrollView, useColorScheme, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getCategoryTotalsForPeriod, getTrendData } from '../../utils/database';

const screenWidth = Dimensions.get("window").width;

export default function Reports() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  const [pieData, setPieData] = useState<any[]>([]);
  const [lineData, setLineData] = useState<any>({ labels: [], datasets: [{ data: [] }] });
  const [combinedTotal, setCombinedTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-12
        
        let startStr = '';
        let endStr = currentDate.toISOString();
        
        if (period === 'week') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          startStr = d.toISOString();
        } else if (period === 'month') {
          startStr = `${currentYear}-${currentMonth < 10 ? '0'+currentMonth : currentMonth}-01`;
          endStr = `${currentYear}-${currentMonth < 10 ? '0'+currentMonth : currentMonth}-31`;
        } else {
          startStr = `${currentYear}-01-01`;
          endStr = `${currentYear}-12-31`;
        }

        // Fetch Pie Chart Data
        const stats = await getCategoryTotalsForPeriod(db, startStr, endStr);
        let totalSum = 0;
        
        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
        
        const formattedPie = stats.map((s: any, idx: number) => {
          totalSum += s.total;
          return {
            name: s.category,
            amount: s.total,
            color: colors[idx % colors.length],
            legendFontColor: isDark ? "#fff" : "#374151",
            legendFontSize: 12
          }
        });
        
        if (totalSum === 0) {
          setPieData([{ name: "No Data", amount: 1, color: isDark ? "#374151" : "#e5e7eb", legendFontColor: isDark ? "#fff" : "#374151", legendFontSize: 12 }]);
        } else {
          setPieData(formattedPie);
        }
        setCombinedTotal(totalSum);

        // Fetch Line Chart Data
        const trends = await getTrendData(db, period, currentYear, currentMonth);
        let labels: string[] = [];
        let dataPoints: number[] = [];
        
        if (trends.length === 0) {
          labels = ['Start', 'No Data'];
          dataPoints = [0, 0];
        } else if (trends.length === 1) {
          const d = new Date(trends[0].date);
          const lbl = (period === 'week' || period === 'month') ? `${d.getDate()}/${d.getMonth()+1}` : d.toLocaleString('default', { month: 'short' });
          labels = ['Start', lbl];
          dataPoints = [0, trends[0].total];
        } else {
          // Format based on period
          trends.forEach((t: any) => {
            const d = new Date(t.date);
            if (period === 'week' || period === 'month') {
              labels.push(`${d.getDate()}/${d.getMonth()+1}`);
            } else {
              labels.push(d.toLocaleString('default', { month: 'short' }));
            }
            dataPoints.push(t.total);
          });
        }
        
        setLineData({
          labels: labels.slice(-6), // show last 6 points max for UI space
          datasets: [{ data: dataPoints.slice(-6) }]
        });
      };
      
      loadData();
    }, [db, period])
  );

  const chartConfig = {
    backgroundGradientFrom: isDark ? "#1f2937" : "#ffffff",
    backgroundGradientTo: isDark ? "#1f2937" : "#ffffff",
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
  };

  return (
    <ScrollView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>Analytics</Text>
      </View>

      {/* Period Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, period === 'week' && styles.tabActive]} onPress={() => setPeriod('week')}>
          <Text style={[styles.tabText, period === 'week' && styles.tabTextActive, isDark && period !== 'week' && styles.textLightMuted]}>1 Week</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, period === 'month' && styles.tabActive]} onPress={() => setPeriod('month')}>
          <Text style={[styles.tabText, period === 'month' && styles.tabTextActive, isDark && period !== 'month' && styles.textLightMuted]}>1 Month</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, period === 'year' && styles.tabActive]} onPress={() => setPeriod('year')}>
          <Text style={[styles.tabText, period === 'year' && styles.tabTextActive, isDark && period !== 'year' && styles.textLightMuted]}>1 Year</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.totalCard, isDark ? styles.cardDark : styles.cardLight]}>
        <Text style={[styles.totalLabel, isDark ? styles.textLightMuted : styles.textDarkMuted]}>Total Spent ({period})</Text>
        <Text style={styles.totalValue}>₹{combinedTotal.toLocaleString('en-IN')}</Text>
      </View>

      {/* Charts */}
      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Category Distribution</Text>
      <View style={[styles.chartWrapper, isDark ? styles.cardDark : styles.cardLight]}>
        {pieData.length === 0 ? (
          <Text style={{textAlign: 'center', padding: 40, color: '#9ca3af'}}>No transactions found for this period.</Text>
        ) : (
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
        )}
      </View>

      <Text style={[styles.sectionTitle, isDark ? styles.textLight : styles.textDark]}>Spending Trend</Text>
      <View style={[styles.chartWrapper, isDark ? styles.cardDark : styles.cardLight, { paddingLeft: 0, paddingRight: 0 }]}>
        {lineData.labels.length === 0 ? (
          <Text style={{textAlign: 'center', padding: 40, color: '#9ca3af'}}>No spending trend available.</Text>
        ) : (
          <LineChart
            data={lineData}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            }}
            bezier={lineData.datasets[0]?.data?.length > 2 && new Set(lineData.datasets[0]?.data).size > 1}
            style={{ borderRadius: 16 }}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  lightBg: { backgroundColor: '#f3f4f6' },
  darkBg: { backgroundColor: '#0A0A0A' },
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800' },
  textLight: { color: '#f9fafb' },
  textDark: { color: '#1f2937' },
  textLightMuted: { color: '#9ca3af' },
  textDarkMuted: { color: '#6b7280' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(156, 163, 175, 0.2)', borderRadius: 12, padding: 4, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#10b981', elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#ffffff' },

  cardLight: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardDark: { backgroundColor: '#141414', borderColor: '#262626', borderWidth: 1 },
  totalCard: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 24 },
  totalLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  totalValue: { fontSize: 40, fontWeight: '900', color: '#3b82f6', letterSpacing: -1 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  chartWrapper: { borderRadius: 20, padding: 16, marginBottom: 32, overflow: 'hidden' }
});
