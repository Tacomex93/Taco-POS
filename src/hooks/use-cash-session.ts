'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type CashSession = {
  id: string;
  label: string;
  status: 'abierta' | 'cerrada';
  opening_float: number;
  closing_cash: number | null;
  card_total: number | null;
  expected_total: number | null;
  difference_amount: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
};

export function useCashSession() {
  const [session, setSession] = useState<CashSession | null | undefined>(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'abierta')
      .maybeSingle();
    setSession((data as CashSession | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const openSession = useCallback(async (label: string, openingFloat: number, employeeId: string) => {
    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({ label, status: 'abierta', opening_float: openingFloat, opened_by: employeeId })
      .select()
      .single();
    if (error) throw error;
    setSession(data as CashSession);
    return data as CashSession;
  }, []);

  const closeSession = useCallback(async (
    sessionId: string,
    closingCash: number,
    cardTotal: number,
    expectedTotal: number,
    notes: string
  ) => {
    const diff = Math.round((closingCash + cardTotal - expectedTotal) * 100) / 100;
    const { error } = await supabase
      .from('cash_sessions')
      .update({
        status: 'cerrada',
        closing_cash: closingCash,
        card_total: cardTotal,
        expected_total: expectedTotal,
        difference_amount: diff,
        closed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', sessionId);
    if (error) throw error;
    setSession(null);
  }, []);

  return { session, loading, refresh, openSession, closeSession };
}
