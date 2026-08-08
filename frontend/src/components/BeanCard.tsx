import { useState } from 'react'
import { getFreshness, FRESHNESS_STYLE } from '../hooks/useBeans'
import type { Bean } from '../hooks/useBeans'
import { useBeanHistory } from '../hooks/useLogs'

interface Props {
  bean: Bean
  onDelete: (id: string) => void
  onEdit: (bean: Bean) => void
}

export function BeanCard({ bean, onDelete, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { entries, loading, error } = useBeanHistory(bean.id, expanded)
  const freshness = getFreshness(bean.roast_date)
  const pct = Math.min(100, Math.round((bean.remaining_weight_g / bean.total_weight_g) * 100))
  const lowStock = bean.remaining_weight_g < 50

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.info}>
          {freshness && (
            <span style={{
              ...styles.badge,
              background: FRESHNESS_STYLE[freshness].bg,
              color: FRESHNESS_STYLE[freshness].text,
            }}>
              {freshness}
            </span>
          )}
          <h3 style={styles.name}>{bean.name}</h3>
          {bean.roaster && <p style={styles.sub}>{bean.roaster}</p>}
          <p style={styles.sub}>
            {[bean.origin, bean.roast_level, bean.process_method].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={styles.actions}>
          <button onClick={() => onEdit(bean)} style={styles.editBtn} aria-label="Edit bean">
            Edit
          </button>
          <button onClick={() => onDelete(bean.id)} style={styles.deleteBtn} aria-label="Delete bean">
            ×
          </button>
        </div>
      </div>

      <div style={styles.weightRow}>
        <div>
          <span style={{ ...styles.weightNum, color: lowStock ? 'var(--color-error)' : 'var(--color-espresso)' }}>
            {bean.remaining_weight_g.toFixed(0)}g
          </span>
          <span style={styles.weightLabel}> remaining</span>
          {lowStock && <span style={styles.lowStock}> · Low stock</span>}
        </div>
        <span style={styles.pct}>{pct}%</span>
      </div>

      <div style={styles.barTrack}>
        <div style={{
          ...styles.barFill,
          width: `${pct}%`,
          background: lowStock ? 'var(--color-error)' : 'var(--color-caramel)',
        }} />
      </div>

      {bean.roast_date && (
        <p style={styles.date}>
          Roasted {new Date(bean.roast_date).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </p>
      )}

      <button onClick={() => setExpanded(e => !e)} style={styles.brewsToggle}>
        {expanded ? 'Hide history' : 'View history'} {expanded ? '▲' : '▼'}
      </button>

      {expanded && (
        <div style={styles.brewsList}>
          {loading ? (
            <p style={styles.brewsEmpty}>Loading…</p>
          ) : error ? (
            <p style={{ ...styles.brewsEmpty, color: 'var(--color-error)' }}>Couldn't load history</p>
          ) : entries.length === 0 ? (
            <p style={styles.brewsEmpty}>No inventory changes yet</p>
          ) : (
            entries.map(entry => {
              const brewLabel = [entry.log?.brew_method, entry.log?.coffee_name].filter(Boolean).join(' · ') || 'Brew'
              const kind =
                entry.source === 'manual_adjustment'
                  ? { tag: 'Manual', style: styles.sourceManual, label: 'Manual adjustment' }
                  : entry.source === 'brew_edit_reverse'
                    ? { tag: 'Edit', style: styles.sourceEdit, label: `Moved off — ${brewLabel}` }
                    : { tag: 'Brew', style: styles.sourceBrew, label: brewLabel }
              return (
                <div key={entry.id} style={styles.brewRow}>
                  <span style={styles.brewName}>
                    <span style={{ ...styles.sourceTag, ...kind.style }}>{kind.tag}</span>
                    {kind.label}
                  </span>
                  <span style={styles.brewMeta}>
                    {`${entry.delta_g > 0 ? '+' : ''}${entry.delta_g}g`}
                    {` · ${new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: { display: 'flex', flexDirection: 'column', gap: '2px' },
  badge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '99px',
    marginBottom: '4px',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    color: 'var(--color-espresso)',
  },
  sub: { fontSize: '0.8rem', color: 'var(--color-muted)' },
  actions: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  editBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    color: 'var(--color-caramel)',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '99px',
    cursor: 'pointer',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-muted)',
    fontSize: '1.2rem',
    lineHeight: 1,
    padding: 0,
    cursor: 'pointer',
  },
  sourceTag: {
    fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.04em', padding: '1px 6px', borderRadius: '99px',
    marginRight: '6px', verticalAlign: 'middle',
  },
  sourceBrew:   { background: '#e8f0d8', color: '#4a5a2a' },
  sourceManual: { background: '#f0e0d0', color: '#8a5a2a' },
  sourceEdit:   { background: '#dbe4f0', color: '#2a4a7a' },
  weightRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  weightNum: { fontSize: '1.3rem', fontWeight: 700 },
  weightLabel: { fontSize: '0.8rem', color: 'var(--color-muted)' },
  lowStock: { fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 },
  pct: { fontSize: '0.85rem', color: 'var(--color-muted)' },
  barTrack: {
    height: '6px',
    background: 'var(--color-border)',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '99px',
    transition: 'width 0.3s ease',
  },
  date: { fontSize: '0.75rem', color: 'var(--color-muted)' },
  brewsToggle: {
    background: 'none', border: 'none', padding: 0, textAlign: 'left',
    fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-caramel)', cursor: 'pointer',
  },
  brewsList: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  brewsEmpty: { fontSize: '0.8rem', color: 'var(--color-muted)' },
  brewRow: {
    display: 'flex', flexDirection: 'column', gap: '2px',
    paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)',
  },
  brewName: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-espresso)' },
  brewMeta: { fontSize: '0.75rem', color: 'var(--color-muted)' },
}
