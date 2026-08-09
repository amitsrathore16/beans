import type { ReattributionPreview } from '../hooks/useLogs'

interface Props {
  preview: ReattributionPreview
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ReattributionModal({ preview, loading, onConfirm, onCancel }: Props) {
  const dose = preview.dose_g
  const movesToBean = preview.to_bean_name != null

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h2 style={s.title}>Move inventory?</h2>
        <p style={s.subtitle}>
          You changed the coffee name, so this brew’s deduction should follow it.
        </p>

        <div style={s.box}>
          {movesToBean ? (
            <p style={s.line}>
              Refund <strong>{dose}g</strong> to <strong>{preview.from_bean_name}</strong> and deduct it from{' '}
              <strong>{preview.to_bean_name}</strong>.
            </p>
          ) : (
            <p style={s.line}>
              No bean matches the new name. Refund <strong>{dose}g</strong> back to{' '}
              <strong>{preview.from_bean_name}</strong>; this brew will no longer be linked to inventory.
            </p>
          )}
        </div>

        <div style={s.actions}>
          <button onClick={onConfirm} disabled={loading} style={s.confirmBtn}>
            {loading ? 'Saving…' : movesToBean ? 'Move & save' : 'Refund & save'}
          </button>
          <button onClick={onCancel} disabled={loading} style={s.cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(44,26,14,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'var(--space-4)', zIndex: 200,
  },
  modal: {
    background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
    width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-md)',
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '1.3rem',
    color: 'var(--color-espresso)', marginBottom: 'var(--space-1)',
  },
  subtitle: { fontSize: '0.875rem', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' },
  box: {
    background: 'var(--color-foam)', borderRadius: 'var(--radius-md)',
    padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
  },
  line: { fontSize: '0.9rem', color: 'var(--color-espresso)', lineHeight: 1.5 },
  actions: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  confirmBtn: {
    padding: 'var(--space-3)', background: 'var(--color-caramel)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.95rem',
  },
  cancelBtn: {
    padding: 'var(--space-3)', background: 'none', color: 'var(--color-muted)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.95rem',
  },
}
