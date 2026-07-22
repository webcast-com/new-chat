import { projectId, publicAnonKey } from '/utils/supabase/info';

export async function fetchSupabaseApi<T>(service: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ service, ...params });
  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/rapidapi?${query}`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json',
    },
    credentials: 'omit',
  });

  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    throw new Error('Supabase API returned an invalid response');
  }

  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String(data.error) : `Supabase API returned ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
