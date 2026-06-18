// Cliente HTTP (axios). baseURL vem de EXPO_PUBLIC_API_URL (.env).
// Em device físico, usar o IP da máquina na LAN, não localhost.
import axios from 'axios';
import { getToken } from './storage';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Extrai uma mensagem de erro amigável da resposta da API.
export function apiError(err: unknown, fallback = 'Algo deu errado.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; errors?: string[] } | undefined;
    if (data?.error) return data.error;
    if (data?.errors?.length) return data.errors.join('. ');
  }
  return fallback;
}
