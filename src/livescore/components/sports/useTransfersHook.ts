import { useCallback, useEffect, useRef, useState } from 'react';

export interface Transfer {
  id: string;
  player: string;
  from: string;
  to: string;
  fee: string;
  date: string;
}

const POLL_INTERVAL = 300000;
const LIVE_TRANSFERS_API_ENABLED = import.meta.env.VITE_ENABLE_LIVE_TRANSFERS_API === 'true';
const fallbackTransfers: Transfer[] = [
  { id: 'demo-1', player: 'Recent transfer updates', from: 'Transfer window', to: 'Live feed', fee: 'Check back soon', date: 'Demo data' },
  { id: 'demo-2', player: 'Football transfer news', from: 'Clubs and leagues', to: 'Worldwide', fee: 'Latest moves', date: 'Demo data' },
];

function readValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return readValue(record.name ?? record.displayName ?? record.title ?? record.shortName);
  }
  return '';
}

function mapTransfer(item: Record<string, unknown>, index: number): Transfer | null {
  const player = readValue(item.player ?? item.player_name ?? item.name ?? item.athlete);
  if (!player) return null;

  const from = readValue(item.from ?? item.from_team ?? item.old_team ?? item.previous_team ?? item.source) || 'Free agent';
  const to = readValue(item.to ?? item.to_team ?? item.new_team ?? item.current_team ?? item.destination) || 'Undisclosed';
  const fee = readValue(item.fee ?? item.transfer_fee ?? item.price ?? item.amount) || 'Undisclosed';
  const date = readValue(item.date ?? item.transfer_date ?? item.created_at) || 'Recent';

  return { id: readValue(item.id) || `${player}-${index}`, player, from, to, fee, date };
}

function getTransferList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  for (const key of ['response', 'data', 'transfers', 'results']) {
    if (Array.isArray(record[key])) return getTransferList(record[key]);
  }
  return [];
}

export function useTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>(fallbackTransfers);
  const [source, setSource] = useState<'loading' | 'api-live' | 'fallback-demo'>('loading');
  const [loading, setLoading] = useState(true);
  const unavailableUntilRef = useRef(0);

  const fetchTransfers = useCallback(async () => {
    if (!LIVE_TRANSFERS_API_ENABLED) {
      setTransfers(fallbackTransfers);
      setSource('fallback-demo');
      setLoading(false);
      return;
    }

    if (Date.now() < unavailableUntilRef.current) return;

    try {
      const { projectId, publicAnonKey } = await import('/utils/supabase/info');
      if (!projectId || !publicAnonKey) throw new Error('Supabase configuration missing');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/football-transfers`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
      });

      if (!response.ok) throw new Error(`Transfer API returned ${response.status}`);

      const mappedTransfers = getTransferList(await response.json())
        .map(mapTransfer)
        .filter((transfer): transfer is Transfer => transfer !== null)
        .slice(0, 8);

      if (mappedTransfers.length > 0) {
        setTransfers(mappedTransfers);
        setSource('api-live');
      } else {
        setTransfers(fallbackTransfers);
        setSource('fallback-demo');
      }
    } catch {
      unavailableUntilRef.current = Date.now() + POLL_INTERVAL;
      setTransfers(fallbackTransfers);
      setSource('fallback-demo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    const intervalId = window.setInterval(fetchTransfers, POLL_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [fetchTransfers]);

  return { transfers, source, loading };
}
