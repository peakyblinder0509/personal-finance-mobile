import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import Card from '@/src/components/Card';
import ProgressBar from '@/src/components/ProgressBar';
import Skeleton from '@/src/components/Skeleton';
import { useApi } from '@/src/hooks/useApi';
import { accountService } from '@/src/services/accountService';
import { aiService } from '@/src/services/aiService';
import { alertService } from '@/src/services/alertService';
import { budgetService } from '@/src/services/budgetService';
import { transactionService } from '@/src/services/transactionService';
import { formatCurrency } from '@/src/utils/format';
import { budgetLevel, budgetPercent, summarizeMonth, sumBalances, type BudgetLevel } from '@/src/utils/finance';

// Color per budget health level (also used for net/savings sign).
const LEVEL_COLOR: Record<BudgetLevel, string> = {
  ok: '#34c759',
  warning: '#ff9f0a',
  exceeded: '#ff3b30',
};
const NEGATIVE = '#ff3b30';
const POSITIVE = '#34c759';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const screenBg = scheme === 'dark' ? '#000' : '#f2f2f7';

  return (
    <ScrollView
      style={{ backgroundColor: screenBg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <DashboardHeader />
      <NetWorthCard />
      <MonthSummaryCard />
      <BudgetHealthCard />
      <AiSummaryCard />
      <Text style={[styles.footnote, { color: colors.text }]}>Revisit the tab to refresh.</Text>
    </ScrollView>
  );
}

// ─── Header with unread-alerts badge ────────────────────────────────────────
function DashboardHeader() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const fetchCount = useCallback(() => alertService.getUnreadCount(), []);
  const { data: count, reload } = useApi(fetchCount);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const showBadge = (count ?? 0) > 0;

  return (
    <View style={styles.header}>
      <Text style={[styles.h1, { color: colors.text }]}>Dashboard</Text>
      <View>
        <Ionicons name="notifications-outline" size={26} color={colors.text} />
        {showBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count! > 99 ? '99+' : count}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── 1. Net Worth ───────────────────────────────────────────────────────────
function NetWorthCard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const fetcher = useCallback(() => accountService.getAccounts(), []);
  const { data, loading, error, reload } = useApi(fetcher);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <Card title="Net Worth">
      {loading && !data ? (
        <Skeleton width="60%" height={32} />
      ) : error ? (
        <SectionError message="Couldn't load accounts" />
      ) : (
        <Text style={[styles.bigValue, { color: colors.text }]}>
          {formatCurrency(sumBalances(data ?? []))}
        </Text>
      )}
    </Card>
  );
}

// ─── 2. This Month (income / expenses / net savings) ────────────────────────
function MonthSummaryCard() {
  const fetcher = useCallback(() => transactionService.getCurrentMonth(), []);
  const { data, loading, error, reload } = useApi(fetcher);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  if (loading && !data) {
    return (
      <Card title="This Month">
        <Skeleton width="100%" height={20} />
        <Skeleton width="80%" height={20} />
        <Skeleton width="50%" height={20} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card title="This Month">
        <SectionError message="Couldn't load transactions" />
      </Card>
    );
  }

  const { income, expenses, net } = summarizeMonth(data ?? []);
  return (
    <Card title="This Month">
      <SummaryRow label="Income" value={formatCurrency(income)} color={POSITIVE} />
      <SummaryRow label="Expenses" value={formatCurrency(expenses)} color={NEGATIVE} />
      <SummaryRow
        label="Net savings"
        value={formatCurrency(net)}
        color={net >= 0 ? POSITIVE : NEGATIVE}
        emphasize
      />
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  color,
  emphasize,
}: {
  label: string;
  value: string;
  color: string;
  emphasize?: boolean;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  return (
    <View style={[styles.row, emphasize && styles.rowEmphasize]}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color }, emphasize && styles.rowValueEmphasize]}>{value}</Text>
    </View>
  );
}

// ─── 3. Budget Health ───────────────────────────────────────────────────────
function BudgetHealthCard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const fetcher = useCallback(() => budgetService.getBudgets(), []);
  const { data, loading, error, reload } = useApi(fetcher);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <Card title="Budget Health">
      {loading && !data ? (
        <>
          <Skeleton width="100%" height={36} />
          <Skeleton width="100%" height={36} />
        </>
      ) : error ? (
        <SectionError message="Couldn't load budgets" />
      ) : (data ?? []).length === 0 ? (
        <Text style={[styles.muted, { color: colors.text }]}>No budgets yet.</Text>
      ) : (
        (data ?? []).map((b) => {
          const level = budgetLevel(b);
          const pct = budgetPercent(b);
          return (
            <View key={b.id} style={styles.budgetRow}>
              <View style={styles.budgetHeader}>
                <Text style={[styles.budgetCategory, { color: colors.text }]}>{b.category}</Text>
                <Text style={[styles.budgetAmount, { color: colors.text }]}>
                  {formatCurrency(b.spentAmount)} / {formatCurrency(b.limitAmount)}
                </Text>
              </View>
              <ProgressBar percent={pct} color={LEVEL_COLOR[level]} />
              <Text style={[styles.budgetPct, { color: LEVEL_COLOR[level] }]}>
                {Math.round(pct)}% used
                {level === 'exceeded' ? ' · over budget' : level === 'warning' ? ' · approaching limit' : ''}
              </Text>
            </View>
          );
        })
      )}
    </Card>
  );
}

// ─── 4. AI Spending Summary (skeleton while loading; graceful failure) ───────
function AiSummaryCard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];

  const fetcher = useCallback(() => aiService.getSpendingSummary(), []);
  const { data, loading, error, reload } = useApi(fetcher);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  return (
    <Card title="AI Spending Summary">
      {loading && !data ? (
        <>
          <Skeleton width="100%" height={14} />
          <Skeleton width="95%" height={14} />
          <Skeleton width="70%" height={14} />
        </>
      ) : error ? (
        <Text style={[styles.muted, { color: colors.text }]}>Insights unavailable</Text>
      ) : (
        <Text style={[styles.aiText, { color: colors.text }]}>{data?.summary}</Text>
      )}
    </Card>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────────
function SectionError({ message }: { message: string }) {
  return <Text style={styles.errorText}>{message}</Text>;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  h1: {
    fontSize: 30,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  bigValue: {
    fontSize: 34,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowEmphasize: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8e8e93',
    marginTop: 4,
    paddingTop: 10,
  },
  rowLabel: {
    fontSize: 15,
    opacity: 0.8,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowValueEmphasize: {
    fontSize: 18,
    fontWeight: '800',
  },
  budgetRow: {
    gap: 6,
    paddingVertical: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetCategory: {
    fontSize: 15,
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 13,
    opacity: 0.7,
  },
  budgetPct: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiText: {
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    fontSize: 14,
    opacity: 0.6,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
  },
  footnote: {
    fontSize: 12,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 4,
  },
});
