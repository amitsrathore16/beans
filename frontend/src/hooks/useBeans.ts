import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Bean {
  id: string
  user_id: string
  name: string
  roaster?: string
  origin?: string
  roast_level?: string
  process_method?: string
  roast_date?: string
  opened_date?: string
  total_weight_g: number
  remaining_weight_g: number
  photo_url?: string
  deleted_at?: string
  created_at: string
  updated_at: string
}

export type Freshness = 'Fresh' | 'Good' | 'Aging' | 'Stale'

export function getFreshness(roastDate?: string): Freshness | null {
  if (!roastDate) return null
  const days = Math.floor((Date.now() - new Date(roastDate).getTime()) / 86_400_000)
  if (days < 14)  return 'Fresh'
  if (days < 30)  return 'Good'
  if (days < 60)  return 'Aging'
  return 'Stale'
}

export const FRESHNESS_COLOR: Record<Freshness, string> = {
  Fresh: '#d4edda',
  Good:  '#d1ecf1',
  Aging: '#fff3cd',
  Stale: '#f8d7da',
}

export const FRESHNESS_TEXT: Record<Freshness, string> = {
  Fresh: '#155724',
  Good:  '#0c5460',
  Aging: '#856404',
  Stale: '#721c24',
}

export function useBeans() {
  const [beans, setBeans] = useState<Bean[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBeans = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('beans')
      .select('*')
      .is('deleted_at', null)
      .order('roast_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setBeans((data as Bean[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBeans() }, [fetchBeans])

  return { beans, setBeans, loading, error, refetch: fetchBeans }
}

export interface BeanCreatePayload {
  name: string
  roaster?: string
  origin?: string
  roast_level?: string
  process_method?: string
  roast_date?: string
  opened_date?: string
  total_weight_g: number
  remaining_weight_g: number
}

export async function createBean(payload: BeanCreatePayload): Promise<Bean> {
  const { data, error } = await supabase
    .from('beans')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Bean
}

export function useSoftDeleteBean() {
  const [loading, setLoading] = useState(false)

  async function softDelete(id: string) {
    setLoading(true)
    const { error } = await supabase
      .from('beans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setLoading(false)
    if (error) throw new Error(error.message)
  }

  return { softDelete, loading }
}
