import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useGroups } from '@/src/store/GroupsProvider'
import { computeBalances, totalSpent } from '@/src/lib/balances'
import { formatMoney } from '@/src/lib/money'
import { Button } from '@/src/components/ui'
import { colors } from '@/src/theme'

export default function GroupsScreen() {
  const router = useRouter()
  const { state } = useGroups()

  if (!state.ready) return null

  if (state.groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🧾</Text>
        <Text style={styles.emptyTitle}>Split expenses without the math</Text>
        <Text style={styles.emptyText}>
          Create a group for a trip, a shared flat or a dinner. Add who paid what and HesapBöl tells everyone what they owe.
        </Text>
        <Button title="Create your first group" onPress={() => router.push('/new-group')} style={{ alignSelf: 'stretch' }} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={state.groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
        renderItem={({ item }) => {
          const open = [...computeBalances(item).values()].filter((b) => b !== 0).length
          return (
            <Pressable
              onPress={() => router.push(`/group/${item.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.groupCard, pressed && { opacity: 0.8 }]}
            >
                <Text style={styles.groupEmoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>
                    {item.members.length} people · {formatMoney(totalSpent(item))} spent
                  </Text>
                </View>
                {open === 0 ? (
                  <MaterialCommunityIcons name="check-circle" size={22} color={colors.positive} accessibilityLabel="Settled" />
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
                )}
            </Pressable>
          )
        }}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/new-group')} accessibilityLabel="New group" accessibilityRole="button">
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  groupEmoji: { fontSize: 32 },
  groupName: { fontSize: 17, fontWeight: '600', color: colors.text },
  groupMeta: { fontSize: 14, color: colors.muted, marginTop: 2 },
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
