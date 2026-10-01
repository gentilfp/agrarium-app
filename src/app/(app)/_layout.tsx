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
      <Stack.Screen name="nova-safra" options={{ title: 'Nova safra' }} />
      <Stack.Screen name="resultado" options={{ title: 'Relatório' }} />
      <Stack.Screen name="notas" options={{ title: 'Notas fiscais' }} />
      <Stack.Screen name="notas/[id]" options={{ title: 'Documento' }} />
      <Stack.Screen name="relatorio" options={{ title: 'Relatório de compras' }} />
      <Stack.Screen name="revisao" options={{ title: 'Revisar compras' }} />
    </Stack>
  );
}
