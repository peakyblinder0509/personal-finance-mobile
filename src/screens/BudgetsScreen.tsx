import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import BudgetFormSheet from '@/src/components/BudgetFormSheet';
import Card from '@/src/components/Card';
import MarkdownText from '@/src/components/MarkdownText';
import ProgressBar from '@/src/components/ProgressBar';
import Skeleton from '@/src/components/Skeleton';
import { useApi } from '@/src/hooks/useApi';
import { aiService } from '@/src/services/aiService';
import { budgetService } from '@/src/services/budgetService';
import type { BudgetStatus } from '@/src/types';
import { formatCurrency } from '@/src/utils/format';
import { BUDGET_LEVEL_COLOR, budgetLevel, budgetPercent } from '@/src/utils/finance';

function monthLabelFor(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export default function BudgetsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const screenBg = scheme === 'dark' ? '#000' : '#f2f2f7';

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const [budgets, setBudgets] = useState<BudgetStatus[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const label = monthLabelFor(month, year);

  const load = useCallback(async () => {
    setError(null);
    try {
      setBudgets(await budgetService.getBudgets({ month, year }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load budgets.');
    }
  }, [month, year]);

  useEffect(() => {
    void load();
  }, [load]);

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

  function shiftMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  }

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }>
        {/* Monthly selector */}
        <View style={styles.selector}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={8} style={styles.arrow}>
            <Ionicons name="chevron-back" size={24} color={colors.tint} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{label}</Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={8} style={styles.arrow}>
            <Ionicons name="chevron-forward" size={24} color={colors.tint} />
          </Pressable>
        </View>

        <Pressable onPress={() => setFormVisible(true)} style={[styles.addBtn, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add budget</Text>
        </Pressable>

        {/* Budget list */}
        {budgets === null && !error ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : budgets && budgets.length === 0 ? (
          <Text style={[styles.muted, { color: colors.text }]}>No budgets for {label}.</Text>
        ) : (
          budgets?.map((b) => <BudgetCard key={b.id} budget={b} />)
        )}

        <AiBudgetAdviceCard />
      </ScrollView>

      <BudgetFormSheet
        visible={formVisible}
        month={month}
        year={year}
        monthLabel={label}
        onClose={() => setFormVisible(false)}
        onCreated={() => {
          setFormVisible(false);
          void load();
        }}
      />
    </View>
  );
}

function BudgetCard({ budget }: { budget: BudgetStatus }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const pct = budgetPercent(budget);
  const color = BUDGET_LEVEL_COLOR[budgetLevel(budget)];

  return (
    <Card>
      <View style={styles.cardHeader}>
        <Text style={[styles.category, { color: colors.text }]}>{budget.category}</Text>
        <Text style={[styles.pct, { color }]}>{Math.round(pct)}%</Text>
      </View>
      <ProgressBar percent={pct} color={color} />
      <Text style={[styles.amounts, { color: colors.text }]}>
        {formatCurrency(budget.spentAmount)} of {formatCurrency(budget.limitAmount)}
      </Text>
    </Card>
  );
}

function AiBudgetAdviceCard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const fetcher = useCallback(() => aiService.getBudgetAdvice(), []);
  const { data, loading, error, reload } = useApi(fetcher);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <Card style={styles.adviceCard}>
      <View style={styles.adviceHeader}>
        <Text style={[styles.adviceTitle, { color: colors.text }]}>AI Budget Advice</Text>
        <Pressable onPress={() => void reload()} disabled={loading} hitSlop={8}>
          <Ionicons name="refresh" size={20} color={loading ? colors.tabIconDefault : colors.tint} />
        </Pressable>
      </View>
      {loading ? (
        // This call is slow (several seconds) — a spinner with a label reads
        // better than a frozen card.
        <View style={styles.adviceLoading}>
          <ActivityIndicator color={colors.tint} />
          <Text style={[styles.muted, { color: colors.text }]}>Generating advice…</Text>
        </View>
      ) : error ? (
        <View style={styles.adviceError}>
          <Text style={[styles.muted, { color: colors.text }]}>Couldn’t load budget advice.</Text>
          <Pressable onPress={() => void reload()} style={[styles.retryBtn, { borderColor: colors.tint }]}>
            <Ionicons name="refresh" size={16} color={colors.tint} />
            <Text style={{ color: colors.tint, fontWeight: '600' }}>Retry</Text>
          </Pressable>
        </View>
      ) : data ? (
        <MarkdownText text={data} color={colors.text} />
      ) : null}
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <Skeleton width="40%" height={16} />
      <Skeleton width="100%" height={8} />
      <Skeleton width="50%" height={12} />
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 16,
    fontWeight: '700',
  },
  pct: {
    fontSize: 15,
    fontWeight: '700',
  },
  amounts: {
    fontSize: 13,
    opacity: 0.7,
  },
  adviceCard: {
    marginTop: 8,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  muted: {
    fontSize: 14,
    opacity: 0.6,
  },
  adviceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  adviceError: {
    gap: 10,
    paddingVertical: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  error: {
    color: '#ff3b30',
    textAlign: 'center',
    marginVertical: 16,
  },
});
