import { Ionicons } from '@expo/vector-icons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Item = { href: Href; label: string; icon: keyof typeof Ionicons.glyphMap };

const ITEMS: Item[] = [
  { href: '/inicio', label: 'Início', icon: 'home-outline' },
  { href: '/compras', label: 'Compras', icon: 'receipt-outline' },
  { href: '/precos', label: 'Preços', icon: 'pricetags-outline' },
  { href: '/safra', label: 'Safra', icon: 'leaf-outline' },
];

const TAB_PATHS = ['/inicio', '/compras', '/precos', '/safra'];

// AGR-23: menu lateral para telas largas. Fica fora do Stack, então aparece
// também nas telas de detalhe — lá ele abre recolhido, para dar espaço ao conteúdo.
export function SideMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const onTab = TAB_PATHS.includes(pathname);
  const [collapsed, setCollapsed] = useState(!onTab);

  // Ao trocar entre aba e tela de detalhe, volta ao padrão da nova tela.
  useEffect(() => {
    setCollapsed(!onTab);
  }, [onTab]);

  return (
    <View style={[styles.menu, collapsed ? styles.menuCollapsed : styles.menuOpen]}>
      <Pressable
        onPress={() => setCollapsed((c) => !c)}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expandir menu' : 'Recolher menu'}
        style={[styles.item, styles.toggle]}>
        <Ionicons
          name={collapsed ? 'chevron-forward-outline' : 'chevron-back-outline'}
          size={20}
          color={colors.muted}
        />
      </Pressable>
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        const tint = active ? colors.primary : colors.muted;
        return (
          <Pressable
            key={item.label}
            onPress={() => router.navigate(item.href)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.itemActive]}>
            <Ionicons name={item.icon} size={22} color={tint} />
            {!collapsed && <Text style={[styles.label, { color: tint }]}>{item.label}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: 8,
    gap: 4,
  },
  menuOpen: { width: 160 },
  menuCollapsed: { width: 56 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  itemActive: { backgroundColor: colors.primaryLight },
  toggle: { marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700' },
});
