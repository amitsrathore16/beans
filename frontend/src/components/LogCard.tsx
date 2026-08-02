import { useState } from 'react'
import type { Log, DuplicateMode } from '../hooks/useLogs'
import { getExtractionStatus } from './NewLogForm'

interface Props {
  log: Log
  onDelete: (id: string) => void
  onEdit: (log: Log) => void
  onDuplicate?: (id: string, mode: DuplicateMode) => void
}

export function LogCard({ log, onDelete, onEdit, onDuplicate }: Props) {
  const isHome = log.log_type === 'home'
  const [showBrewAgain, setShowBrewAgain] = useState(false)

  const extractionStatus = getExtractionStatus(log.actual_yield_g, log.ideal_yield_g)

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...s.badge, background: isHome ? '#e8f0d8' : '#f0e8d8' }}>
            {isHome ? 'Home brew' : 'Café'}
          </span>
          <h3 style={s.name}>{log.coffee_name}</h3>
          <p style={s.subheading}>
            {[log.roaster, log.brew_method].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={s.right}>
          {log.rating != null && <Stars rating={log.rating} />}
          <div style={s.headerActions}>
            <button onClick={() => onEdit(log)} style={s.editBtn} aria-label="Edit log">Edit</button>
            <button onClick={() => onDelete(log.id)} style={s.deleteBtn} aria-label="Delete log">×</button>
          </div>
        </div>
      </div>

      {/* Row 1 — equipment · grind */}
      {isHome && (log.equipment || log.grind_size) && (
        <div style={s.chipRow}>
          {log.equipment  && <Chip value={log.equipment} />}
          {log.grind_size && <Chip value={log.grind_size} />}
        </div>
      )}

      {/* Row 2 — dose · ratio · yield */}
      {isHome && (log.dose_g != null || log.coffee_water_ratio || log.actual_yield_g != null) && (
        <div style={s.chipRow}>
          {log.dose_g != null        && <Chip value={`${log.dose_g}g dose`} />}
          {log.coffee_water_ratio    && <Chip value={log.coffee_water_ratio} />}
          {log.actual_yield_g != null && <Chip value={`${log.actual_yield_g}g yield`} />}
        </div>
      )}

      {/* Café location */}
      {!isHome && log.cafe_name && (
        <p style={s.cafeName}>{log.cafe_name}{log.location ? ` · ${log.location}` : ''}</p>
      )}

      {log.notes && <p style={s.notes}>{log.notes}</p>}

      {/* Footer */}
      <div style={s.footer}>
        <div style={s.footerLeft}>
          {extractionStatus && <ExtractionBadge status={extractionStatus} />}
          <span style={s.date}>{relativeTime(log.created_at)}</span>
        </div>

        {isHome && onDuplicate && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowBrewAgain(p => !p)} style={s.brewAgainBtn}>
              Brew again ↓
            </button>
            {showBrewAgain && (
              <div style={s.brewMenu}>
                <button style={s.brewMenuItem}
                  onClick={() => { setShowBrewAgain(false); onDuplicate(log.id, 'exact') }}>
                  <strong>Exact copy</strong>
                  <span>All settings &amp; notes duplicated</span>
                </button>
                <button style={s.brewMenuItem}
                  onClick={() => { setShowBrewAgain(false); onDuplicate(log.id, 'log_with_changes') }}>
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

function Chip({ value }: { value: string }) {
  return <span style={s.chip}>{value}</span>
}

function ExtractionBadge({ status }: { status: 'ideal' | 'over' | 'under' }) {
  const cfg = {
    ideal: { label: '● Ideal', color: '#2E7D32', bg: '#e6f4ea' },
    over:  { label: '▲ Over',  color: '#C8873A', bg: '#fef3c7' },
    under: { label: '▼ Under', color: '#1565C0', bg: '#dbeafe' },
  }[status]
  return (
    <span style={{ ...s.extractionBadge, color: cfg.color, background: cfg.bg }}>
      {cfg.label}
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
  if (days === 1) return '1 day ago'
  if (days < 30)  return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const s: Record<string, React.CSSProperties> = {
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
  headerActions: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  editBtn: {
    background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-caramel)',
    fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', cursor: 'pointer',
  },
  deleteBtn: { background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '1.2rem', lineHeight: 1, padding: 0 },
  chipRow: {
    display: 'flex', gap: 'var(--space-2)', overflowX: 'auto',
    paddingBottom: '2px', scrollbarWidth: 'none' as const,
  },
  chip: {
    flexShrink: 0, fontSize: '0.78rem', padding: '3px 10px',
    borderRadius: '99px', background: 'var(--color-foam)',
    color: 'var(--color-espresso)', whiteSpace: 'nowrap' as const,
  },
  cafeName: { fontSize: '0.875rem', color: 'var(--color-roast)' },
  notes: { fontSize: '0.875rem', color: 'var(--color-muted)', fontStyle: 'italic' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-1)' },
  footerLeft: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  extractionBadge: { fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '99px' },
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
