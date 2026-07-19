import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/lib/auth";
import { colors } from "@/lib/theme";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.white,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ title: "" }} />
            <Stack.Screen name="register" options={{ title: "Criar conta" }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
