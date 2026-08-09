import { useState, useMemo, type FormEvent } from 'react'
import { createLog, updateLog } from '../hooks/useLogs'
import type { InventoryMatch, SensoryProfile, Log, ReattributionPreview } from '../hooks/useLogs'
import { ReattributionModal } from './ReattributionModal'

// ── Constants ─────────────────────────────────────────────────────────────────

const BREW_METHODS = [
  'Espresso', 'Pour Over', 'AeroPress', 'French Press',
  'Moka Pot', 'Cold Brew', 'Siphon', 'Stovetop',
]

const BREW_METHOD_EQUIPMENT: Record<string, string[]> = {
  'Espresso':     ['Home Machine (generic)', 'Breville Barista Express', "De'Longhi Dedica", 'Flair Pro 2', 'Cafelat Robot', 'Rok EspressoGC'],
  'Pour Over':    ['Hario V60', 'Kalita Wave', 'Chemex', 'Origami Dripper', 'Orea Brewer', 'Fellow Stagg X Dripper'],
  'AeroPress':    ['AeroPress (standard)', 'AeroPress Go', 'AeroPress + Fellow Prismo'],
  'French Press': ['Bodum', 'SleekSteep', 'Generic French Press'],
  'Moka Pot':     ['Bialetti Moka Express', 'Generic Moka Pot'],
  'Cold Brew':    ['Toddy Cold Brew System', 'Mason Jar (immersion)', 'Generic Cold Brew Maker'],
  'Siphon':       ['Hario Syphon', 'Yama Siphon'],
  'Stovetop':     ['Turkish Cezve / Ibrik', 'Percolator'],
}

const COFFEE_TYPES    = ['Single Origin', 'Blend']
const SPECIES_OPTIONS = ['100% Arabica', '100% Robusta', 'Arabica-Robusta Blend', 'Other']
const PROCESS_METHODS = ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Monsooned']
const ROAST_LEVELS    = ['Light', 'Medium', 'Medium-Dark', 'Dark']
const WOULD_RETURN    = ['Yes', 'Maybe', 'No'] as const

const SENSORY_OPTIONS = {
  aroma:      { multi: true,  options: ['Floral', 'Fruity', 'Nutty', 'Chocolatey', 'Spicy', 'Earthy', 'Sweet', 'Herbal', 'Smoky'] },
  flavour:    { multi: true,  options: ['Citrus', 'Berry', 'Stone Fruit', 'Tropical', 'Chocolate', 'Caramel', 'Brown Sugar', 'Nutty', 'Vanilla', 'Toffee', 'Malt'] },
  acidity:    { multi: true,  options: ['Low', 'Mild', 'Bright', 'Crisp', 'Sparkling', 'Tart', 'Winey', 'Citric', 'Malic'] },
  body:       { multi: false, options: ['Light', 'Medium', 'Full', 'Syrupy'] },
  bitterness: { multi: false, options: ['Low', 'Mild', 'Medium', 'High', 'Harsh'] },
  mouthfeel:  { multi: false, options: ['Watery', 'Silky', 'Smooth', 'Creamy', 'Velvety', 'Gritty', 'Astringent'] },
  finish:     { multi: true,  options: ['Short', 'Clean', 'Lingering', 'Sweet', 'Bitter', 'Dry', 'Spiced'] },
} as const

type SensoryKey = keyof typeof SENSORY_OPTIONS

// ── Extraction helpers (pure, exported for tests) ─────────────────────────────

