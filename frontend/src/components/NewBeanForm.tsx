import { useState, type FormEvent } from 'react'
import { createBean } from '../hooks/useBeans'
import type { Bean } from '../hooks/useBeans'

const ROAST_LEVELS   = ['Light', 'Medium', 'Medium-Dark', 'Dark']
const PROCESS_METHODS = ['Washed', 'Natural', 'Honey', 'Anaerobic']

interface Props {
  onClose: () => void
  onSaved: (bean: Bean) => void
}

export function NewBeanForm({ onClose, onSaved }: Props) {
  const [name, setName]               = useState('')
  const [roaster, setRoaster]         = useState('')
  const [origin, setOrigin]           = useState('')
  const [roastLevel, setRoastLevel]   = useState('')
  const [process, setProcess]         = useState('')
  const [roastDate, setRoastDate]     = useState('')
  const [openedDate, setOpenedDate]   = useState('')
  const [totalWeight, setTotalWeight] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const total = Number(totalWeight)
      const bean = await createBean({
        name:               name.trim(),
        roaster:            roaster || undefined,
        origin:             origin || undefined,
        roast_level:        roastLevel || undefined,
        process_method:     process || undefined,
        roast_date:         roastDate || undefined,
        opened_date:        openedDate || undefined,
        total_weight_g:     total,
        remaining_weight_g: total,
      })
      onSaved(bean)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save bean')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <div style={styles.sheetHeader}>
          <h2 style={styles.title}>Add bean bag</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <Field label="Coffee name *">
            <input value={name} onChange={e => setName(e.target.value)}
              required style={styles.input} placeholder="e.g. Ethiopia Yirgacheffe" />
          </Field>

          <div style={styles.row}>
            <Field label="Roaster">
              <input value={roaster} onChange={e => setRoaster(e.target.value)}
                style={styles.input} placeholder="Roaster name" />
            </Field>
            <Field label="Origin">
              <input value={origin} onChange={e => setOrigin(e.target.value)}
                style={styles.input} placeholder="Country / region" />
            </Field>
          </div>

          <div style={styles.row}>
            <Field label="Roast level">
              <select value={roastLevel} onChange={e => setRoastLevel(e.target.value)} style={styles.input}>
                <option value="">—</option>
                {ROAST_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Process">
              <select value={process} onChange={e => setProcess(e.target.value)} style={styles.input}>
                <option value="">—</option>
                {PROCESS_METHODS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div style={styles.row}>
            <Field label="Roast date">
              <input type="date" value={roastDate} onChange={e => setRoastDate(e.target.value)}
                style={styles.input} />
            </Field>
            <Field label="Opened date">
              <input type="date" value={openedDate} onChange={e => setOpenedDate(e.target.value)}
                style={styles.input} />
            </Field>
          </div>

          <Field label="Bag weight (g) *">
            <input type="number" step="1" min="1" value={totalWeight}
              onChange={e => setTotalWeight(e.target.value)}
              required style={styles.input} placeholder="250" />
          </Field>

          {error && <p style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Saving…' : 'Add to inventory'}
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
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' },
  input: {
    padding: 'var(--space-3)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', fontSize: '0.95rem', width: '100%',
  },
  submitBtn: {
    padding: 'var(--space-4)', background: 'var(--color-caramel)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem',
    marginTop: 'var(--space-2)',
  },
}
