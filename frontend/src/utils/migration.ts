import { supabase } from '../lib/supabaseClient'
import { apiFetch } from '../lib/apiClient'
import type { SensoryProfile } from '../hooks/useLogs'

const MIGRATION_FLAG = 'grounded_migration_complete'

interface LegacyBrew {
  id?: string
  bean_name?: string
  coffee_name?: string
  roaster?: string
  roast_level?: string
  brew_method?: string
  machine?: string
  dose_g?: number
  yield_g?: number
  brew_time_s?: number
  grind_size?: string
  water_temp_c?: number
  rating?: number
  notes?: string
  flavour_tags?: string[]
  body?: string
  mouthfeel?: string
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

function migrateLegacyLog(brew: LegacyBrew): {
  actual_yield_g?: number
  equipment?: string
  sensory_profile?: SensoryProfile
} {
  const sensory: SensoryProfile = {}

  if (brew.body)      sensory.body      = brew.body
  if (brew.mouthfeel) sensory.mouthfeel = brew.mouthfeel

  // acidity and finish were stored as strings — wrap in arrays to match v3 shape
  if (brew.acidity)          sensory.acidity = [brew.acidity]
  if (brew.finish)           sensory.finish  = [brew.finish]
  if (brew.flavour_tags?.length) sensory.flavour = brew.flavour_tags

  return {
    actual_yield_g:  brew.yield_g,
    equipment:       brew.machine,
    sensory_profile: Object.keys(sensory).length ? sensory : undefined,
  }
}

async function migrateItems<T extends LegacyBrew>(
  items: T[],
  log_type: 'home' | 'cafe',
  extra: (item: T, m: ReturnType<typeof migrateLegacyLog>) => Record<string, unknown>,
): Promise<void> {
  for (const item of items) {
    try {
      const m = migrateLegacyLog(item)
      await apiFetch('/logs', {
        method: 'POST',
        body: JSON.stringify({
          log: {
            log_type,
            coffee_name:     item.coffee_name ?? item.bean_name ?? 'Unknown',
            roaster:         item.roaster,
            roast_level:     item.roast_level,
            brew_method:     item.brew_method,
            rating:          item.rating,
            notes:           item.notes,
            sensory_profile: m.sensory_profile,
            ...extra(item, m),
          },
          deduct_inventory: false,
        }),
      })
    } catch {
      // skip individual failures — don't block migration
    }
  }
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

  const brews: LegacyBrew[]       = rawBrews    ? JSON.parse(rawBrews)    : []
  const tastings: LegacyTasting[] = rawTastings ? JSON.parse(rawTastings) : []
  const beans: LegacyBean[]       = rawBeans    ? JSON.parse(rawBeans)    : []

  await migrateItems(brews, 'home', (b, m) => ({
    equipment:      m.equipment,
    dose_g:         b.dose_g,
    actual_yield_g: m.actual_yield_g,
    brew_time_s:    b.brew_time_s,
    grind_size:     b.grind_size,
    water_temp_c:   b.water_temp_c,
  }))

  await migrateItems(tastings, 'cafe', (t) => ({
    cafe_name:   t.cafe_name,
    location:    t.location,
    would_return:t.would_return,
  }))

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
