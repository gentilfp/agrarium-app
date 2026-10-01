import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, type Control, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, type TextInputProps } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  property_size_ha: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// Campo controlado reaproveitável.
function CField({
  control, name, label, hint, error, ...rest
}: { control: Control<FormData>; name: keyof FormData; label: string; hint?: string; error?: string } & TextInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <Field label={label} hint={hint} error={error} value={value as string} onChangeText={onChange} {...rest} />
      )}
    />
  );
}

export default function Register() {
  const { signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', phone: '', birth_date: '', city: '', state: '', property_size_ha: '' },
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setErr(null);
    try {
      await signUp({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        birth_date: data.birth_date || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        property_size_ha: data.property_size_ha ? Number(data.property_size_ha) : undefined,
      });
      router.replace('/dashboard');
    } catch (e) {
      setErr(apiError(e, 'Não foi possível criar a conta.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Seus dados</Text>

        <CField control={control} name="name" label="Nome" error={errors.name?.message} placeholder="Seu nome" />
        <CField control={control} name="email" label="E-mail" error={errors.email?.message}
          autoCapitalize="none" keyboardType="email-address" placeholder="voce@fazenda.com.br" />
        <CField control={control} name="password" label="Senha" error={errors.password?.message}
          secureTextEntry placeholder="mínimo 8 caracteres" />
        <CField control={control} name="phone" label="Telefone" keyboardType="phone-pad" placeholder="(00) 00000-0000" />
        <CField control={control} name="birth_date" label="Data de nascimento" hint="formato AAAA-MM-DD" placeholder="1985-04-20" />
        <CField control={control} name="city" label="Cidade" placeholder="Orlândia" />
        <CField control={control} name="state" label="Estado (UF)" autoCapitalize="characters" maxLength={2} placeholder="SP" />
        <CField control={control} name="property_size_ha" label="Tamanho da propriedade (ha)" keyboardType="numeric" placeholder="120" />

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Button title="Criar conta" onPress={handleSubmit(onSubmit)} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 20 },
  err: { color: colors.danger, marginBottom: 12 },
});
