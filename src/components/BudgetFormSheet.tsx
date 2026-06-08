import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import FormInput from '@/src/components/FormInput';
import PrimaryButton from '@/src/components/PrimaryButton';
import { budgetService } from '@/src/services/budgetService';
import { isNonEmpty } from '@/src/utils/validators';

// Add-budget bottom sheet. The month/year come from the screen's selector, so
// the new budget lands in the month the user is viewing.
type BudgetFormSheetProps = {
  visible: boolean;
  month: number;
  year: number;
  monthLabel: string;
  onClose: () => void;
  onCreated: () => void;
};

export default function BudgetFormSheet({
  visible,
  month,
  year,
  monthLabel,
  onClose,
  onCreated,
}: BudgetFormSheetProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const surface = scheme === 'dark' ? '#1c1c1e' : '#ffffff';

  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCategory('');
      setLimit('');
      setError(null);
    }
  }, [visible]);

  async function handleSave() {
    if (!isNonEmpty(category)) {
      setError('Please enter a category.');
      return;
    }
    const parsedLimit = Number(limit);
    if (!limit.trim() || Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      setError('Enter a monthly limit greater than 0.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await budgetService.createBudget({
        category: category.trim(),
        limitAmount: parsedLimit,
        month,
        year,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the budget.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: surface }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>Add budget</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>for {monthLabel}</Text>

          <FormInput
            label="Category"
            placeholder="e.g. Dining"
            value={category}
            onChangeText={setCategory}
            editable={!saving}
          />
          <FormInput
            label="Monthly limit"
            placeholder="0.00"
            keyboardType="numeric"
            value={limit}
            onChangeText={setLimit}
            editable={!saving}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Add budget" onPress={handleSave} loading={saving} disabled={saving} />
          <Pressable onPress={onClose} disabled={saving} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8e8e93',
    opacity: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: -10,
  },
  error: {
    color: '#ff3b30',
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    opacity: 0.7,
  },
});
