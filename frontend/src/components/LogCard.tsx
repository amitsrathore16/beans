import { useState } from 'react'
import type { Log, DuplicateMode } from '../hooks/useLogs'
import { getExtractionStatus } from './NewLogForm'

interface Props {
  log: Log
  onDelete: (id: string) => void
  onDuplicate?: (id: string, mode: DuplicateMode) => void
}

export function LogCard({ log, onDelete, onDuplicate }: Props) {
  const isHome = log.log_type === 'home'
  const [showBrewAgain, setShowBrewAgain] = useState(false)

  const extractionStatus = getExtractionStatus(log.actual_yield_g, log.ideal_yield_g)

  const chips: { label: string; value: string }[] = []
  if (log.dose_g != null)         chips.push({ label: 'Dose',  value: `${log.dose_g}g` })
  if (log.coffee_water_ratio)     chips.push({ label: 'Ratio', value: log.coffee_water_ratio })
  if (log.grind_size)             chips.push({ label: 'Grind', value: log.grind_size })
  if (log.actual_yield_g != null) chips.push({ label: 'Yield', value: `${log.actual_yield_g}g` })

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...styles.badge, background: isHome ? '#e8f0d8' : '#f0e8d8' }}>
            {isHome ? 'Home brew' : 'Café'}
          </span>
          <h3 style={styles.name}>{log.coffee_name}</h3>
          <p style={styles.subheading}>
            {[log.brand, log.brew_method, log.equipment].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={styles.right}>
          {log.rating && <Stars rating={log.rating} />}
          <button onClick={() => onDelete(log.id)} style={styles.deleteBtn} aria-label="Delete log">×</button>
        </div>
      </div>

      {/* Home brew chip row */}
      {isHome && chips.length > 0 && (
        <div style={styles.chipRow}>
          {chips.map(c => (
            <span key={c.label} style={styles.chip}>
              <span style={styles.chipLabel}>{c.label}</span>
              {' '}{c.value}
            </span>
          ))}
        </div>
      )}

      {/* Café location */}
      {!isHome && log.cafe_name && (
        <p style={styles.cafeName}>{log.cafe_name}{log.location ? ` · ${log.location}` : ''}</p>
      )}

      {log.notes && <p style={styles.notes}>{log.notes}</p>}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          {extractionStatus && <ExtractionBadge status={extractionStatus} />}
          <p style={styles.date}>{relativeTime(log.created_at)}</p>
        </div>

        {isHome && onDuplicate && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowBrewAgain(p => !p)} style={styles.brewAgainBtn}>
              Brew again ↓
            </button>
            {showBrewAgain && (
              <div style={styles.brewMenu}>
                <button
                  style={styles.brewMenuItem}
                  onClick={() => { setShowBrewAgain(false); onDuplicate(log.id, 'exact') }}
                >
                  <strong>Exact copy</strong>
                  <span>All settings &amp; notes duplicated</span>
                </button>
                <button
                  style={styles.brewMenuItem}
                  onClick={() => { setShowBrewAgain(false); onDuplicate(log.id, 'log_with_changes') }}
                >
                  <strong>Log with changes</strong>
                  <span>Keep extraction, clear tasting notes</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= rating ? 'var(--color-caramel)' : 'var(--color-border)', fontSize: '0.9rem' }}>★</span>
      ))}
    </div>
  )
}

function ExtractionBadge({ status }: { status: 'ideal' | 'over' | 'under' }) {
  const config = {
    ideal: { label: '● Ideal', color: '#2d7a3a', bg: '#e6f4ea' },
    over:  { label: '▲ Over', color: '#92400e', bg: '#fef3c7' },
    under: { label: '▼ Under', color: '#1e3a5f', bg: '#dbeafe' },
  }[status]
  return (
    <span style={{ ...styles.extractionBadge, color: config.color, background: config.bg }}>
      {config.label}
    </span>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)', boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' },
  badge: {
    display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
    padding: '2px 8px', borderRadius: '99px', marginBottom: 'var(--space-1)',
    color: 'var(--color-espresso)',
  },
  name: { fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-espresso)' },
  subheading: { fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '2px' },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 },
  deleteBtn: { background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', lineHeight: 1, padding: 0 },
  chipRow: {
    display: 'flex', gap: 'var(--space-2)', overflowX: 'auto',
    paddingBottom: '2px', scrollbarWidth: 'none',
  },
  chip: {
    flexShrink: 0, fontSize: '0.78rem', padding: '3px 10px',
    borderRadius: '99px', background: 'var(--color-foam)',
    color: 'var(--color-espresso)', whiteSpace: 'nowrap',
  },
  chipLabel: {
    fontSize: '0.65rem', color: 'var(--color-muted)',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '2px',
  },
  cafeName: { fontSize: '0.875rem', color: 'var(--color-roast)' },
  notes: { fontSize: '0.875rem', color: 'var(--color-muted)', fontStyle: 'italic' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-1)' },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  extractionBadge: {
    fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
  },
  date: { fontSize: '0.75rem', color: 'var(--color-border)' },
  brewAgainBtn: {
    background: 'none', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: '4px 10px',
    fontSize: '0.75rem', color: 'var(--color-roast)', fontWeight: 500,
  },
  brewMenu: {
    position: 'absolute', right: 0, bottom: '110%',
    background: '#fff', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
    overflow: 'hidden', minWidth: '200px', zIndex: 10,
  },
  brewMenuItem: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    width: '100%', padding: 'var(--space-3) var(--space-4)',
    background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)',
    textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-espresso)',
  },
}
