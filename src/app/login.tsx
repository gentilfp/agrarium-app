import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setErr(null);
    try {
      await signIn(data.email, data.password);
      router.replace('/dashboard');
    } catch (e) {
      setErr(apiError(e, 'Não foi possível entrar.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Agrarium</Text>
        <Text style={styles.tagline}>Inteligência agronômica · custos da cana</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Field label="E-mail" value={value} onChangeText={onChange} error={errors.email?.message}
              autoCapitalize="none" keyboardType="email-address" placeholder="voce@fazenda.com.br" />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Field label="Senha" value={value} onChangeText={onChange} error={errors.password?.message}
              secureTextEntry placeholder="••••••••" />
          )}
        />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Button title="Entrar" onPress={handleSubmit(onSubmit)} loading={submitting} />

        <View style={styles.footer}>
          <Text style={styles.muted}>Ainda não tem conta? </Text>
          <Link href="/register" style={styles.link}>Criar conta</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, maxWidth: 480, width: '100%', alignSelf: 'center', flexGrow: 1 },
  brand: { fontSize: 34, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  tagline: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  err: { color: colors.danger, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  muted: { color: colors.muted },
  link: { color: colors.primary, fontWeight: '700' },
});
