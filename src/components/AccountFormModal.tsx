import { useEffect, useState } from 'react';
import {
  Alert,
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
import { accountService } from '@/src/services/accountService';
import { ACCOUNT_TYPES, type Account, type AccountType } from '@/src/types';
import { isNonEmpty } from '@/src/utils/validators';

// One modal used for both Add and Edit. `account` null = add mode; otherwise
// the form is pre-filled for editing and a Delete action appears.
type AccountFormModalProps = {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: () => void; // parent reloads the list and closes the modal
};

export default function AccountFormModal({
  visible,
  account,
  onClose,
  onSaved,
}: AccountFormModalProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const surface = scheme === 'dark' ? '#1c1c1e' : '#ffffff';
  const isEdit = account !== null;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset / pre-fill the form whenever the modal opens or the target changes.
  useEffect(() => {
    if (visible) {
      setName(account?.name ?? '');
      setType((account?.type as AccountType) ?? 'CHECKING');
      setBalance(account ? String(account.balance) : '');
      setError(null);
    }
  }, [visible, account]);

  async function handleSave() {
    if (!isNonEmpty(name)) {
      setError('Please enter an account name.');
      return;
    }
    const parsedBalance = balance.trim() === '' ? 0 : Number(balance);
    if (Number.isNaN(parsedBalance)) {
      setError('Balance must be a number.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const input = { name: name.trim(), type, balance: parsedBalance };
      if (account) {
        await accountService.updateAccount(account.id, input);
      } else {
        await accountService.createAccount(input);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the account.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!account) return;
    Alert.alert(
      'Delete account',
      `Delete "${account.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    if (!account) return;
    setError(null);
    setDeleting(true);
    try {
      await accountService.deleteAccount(account.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the account.');
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: surface }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>
            {isEdit ? 'Edit account' : 'Add account'}
          </Text>

          <FormInput
            label="Account name"
            placeholder="e.g. Everyday Checking"
            value={name}
            onChangeText={setName}
            editable={!busy}
          />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Type</Text>
            <View style={styles.segment}>
              {ACCOUNT_TYPES.map((t) => {
                const selected = t === type;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setType(t)}
                    disabled={busy}
                    style={[
                      styles.segmentItem,
                      { borderColor: colors.tabIconDefault },
                      selected && { backgroundColor: colors.tint, borderColor: colors.tint },
                    ]}>
                    <Text style={[styles.segmentText, { color: selected ? '#fff' : colors.text }]}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FormInput
            label="Initial balance"
            placeholder="0.00"
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
            editable={!busy}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            title={isEdit ? 'Save changes' : 'Add account'}
            onPress={handleSave}
            loading={saving}
            disabled={busy}
          />

          {isEdit ? (
            <Pressable onPress={confirmDelete} disabled={busy} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete account'}</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onClose} disabled={busy} style={styles.cancelBtn}>
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
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#ff3b30',
  },
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
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
