import { getFreshness, FRESHNESS_COLOR, FRESHNESS_TEXT } from '../hooks/useBeans'
import type { Bean } from '../hooks/useBeans'

interface Props {
  bean: Bean
  onDelete: (id: string) => void
}

export function BeanCard({ bean, onDelete }: Props) {
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
              background: FRESHNESS_COLOR[freshness],
              color: FRESHNESS_TEXT[freshness],
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
        <button onClick={() => onDelete(bean.id)} style={styles.deleteBtn} aria-label="Delete bean">
          ×
        </button>
      </div>

      <div style={styles.weightRow}>
        <div>
          <span style={{ ...styles.weightNum, color: lowStock ? 'var(--color-error)' : 'var(--color-espresso)' }}>
            {bean.remaining_weight_g.toFixed(0)}g
          </span>
          <span style={styles.weightLabel}> / {bean.total_weight_g.toFixed(0)}g remaining</span>
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
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-muted)',
    fontSize: '1.2rem',
    lineHeight: 1,
    padding: 0,
    cursor: 'pointer',
  },
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
}
