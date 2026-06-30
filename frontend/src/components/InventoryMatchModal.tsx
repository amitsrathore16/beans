import type { InventoryMatch } from '../hooks/useLogs'

interface Props {
  match: InventoryMatch
  logId: string
  onConfirm: (beanId: string, logId: string, doseG: number) => Promise<void>
  onSkip: () => void
}

export function InventoryMatchModal({ match, logId, onConfirm, onSkip }: Props) {
  const doseG = match.remaining_before_g - match.remaining_after_g

  async function handleConfirm() {
    await onConfirm(match.bean_id, logId, doseG)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Deduct from inventory?</h2>
        <p style={styles.subtitle}>Found a match in your bean inventory</p>

        <div style={styles.beanInfo}>
          <p style={styles.beanName}>{match.bean_name}</p>
          <div style={styles.weights}>
            <Weight label="Before" value={match.remaining_before_g} />
            <span style={styles.arrow}>→</span>
            <Weight label="After" value={match.remaining_after_g} />
          </div>
          <p style={styles.deduction}>−{doseG.toFixed(1)}g</p>
        </div>

        {match.low_stock_warning && (
          <div style={styles.warning}>
            ⚠ Running low — only {match.remaining_after_g.toFixed(0)}g remaining after this brew
          </div>
        )}

        <div style={styles.actions}>
          <button onClick={handleConfirm} style={styles.confirmBtn}>
            Confirm deduction
          </button>
          <button onClick={onSkip} style={styles.skipBtn}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

function Weight({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-espresso)' }}>{value.toFixed(0)}g</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(44,26,14,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-4)',
    zIndex: 100,
  },
  modal: {
    background: '#fff',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '360px',
    boxShadow: 'var(--shadow-md)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    color: 'var(--color-espresso)',
    marginBottom: 'var(--space-1)',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--color-muted)',
    marginBottom: 'var(--space-4)',
  },
  beanInfo: {
    background: 'var(--color-foam)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
  },
  beanName: {
    fontWeight: 600,
    color: 'var(--color-espresso)',
    marginBottom: 'var(--space-3)',
  },
  weights: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-4)',
  },
  arrow: {
    color: 'var(--color-muted)',
    fontSize: '1.2rem',
  },
  deduction: {
    textAlign: 'center',
    marginTop: 'var(--space-2)',
    fontSize: '0.8rem',
    color: 'var(--color-muted)',
  },
  warning: {
    background: '#fff8e6',
    border: '1px solid #f0c060',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-3)',
    fontSize: '0.8rem',
    color: '#8a6000',
    marginBottom: 'var(--space-4)',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  confirmBtn: {
    padding: 'var(--space-3)',
    background: 'var(--color-caramel)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  skipBtn: {
    padding: 'var(--space-3)',
    background: 'none',
    color: 'var(--color-muted)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.95rem',
  },
}
