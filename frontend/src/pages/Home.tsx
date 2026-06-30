import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHomeLogs, useCafeLogs, useSoftDeleteLog, duplicateLog } from '../hooks/useLogs'
import type { InventoryMatch, DuplicateMode } from '../hooks/useLogs'
import { useBeans, useSoftDeleteBean } from '../hooks/useBeans'
import { useBeansRealtime } from '../hooks/useBeansRealtime'
import type { Bean } from '../hooks/useBeans'
import { LogCard } from '../components/LogCard'
import { BeanCard } from '../components/BeanCard'
import { NewLogForm } from '../components/NewLogForm'
import type { LogPrefill } from '../components/NewLogForm'
import { NewBeanForm } from '../components/NewBeanForm'
import { InventoryMatchModal } from '../components/InventoryMatchModal'
import { apiFetch } from '../lib/apiClient'

type Tab = 'home' | 'cafe' | 'beans'

export function Home() {
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')
  const [showForm, setShowForm] = useState(false)
  const [logPrefill, setLogPrefill] = useState<LogPrefill | undefined>(undefined)
  const [pendingMatch, setPendingMatch] = useState<{ match: InventoryMatch; logId: string } | null>(null)

  const { logs: homeLogs, loading: homeLoading, refetch: refetchHome } = useHomeLogs()
  const { logs: cafeLogs, loading: cafeLoading, refetch: refetchCafe } = useCafeLogs()
  const { softDelete: softDeleteLog } = useSoftDeleteLog()

  const { beans, setBeans, loading: beansLoading, refetch: refetchBeans } = useBeans()
  const { softDelete: softDeleteBean } = useSoftDeleteBean()
  useBeansRealtime(user?.id, setBeans)

  async function handleLogSaved(logId: string, match: InventoryMatch | null) {
    setShowForm(false)
    refetchHome()
    refetchCafe()
    if (match) setPendingMatch({ match, logId })
  }

  async function handleDeductConfirm(beanId: string, logId: string, doseG: number) {
    await apiFetch('/inventory/deduct', {
      method: 'POST',
      body: JSON.stringify({ bean_id: beanId, log_id: logId, dose_g: doseG }),
    })
    setPendingMatch(null)
    refetchBeans()
  }

  async function handleDeleteLog(id: string) {
    await softDeleteLog(id)
    refetchHome()
    refetchCafe()
  }

  async function handleDuplicate(id: string, mode: DuplicateMode) {
    if (mode === 'exact') {
      await duplicateLog(id, 'exact')
      refetchHome()
    } else {
      // Find the source log and pre-fill the form with extraction params
      const source = homeLogs.find(l => l.id === id)
      setLogPrefill({
        coffee_name:  source?.coffee_name,
        roaster:      source?.roaster,
        roast_level:  source?.roast_level,
        brew_method:  source?.brew_method,
        dose_g:       source?.dose_g,
        yield_g:      source?.yield_g,
        brew_time_s:  source?.brew_time_s,
        grind_size:   source?.grind_size,
        water_temp_c: source?.water_temp_c,
      })
      setShowForm(true)
    }
  }

  async function handleDeleteBean(id: string) {
    await softDeleteBean(id)
    refetchBeans()
  }

  function handleBeanSaved(bean: Bean) {
    setShowForm(false)
    setBeans(prev => [bean, ...prev])
  }

  function handleFormClose() {
    setShowForm(false)
    setLogPrefill(undefined)
  }

  const TAB_LABELS: Record<Tab, string> = {
    home: 'Home brews',
    cafe: 'Café tastings',
    beans: 'Beans',
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Grounded</h1>
        <button onClick={signOut} style={styles.signOut}>Sign out</button>
      </header>

      <div style={styles.tabsWrapper}>
        <nav style={styles.tabs}>
          {(['home', 'cafe', 'beans'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      <main style={styles.main}>
        {tab === 'beans' ? (
          beansLoading ? (
            <p style={styles.empty}>Loading…</p>
          ) : beans.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No beans yet</p>
              <p style={styles.emptyHint}>Tap + to add a bag to your inventory</p>
            </div>
          ) : (
            <div style={styles.list}>
              {beans.map(bean => (
                <BeanCard key={bean.id} bean={bean} onDelete={handleDeleteBean} />
              ))}
            </div>
          )
        ) : (
          (() => {
            const logs = tab === 'home' ? homeLogs : cafeLogs
            const loading = tab === 'home' ? homeLoading : cafeLoading
            return loading ? (
              <p style={styles.empty}>Loading…</p>
            ) : logs.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>No {tab === 'home' ? 'brew' : 'tasting'} logs yet</p>
                <p style={styles.emptyHint}>Tap + to add your first entry</p>
              </div>
            ) : (
              <div style={styles.list}>
                {logs.map(log => (
                  <LogCard key={log.id} log={log} onDelete={handleDeleteLog} onDuplicate={handleDuplicate} />
                ))}
              </div>
            )
          })()
        )}
      </main>

      <button onClick={() => setShowForm(true)} style={styles.fab} aria-label={tab === 'beans' ? 'Add bean' : 'Add log'}>
        +
      </button>

      {showForm && tab === 'beans' && (
        <NewBeanForm onClose={handleFormClose} onSaved={handleBeanSaved} />
      )}

      {showForm && tab !== 'beans' && (
        <NewLogForm onClose={handleFormClose} onSaved={handleLogSaved} prefill={logPrefill} />
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
  tabsWrapper: {
    background: '#fff',
    borderBottom: '1px solid var(--color-border)',
    padding: 'var(--space-3) var(--space-4)',
  },
  tabs: {
    display: 'flex',
    background: 'var(--color-foam)',
    borderRadius: '99px',
    padding: '3px',
    gap: '2px',
  },
  tab: {
    flex: 1, padding: 'var(--space-2) var(--space-3)', border: 'none',
    background: 'transparent',
    color: 'var(--color-muted)', fontWeight: 500, fontSize: '0.85rem',
    borderRadius: '99px',
    position: 'relative' as const,
  },
  tabActive: {
    color: 'var(--color-espresso)',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    fontWeight: 600,
  },
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
