import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}>
      <Stack.Screen name="dashboard" options={{ title: 'Agrarium' }} />
      <Stack.Screen name="new-harvest" options={{ title: 'Nova safra', presentation: 'modal' }} />
      <Stack.Screen name="harvest/[id]" options={{ title: 'Análise da safra' }} />
    </Stack>
  );
}
