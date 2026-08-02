interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <h2 style={s.title}>{title}</h2>
        <p style={s.message}>{message}</p>
        <div style={s.actions}>
          <button onClick={onConfirm} style={s.confirmBtn}>{confirmLabel}</button>
          <button onClick={onCancel} style={s.cancelBtn}>Cancel</button>
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
    width: '100%', maxWidth: '340px', boxShadow: 'var(--shadow-md)',
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '1.2rem',
    color: 'var(--color-espresso)', marginBottom: 'var(--space-2)',
  },
  message: { fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' },
  actions: { display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' },
  confirmBtn: {
    padding: 'var(--space-3)', background: 'var(--color-error)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.95rem',
  },
  cancelBtn: {
    padding: 'var(--space-3)', background: 'none', color: 'var(--color-muted)',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.95rem',
  },
}
