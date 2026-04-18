import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTable<T = any>(table: string, orderBy = 'created_at', ascending = false) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshIdx, setRefreshIdx] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (supabase.from(table as any).select('*').order(orderBy, { ascending }) as any)
      .then(({ data, error }: any) => {
        if (!active) return;
        if (error) console.error(error);
        setRows((data ?? []) as T[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [table, orderBy, ascending, refreshIdx]);

  const refresh = () => setRefreshIdx(i => i + 1);
  return { rows, loading, refresh, setRows };
}
