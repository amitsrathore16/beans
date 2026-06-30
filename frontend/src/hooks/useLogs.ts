import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { apiFetch } from '../lib/apiClient'

export interface Log {
  id: string
  user_id: string
  log_type: 'home' | 'cafe'
  coffee_name: string
  roaster?: string
  roast_level?: string
  origin?: string
  brew_method?: string
  body?: string
  mouthfeel?: string
  acidity?: string
  finish?: string
  flavour_tags?: string[]
  rating?: number
  notes?: string
  // Home-only
  machine?: string
  grinder?: string
  dose_g?: number
  yield_g?: number
  brew_time_s?: number
  grind_size?: string
  water_temp_c?: number
  ratio?: number
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

export function useSoftDeleteLog() {
  const [loading, setLoading] = useState(false)

  async function softDelete(id: string) {
    setLoading(true)
    const { error } = await supabase
      .from('logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setLoading(false)
    if (error) throw new Error(error.message)
  }

  return { softDelete, loading }
}

export interface LogCreatePayload {
  log: Omit<Log, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'ratio'>
  deduct_inventory: boolean
  confirmed_bean_id?: string | null
}

export async function createLog(payload: LogCreatePayload): Promise<LogSaveResponse> {
  return apiFetch<LogSaveResponse>('/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
