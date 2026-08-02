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

// One row of a bean's inventory history — every weight change is an
// inventory_events row. `source` differentiates brew deductions ('brew_save',
// with a linked log) from manual edits ('manual_adjustment', log = null).
export interface BeanHistoryEntry {
  id: string
  created_at: string
  delta_g: number
  source: string
  log: { coffee_name: string; brew_method: string | null } | null
}

// Inventory history for one bean. Lazy-fetched: only runs when `enabled`
// (i.e. the card is expanded).
export function useBeanHistory(beanId: string, enabled: boolean) {
  const [entries, setEntries] = useState<BeanHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('inventory_events')
      .select('id, created_at, delta_g, source, log:logs(coffee_name, brew_method)')
      .eq('bean_id', beanId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
        } else {
          // PostgREST's embed-alias return type isn't inferable here, so cast the known shape.
          setEntries((data ?? []) as unknown as BeanHistoryEntry[])
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [beanId, enabled])

  return { entries, loading, error }
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

// Editable log fields — the quantity/extraction block (dose_g, ratio, yields)
// is intentionally excluded and locked; the backend rejects it too.
export type LogUpdatePayload = Partial<Pick<Log,
  'roaster' | 'coffee_name' | 'coffee_type' | 'origin_country' | 'origin_region' |
  'species' | 'process_method' | 'varietal' | 'roast_level' | 'roast_date' |
  'brew_method' | 'equipment' | 'grinder' | 'grind_size' | 'brew_time_s' |
  'water_temp_c' | 'sensory_profile' | 'rating' | 'notes' |
  'cafe_name' | 'location' | 'would_return'
>>

export async function updateLog(id: string, payload: LogUpdatePayload): Promise<void> {
  await apiFetch(`/logs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
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
