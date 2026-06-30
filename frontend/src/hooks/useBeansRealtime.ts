import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Bean } from './useBeans'

export function useBeansRealtime(
  userId: string | undefined,
  setBeans: React.Dispatch<React.SetStateAction<Bean[]>>,
) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('beans-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'beans',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Bean
          setBeans(prev =>
            prev.map(b => b.id === updated.id ? updated : b)
          )
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, setBeans])
}
