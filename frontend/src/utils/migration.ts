import { supabase } from '../lib/supabaseClient'
import { apiFetch } from '../lib/apiClient'

const MIGRATION_FLAG = 'grounded_migration_complete'

interface LegacyBrew {
  id?: string
  bean_name?: string
  coffee_name?: string
  roaster?: string
  roast_level?: string
  brew_method?: string
  dose_g?: number
  yield_g?: number
  brew_time_s?: number
  grind_size?: string
  water_temp_c?: number
  rating?: number
  notes?: string
  flavour_tags?: string[]
  body?: string
  acidity?: string
  finish?: string
  created_at?: string
}

interface LegacyTasting extends LegacyBrew {
  cafe_name?: string
  location?: string
  would_return?: 'Yes' | 'Maybe' | 'No'
}

interface LegacyBean {
  name?: string
  roaster?: string
  origin?: string
  roast_level?: string
  process_method?: string
  roast_date?: string
  total_weight_g?: number
  remaining_weight_g?: number
}

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') return

  const rawBrews    = localStorage.getItem('cc-brews')
  const rawTastings = localStorage.getItem('cc-tastings')
  const rawBeans    = localStorage.getItem('cc-beans')

  const hasData = rawBrews || rawTastings || rawBeans
  if (!hasData) {
    localStorage.setItem(MIGRATION_FLAG, 'true')
    return
  }

  const brews: LegacyBrew[]      = rawBrews    ? JSON.parse(rawBrews)    : []
  const tastings: LegacyTasting[] = rawTastings ? JSON.parse(rawTastings) : []
  const beans: LegacyBean[]      = rawBeans    ? JSON.parse(rawBeans)    : []

  // Migrate home brews via FastAPI (handles inventory matching)
  for (const brew of brews) {
    try {
      await apiFetch('/logs', {
        method: 'POST',
        body: JSON.stringify({
          log: {
            log_type: 'home',
            coffee_name: brew.coffee_name ?? brew.bean_name ?? 'Unknown',
            roaster:     brew.roaster,
            roast_level: brew.roast_level,
            brew_method: brew.brew_method,
            dose_g:      brew.dose_g,
            yield_g:     brew.yield_g,
            brew_time_s: brew.brew_time_s,
            grind_size:  brew.grind_size,
            water_temp_c: brew.water_temp_c,
            rating:      brew.rating,
            notes:       brew.notes,
            flavour_tags: brew.flavour_tags,
            body:        brew.body,
            acidity:     brew.acidity,
            finish:      brew.finish,
          },
          deduct_inventory: false,
        }),
      })
    } catch {
      // Skip individual failures — don't block migration
    }
  }

  // Migrate café tastings via FastAPI
  for (const tasting of tastings) {
    try {
      await apiFetch('/logs', {
        method: 'POST',
        body: JSON.stringify({
          log: {
            log_type:    'cafe',
            coffee_name: tasting.coffee_name ?? tasting.bean_name ?? 'Unknown',
            roaster:     tasting.roaster,
            roast_level: tasting.roast_level,
            brew_method: tasting.brew_method,
            cafe_name:   tasting.cafe_name,
            location:    tasting.location,
            would_return: tasting.would_return,
            rating:      tasting.rating,
            notes:       tasting.notes,
            flavour_tags: tasting.flavour_tags,
          },
          deduct_inventory: false,
        }),
      })
    } catch {
      // Skip individual failures
    }
  }

  // Migrate beans directly via PostgREST
  if (beans.length > 0) {
    const rows = beans
      .filter(b => b.name)
      .map(b => ({
        name:               b.name!,
        roaster:            b.roaster,
        origin:             b.origin,
        roast_level:        b.roast_level,
        process_method:     b.process_method,
        roast_date:         b.roast_date,
        total_weight_g:     b.total_weight_g ?? 250,
        remaining_weight_g: b.remaining_weight_g ?? b.total_weight_g ?? 250,
      }))

    if (rows.length > 0) {
      await supabase.from('beans').insert(rows)
    }
  }

  localStorage.setItem(MIGRATION_FLAG, 'true')
  localStorage.removeItem('cc-brews')
  localStorage.removeItem('cc-tastings')
  localStorage.removeItem('cc-beans')
}
