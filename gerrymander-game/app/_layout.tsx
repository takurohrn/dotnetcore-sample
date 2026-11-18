import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: 'もどる',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="select" options={{ title: '市区町村をえらぶ' }} />
        <Stack.Screen name="paint" options={{ title: '色とパーツ' }} />
        <Stack.Screen name="result" options={{ title: '評価' }} />
        <Stack.Screen name="save" options={{ title: '保存' }} />
        <Stack.Screen name="gallery/index" options={{ title: 'ギャラリー' }} />
        <Stack.Screen name="gallery/[id]" options={{ title: '作品' }} />
      </Stack>
    </>
  );
}
