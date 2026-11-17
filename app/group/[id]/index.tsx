import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useGroup } from '@/src/store/GroupsProvider'
import { computeBalances, simplifyDebts, totalSpent } from '@/src/lib/balances'
import { formatMoney } from '@/src/lib/money'
import { createId } from '@/src/lib/id'
import { Avatar, Button, Card, SectionTitle } from '@/src/components/ui'
import { CATEGORY_META, colors } from '@/src/theme'

type Tab = 'expenses' | 'balances'

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { group, dispatch } = useGroup(id)
  const [tab, setTab] = useState<Tab>('expenses')
  const [newMember, setNewMember] = useState('')

  const balances = useMemo(() => (group ? computeBalances(group) : new Map<string, number>()), [group])

  if (!group) return null

  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?'
  const openDebts = simplifyDebts(balances)

  const shareSummary = () => {
    const lines = [`${group.emoji} ${group.name}`, `Total spent: ${formatMoney(totalSpent(group))}`, '']
    if (openDebts.length === 0) lines.push('Everyone is settled up 🎉')
    for (const t of openDebts) lines.push(`${nameOf(t.from)} → ${nameOf(t.to)}: ${formatMoney(t.amount)}`)
    Share.share({ message: lines.join('\n') })
  }

  const confirmDelete = () =>
    Alert.alert('Delete group', `Delete "${group.name}" and all its expenses?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back()
          dispatch({ type: 'deleteGroup', groupId: group.id })
        },
      },
    ])

  const addMember = () => {
    const name = newMember.trim()
    if (!name) return
    if (group.members.some((m) => m.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'))) {
      Alert.alert('Name taken', `${name} is already in this group.`)
      return
    }
    dispatch({ type: 'addMember', groupId: group.id, member: { id: createId(), name } })
    setNewMember('')
  }

  // Expenses grouped by day, newest first
  const sections = Object.entries(
    [...group.expenses]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .reduce<Record<string, typeof group.expenses>>((acc, e) => {
        const key = e.createdAt.slice(0, 10)
        ;(acc[key] ??= []).push(e)
        return acc
      }, {})
  )

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `${group.emoji} ${group.name}`,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable onPress={shareSummary} accessibilityLabel="Share summary" hitSlop={8}>
                <MaterialCommunityIcons name="share-variant" size={22} color={colors.primary} />
              </Pressable>
              <Pressable onPress={confirmDelete} accessibilityLabel="Delete group" hitSlop={8}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.primary} />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Total spent</Text>
          <Text style={styles.summaryValue}>{formatMoney(totalSpent(group))}</Text>
          <Text style={styles.summaryMeta}>
            {group.expenses.length} expenses · {group.members.length} people
          </Text>
        </Card>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(['expenses', 'balances'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'expenses' ? 'Expenses' : 'Balances'}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'expenses' ? (
          sections.length === 0 ? (
            <Text style={styles.emptyText}>No expenses yet. Tap + to add the first one.</Text>
          ) : (
            sections.map(([day, expenses]) => (
              <View key={day}>
                <SectionTitle>{dayLabel(expenses[0].createdAt)}</SectionTitle>
                <Card style={{ padding: 0 }}>
                  {expenses.map((e, index) => (
                    <Pressable
                      key={e.id}
                      onPress={() => router.push({ pathname: '/group/[id]/expense', params: { id: group.id, expenseId: e.id } })}
                      style={[styles.expenseRow, index > 0 && styles.rowBorder]}
                    >
                      <View style={styles.categoryIcon}>
                        <MaterialCommunityIcons name={CATEGORY_META[e.category].icon} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.expenseTitle}>{e.description}</Text>
                        <Text style={styles.expenseMeta}>
                          {nameOf(e.paidBy)} paid · split {e.shares.length} ways
                        </Text>
                      </View>
                      <Text style={styles.expenseAmount}>{formatMoney(e.amount)}</Text>
                    </Pressable>
                  ))}
                </Card>
              </View>
            ))
          )
        ) : (
          <>
            <SectionTitle>Who is up or down</SectionTitle>
            <Card style={{ padding: 0 }}>
              {group.members.map((m, index) => {
                const balance = balances.get(m.id) ?? 0
                return (
                  <View key={m.id} style={[styles.balanceRow, index > 0 && styles.rowBorder]}>
                    <Avatar id={m.id} name={m.name} />
                    <Text style={styles.memberName}>{m.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.balance, { color: balance > 0 ? colors.positive : balance < 0 ? colors.negative : colors.muted }]}>
                        {balance === 0 ? 'Settled' : formatMoney(Math.abs(balance))}
                      </Text>
                      {balance !== 0 && <Text style={styles.balanceHint}>{balance > 0 ? 'gets back' : 'owes'}</Text>}
                    </View>
                  </View>
                )
              })}
            </Card>

            <Button
              title={openDebts.length ? `Settle up (${openDebts.length} payment${openDebts.length > 1 ? 's' : ''})` : 'Everyone is settled 🎉'}
              disabled={openDebts.length === 0}
              onPress={() => router.push({ pathname: '/group/[id]/settle', params: { id: group.id } })}
              style={{ marginTop: 16 }}
            />

            <SectionTitle>Add someone</SectionTitle>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={styles.input}
                value={newMember}
                onChangeText={setNewMember}
                placeholder="Name"
                onSubmitEditing={addMember}
                returnKeyType="done"
              />
              <Button title="Add" variant="secondary" onPress={addMember} />
            </View>
          </>
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: '/group/[id]/expense', params: { id: group.id } })}
        accessibilityLabel="Add expense"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', paddingVertical: 20, backgroundColor: colors.primary, borderColor: colors.primary },
  summaryLabel: { color: '#ffedd5', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  summaryMeta: { color: '#ffedd5', fontSize: 13, marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#f5f5f4', borderRadius: 12, padding: 4, marginTop: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 15, color: colors.muted, fontWeight: '500' },
  tabTextActive: { color: colors.text, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 15 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  categoryIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  expenseTitle: { fontSize: 16, fontWeight: '500', color: colors.text },
  expenseMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  memberName: { flex: 1, fontSize: 16, color: colors.text },
  balance: { fontSize: 16, fontWeight: '600' },
  balanceHint: { fontSize: 12, color: colors.muted },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
})
