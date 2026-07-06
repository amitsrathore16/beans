import { useState, useMemo, type FormEvent } from 'react'
import { createLog } from '../hooks/useLogs'
import type { InventoryMatch, SensoryProfile } from '../hooks/useLogs'

// ── Constants ─────────────────────────────────────────────────────────────────

const BREW_METHODS = [
  'Espresso', 'Pour Over', 'AeroPress', 'French Press',
  'Moka Pot', 'Cold Brew', 'Siphon', 'Stovetop',
]

const BREW_METHOD_EQUIPMENT: Record<string, string[]> = {
  'Espresso':    ['Home Machine (generic)', 'Breville Barista Express', "De'Longhi Dedica", 'Flair Pro 2', 'Cafelat Robot', 'Rok EspressoGC'],
  'Pour Over':   ['Hario V60', 'Kalita Wave', 'Chemex', 'Origami Dripper', 'Orea Brewer', 'Fellow Stagg X Dripper'],
  'AeroPress':   ['AeroPress (standard)', 'AeroPress Go', 'AeroPress + Fellow Prismo'],
  'French Press':['Bodum', 'SleekSteep', 'Generic French Press'],
  'Moka Pot':    ['Bialetti Moka Express', 'Generic Moka Pot'],
  'Cold Brew':   ['Toddy Cold Brew System', 'Mason Jar (immersion)', 'Generic Cold Brew Maker'],
  'Siphon':      ['Hario Syphon', 'Yama Siphon'],
  'Stovetop':    ['Turkish Cezve / Ibrik', 'Percolator'],
}

const VARIETAL_OPTIONS = ['100% Arabica', 'Arabica-Robusta Blend', 'Gesha', 'SL28', 'SL34', 'Bourbon', 'Typica', 'Other']
const ROAST_LEVELS    = ['Light', 'Medium', 'Medium-Dark', 'Dark']
const PROCESS_METHODS = ['Washed', 'Natural', 'Honey', 'Anaerobic']
const WOULD_RETURN    = ['Yes', 'Maybe', 'No'] as const

const SENSORY_OPTIONS = {
  aroma:      { multi: true,  options: ['Floral', 'Fruity', 'Nutty', 'Chocolatey', 'Spicy', 'Earthy', 'Sweet', 'Herbal', 'Smoky'] },
  flavour:    { multi: true,  options: ['Citrus', 'Berry', 'Stone Fruit', 'Tropical', 'Chocolate', 'Caramel', 'Brown Sugar', 'Nutty', 'Vanilla', 'Toffee', 'Malt', 'Tobacco', 'Cedar'] },
  acidity:    { multi: true,  options: ['Low', 'Mild', 'Bright', 'Crisp', 'Sparkling', 'Tart', 'Winey', 'Citric', 'Malic'] },
  body:       { multi: false, options: ['Light', 'Medium', 'Full', 'Syrupy'] },
  bitterness: { multi: false, options: ['Low', 'Mild', 'Medium', 'High', 'Harsh'] },
  mouthfeel:  { multi: false, options: ['Watery', 'Silky', 'Smooth', 'Creamy', 'Velvety', 'Gritty', 'Astringent'] },
  finish:     { multi: true,  options: ['Short', 'Clean', 'Lingering', 'Sweet', 'Bitter', 'Dry', 'Spiced'] },
} as const

type SensoryKey = keyof typeof SENSORY_OPTIONS

// ── Extraction logic (pure) ───────────────────────────────────────────────────

export function getExtractionStatus(
  actual: number | undefined,
  ideal: number | undefined,
): 'ideal' | 'over' | 'under' | null {
  if (actual == null || ideal == null || ideal === 0) return null
  const delta = (actual - ideal) / ideal
  if (Math.abs(delta) <= 0.05) return 'ideal'
  return delta > 0 ? 'over' : 'under'
}

