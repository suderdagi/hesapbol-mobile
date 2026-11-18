import { useMemo } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useGroup } from '@/src/store/GroupsProvider'
import { computeBalances, EXACT_LIMIT, simplifyDebts, type Transfer } from '@/src/lib/balances'
import { formatMoney } from '@/src/lib/money'
import { createId } from '@/src/lib/id'
import { Avatar, Button, Card, SectionTitle } from '@/src/components/ui'
import { colors } from '@/src/theme'

export default function SettleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { group, dispatch } = useGroup(id)
  const balances = useMemo(() => (group ? computeBalances(group) : new Map<string, number>()), [group])
  const transfers = useMemo(() => simplifyDebts(balances), [balances])
  if (!group) return null

  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?'
  // Above EXACT_LIMIT people the list is short but not guaranteed to be the shortest possible
  const isFewest = [...balances.values()].filter((b) => b !== 0).length <= EXACT_LIMIT

  const markPaid = (t: Transfer) => {
    Alert.alert('Mark as paid', `${nameOf(t.from)} paid ${formatMoney(t.amount)} to ${nameOf(t.to)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, paid',
        onPress: () => {
          dispatch({
            type: 'addSettlement',
            groupId: group.id,
            settlement: { id: createId(), ...t, createdAt: new Date().toISOString() },
          })
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        },
      },
    ])
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      {transfers.length === 0 ? (
        <View style={styles.done}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={styles.doneText}>Everyone is settled up</Text>
        </View>
      ) : (
        <>
          <Text style={styles.intro}>
            {isFewest ? 'The fewest payments' : 'A short list of payments'} that settle every debt in {group.name}. Mark a payment as
            paid once the money is sent.
          </Text>
          {transfers.map((t) => (
            <Card key={`${t.from}-${t.to}`} style={styles.transfer}>
              <View style={styles.people}>
                <View style={styles.person}>
                  <Avatar id={t.from} name={nameOf(t.from)} size={44} />
                  <Text style={styles.personName}>{nameOf(t.from)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.amount}>{formatMoney(t.amount)}</Text>
                  <MaterialCommunityIcons name="arrow-right-thin" size={32} color={colors.primary} />
                </View>
                <View style={styles.person}>
                  <Avatar id={t.to} name={nameOf(t.to)} size={44} />
                  <Text style={styles.personName}>{nameOf(t.to)}</Text>
                </View>
              </View>
              <Button title="Mark as paid" variant="secondary" onPress={() => markPaid(t)} />
            </Card>
          ))}
        </>
      )}

      {group.settlements.length > 0 && (
        <>
          <SectionTitle>Payments made</SectionTitle>
          <Card style={{ padding: 0 }}>
            {group.settlements.map((s, index) => (
              <View key={s.id} style={[styles.historyRow, index > 0 && styles.rowBorder]}>
                <Text style={styles.historyText}>
                  {nameOf(s.from)} → {nameOf(s.to)}
                </Text>
                <Text style={styles.historyAmount}>{formatMoney(s.amount)}</Text>
                <MaterialCommunityIcons
                  name="undo"
                  size={20}
                  color={colors.muted}
                  accessibilityLabel="Undo payment"
                  onPress={() => dispatch({ type: 'deleteSettlement', groupId: group.id, settlementId: s.id })}
                />
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  intro: { color: colors.muted, fontSize: 15, lineHeight: 21, marginBottom: 16 },
  transfer: { marginBottom: 12, gap: 16 },
  people: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { alignItems: 'center', gap: 6, width: 90 },
  personName: { fontSize: 14, fontWeight: '500', color: colors.text, textAlign: 'center' },
  amount: { fontSize: 18, fontWeight: '700', color: colors.text },
  done: { alignItems: 'center', marginTop: 80, gap: 12 },
  doneText: { fontSize: 20, fontWeight: '600', color: colors.text },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  historyText: { flex: 1, fontSize: 15, color: colors.text },
  historyAmount: { fontSize: 15, fontWeight: '600', color: colors.text },
})