export function getExtractionStatus(
  actual: number | undefined,
  ideal: number | undefined,
): 'ideal' | 'over' | 'under' | null {
  if (actual == null || ideal == null || ideal === 0) return null
  const delta = (actual - ideal) / ideal
  if (Math.abs(delta) <= 0.05) return 'ideal'
  return delta > 0 ? 'over' : 'under'
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LogPrefill {
  roaster?: string
  coffee_name?: string
  coffee_type?: string
  origin_country?: string
  origin_region?: string
  species?: string
  process_method?: string
  varietal?: string
  roast_level?: string
  roast_date?: string
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
  editLog?: Log            // when set, the form edits this log instead of creating
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewLogForm({ onClose, onSaved, prefill, editLog }: Props) {
  const isEdit = !!editLog
  const src: LogPrefill = editLog ?? prefill ?? {}

  const [logType, setLogType] = useState<'home' | 'cafe'>(editLog?.log_type ?? 'home')

  // Group A — Product
  const [roaster, setRoaster]         = useState(src.roaster ?? '')
  const [coffeeName, setCoffeeName]   = useState(src.coffee_name ?? '')
  const [coffeeType, setCoffeeType]   = useState(src.coffee_type ?? '')

  // Group B — Origin
  const [originCountry, setOriginCountry] = useState(src.origin_country ?? '')
  const [originRegion, setOriginRegion]   = useState(src.origin_region ?? '')

  // Group C — Bean Profile
  const [species, setSpecies]             = useState(src.species ?? '')
  const [processMethod, setProcessMethod] = useState(src.process_method ?? '')
  const [varietal, setVarietal]           = useState(src.varietal ?? '')

  // Group D — Roast Profile
  const [roastLevel, setRoastLevel] = useState(src.roast_level ?? '')
  const [roastDate, setRoastDate]   = useState(src.roast_date ?? '')

  // Equipment
  const [brewMethod, setBrewMethod] = useState(src.brew_method ?? '')
  const [equipment, setEquipment]   = useState(src.equipment ?? '')

  // Grind
  const [grinder, setGrinder]     = useState(editLog?.grinder ?? '')
  const [grindSize, setGrindSize] = useState(src.grind_size ?? '')

  // Extraction — locked (read-only) when editing
  const [doseG, setDoseG]                       = useState(src.dose_g?.toString() ?? '')
  const [coffeeWaterRatio, setCoffeeWaterRatio] = useState(src.coffee_water_ratio ?? '')
  const [actualYieldG, setActualYieldG]         = useState(src.actual_yield_g?.toString() ?? '')
  const [brewTimeS, setBrewTimeS]               = useState(src.brew_time_s?.toString() ?? '')
  const [waterTempC, setWaterTempC]             = useState(src.water_temp_c?.toString() ?? '')

  // Sensory
  const [sensoryProfile, setSensoryProfile] = useState<SensoryProfile>(editLog?.sensory_profile ?? {})

  // Overall
  const [rating, setRating] = useState<number | ''>(editLog?.rating ?? '')
  const [notes, setNotes]   = useState(editLog?.notes ?? '')

  // Café-only
  const [cafeName, setCafeName]       = useState(editLog?.cafe_name ?? '')
  const [location, setLocation]       = useState(editLog?.location ?? '')
  const [wouldReturn, setWouldReturn] = useState(editLog?.would_return ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [reattribution, setReattribution] = useState<ReattributionPreview | null>(null)

  const idealYield = useMemo(() => {
    const doseNum = parseFloat(doseG)
    const parts = coffeeWaterRatio.split(':')
    if (parts.length !== 2) return null
    const denominator = parseFloat(parts[1])
    if (isNaN(doseNum) || isNaN(denominator) || denominator === 0) return null
    return parseFloat((doseNum * denominator).toFixed(1))
  }, [doseG, coffeeWaterRatio])
  const extractionStatus = getExtractionStatus(
    actualYieldG ? parseFloat(actualYieldG) : undefined,
    idealYield ?? undefined,
  )
  const equipmentOptions = BREW_METHOD_EQUIPMENT[brewMethod] ?? []

  function handleBrewMethodChange(method: string) {
    setBrewMethod(method)
    setEquipment('')
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

  // Fields shared by create and edit. The extraction/quantity block is NOT here
  // — it only exists on create (locked on edit, rejected by the backend).
  function buildCommon() {
    return {
      roaster: roaster || undefined,
      coffee_name: coffeeName.trim(),
      coffee_type: coffeeType || undefined,
      origin_country: originCountry || undefined,
      origin_region: originRegion || undefined,
      species: species || undefined,
      process_method: processMethod || undefined,
      varietal: varietal || undefined,
      roast_level: roastLevel || undefined,
      roast_date: roastDate || undefined,
      brew_method: brewMethod || undefined,
      equipment: equipment || undefined,
      grinder: grinder || undefined,
      grind_size: grindSize || undefined,
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
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isEdit) {
        const resp = await updateLog(editLog!.id, buildCommon())
        // A coffee_name change on a deducted brew needs confirmation before the
        // stock moves — hold the save and show the modal.
        if (resp.reattribution) {
          setReattribution(resp.reattribution)
          setLoading(false)
          return
        }
        onSaved(editLog!.id, null)
        return
      }
      const result = await createLog({
        log: {
          log_type: logType,
          ...buildCommon(),
          dose_g: doseG ? Number(doseG) : undefined,
          coffee_water_ratio: coffeeWaterRatio || undefined,
          ideal_yield_g: idealYield ?? undefined,
          actual_yield_g: actualYieldG ? Number(actualYieldG) : undefined,
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

  async function handleConfirmReattribution() {
    setError(null)
    setLoading(true)
    try {
      await updateLog(editLog!.id, buildCommon(), true)
      onSaved(editLog!.id, null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save log')
      setReattribution(null)   // fall back to the form so the error shows
    } finally {
      setLoading(false)
    }
  }

  if (reattribution) {
    return (
      <ReattributionModal
        preview={reattribution}
        loading={loading}
        onConfirm={handleConfirmReattribution}
        onCancel={() => setReattribution(null)}
      />
    )
  }

  return (
    <div style={s.overlay}>
      <div style={s.sheet}>
        <div style={s.sheetHeader}>
          <h2 style={s.title}>{isEdit ? 'Edit log' : 'New log'}</h2>
          <button onClick={onClose} style={s.closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Log type toggle — locked when editing (type can't change) */}
          <div style={s.toggle}>
            {(['home', 'cafe'] as const).map(type => (
              <button key={type} type="button" disabled={isEdit} onClick={() => setLogType(type)}
                style={{ ...s.toggleBtn, ...(logType === type ? s.toggleActive : {}),
                  ...(isEdit ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}>
                {type === 'home' ? 'Home brew' : 'Café'}
              </button>
            ))}
          </div>

          {/* ── Coffee ──────────────────────────────────────────────────── */}
          <SectionDivider label="Coffee" />

          {/* Group A — Product */}
          <GroupLabel label="Product" />
          <Field label="Roaster / Brand">
            <input value={roaster} onChange={e => setRoaster(e.target.value)}
              style={s.input} placeholder="e.g. Blue Tokai, Third Wave Coffee" />
          </Field>
          <Field label="Coffee name *">
            <input value={coffeeName} onChange={e => setCoffeeName(e.target.value)}
              required style={s.input} placeholder="e.g. Ethiopia Yirgacheffe" />
          </Field>
          <Field label="Coffee type">
            <SingleChipRow options={COFFEE_TYPES} selected={coffeeType} onSelect={setCoffeeType} />
          </Field>

          {/* Group B — Origin */}
          <GroupLabel label="Origin" />
          <div style={s.row}>
            <Field label="Country">
              <input value={originCountry} onChange={e => setOriginCountry(e.target.value)}
                style={s.input} placeholder="India, Ethiopia…" />
            </Field>
            <Field label="Region / Estate">
              <input value={originRegion} onChange={e => setOriginRegion(e.target.value)}
                style={s.input} placeholder="Coorg, Yirgacheffe…" />
            </Field>
          </div>

          {/* Group C — Bean Profile */}
          <GroupLabel label="Bean Profile" />
          <Field label="Species">
            <SingleChipRow options={SPECIES_OPTIONS} selected={species} onSelect={setSpecies} />
          </Field>
          <Field label="Process method">
            <SingleChipRow options={PROCESS_METHODS} selected={processMethod} onSelect={setProcessMethod} />
          </Field>
          <Field label="Varietal (e.g. SL28, Gesha)">
            <input value={varietal} onChange={e => setVarietal(e.target.value)}
              style={s.input} placeholder="Optional — cultivar name" />
          </Field>

          {/* Group D — Roast Profile */}
          <GroupLabel label="Roast Profile" />
          <Field label="Roast level">
            <SingleChipRow options={ROAST_LEVELS} selected={roastLevel} onSelect={setRoastLevel} />
          </Field>
          <Field label="Roast date">
            <input type="date" value={roastDate} onChange={e => setRoastDate(e.target.value)} style={s.input} />
          </Field>

          {/* ── Equipment ─────────────────────────────────────────────────── */}
          <SectionDivider label="Equipment" />

          <Field label="Brew method">
            <select value={brewMethod} onChange={e => handleBrewMethodChange(e.target.value)} style={s.input}>
              <option value="">—</option>
              {BREW_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="Equipment">
            {equipmentOptions.length > 0 && (
              <SingleChipRow options={equipmentOptions} selected={equipment} onSelect={setEquipment} />
            )}
            <input value={equipment} onChange={e => setEquipment(e.target.value)}
              style={{ ...s.input, marginTop: equipmentOptions.length > 0 ? 'var(--space-2)' : 0 }}
              placeholder={equipmentOptions.length > 0 ? 'Or type your equipment' : 'Your equipment'} />
          </Field>

          {/* Home-only sections */}
          {logType === 'home' && (
            <>
              {/* ── Grind ─────────────────────────────────────────────── */}
              <SectionDivider label="Grind" />
              <div style={s.row}>
                <Field label="Grinder">
                  <input value={grinder} onChange={e => setGrinder(e.target.value)}
                    style={s.input} placeholder="Comandante C40…" />
                </Field>
                <Field label="Grind size">
                  <input value={grindSize} onChange={e => setGrindSize(e.target.value)}
                    style={s.input} placeholder="Fine, 20 clicks…" />
                </Field>
              </div>

              {/* ── Extraction ──────────────────────────────────────────── */}
              <SectionDivider label={isEdit ? 'Extraction (locked)' : 'Extraction'} />
              <div style={s.row}>
                <Field label="Dose (g)">
                  <input type="number" step="0.1" value={doseG} onChange={e => setDoseG(e.target.value)}
                    disabled={isEdit} style={{ ...s.input, ...(isEdit ? s.readOnly : {}) }} placeholder="18" />
                </Field>
                <Field label="Coffee:Water ratio">
                  <input value={coffeeWaterRatio} onChange={e => setCoffeeWaterRatio(e.target.value)}
                    disabled={isEdit} style={{ ...s.input, ...(isEdit ? s.readOnly : {}) }} placeholder="1:15" />
                </Field>
              </div>
              <div style={s.row}>
                <Field label="Ideal yield (g)">
                  <div style={{ ...s.input, ...s.readOnly }}>
                    {idealYield != null ? `${idealYield}g` : '—'}
                  </div>
                </Field>
                <Field label="Actual yield (g)">
                  <input type="number" step="0.1" value={actualYieldG} onChange={e => setActualYieldG(e.target.value)}
                    disabled={isEdit} style={{ ...s.input, ...(isEdit ? s.readOnly : {}) }} placeholder="36" />
                </Field>
              </div>
              {extractionStatus && <ExtractionBadge status={extractionStatus} />}
              <div style={s.row}>
                <Field label="Brew time (s)">
                  <input type="number" value={brewTimeS} onChange={e => setBrewTimeS(e.target.value)}
                    style={s.input} placeholder="28" />
                </Field>
                <Field label="Water temp (°C)">
                  <input type="number" value={waterTempC} onChange={e => setWaterTempC(e.target.value)}
                    style={s.input} placeholder="93" />
                </Field>
              </div>
            </>
          )}

          {/* Café-only */}
          {logType === 'cafe' && (
            <>
              <SectionDivider label="Café" />
              <Field label="Café name">
                <input value={cafeName} onChange={e => setCafeName(e.target.value)}
                  style={s.input} placeholder="Blue Bottle Coffee" />
              </Field>
              <div style={s.row}>
                <Field label="Location">
                  <input value={location} onChange={e => setLocation(e.target.value)}
                    style={s.input} placeholder="City or address" />
                </Field>
                <Field label="Would return?">
                  <select value={wouldReturn} onChange={e => setWouldReturn(e.target.value)} style={s.input}>
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
              <div style={s.chipGrid}>
                {cfg.options.map(opt => {
                  const val = sensoryProfile[key as keyof SensoryProfile]
                  const active = cfg.multi
                    ? Array.isArray(val) && val.includes(opt)
                    : val === opt
                  return (
                    <button key={opt} type="button"
                      onClick={() => cfg.multi ? toggleSensoryMulti(key, opt) : toggleSensorySingle(key, opt)}
                      style={{ ...s.chip, ...(active ? s.chipActive : {}) }}>
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
                <button key={n} type="button" onClick={() => setRating(rating === n ? '' : n)}
                  style={{ fontSize: '1.4rem', background: 'none', border: 'none',
                    color: rating !== '' && n <= rating ? 'var(--color-caramel)' : 'var(--color-border)' }}>
                  ★
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes">
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...s.input, height: '80px', resize: 'vertical' }}
              placeholder="Tasting notes…" />
          </Field>

          {error && <p style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>{error}</p>}
          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save log'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={s.sectionDivider}>
      <span style={s.sectionLabel}>{label}</span>
      <div style={s.sectionLine} />
    </div>
  )
}

function GroupLabel({ label }: { label: string }) {
  return <p style={s.groupLabel}>{label}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={s.field}>
      {label}
      {children}
    </label>
  )
}

function SingleChipRow({ options, selected, onSelect }: {
  options: readonly string[]
  selected: string
  onSelect: (v: string) => void
}) {
  return (
    <div style={s.chipGrid}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onSelect(selected === opt ? '' : opt)}
          style={{ ...s.chip, ...(selected === opt ? s.chipActive : {}) }}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ExtractionBadge({ status }: { status: 'ideal' | 'over' | 'under' }) {
  const cfg = {
    ideal: { label: '● Ideal',                color: '#2E7D32', bg: '#e6f4ea' },
    over:  { label: '▲ Over-extracted risk',  color: '#C8873A', bg: '#fef3c7' },
    under: { label: '▼ Under-extracted risk', color: '#1565C0', bg: '#dbeafe' },
  }[status]
  return (
    <div style={{ ...s.extractionBadge, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
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
    flex: 1, padding: 'var(--space-2)', border: 'none', borderRadius: '6px',
    background: 'transparent', color: 'var(--color-muted)', fontWeight: 500, fontSize: '0.9rem',
  },
  toggleActive: { background: '#fff', color: 'var(--color-espresso)', boxShadow: 'var(--shadow-sm)' },
  sectionDivider: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)',
  },
  sectionLabel: {
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--color-muted)', whiteSpace: 'nowrap',
  },
  sectionLine: { flex: 1, height: '1px', background: 'var(--color-border)' },
  groupLabel: {
    fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-caramel)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '-8px',
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
    fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-espresso)',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' },
  input: {
    padding: 'var(--space-3)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', fontSize: '0.95rem', width: '100%',
    boxSizing: 'border-box' as const,
  },
  readOnly: {
    background: 'var(--color-foam)', color: 'var(--color-muted)',
    display: 'flex', alignItems: 'center', fontWeight: 600, minHeight: '42px',
  },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-1)' },
  chip: {
    padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--color-border)',
    background: '#fff', fontSize: '0.8rem', color: 'var(--color-muted)',
  },
  chipActive: {
    background: 'var(--color-cream)', borderColor: 'var(--color-caramel)',
    color: 'var(--color-roast)', fontWeight: 600,
  },
  extractionBadge: {
    padding: '4px 12px', borderRadius: '99px',
    fontSize: '0.8rem', fontWeight: 600, alignSelf: 'flex-start',
  },
  submitBtn: {
    padding: 'var(--space-4)', background: 'var(--color-caramel)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem',
    marginTop: 'var(--space-2)',
  },
}
