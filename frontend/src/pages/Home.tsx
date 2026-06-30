import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHomeLogs, useCafeLogs, useSoftDeleteLog } from '../hooks/useLogs'
import type { InventoryMatch } from '../hooks/useLogs'
import { LogCard } from '../components/LogCard'
import { NewLogForm } from '../components/NewLogForm'
import { InventoryMatchModal } from '../components/InventoryMatchModal'
import { apiFetch } from '../lib/apiClient'

type Tab = 'home' | 'cafe'

export function Home() {
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')
  const [showForm, setShowForm] = useState(false)
  const [pendingMatch, setPendingMatch] = useState<{ match: InventoryMatch; logId: string } | null>(null)

  const { logs: homeLogs, loading: homeLoading, refetch: refetchHome } = useHomeLogs()
  const { logs: cafeLogs, loading: cafeLoading, refetch: refetchCafe } = useCafeLogs()
  const { softDelete } = useSoftDeleteLog()

  const logs = tab === 'home' ? homeLogs : cafeLogs
  const loading = tab === 'home' ? homeLoading : cafeLoading

  async function handleLogSaved(logId: string, match: InventoryMatch | null) {
    setShowForm(false)
    refetchHome()
    refetchCafe()
    if (match) {
      setPendingMatch({ match, logId })
    }
  }

  async function handleDeductConfirm(beanId: string, logId: string, doseG: number) {
    await apiFetch('/inventory/deduct', {
      method: 'POST',
      body: JSON.stringify({ bean_id: beanId, log_id: logId, dose_g: doseG }),
    })
    setPendingMatch(null)
  }

  async function handleDelete(id: string) {
    await softDelete(id)
    refetchHome()
    refetchCafe()
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Grounded</h1>
        <button onClick={signOut} style={styles.signOut}>Sign out</button>
      </header>

      <nav style={styles.tabs}>
        {(['home', 'cafe'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
          >
            {t === 'home' ? 'Home brews' : 'Café tastings'}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {loading ? (
          <p style={styles.empty}>Loading…</p>
        ) : logs.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No {tab === 'home' ? 'brew' : 'tasting'} logs yet</p>
            <p style={styles.emptyHint}>Tap + to add your first entry</p>
          </div>
        ) : (
          <div style={styles.list}>
            {logs.map(log => (
              <LogCard key={log.id} log={log} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <button onClick={() => setShowForm(true)} style={styles.fab} aria-label="Add log">
        +
      </button>

      {showForm && (
        <NewLogForm
          onClose={() => setShowForm(false)}
          onSaved={handleLogSaved}
        />
      )}

      {pendingMatch && (
        <InventoryMatchModal
          match={pendingMatch.match}
          logId={pendingMatch.logId}
          onConfirm={handleDeductConfirm}
          onSkip={() => setPendingMatch(null)}
        />
      )}

      <p style={styles.userHint}>{user?.email}</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: 'var(--color-foam)', paddingBottom: '80px' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: 'var(--space-4) var(--space-6)',
    borderBottom: '1px solid var(--color-border)', background: '#fff',
  },
  logo: { fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-espresso)' },
  signOut: {
    background: 'none', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)',
    color: 'var(--color-muted)', fontSize: '0.8rem',
  },
  tabs: {
    display: 'flex', background: '#fff',
    borderBottom: '1px solid var(--color-border)',
  },
  tab: {
    flex: 1, padding: 'var(--space-3)', border: 'none', background: 'none',
    color: 'var(--color-muted)', fontWeight: 500, fontSize: '0.9rem',
    borderBottom: '2px solid transparent',
  },
  tabActive: { color: 'var(--color-caramel)', borderBottomColor: 'var(--color-caramel)' },
  main: { padding: 'var(--space-4)' },
  list: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
  empty: { textAlign: 'center', color: 'var(--color-muted)', padding: 'var(--space-8)' },
  emptyState: { textAlign: 'center', padding: 'var(--space-12)' },
  emptyTitle: { fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-espresso)', marginBottom: 'var(--space-2)' },
  emptyHint: { color: 'var(--color-muted)', fontSize: '0.875rem' },
  fab: {
    position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)',
    width: '56px', height: '56px', borderRadius: '50%',
    background: 'var(--color-caramel)', color: '#fff', border: 'none',
    fontSize: '1.8rem', lineHeight: 1, boxShadow: 'var(--shadow-md)',
  },
  userHint: {
    position: 'fixed', bottom: 'var(--space-2)', left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '0.7rem', color: 'var(--color-border)',
  },
}
