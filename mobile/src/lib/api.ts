import { supabase } from '@/lib/supabase';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function foodizApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL non configurée');

  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Session expirée');

  const response = await fetch(`${apiUrl}/api/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      ...init.headers,
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Erreur serveur Foodiz');
  }
  return payload as T;
}
