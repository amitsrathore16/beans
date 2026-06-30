import type { Log } from '../hooks/useLogs'

interface Props {
  log: Log
  onDelete: (id: string) => void
}

export function LogCard({ log, onDelete }: Props) {
  const isHome = log.log_type === 'home'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <span style={{ ...styles.badge, background: isHome ? '#e8f0d8' : '#f0e8d8' }}>
            {isHome ? 'Home brew' : 'Café'}
          </span>
          <h3 style={styles.name}>{log.coffee_name}</h3>
          {log.roaster && <p style={styles.roaster}>{log.roaster}</p>}
        </div>
        <div style={styles.right}>
          {log.rating && <Stars rating={log.rating} />}
          <button
            onClick={() => onDelete(log.id)}
            style={styles.deleteBtn}
            aria-label="Delete log"
          >
            ×
          </button>
        </div>
      </div>

      {isHome && (log.dose_g || log.yield_g || log.brew_time_s) && (
        <div style={styles.stats}>
          {log.dose_g && <Stat label="Dose" value={`${log.dose_g}g`} />}
          {log.yield_g && <Stat label="Yield" value={`${log.yield_g}g`} />}
          {log.ratio && <Stat label="Ratio" value={`1:${log.ratio.toFixed(1)}`} />}
          {log.brew_time_s && <Stat label="Time" value={`${log.brew_time_s}s`} />}
        </div>
      )}

      {!isHome && log.cafe_name && (
        <p style={styles.cafeName}>{log.cafe_name}{log.location ? ` · ${log.location}` : ''}</p>
      )}

      {log.flavour_tags && log.flavour_tags.length > 0 && (
        <div style={styles.tags}>
          {log.flavour_tags.map(tag => (
            <span key={tag} style={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

      {log.notes && <p style={styles.notes}>{log.notes}</p>}

      <p style={styles.date}>
        {new Date(log.created_at).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        })}
      </p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
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
    gap: 'var(--space-2)',
  },
  badge: {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '99px',
    marginBottom: 'var(--space-1)',
    color: 'var(--color-espresso)',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    color: 'var(--color-espresso)',
  },
  roaster: {
    fontSize: '0.8rem',
    color: 'var(--color-muted)',
    marginTop: '2px',
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 'var(--space-2)',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-muted)',
    fontSize: '1.2rem',
    lineHeight: 1,
    padding: 0,
  },
  stats: {
    display: 'flex',
    gap: 'var(--space-3)',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'var(--color-foam)',
    borderRadius: 'var(--radius-sm)',
    padding: '4px 10px',
  },
  statLabel: {
    fontSize: '0.65rem',
    color: 'var(--color-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--color-espresso)',
  },
  cafeName: {
    fontSize: '0.875rem',
    color: 'var(--color-roast)',
  },
  tags: {
    display: 'flex',
    gap: 'var(--space-1)',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '0.75rem',
    padding: '2px 10px',
    borderRadius: '99px',
    background: 'var(--color-cream)',
    color: 'var(--color-roast)',
  },
  notes: {
    fontSize: '0.875rem',
    color: 'var(--color-muted)',
    fontStyle: 'italic',
  },
  date: {
    fontSize: '0.75rem',
    color: 'var(--color-border)',
    marginTop: 'var(--space-1)',
  },
}
