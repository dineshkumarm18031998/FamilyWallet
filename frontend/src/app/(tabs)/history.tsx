import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function History() {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});

  const fetchMonthData = useCallback(async (year: string, month: string) => {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0).toISOString();
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
    const rows = await db.getAllAsync('SELECT date FROM expenses WHERE date >= ? AND date <= ?', [start, end]);
    
    let marks: any = {};
    rows.forEach((row: any) => {
      const d = new Date(row.date);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!marks[ds]) {
        marks[ds] = { marked: true, dotColor: '#10b981' };
      }
    });
    
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#3b82f6' };
    setMarkedDates(marks);
  }, [db, selectedDate]);

  const loadExpenses = useCallback(async () => {
    const parts = selectedDate.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    let startStr = '';
    let endStr = '';

    if (period === 'day') {
      const start = new Date(year, month, day, 0, 0, 0);
      const end = new Date(year, month, day, 23, 59, 59);
      startStr = start.toISOString();
      endStr = end.toISOString();
    } else if (period === 'week') {
      const start = new Date(year, month, day, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(year, month, day, 23, 59, 59);
      end.setDate(end.getDate() - end.getDay() + 6);
      startStr = start.toISOString();
      endStr = end.toISOString();
    } else if (period === 'month') {
      const start = new Date(year, month, 1, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      startStr = start.toISOString();
      endStr = end.toISOString();
    } else {
      const start = new Date(year, 0, 1, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59);
      startStr = start.toISOString();
      endStr = end.toISOString();
    }

    const rows = await db.getAllAsync('SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC', [startStr, endStr]);
    setExpenses(rows);
  }, [db, selectedDate, period]);

  useFocusEffect(
    useCallback(() => {
      const d = new Date(selectedDate);
      fetchMonthData(d.getFullYear().toString(), (d.getMonth() + 1).toString());
      loadExpenses();
    }, [selectedDate, period, fetchMonthData, loadExpenses])
  );

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const handleMonthChange = (month: any) => {
    fetchMonthData(month.year.toString(), month.month.toString());
  };

  const exportPDF = async () => {
    if (expenses.length === 0) {
      Alert.alert('No Data', 'There are no transactions in this period to export.');
      return;
    }

    let rowsHtml = '';
    let total = 0;
    expenses.forEach(tx => {
      total += tx.amount;
      const d = new Date(tx.date);
      const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      rowsHtml += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${timeStr}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><strong>${tx.merchant}</strong><br><span style="color:#6b7280;font-size:12px;">${tx.category}</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #ef4444; text-align:right;">-₹${tx.amount.toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    let subtitle = `Transactions for ${selectedDate}`;
    if (period !== 'day') subtitle = `Transactions for the selected ${period}`;

    const html = `
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 40px; color: #111827;">
          <h1 style="color: #059669; text-align: center;">FamilyWallet Report</h1>
          <p style="text-align: center; color: #6b7280; font-size: 18px;">${subtitle}</p>
          <hr style="border: 0; border-top: 2px solid #e5e7eb; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left;">
                <th style="padding: 12px;">Date/Time</th>
                <th style="padding: 12px;">Merchant</th>
                <th style="padding: 12px; text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 16px; text-align: right; font-weight: bold; font-size: 18px;">Total Spent:</td>
                <td style="padding: 16px; text-align: right; font-weight: bold; font-size: 18px; color: #ef4444;">-₹${total.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
          <p style="text-align: center; color: #9ca3af; margin-top: 50px; font-size: 12px;">Generated via FamilyWallet Analytics</p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Transaction History' });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate or share PDF.');
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconMap: any = { Food: 'fast-food', Groceries: 'cart', Recharge: 'phone-portrait' };
    const colorMap: any = { Food: '#ef4444', Groceries: '#f59e0b', Recharge: '#3b82f6' };
    const icon = iconMap[item.category] || 'receipt';
    const color = colorMap[item.category] || '#10b981';
    const timeStr = new Date(item.date).toLocaleDateString() + ' ' + new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.txItem, isDark ? styles.borderDark : styles.borderLight]}>
        <View style={[styles.txIconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.txDetails}>
          <Text style={[styles.txName, isDark ? styles.textLight : styles.textDark]}>{item.merchant}</Text>
          <Text style={styles.txDate}>{timeStr} • {item.category}</Text>
        </View>
        <Text style={[styles.txAmount, { color: '#ef4444' }]}>-₹{item.amount.toLocaleString('en-IN')}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDark ? styles.textLight : styles.textDark]}>History</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={exportPDF}>
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.exportBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, period === 'day' && styles.tabActive]} onPress={() => setPeriod('day')}>
            <Text style={[styles.tabText, period === 'day' && styles.tabTextActive]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, period === 'week' && styles.tabActive]} onPress={() => setPeriod('week')}>
            <Text style={[styles.tabText, period === 'week' && styles.tabTextActive]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, period === 'month' && styles.tabActive]} onPress={() => setPeriod('month')}>
            <Text style={[styles.tabText, period === 'month' && styles.tabTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, period === 'year' && styles.tabActive]} onPress={() => setPeriod('year')}>
            <Text style={[styles.tabText, period === 'year' && styles.tabTextActive]}>Yearly</Text>
          </TouchableOpacity>
        </View>
      </View>

      {period === 'day' && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TouchableOpacity 
            style={[styles.dateSelectorBtn, isDark ? styles.cardDark : styles.cardLight]} 
            onPress={() => setCalendarOpen(!calendarOpen)}>
            <Ionicons name="calendar-outline" size={20} color={isDark ? '#f9fafb' : '#111827'} />
            <Text style={[styles.dateSelectorText, isDark ? styles.textLight : styles.textDark]}>
              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
            <Ionicons name={calendarOpen ? "chevron-up" : "chevron-down"} size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
        </View>
      )}

      {period === 'day' && calendarOpen && (
        <View style={[styles.calendarContainer, isDark ? styles.cardDark : styles.cardLight]}>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => { handleDayPress(day); setCalendarOpen(false); }}
            onMonthChange={handleMonthChange}
            markedDates={markedDates}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: isDark ? '#9ca3af' : '#6b7280',
              selectedDayBackgroundColor: '#3b82f6',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#10b981',
              dayTextColor: isDark ? '#f9fafb' : '#111827',
              textDisabledColor: isDark ? '#374151' : '#d1d5db',
              dotColor: '#10b981',
              selectedDotColor: '#ffffff',
              arrowColor: '#3b82f6',
              monthTextColor: isDark ? '#f9fafb' : '#111827',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
            }}
          />
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={[styles.listTitle, isDark ? styles.textLight : styles.textDark]}>
          Transactions ({period})
        </Text>
        <FlatList
          data={expenses}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No transactions found for this period.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#FAFAFA' },
  darkBg: { backgroundColor: '#0A0A0A' },
  header: { padding: 24, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  textLight: { color: '#ffffff' },
  textDark: { color: '#111827' },
  
  exportBtn: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(156, 163, 175, 0.2)', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#10b981', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#ffffff' },

  dateSelectorBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, justifyContent: 'space-between' },
  dateSelectorText: { fontSize: 15, fontWeight: '700', flex: 1, marginLeft: 12 },

  calendarContainer: { marginHorizontal: 20, borderRadius: 24, padding: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, marginBottom: 16 },
  cardLight: { backgroundColor: '#FFFFFF', borderColor: '#F3F4F6', borderWidth: 1 },
  cardDark: { backgroundColor: '#141414', borderColor: '#262626', borderWidth: 1 },
  
  listContainer: { flex: 1, marginTop: 16 },
  listTitle: { fontSize: 16, fontWeight: '700', marginHorizontal: 24, marginBottom: 12, textTransform: 'capitalize' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, backgroundColor: 'transparent' },
  borderLight: { borderBottomColor: '#F3F4F6' },
  borderDark: { borderBottomColor: '#262626' },
  txIconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txDetails: { flex: 1 },
  txName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  txDate: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  txAmount: { fontSize: 17, fontWeight: '800' },
});
