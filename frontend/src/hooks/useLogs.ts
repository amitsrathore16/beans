import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { apiFetch } from '../lib/apiClient'
import { useSoftDelete } from './useBeans'

export interface SensoryProfile {
  aroma?: string[]
  flavour?: string[]
  acidity?: string[]
  body?: string
  bitterness?: string
  mouthfeel?: string
  finish?: string[]
}

export interface Log {
  id: string
  user_id: string
  log_type: 'home' | 'cafe'
  // Group A — Product
  roaster?: string
  coffee_name: string
  coffee_type?: string
  // Group B — Origin
  origin_country?: string
  origin_region?: string
  // Group C — Bean Profile
  species?: string
  process_method?: string
  varietal?: string
  // Group D — Roast Profile
  roast_level?: string
  roast_date?: string
  // Equipment
  brew_method?: string
  equipment?: string
  // Grind
  grinder?: string
  grind_size?: string
  // Extraction
  dose_g?: number
  coffee_water_ratio?: string
  ideal_yield_g?: number
  actual_yield_g?: number
  brew_time_s?: number
  water_temp_c?: number
  // Sensory
  sensory_profile?: SensoryProfile
  // Overall
  rating?: number
  notes?: string
  duplicated_from?: string
  // Café-only
  cafe_name?: string
  location?: string
  would_return?: 'Yes' | 'Maybe' | 'No'
  // Timestamps
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface InventoryMatch {
  bean_id: string
  bean_name: string
  remaining_before_g: number
  remaining_after_g: number
  low_stock_warning: boolean
}

export interface LogSaveResponse {
  log_id: string
  inventory_match: InventoryMatch | null
}

function useLogs(logType?: 'home' | 'cafe') {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('logs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (logType) {
      query = query.eq('log_type', logType)
    }

    const { data, error } = await query
    if (error) {
      setError(error.message)
    } else {
      setLogs((data as Log[]) ?? [])
    }
    setLoading(false)
  }, [logType])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return { logs, loading, error, refetch: fetchLogs }
}

export function useHomeLogs() { return useLogs('home') }
export function useCafeLogs() { return useLogs('cafe') }

// Just the columns the bean card's brew list renders — avoids over-fetching
// full log rows (sensory_profile jsonb, notes, …) through the embed.
export type BeanLog = Pick<
  Log,
  'id' | 'coffee_name' | 'brew_method' | 'dose_g' | 'rating' | 'created_at' | 'deleted_at'
>

const BEAN_LOG_COLS = 'id,coffee_name,brew_method,dose_g,rating,created_at,deleted_at'

// Related brew logs for one bean — the only bean↔log link is the inventory_events
// ledger (confirmed deductions), so we read through it. Lazy-fetched: only runs
// when `enabled` (i.e. the card is expanded).
export function useBeanLogs(beanId: string, enabled: boolean) {
  const [logs, setLogs] = useState<BeanLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('inventory_events')
      .select(`log:logs(${BEAN_LOG_COLS})`)
      .eq('bean_id', beanId)
      .not('log_id', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
        } else {
          // PostgREST's embed-alias return type isn't inferable here, so cast the
          // known shape; if the embed shape is ever wrong this fails at runtime.
          const rows = (data ?? []) as unknown as { log: BeanLog | null }[]
          setLogs(rows.map(r => r.log).filter((l): l is BeanLog => !!l && !l.deleted_at))
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [beanId, enabled])

  return { logs, loading, error }
}

export function useSoftDeleteLog() { return useSoftDelete('logs') }

export interface LogCreatePayload {
  log: Omit<Log, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
  deduct_inventory: boolean
  confirmed_bean_id?: string | null
}

export async function createLog(payload: LogCreatePayload): Promise<LogSaveResponse> {
  return apiFetch<LogSaveResponse>('/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export type DuplicateMode = 'exact' | 'log_with_changes'

export interface DuplicateResponse {
  new_log_id: string
  mode: DuplicateMode
}

export async function duplicateLog(id: string, mode: DuplicateMode): Promise<DuplicateResponse> {
  return apiFetch<DuplicateResponse>(`/logs/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
  })
}
