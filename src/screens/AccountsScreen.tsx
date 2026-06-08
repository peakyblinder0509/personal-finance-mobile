import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import AccountFormModal from '@/src/components/AccountFormModal';
import { accountService } from '@/src/services/accountService';
import type { Account } from '@/src/types';
import { formatCurrency } from '@/src/utils/format';
import { sumBalances } from '@/src/utils/finance';

const POSITIVE = '#34c759';
const NEGATIVE = '#ff3b30';

export default function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const screenBg = scheme === 'dark' ? '#000' : '#f2f2f7';

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal: null target = add mode; an account = edit mode.
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAccounts(await accountService.getAccounts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load accounts.');
    }
  }, []);

  // Reload whenever the tab gains focus (e.g. after adding a transaction).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  function openAdd() {
    setEditing(null);
    setModalVisible(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setModalVisible(true);
  }

  function onSaved() {
    setModalVisible(false);
    void load();
  }

  const netWorth = sumBalances(accounts ?? []);

  const header = (
    <View style={styles.header}>
      <View>
        <Text style={[styles.netLabel, { color: colors.text }]}>Net Worth</Text>
        <Text style={[styles.netValue, { color: netWorth >= 0 ? colors.text : NEGATIVE }]}>
          {formatCurrency(netWorth)}
        </Text>
      </View>
      <Pressable onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.tint }]}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Add</Text>
      </Pressable>
    </View>
  );

  // Initial load (no data yet, no error): show a spinner.
  if (accounts === null && !error) {
    return (
      <View style={[styles.center, { backgroundColor: screenBg, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <FlatList
        data={accounts ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 12 }]}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <AccountRow account={item} onPress={() => openEdit(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={[styles.muted, { color: colors.text }]}>
              No accounts yet. Tap “Add” to create one.
            </Text>
          )
        }
      />

      <AccountFormModal
        visible={modalVisible}
        account={editing}
        onClose={() => setModalVisible(false)}
        onSaved={onSaved}
      />
    </View>
  );
}

function AccountRow({ account, onPress }: { account: Account; onPress: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const surface = scheme === 'dark' ? '#1c1c1e' : '#ffffff';
  const balanceColor = account.balance >= 0 ? POSITIVE : NEGATIVE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: surface }, pressed && styles.rowPressed]}>
      <View style={styles.rowLeft}>
        <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
        <Text style={[styles.accountType, { color: colors.text }]}>{account.type}</Text>
      </View>
      <Text style={[styles.accountBalance, { color: balanceColor }]}>
        {formatCurrency(account.balance)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  netValue: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLeft: {
    gap: 2,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 12,
    opacity: 0.5,
  },
  accountBalance: {
    fontSize: 17,
    fontWeight: '700',
  },
  muted: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 24,
  },
  error: {
    color: '#ff3b30',
    textAlign: 'center',
    marginTop: 24,
  },
});
