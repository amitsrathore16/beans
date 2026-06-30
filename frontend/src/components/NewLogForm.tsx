import { useState, type FormEvent } from 'react'
import { createLog } from '../hooks/useLogs'
import type { InventoryMatch } from '../hooks/useLogs'

const ROAST_LEVELS = ['Light', 'Medium', 'Medium-Dark', 'Dark']
const BREW_METHODS = ['Espresso', 'V60', 'AeroPress', 'Filter', 'Cold Brew', 'Cafetière', 'Moka Pot']
const WOULD_RETURN = ['Yes', 'Maybe', 'No'] as const
const FLAVOUR_OPTIONS = ['Chocolate', 'Nutty', 'Caramel', 'Fruity', 'Floral', 'Citrus', 'Berry', 'Spice', 'Earthy', 'Smoky', 'Vanilla']

export interface LogPrefill {
  coffee_name?: string
  roaster?: string
  roast_level?: string
  brew_method?: string
  dose_g?: number
  yield_g?: number
  brew_time_s?: number
  grind_size?: string
  water_temp_c?: number
}

interface Props {
  onClose: () => void
  onSaved: (logId: string, match: InventoryMatch | null) => void
  prefill?: LogPrefill
}

export function NewLogForm({ onClose, onSaved, prefill }: Props) {
  const [logType, setLogType] = useState<'home' | 'cafe'>('home')
  const [coffeeName, setCoffeeName] = useState(prefill?.coffee_name ?? '')
  const [roaster, setRoaster] = useState(prefill?.roaster ?? '')
  const [roastLevel, setRoastLevel] = useState(prefill?.roast_level ?? '')
  const [brewMethod, setBrewMethod] = useState(prefill?.brew_method ?? '')
  const [rating, setRating] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [flavourTags, setFlavourTags] = useState<string[]>([])
  // Home-only
  const [doseG, setDoseG] = useState(prefill?.dose_g?.toString() ?? '')
  const [yieldG, setYieldG] = useState(prefill?.yield_g?.toString() ?? '')
  const [brewTimeS, setBrewTimeS] = useState(prefill?.brew_time_s?.toString() ?? '')
  const [grindSize, setGrindSize] = useState(prefill?.grind_size ?? '')
  // Café-only
  const [cafeName, setCafeName] = useState('')
  const [location, setLocation] = useState('')
  const [wouldReturn, setWouldReturn] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTag(tag: string) {
    setFlavourTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await createLog({
        log: {
          log_type: logType,
          coffee_name: coffeeName.trim(),
          roaster: roaster || undefined,
          roast_level: roastLevel || undefined,
          brew_method: brewMethod || undefined,
          rating: rating !== '' ? Number(rating) : undefined,
          notes: notes || undefined,
          flavour_tags: flavourTags.length ? flavourTags : undefined,
          ...(logType === 'home' ? {
            dose_g: doseG ? Number(doseG) : undefined,
            yield_g: yieldG ? Number(yieldG) : undefined,
            brew_time_s: brewTimeS ? Number(brewTimeS) : undefined,
            grind_size: grindSize || undefined,
          } : {
            cafe_name: cafeName || undefined,
            location: location || undefined,
            would_return: (wouldReturn as 'Yes' | 'Maybe' | 'No') || undefined,
          }),
        },
        deduct_inventory: logType === 'home',
      })
      onSaved(result.log_id, result.inventory_match)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <div style={styles.sheetHeader}>
          <h2 style={styles.title}>New log</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Log type toggle */}
          <div style={styles.toggle}>
            {(['home', 'cafe'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setLogType(type)}
                style={{ ...styles.toggleBtn, ...(logType === type ? styles.toggleActive : {}) }}
              >
                {type === 'home' ? 'Home brew' : 'Café'}
              </button>
            ))}
          </div>

          <Field label="Coffee name *">
            <input value={coffeeName} onChange={e => setCoffeeName(e.target.value)}
              required style={styles.input} placeholder="e.g. Ethiopia Yirgacheffe" />
          </Field>

          <div style={styles.row}>
            <Field label="Roaster">
              <input value={roaster} onChange={e => setRoaster(e.target.value)}
                style={styles.input} placeholder="Roaster name" />
            </Field>
            <Field label="Roast level">
              <select value={roastLevel} onChange={e => setRoastLevel(e.target.value)} style={styles.input}>
                <option value="">—</option>
                {ROAST_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Brew method">
            <select value={brewMethod} onChange={e => setBrewMethod(e.target.value)} style={styles.input}>
              <option value="">—</option>
              {BREW_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>

          {/* Home-only fields */}
          {logType === 'home' && (
            <>
              <div style={styles.row}>
                <Field label="Dose (g)">
                  <input type="number" step="0.1" value={doseG} onChange={e => setDoseG(e.target.value)}
                    style={styles.input} placeholder="18" />
                </Field>
                <Field label="Yield (g)">
                  <input type="number" step="0.1" value={yieldG} onChange={e => setYieldG(e.target.value)}
                    style={styles.input} placeholder="36" />
                </Field>
              </div>
              <div style={styles.row}>
                <Field label="Brew time (s)">
                  <input type="number" value={brewTimeS} onChange={e => setBrewTimeS(e.target.value)}
                    style={styles.input} placeholder="28" />
                </Field>
                <Field label="Grind size">
                  <input value={grindSize} onChange={e => setGrindSize(e.target.value)}
                    style={styles.input} placeholder="Fine" />
                </Field>
              </div>
            </>
          )}

          {/* Café-only fields */}
          {logType === 'cafe' && (
            <>
              <Field label="Café name">
                <input value={cafeName} onChange={e => setCafeName(e.target.value)}
                  style={styles.input} placeholder="Blue Bottle Coffee" />
              </Field>
              <div style={styles.row}>
                <Field label="Location">
                  <input value={location} onChange={e => setLocation(e.target.value)}
                    style={styles.input} placeholder="City or address" />
                </Field>
                <Field label="Would return?">
                  <select value={wouldReturn} onChange={e => setWouldReturn(e.target.value)} style={styles.input}>
                    <option value="">—</option>
                    {WOULD_RETURN.map(w => <option key={w}>{w}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {/* Shared fields */}
          <Field label="Flavour tags">
            <div style={styles.tagGrid}>
              {FLAVOUR_OPTIONS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={{ ...styles.tagOption, ...(flavourTags.includes(tag) ? styles.tagActive : {}) }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Rating">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? '' : n)}
                  style={{ fontSize: '1.4rem', background: 'none', border: 'none',
                    color: rating !== '' && n <= rating ? 'var(--color-caramel)' : 'var(--color-border)' }}
                >
                  ★
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...styles.input, height: '80px', resize: 'vertical' }}
              placeholder="Tasting notes…" />
          </Field>

          {error && <p style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Saving…' : 'Save log'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
      fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-espresso)' }}>
      {label}
      {children}
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(44,26,14,0.4)',
    display: 'flex', alignItems: 'flex-end', zIndex: 100,
  },
  sheet: {
    background: '#fff', width: '100%', maxHeight: '90dvh',
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    overflowY: 'auto', padding: 'var(--space-6)',
  },
  sheetHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 'var(--space-4)',
  },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-espresso)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.6rem', color: 'var(--color-muted)', lineHeight: 1 },
  form: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  toggle: {
    display: 'flex', background: 'var(--color-foam)',
    borderRadius: 'var(--radius-md)', padding: '3px', gap: '3px',
  },
  toggleBtn: {
    flex: 1, padding: 'var(--space-2)', border: 'none',
    borderRadius: '6px', background: 'transparent',
    color: 'var(--color-muted)', fontWeight: 500, fontSize: '0.9rem',
  },
  toggleActive: { background: '#fff', color: 'var(--color-espresso)', boxShadow: 'var(--shadow-sm)' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' },
  input: {
    padding: 'var(--space-3)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', fontSize: '0.95rem', width: '100%',
  },
  tagGrid: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' },
  tagOption: {
    padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--color-border)',
    background: '#fff', fontSize: '0.8rem', color: 'var(--color-muted)',
  },
  tagActive: { background: 'var(--color-cream)', borderColor: 'var(--color-caramel)', color: 'var(--color-roast)', fontWeight: 600 },
  submitBtn: {
    padding: 'var(--space-4)', background: 'var(--color-caramel)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem',
    marginTop: 'var(--space-2)',
  },
}
