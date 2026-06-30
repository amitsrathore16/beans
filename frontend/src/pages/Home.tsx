import { useAuth } from '../contexts/AuthContext'

export function Home() {
  const { user, signOut } = useAuth()

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Grounded</h1>
        <button onClick={signOut} style={styles.signOut}>Sign out</button>
      </header>

      <main style={styles.main}>
        <p style={styles.welcome}>Welcome, {user?.email}</p>
        <p style={styles.empty}>Your coffee logs will appear here.</p>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    background: 'var(--color-foam)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-4) var(--space-6)',
    borderBottom: '1px solid var(--color-border)',
    background: '#fff',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    color: 'var(--color-espresso)',
  },
  signOut: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)',
    color: 'var(--color-muted)',
    fontSize: '0.875rem',
  },
  main: {
    padding: 'var(--space-8) var(--space-6)',
    textAlign: 'center',
  },
  welcome: {
    color: 'var(--color-espresso)',
    marginBottom: 'var(--space-4)',
  },
  empty: {
    color: 'var(--color-muted)',
    fontSize: '0.9rem',
  },
}
