import { useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useGroup, useGroups } from '@/src/store/GroupsProvider'
import { formatMoney, toInputValue, toKurus } from '@/src/lib/money'
import { splitEqually, validateShares } from '@/src/lib/split'
import { createId } from '@/src/lib/id'
import { CATEGORIES, type Category, type Group, type Share } from '@/src/lib/types'
import { Avatar, Button, Chip, SectionTitle } from '@/src/components/ui'
import { CATEGORY_META, colors } from '@/src/theme'

export default function ExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>()
  const { group } = useGroup(id)

  // Wait for saved data to load, otherwise the form would start with no members selected
  if (!group) return null
  return <ExpenseForm group={group} expenseId={expenseId} />
}

function ExpenseForm({ group, expenseId }: { group: Group; expenseId?: string }) {
  const router = useRouter()
  const { dispatch } = useGroups()
  const existing = group.expenses.find((e) => e.id === expenseId)

  const [description, setDescription] = useState(existing?.description ?? '')
  const [amountText, setAmountText] = useState(existing ? toInputValue(existing.amount) : '')
  const [category, setCategory] = useState<Category>(existing?.category ?? 'food')
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? group.members[0]?.id ?? '')
  const [splitType, setSplitType] = useState<'equal' | 'exact'>(existing?.splitType ?? 'equal')
  const [included, setIncluded] = useState<string[]>(
    existing?.shares.map((s) => s.memberId) ?? group.members.map((m) => m.id)
  )
  const [exact, setExact] = useState<Record<string, string>>(
    Object.fromEntries(existing?.splitType === 'exact' ? existing.shares.map((s) => [s.memberId, toInputValue(s.amount)]) : [])
  )

  const parsedAmount = toKurus(amountText)
  const amount = parsedAmount ?? 0
  // Without this the Save button would just stay disabled for input like "1.250,50"
  const amountUnreadable = amountText.trim() !== '' && parsedAmount === null

  // Shares are derived from the inputs on every render, so the preview is always correct
  const shares: Share[] = useMemo(() => {
    if (splitType === 'equal') {
      const ids = group.members.map((m) => m.id).filter((memberId) => included.includes(memberId))
      return splitEqually(amount, ids)
    }
    return group.members
      .map((m) => ({ memberId: m.id, amount: toKurus(exact[m.id] ?? '') ?? 0 }))
      .filter((s) => s.amount > 0)
  }, [group, splitType, included, exact, amount])

  const validation = validateShares(amount, shares)
  const canSave = description.trim().length > 0 && validation.ok

  const save = () => {
    if (!canSave) return
    dispatch({
      type: 'saveExpense',
      groupId: group.id,
      expense: {
        id: existing?.id ?? createId(),
        description: description.trim(),
        amount,
        paidBy,
        shares,
        splitType,
        category,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      },
    })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    router.back()
  }

  const remove = () =>
    Alert.alert('Delete expense', `Delete "${existing?.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'deleteExpense', groupId: group.id, expenseId: existing!.id })
          router.back()
        },
      },
    ])

  const toggle = (memberId: string) =>
    setIncluded((prev) => (prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId]))

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Edit expense' : 'New expense' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.amountInput}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0,00"
          keyboardType="decimal-pad"
          accessibilityLabel="Amount in TL"
          autoFocus={!existing}
        />
        <Text style={styles.currency}>TL</Text>
        {amountUnreadable && (
          <Text style={[styles.error, { textAlign: 'center', marginTop: -8, marginBottom: 16 }]}>
            Type the amount with digits and one comma or dot, for example 12,50
          </Text>
        )}

        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="What was it for? e.g. Dinner"
          accessibilityLabel="Description"
        />

        <SectionTitle>Category</SectionTitle>
        <View style={styles.wrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_META[c].label} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <SectionTitle>Paid by</SectionTitle>
        <View style={styles.wrap}>
          {group.members.map((m) => (
            <Chip key={m.id} label={m.name} selected={paidBy === m.id} onPress={() => setPaidBy(m.id)} />
          ))}
        </View>

        <SectionTitle>Split</SectionTitle>
        <View style={[styles.wrap, { marginBottom: 12 }]}>
          <Chip label="Equally" selected={splitType === 'equal'} onPress={() => setSplitType('equal')} />
          <Chip label="Exact amounts" selected={splitType === 'exact'} onPress={() => setSplitType('exact')} />
        </View>

        {group.members.map((m) => {
          const share = shares.find((s) => s.memberId === m.id)
          return (
            <View key={m.id} style={styles.memberRow}>
              <Avatar id={m.id} name={m.name} size={32} />
              <Text style={styles.memberName}>{m.name}</Text>
              {splitType === 'equal' ? (
                <>
                  <Text style={styles.shareText}>{share ? formatMoney(share.amount) : '—'}</Text>
                  <Chip label={included.includes(m.id) ? 'In' : 'Out'} selected={included.includes(m.id)} onPress={() => toggle(m.id)} />
                </>
              ) : (
                <TextInput
                  style={styles.exactInput}
                  value={exact[m.id] ?? ''}
                  onChangeText={(text) => setExact((prev) => ({ ...prev, [m.id]: text }))}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  accessibilityLabel={`Share of ${m.name}`}
                />
              )}
            </View>
          )
        })}

        {amount > 0 && !validation.ok && <Text style={styles.error}>{validation.message}</Text>}

        <Button title={existing ? 'Save changes' : 'Add expense'} onPress={save} disabled={!canSave} style={{ marginTop: 24 }} />
        {existing && <Button title="Delete expense" variant="danger" onPress={remove} style={{ marginTop: 12 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  amountInput: { fontSize: 44, fontWeight: '700', textAlign: 'center', color: colors.text, paddingTop: 12 },
  currency: { textAlign: 'center', color: colors.muted, marginBottom: 20 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  memberName: { flex: 1, fontSize: 16, color: colors.text },
  shareText: { fontSize: 15, color: colors.muted, minWidth: 80, textAlign: 'right' },
  exactInput: {
    width: 110,
    textAlign: 'right',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  error: { color: colors.negative, marginTop: 12, fontSize: 14 },
})
