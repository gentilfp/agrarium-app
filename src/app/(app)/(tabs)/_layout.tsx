import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DemoBanner } from '@/components/DemoBanner';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

// AGR-23: 4 abas — Início, Compras, Preços e Safra. Em telas largas o menu
// lateral (SideMenu) assume; no celular a barra fica embaixo. O nome do
// produtor e "Sair" ficam no cabeçalho.
export default function TabsLayout() {
  const { user, signOut } = useAuth();
  const wide = useWindowDimensions().width >= 768;
  const firstName = user?.name?.split(' ')[0] ?? 'produtor';

  return (
    <View style={styles.root}>
      <DemoBanner />
      <Tabs
        screenOptions={{
          // Em telas largas o menu é o SideMenu (no layout de (app)).
          tabBarStyle: wide ? { display: 'none' } : undefined,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          sceneStyle: { backgroundColor: colors.bg },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
          headerRight: () => (
            <View style={styles.headerRight}>
              <Text style={styles.headerName} numberOfLines={1}>
                {firstName}
              </Text>
              <Pressable
                onPress={signOut}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Sair"
                style={styles.headerBtn}>
                <Text style={styles.headerAction}>Sair</Text>
              </Pressable>
            </View>
          ),
        }}>
        <Tabs.Screen
          name="inicio"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="compras"
          options={{
            title: 'Compras',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="precos"
          options={{
            title: 'Preços',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pricetags-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="safra"
          options={{
            title: 'Safra',
            tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  headerName: { color: colors.white, fontSize: 14, fontWeight: '600', maxWidth: 140 },
  headerBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  headerAction: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