function computeIdealYield(dose: string, ratio: string): number | null {
  const doseNum = parseFloat(dose)
  const parts = ratio.split(':')
  if (parts.length !== 2) return null
  const denominator = parseFloat(parts[1])
  if (isNaN(doseNum) || isNaN(denominator) || denominator === 0) return null
  return parseFloat((doseNum * denominator).toFixed(1))
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LogPrefill {
  brand?: string
  coffee_name?: string
  origin?: string
  roaster?: string
  varietal?: string
  roast_level?: string
  process_method?: string
  brew_method?: string
  equipment?: string
  coffee_water_ratio?: string
  dose_g?: number
  actual_yield_g?: number
  brew_time_s?: number
  grind_size?: string
  water_temp_c?: number
}

interface Props {
  onClose: () => void
  onSaved: (logId: string, match: InventoryMatch | null) => void
  prefill?: LogPrefill
  existingBrands?: string[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewLogForm({ onClose, onSaved, prefill, existingBrands = [] }: Props) {
  const [logType, setLogType] = useState<'home' | 'cafe'>('home')

  // Coffee identity
  const [brand, setBrand]               = useState(prefill?.brand ?? '')
  const [coffeeName, setCoffeeName]     = useState(prefill?.coffee_name ?? '')
  const [origin, setOrigin]             = useState(prefill?.origin ?? '')
  const [roaster, setRoaster]           = useState(prefill?.roaster ?? '')
  const [varietal, setVarietal]         = useState(prefill?.varietal ?? '')
  const [roastLevel, setRoastLevel]     = useState(prefill?.roast_level ?? '')
  const [processMethod, setProcessMethod] = useState(prefill?.process_method ?? '')

  // Equipment
  const [brewMethod, setBrewMethod]   = useState(prefill?.brew_method ?? '')
  const [equipment, setEquipment]     = useState(prefill?.equipment ?? '')

  // Grind
  const [grinder, setGrinder]     = useState('')
  const [grindSize, setGrindSize] = useState(prefill?.grind_size ?? '')

  // Extraction
  const [doseG, setDoseG]                   = useState(prefill?.dose_g?.toString() ?? '')
  const [coffeeWaterRatio, setCoffeeWaterRatio] = useState(prefill?.coffee_water_ratio ?? '')
  const [actualYieldG, setActualYieldG]     = useState(prefill?.actual_yield_g?.toString() ?? '')
  const [brewTimeS, setBrewTimeS]           = useState(prefill?.brew_time_s?.toString() ?? '')
  const [waterTempC, setWaterTempC]         = useState(prefill?.water_temp_c?.toString() ?? '')

  // Sensory
  const [sensoryProfile, setSensoryProfile] = useState<SensoryProfile>({})

  // Overall
  const [rating, setRating] = useState<number | ''>('')
  const [notes, setNotes]   = useState('')

  // Café-only
  const [cafeName, setCafeName]       = useState('')
  const [location, setLocation]       = useState('')
  const [wouldReturn, setWouldReturn] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [brandSuggestions, setBrandSuggestions] = useState<string[]>([])

  // Derived
  const idealYield = useMemo(() => computeIdealYield(doseG, coffeeWaterRatio), [doseG, coffeeWaterRatio])
  const extractionStatus = getExtractionStatus(
    actualYieldG ? parseFloat(actualYieldG) : undefined,
    idealYield ?? undefined,
  )

  const equipmentOptions = BREW_METHOD_EQUIPMENT[brewMethod] ?? []

  function handleBrewMethodChange(method: string) {
    setBrewMethod(method)
    setEquipment('')
  }

  function handleBrandChange(val: string) {
    setBrand(val)
    if (val.length >= 1) {
      setBrandSuggestions(
        existingBrands.filter(b => b.toLowerCase().startsWith(val.toLowerCase()) && b !== val)
      )
    } else {
      setBrandSuggestions([])
    }
  }

  function toggleSensoryMulti(key: SensoryKey, value: string) {
    setSensoryProfile(prev => {
      const current = (prev[key] as string[] | undefined) ?? []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  function toggleSensorySingle(key: SensoryKey, value: string) {
    setSensoryProfile(prev => ({
      ...prev,
      [key]: prev[key as keyof SensoryProfile] === value ? undefined : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await createLog({
        log: {
          log_type: logType,
          brand: brand || undefined,
          coffee_name: coffeeName.trim(),
          origin: origin || undefined,
          roaster: roaster || undefined,
          varietal: varietal || undefined,
          roast_level: roastLevel || undefined,
          process_method: processMethod || undefined,
          brew_method: brewMethod || undefined,
          equipment: equipment || undefined,
          grinder: grinder || undefined,
          grind_size: grindSize || undefined,
          dose_g: doseG ? Number(doseG) : undefined,
          coffee_water_ratio: coffeeWaterRatio || undefined,
          ideal_yield_g: idealYield ?? undefined,
          actual_yield_g: actualYieldG ? Number(actualYieldG) : undefined,
          brew_time_s: brewTimeS ? Number(brewTimeS) : undefined,
          water_temp_c: waterTempC ? Number(waterTempC) : undefined,
          sensory_profile: Object.keys(sensoryProfile).length ? sensoryProfile : undefined,
          rating: rating !== '' ? Number(rating) : undefined,
          notes: notes || undefined,
          ...(logType === 'cafe' ? {
            cafe_name: cafeName || undefined,
            location: location || undefined,
            would_return: (wouldReturn as 'Yes' | 'Maybe' | 'No') || undefined,
          } : {}),
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

          {/* ── Coffee ──────────────────────────────────────────────────── */}
          <SectionDivider label="Coffee" />

          <Field label="Brand">
            <div style={{ position: 'relative' }}>
              <input
                value={brand}
                onChange={e => handleBrandChange(e.target.value)}
                style={styles.input}
                placeholder="e.g. Blue Tokai, Third Wave Coffee"
                autoComplete="off"
              />
              {brandSuggestions.length > 0 && (
                <div style={styles.autocomplete}>
                  {brandSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      style={styles.autocompleteItem}
                      onClick={() => { setBrand(s); setBrandSuggestions([]) }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field label="Coffee name *">
            <input
              value={coffeeName}
              onChange={e => setCoffeeName(e.target.value)}
              required
              style={styles.input}
              placeholder="e.g. Monsoon Malabar, Attikan Estate"
            />
          </Field>

          <Field label="Origin">
            <input
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              style={styles.input}
              placeholder="e.g. Attikan Estate, Coorg"
            />
          </Field>

          <Field label="Roaster">
            <input
              value={roaster}
              onChange={e => setRoaster(e.target.value)}
              style={styles.input}
              placeholder="e.g. Blue Tokai"
            />
          </Field>

          <Field label="Varietal">
            <ChipRow
              options={VARIETAL_OPTIONS}
              selected={varietal}
              onSelect={v => setVarietal(prev => prev === v ? '' : v)}
            />
          </Field>

          <Field label="Roast level">
            <ChipRow
              options={ROAST_LEVELS}
              selected={roastLevel}
              onSelect={v => setRoastLevel(prev => prev === v ? '' : v)}
            />
          </Field>

          <Field label="Process method">
            <ChipRow
              options={PROCESS_METHODS}
              selected={processMethod}
              onSelect={v => setProcessMethod(prev => prev === v ? '' : v)}
            />
          </Field>

          {/* ── Equipment ───────────────────────────────────────────────── */}
          <SectionDivider label="Equipment" />

          <Field label="Brew method">
            <select
              value={brewMethod}
              onChange={e => handleBrewMethodChange(e.target.value)}
              style={styles.input}
            >
              <option value="">—</option>
              {BREW_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>

          {equipmentOptions.length > 0 && (
            <Field label="Equipment">
              <ChipRow
                options={equipmentOptions}
                selected={equipment}
                onSelect={v => setEquipment(prev => prev === v ? '' : v)}
              />
              <input
                value={equipment}
                onChange={e => setEquipment(e.target.value)}
                style={{ ...styles.input, marginTop: 'var(--space-2)' }}
                placeholder="Or type your equipment"
              />
            </Field>
          )}

          {equipmentOptions.length === 0 && (
            <Field label="Equipment">
              <input
                value={equipment}
                onChange={e => setEquipment(e.target.value)}
                style={styles.input}
                placeholder="Your equipment"
              />
            </Field>
          )}

          {/* Home-only fields */}
          {logType === 'home' && (
            <>
              {/* ── Grind ─────────────────────────────────────────────── */}
              <SectionDivider label="Grind" />

              <div style={styles.row}>
                <Field label="Grinder">
                  <input
                    value={grinder}
                    onChange={e => setGrinder(e.target.value)}
                    style={styles.input}
                    placeholder="e.g. Comandante C40"
                  />
                </Field>
                <Field label="Grind size">
                  <input
                    value={grindSize}
                    onChange={e => setGrindSize(e.target.value)}
                    style={styles.input}
                    placeholder="e.g. Fine, 20 clicks"
                  />
                </Field>
              </div>

              {/* ── Extraction ──────────────────────────────────────────── */}
              <SectionDivider label="Extraction" />

              <div style={styles.row}>
                <Field label="Dose (g)">
                  <input
                    type="number" step="0.1"
                    value={doseG}
                    onChange={e => setDoseG(e.target.value)}
                    style={styles.input}
                    placeholder="18"
                  />
                </Field>
                <Field label="Coffee:Water ratio">
                  <input
                    value={coffeeWaterRatio}
                    onChange={e => setCoffeeWaterRatio(e.target.value)}
                    style={styles.input}
                    placeholder="1:15"
                  />
                </Field>
              </div>

              <div style={styles.row}>
                <Field label="Ideal yield (g)">
                  <div style={{ ...styles.input, ...styles.readOnly, color: idealYield != null ? 'var(--color-espresso)' : 'var(--color-muted)' }}>
                    {idealYield != null ? `${idealYield}g` : '—'}
                  </div>
                </Field>
                <Field label="Actual yield (g)">
                  <input
                    type="number" step="0.1"
                    value={actualYieldG}
                    onChange={e => setActualYieldG(e.target.value)}
                    style={styles.input}
                    placeholder="36"
                  />
                </Field>
              </div>

              {extractionStatus && (
                <ExtractionBadge status={extractionStatus} />
              )}

              <div style={styles.row}>
                <Field label="Brew time (s)">
                  <input
                    type="number"
                    value={brewTimeS}
                    onChange={e => setBrewTimeS(e.target.value)}
                    style={styles.input}
                    placeholder="28"
                  />
                </Field>
                <Field label="Water temp (°C)">
                  <input
                    type="number"
                    value={waterTempC}
                    onChange={e => setWaterTempC(e.target.value)}
                    style={styles.input}
                    placeholder="93"
                  />
                </Field>
              </div>
            </>
          )}

          {/* Café-only fields */}
          {logType === 'cafe' && (
            <>
              <SectionDivider label="Café" />
              <Field label="Café name">
                <input
                  value={cafeName}
                  onChange={e => setCafeName(e.target.value)}
                  style={styles.input}
                  placeholder="Blue Bottle Coffee"
                />
              </Field>
              <div style={styles.row}>
                <Field label="Location">
                  <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    style={styles.input}
                    placeholder="City or address"
                  />
                </Field>
                <Field label="Would return?">
                  <select
                    value={wouldReturn}
                    onChange={e => setWouldReturn(e.target.value)}
                    style={styles.input}
                  >
                    <option value="">—</option>
                    {WOULD_RETURN.map(w => <option key={w}>{w}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {/* ── Sensory ─────────────────────────────────────────────────── */}
          <SectionDivider label="Sensory" />

          {(Object.entries(SENSORY_OPTIONS) as [SensoryKey, { multi: boolean; options: readonly string[] }][]).map(([key, cfg]) => (
            <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
              <div style={styles.tagGrid}>
                {cfg.options.map(opt => {
                  const profileVal = sensoryProfile[key as keyof SensoryProfile]
                  const isActive = cfg.multi
                    ? Array.isArray(profileVal) && profileVal.includes(opt)
                    : profileVal === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        cfg.multi
                          ? toggleSensoryMulti(key, opt)
                          : toggleSensorySingle(key, opt)
                      }
                      style={{ ...styles.tagOption, ...(isActive ? styles.tagActive : {}) }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </Field>
          ))}

          {/* ── Overall ─────────────────────────────────────────────────── */}
          <SectionDivider label="Overall" />

          <Field label="Rating">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? '' : n)}
                  style={{
                    fontSize: '1.4rem', background: 'none', border: 'none',
                    color: rating !== '' && n <= rating ? 'var(--color-caramel)' : 'var(--color-border)',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...styles.input, height: '80px', resize: 'vertical' }}
              placeholder="Tasting notes…"
            />
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={styles.sectionDivider}>
      <span style={styles.sectionLabel}>{label}</span>
      <div style={styles.sectionLine} />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
      {label}
      {children}
    </label>
  )
}

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: readonly string[]
  selected: string
  onSelect: (v: string) => void
}) {
  return (
    <div style={styles.tagGrid}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          style={{ ...styles.tagOption, ...(selected === opt ? styles.tagActive : {}) }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function ExtractionBadge({ status }: { status: 'ideal' | 'over' | 'under' }) {
  const config = {
    ideal: { label: '● Ideal', color: '#2d7a3a', bg: '#e6f4ea' },
    over:  { label: '▲ Over-extracted risk', color: '#92400e', bg: '#fef3c7' },
    under: { label: '▼ Under-extracted risk', color: '#1e3a5f', bg: '#dbeafe' },
  }[status]

  return (
    <div style={{ ...styles.extractionBadge, color: config.color, background: config.bg }}>
      {config.label}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  sectionDivider: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
    marginTop: 'var(--space-2)',
  },
  sectionLabel: {
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--color-muted)', whiteSpace: 'nowrap',
  },
  sectionLine: {
    flex: 1, height: '1px', background: 'var(--color-border)',
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
    fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-espresso)',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' },
  input: {
    padding: 'var(--space-3)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', fontSize: '0.95rem', width: '100%',
    boxSizing: 'border-box',
  },
  readOnly: {
    background: 'var(--color-foam)', color: 'var(--color-muted)',
    display: 'flex', alignItems: 'center', fontWeight: 600,
  },
  tagGrid: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' },
  tagOption: {
    padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--color-border)',
    background: '#fff', fontSize: '0.8rem', color: 'var(--color-muted)',
  },
  tagActive: {
    background: 'var(--color-cream)', borderColor: 'var(--color-caramel)',
    color: 'var(--color-roast)', fontWeight: 600,
  },
  extractionBadge: {
    padding: '4px 12px', borderRadius: '99px',
    fontSize: '0.8rem', fontWeight: 600, alignSelf: 'flex-start',
  },
  autocomplete: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: '#fff', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
    zIndex: 10, overflow: 'hidden',
  },
  autocompleteItem: {
    width: '100%', padding: 'var(--space-2) var(--space-3)',
    background: 'none', border: 'none', textAlign: 'left',
    fontSize: '0.9rem', color: 'var(--color-espresso)',
    borderBottom: '1px solid var(--color-border)',
  },
  submitBtn: {
    padding: 'var(--space-4)', background: 'var(--color-caramel)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem',
    marginTop: 'var(--space-2)',
  },
}
