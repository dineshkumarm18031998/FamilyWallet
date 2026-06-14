import { View, Text, StyleSheet, ScrollView, useColorScheme, Dimensions, TouchableOpacity } from 'react-native';
import { StackedBarChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getHistoricalTrends } from '../../utils/database';

const screenWidth = Dimensions.get("window").width;

export default function Reports() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [period, setPeriod] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [trends, setTrends] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const data = await getHistoricalTrends(db, period);
        setTrends(data);
      };
      loadData();
    }, [db, period])
  );

  // Process data for Stacked Bar Chart
  const chartData = useMemo(() => {
    const buckets = Array.from(new Set(trends.map(t => t.bucket))).sort();
    const categories = Array.from(new Set(trends.map(t => t.category))).sort();
    
    // Default colors
    const colorMap: Record<string, string> = { 
      Food: '#ef4444', Groceries: '#f59e0b', Recharge: '#3b82f6', DTH: '#8b5cf6', 
      Shopping: '#ec4899', Utilities: '#eab308', Rent: '#14b8a6', Fuel: '#f97316', 
      Medicine: '#10b981', Education: '#6366f1', Travel: '#0ea5e9', Other: '#9ca3af' 
    };
    const fallbackColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    const barColors = categories.map((c, i) => colorMap[c] || fallbackColors[i % fallbackColors.length]);
    
    const data = buckets.map(b => {
      return categories.map(c => {
        const match = trends.find(t => t.bucket === b && t.category === c);
        return match ? match.total : 0;
      });
    });
    
    // Format labels depending on period
    const labels = buckets.map(b => {
      if (period === 'Monthly') {
        const [, m] = b.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[parseInt(m, 10) - 1];
      }
      if (period === 'Weekly') {
        const [, w] = b.split('-');
        return `W${w}`;
      }
      return b;
    });

    // AI Insight Engine
    let insight = "Not enough data yet. Add more expenses to see your trend insights!";
    let averageStr = "";
    
    if (buckets.length > 0) {
      const totalSpendAllTime = data.reduce((sum, bucketArr) => sum + bucketArr.reduce((a, b) => a + b, 0), 0);
      const avg = Math.round(totalSpendAllTime / buckets.length);
      averageStr = `Historical Average: ₹${avg}/${period === 'Weekly' ? 'wk' : period === 'Monthly' ? 'mo' : 'yr'}`;
    }

    if (buckets.length >= 2) {
      const lastBucketTotal = data[data.length - 1].reduce((a, b) => a + b, 0);
      const prevBucketTotal = data[data.length - 2].reduce((a, b) => a + b, 0);
      const diff = lastBucketTotal - prevBucketTotal;
      const percent = prevBucketTotal > 0 ? Math.round((diff / prevBucketTotal) * 100) : 0;
      
      const pText = period.replace('ly','').toLowerCase();
      if (diff > 0) {
        insight = `You spent ${percent}% MORE in the latest ${pText} compared to the previous one. Try to stick to your budget!`;
      } else if (diff < 0) {
        insight = `Great job! You spent ${Math.abs(percent)}% LESS in the latest ${pText} compared to the previous one.`;
      } else {
        insight = `Your spending is exactly the same as the previous ${pText}. Consistent!`;
      }
    }

    return {
      labels: labels.length > 0 ? labels.slice(-12) : ["No Data"], // Show up to 12 bars max
      legend: categories.length > 0 ? categories : ["No Data"],
      data: data.length > 0 ? data.slice(-12) : [[0]],
      barColors: barColors.length > 0 ? barColors : ["#9ca3af"],
      insight,
      averageStr
    };
  }, [trends, period]);

  const chartConfig = {
    backgroundGradientFrom: isDark ? "#1f2937" : "#ffffff",
    backgroundGradientTo: isDark ? "#1f2937" : "#ffffff",
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 10,
    }
  };

  return (
    <ScrollView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isDark ? styles.textLight : styles.textDark]}>Analytics</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, isDark ? styles.tabBgDark : styles.tabBgLight]}>
        {(['Weekly', 'Monthly', 'Yearly'] as const).map(p => (
          <TouchableOpacity 
            key={p} 
            style={[styles.tab, period === p && styles.tabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[
              styles.tabText, 
              isDark ? styles.textLight : styles.textDark,
              period === p && styles.tabTextActive
            ]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Insight Card */}
      <View style={[styles.insightCard, isDark ? styles.cardDark : styles.cardLight]}>
        <View style={styles.insightHeader}>
          <Text style={styles.insightIcon}>✨</Text>
          <Text style={[styles.insightTitle, isDark ? styles.textLight : styles.textDark]}>AI Insight</Text>
        </View>
        <Text style={[styles.insightText, isDark ? styles.textMutedDark : styles.textMutedLight]}>
          {chartData.insight}
        </Text>
        {chartData.averageStr ? (
          <View style={styles.averageBadge}>
            <Text style={styles.averageText}>{chartData.averageStr}</Text>
          </View>
        ) : null}
      </View>

      {/* Stacked Bar Chart */}
      <View style={styles.chartWrapper}>
        <Text style={[styles.chartTitle, isDark ? styles.textLight : styles.textDark]}>
          {period} Trends & Categories
        </Text>
        
        {chartData.labels.length > 0 ? (
          <View style={[styles.chartCard, isDark ? styles.cardDark : styles.cardLight]}>
            <StackedBarChart
              style={styles.chart}
              data={{
                labels: chartData.labels,
                legend: chartData.legend,
                data: chartData.data,
                barColors: chartData.barColors
              }}
              width={screenWidth - 48}
              height={260}
              chartConfig={chartConfig}
              hideLegend={false}
              decimalPlaces={0}
            />
          </View>
        ) : (
          <View style={[styles.emptyChart, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={[styles.emptyText, isDark ? styles.textMutedDark : styles.textMutedLight]}>No expenses found</Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#F3F4F6' },
  darkBg: { backgroundColor: '#111827' },
  textDark: { color: '#111827' },
  textLight: { color: '#ffffff' },
  textMutedDark: { color: '#9ca3af' },
  textMutedLight: { color: '#6b7280' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24
  },
  tabBgLight: { backgroundColor: '#e5e7eb' },
  tabBgDark: { backgroundColor: '#1f2937' },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  
  insightCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)'
  },
  cardLight: { backgroundColor: '#ffffff' },
  cardDark: { backgroundColor: '#1f2937' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  insightIcon: { fontSize: 18, marginRight: 8 },
  insightTitle: { fontSize: 16, fontWeight: '700' },
  insightText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  averageBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  averageText: { color: '#10b981', fontSize: 13, fontWeight: '700' },

  chartWrapper: { marginHorizontal: 24 },
  chartTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden'
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
    marginLeft: -16 // Shift left to align labels
  },
  emptyChart: { height: 220, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '500' }
});
