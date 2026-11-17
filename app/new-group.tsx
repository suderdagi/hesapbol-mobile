import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useGroups } from '@/src/store/GroupsProvider'
import { createId } from '@/src/lib/id'
import { Button, SectionTitle } from '@/src/components/ui'
import { colors } from '@/src/theme'

const EMOJIS = ['✈️', '🏠', '🍕', '🎉', '🏕️', '🚗', '🛒', '🎈', '⚽', '💼']

export default function NewGroupScreen() {
  const router = useRouter()
  const { dispatch } = useGroups()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [people, setPeople] = useState(['', ''])
  const [error, setError] = useState<string | null>(null)

  const create = () => {
    const names = people.map((p) => p.trim()).filter(Boolean)
    const unique = new Set(names.map((n) => n.toLocaleLowerCase('tr')))

    if (!name.trim()) return setError('Give the group a name')
    if (names.length < 2) return setError('Add at least two people')
    if (unique.size !== names.length) return setError('Each person needs a different name')

    const id = createId()
    dispatch({
      type: 'createGroup',
      group: {
        id,
        name: name.trim(),
        emoji,
        members: names.map((n) => ({ id: createId(), name: n })),
        expenses: [],
        settlements: [],
        createdAt: new Date().toISOString(),
      },
    })
    router.replace(`/group/${id}`)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <SectionTitle>Name</SectionTitle>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Kapadokya trip" autoFocus />

        <SectionTitle>Icon</SectionTitle>
        <View style={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              style={[styles.emoji, e === emoji && styles.emojiSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: e === emoji }}
            >
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle>People</SectionTitle>
        {people.map((person, index) => (
          <View key={index} style={styles.personRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={person}
              onChangeText={(text) => setPeople((prev) => prev.map((p, i) => (i === index ? text : p)))}
              placeholder={index === 0 ? 'You' : `Person ${index + 1}`}
              returnKeyType="next"
            />
            {people.length > 2 && (
              <Pressable onPress={() => setPeople((prev) => prev.filter((_, i) => i !== index))} accessibilityLabel="Remove person" hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={22} color={colors.muted} />
              </Pressable>
            )}
          </View>
        ))}
        <Pressable onPress={() => setPeople((prev) => [...prev, ''])} style={styles.addPerson}>
          <MaterialCommunityIcons name="account-plus" size={20} color={colors.primary} />
          <Text style={styles.addPersonText}>Add person</Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="Create group" onPress={create} style={{ marginTop: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  addPerson: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  addPersonText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  error: { color: colors.negative, marginTop: 16, fontSize: 14 },
})
