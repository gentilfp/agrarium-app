import { Redirect, Stack } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SideMenu } from '@/components/SideMenu';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

// AGR-23: grupo protegido. As 4 abas vivem em (tabs); as telas de detalhe
// (notas, safra, compras) abrem por cima, com o botão de voltar do Stack.
export default function AppLayout() {
  const { user, loading } = useAuth();
  const wide = useWindowDimensions().width >= 768;

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <View style={styles.root}>
      {wide && <SideMenu />}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="nova-safra" options={{ title: 'Nova safra' }} />
          <Stack.Screen name="resultado" options={{ title: 'Relatório' }} />
          <Stack.Screen name="notas/[id]" options={{ title: 'Nota' }} />
          <Stack.Screen name="adicionar-compra" options={{ title: 'Adicionar compra' }} />
          <Stack.Screen name="nota-manual" options={{ title: 'Digitar a compra' }} />
          <Stack.Screen name="relatorio" options={{ title: 'Gastos detalhados' }} />
          <Stack.Screen name="revisao" options={{ title: 'Classificar compras' }} />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  content: { flex: 1 },
});
