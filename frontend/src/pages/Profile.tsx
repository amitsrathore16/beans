import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePublicProfile } from '../hooks/useProfile'

export function Profile() {
  const { username = '' } = useParams()
  const { user, signOut } = useAuth()
  const { profile, stats, loading, error } = usePublicProfile(username)

  if (loading) return <p style={s.center}>Loading…</p>
  if (error) return <p style={{ ...s.center, color: 'var(--color-error)' }}>{error}</p>
  // Private profiles of other users are invisible via RLS, so they land here too.
  if (!profile) return <p style={s.center}>Profile not found. <Link to="/">Home</Link></p>

  const isOwn = profile.user_id === user?.id
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const favourites: [string, string[]][] = [
    ['Brew methods', profile.brew_methods],
    ['Origins', profile.origins],
    ['Roast levels', profile.roast_levels],
    ['Interests', profile.interests],
  ]

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.topRow}>
          <Link to="/" style={s.muted}>← Home</Link>
          {isOwn && (
            <div style={s.actions}>
              <Link to="/profile/edit" style={s.editBtn}>Edit profile</Link>
              <button onClick={signOut} style={s.editBtn}>Sign out</button>
            </div>
          )}
        </div>

        <div style={s.head}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={s.avatar} />
            : <div style={{ ...s.avatar, ...s.placeholder }} aria-hidden>{profile.display_name[0]?.toUpperCase()}</div>}
          <div>
            <h1 style={s.name}>{profile.display_name}</h1>
            <p style={s.muted}>
              @{profile.username}
              {profile.experience_level && <> · <span style={s.cap}>{profile.experience_level}</span></>}
              {isOwn && !profile.is_public && <> · Private</>}
            </p>
            <p style={s.muted}>{profile.location ? `${profile.location} · ` : ''}Joined {joined}</p>
          </div>
        </div>

        {profile.bio && <p style={s.bio}>{profile.bio}</p>}

        {stats && (
          <div style={s.stats}>
            <Stat label="Brews" value={stats.total_brews} />
            <Stat label="Last 30 days" value={stats.brews_last_30} />
            <Stat label="Café visits" value={stats.cafe_visits} />
            {stats.top_method && <Stat label="Top method" value={stats.top_method} />}
          </div>
        )}

        {(profile.primary_brewer || profile.grinder) && (
          <section>
            <h2 style={s.h2}>Setup</h2>
            {profile.primary_brewer && <p>Brewer: {profile.primary_brewer}</p>}
            {profile.grinder && <p>Grinder: {profile.grinder}</p>}
          </section>
        )}

        {favourites.filter(([, v]) => v.length).map(([label, values]) => (
          <section key={label}>
            <h2 style={s.h2}>{label}</h2>
            <div style={s.chips}>{values.map(v => <span key={v} style={s.chip}>{v}</span>)}</div>
          </section>
        ))}

        {profile.social_links.length > 0 && (
          <section>
            <h2 style={s.h2}>Links</h2>
            {profile.social_links.map(url => (
              <p key={url}><a href={url} target="_blank" rel="noopener noreferrer nofollow">{url.replace(/^https?:\/\//, '')}</a></p>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={s.stat}>
      <strong style={s.statValue}>{value}</strong>
      <span style={s.muted}>{label}</span>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  center: { textAlign: 'center', padding: 'var(--space-16)', color: 'var(--color-muted)' },
  page: { minHeight: '100dvh', background: 'var(--color-foam)', padding: 'var(--space-4)' },
  card: {
    background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
    maxWidth: '560px', margin: '0 auto', boxShadow: 'var(--shadow-md)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-6)',
  },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  actions: { display: 'flex', gap: 'var(--space-2)' },
  editBtn: {
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-4)', fontSize: '0.8rem', color: 'var(--color-espresso)', textDecoration: 'none', background: 'none',
  },
  head: { display: 'flex', gap: 'var(--space-4)', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  placeholder: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-cream)', color: 'var(--color-roast)', fontSize: '2rem', fontFamily: 'var(--font-display)',
  },
  name: { fontSize: '1.5rem' },
  muted: { color: 'var(--color-muted)', fontSize: '0.875rem' },
  cap: { textTransform: 'capitalize' },
  bio: { whiteSpace: 'pre-wrap' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-3)' },
  stat: {
    display: 'flex', flexDirection: 'column', padding: 'var(--space-3)',
    background: 'var(--color-foam)', borderRadius: 'var(--radius-md)',
  },
  statValue: { fontSize: '1.25rem', color: 'var(--color-espresso)' },
  h2: { fontSize: '1rem', marginBottom: 'var(--space-2)' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' },
  chip: {
    padding: '4px 12px', borderRadius: '99px', background: 'var(--color-cream)',
    color: 'var(--color-roast)', fontSize: '0.8rem',
  },
}
