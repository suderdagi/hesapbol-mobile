import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GroupsProvider } from '@/src/store/GroupsProvider'
import { colors } from '@/src/theme'

export default function RootLayout() {
  return (
    <GroupsProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'HesapBöl' }} />
        <Stack.Screen name="new-group" options={{ title: 'New group', presentation: 'modal' }} />
        <Stack.Screen name="group/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="group/[id]/expense" options={{ title: 'Expense', presentation: 'modal' }} />
        <Stack.Screen name="group/[id]/settle" options={{ title: 'Settle up' }} />
      </Stack>
    </GroupsProvider>
  )
}
