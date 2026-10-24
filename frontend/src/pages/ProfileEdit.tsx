import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BREW_METHODS, ROAST_LEVELS } from '../components/NewLogForm'
import {
  EXPERIENCE_LEVELS, ORIGINS, INTERESTS,
  saveProfile, uploadAvatar, useEquipmentSuggestions,
} from '../hooks/useProfile'
import type { ExperienceLevel } from '../hooks/useProfile'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024   // matches the bucket's file_size_limit

// Doubles as first-time setup (no profile yet) and edit.
export function ProfileEdit() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const isSetup = !profile
  const { brewers, grinders } = useEquipmentSuggestions()

  const [username, setUsername]       = useState(profile?.username ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio]                 = useState(profile?.bio ?? '')
  const [location, setLocation]       = useState(profile?.location ?? '')
  const [avatarUrl, setAvatarUrl]     = useState(profile?.avatar_url ?? '')
  const [experience, setExperience]   = useState<ExperienceLevel | ''>(profile?.experience_level ?? '')
  const [brewMethods, setBrewMethods] = useState<string[]>(profile?.brew_methods ?? [])
  const [origins, setOrigins]         = useState<string[]>(profile?.origins ?? [])
  const [roastLevels, setRoastLevels] = useState<string[]>(profile?.roast_levels ?? [])
  const [interests, setInterests]     = useState<string[]>(profile?.interests ?? [])
  const [brewer, setBrewer]           = useState(profile?.primary_brewer ?? '')
  const [grinder, setGrinder]         = useState(profile?.grinder ?? '')
  const [links, setLinks]             = useState((profile?.social_links ?? []).join('\n'))
  const [isPublic, setIsPublic]       = useState(profile?.is_public ?? true)

  const [loading, setLoading]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleAvatar(file: File | undefined) {
    if (!file || !user) return
    if (file.size > MAX_AVATAR_BYTES) { setError('Image must be 2 MB or smaller'); return }
    setError(null)
    setUploading(true)
    try {
      setAvatarUrl(await uploadAvatar(user.id, file))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    const socialLinks = links.split('\n').map(l => l.trim()).filter(Boolean)
    if (socialLinks.length > 5) { setError('Up to 5 links'); return }
    if (socialLinks.some(l => !/^https?:\/\/\S+$/.test(l))) {
      setError('Links must start with http:// or https://'); return
    }
    setError(null)
    setLoading(true)
    try {
      await saveProfile(user.id, {
        username,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl || null,
        experience_level: experience || null,
        brew_methods: brewMethods,
        origins,
        roast_levels: roastLevels,
        interests,
        primary_brewer: brewer.trim() || null,
        grinder: grinder.trim() || null,
        social_links: socialLinks,
        is_public: isPublic,
      }, !isSetup)
      await refreshProfile()
      navigate(isSetup ? '/' : `/u/${username}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <form onSubmit={handleSubmit} style={s.card}>
        <h1 style={s.title}>{isSetup ? 'Set up your profile' : 'Edit profile'}</h1>
        {isSetup && <p style={s.muted}>Pick a username to continue. Everything else is optional.</p>}

        <label style={s.label}>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())}
            required minLength={3} maxLength={30} pattern="[a-z0-9_]+"
            title="3–30 characters: lowercase letters, numbers, underscore"
            autoComplete="username" style={s.input}
          />
        </label>

        <label style={s.label}>
          Display name
          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            required maxLength={60} autoComplete="name" style={s.input} />
        </label>

        <div style={s.label}>
          Profile picture
          <div style={s.row}>
            {avatarUrl && <img src={avatarUrl} alt="" style={s.avatar} />}
            <input type="file" accept="image/jpeg,image/png,image/webp"
              aria-label="Profile picture"
              onChange={e => handleAvatar(e.target.files?.[0])} disabled={uploading} />
            {avatarUrl && <button type="button" onClick={() => setAvatarUrl('')} style={s.linkBtn}>Remove</button>}
          </div>
        </div>

        <label style={s.label}>
          Bio
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3} style={s.input} />
        </label>

        <label style={s.label}>
          Location
          <input value={location} onChange={e => setLocation(e.target.value)} maxLength={100}
            placeholder="City, Country" style={s.input} />
        </label>

        <fieldset style={s.fieldset}>
          <legend style={s.legend}>Experience level</legend>
          <div style={s.row}>
            {EXPERIENCE_LEVELS.map(lvl => (
              <label key={lvl} style={s.radio}>
                <input type="radio" name="experience" checked={experience === lvl} onChange={() => setExperience(lvl)} />
                {lvl[0].toUpperCase() + lvl.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>

        <ChipGroup label="Favourite brew methods" options={BREW_METHODS} selected={brewMethods} onChange={setBrewMethods} />
        <ChipGroup label="Favourite origins" options={ORIGINS} selected={origins} onChange={setOrigins} />
        <ChipGroup label="Favourite roast levels" options={ROAST_LEVELS} selected={roastLevels} onChange={setRoastLevels} />
        <ChipGroup label="Coffee interests" options={INTERESTS} selected={interests} onChange={setInterests} />

        <label style={s.label}>
          Primary brewer
          <input value={brewer} onChange={e => setBrewer(e.target.value)} maxLength={200} list="brewers" style={s.input} />
          <datalist id="brewers">{brewers.map(b => <option key={b} value={b} />)}</datalist>
        </label>

        <label style={s.label}>
          Grinder
          <input value={grinder} onChange={e => setGrinder(e.target.value)} maxLength={200} list="grinders" style={s.input} />
          <datalist id="grinders">{grinders.map(g => <option key={g} value={g} />)}</datalist>
        </label>

        <label style={s.label}>
          Social links (one per line, up to 5)
          <textarea value={links} onChange={e => setLinks(e.target.value)} rows={3}
            placeholder="https://instagram.com/you" style={s.input} />
        </label>

        <fieldset style={s.fieldset}>
          <legend style={s.legend}>Profile visibility</legend>
          <div style={s.row}>
            <label style={s.radio}>
              <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} /> Public
            </label>
            <label style={s.radio}>
              <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} /> Private
            </label>
          </div>
        </fieldset>

        {error && <p role="alert" style={s.error}>{error}</p>}

        <button type="submit" disabled={loading || uploading} style={s.button}>
          {loading ? 'Saving…' : isSetup ? 'Continue' : 'Save profile'}
        </button>
        {!isSetup && <Link to={`/u/${profile.username}`} style={s.cancel}>Cancel</Link>}
      </form>
    </div>
  )
}

function ChipGroup({ label, options, selected, onChange }: {
  label: string
  options: readonly string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <fieldset style={s.fieldset}>
      <legend style={s.legend}>{label}</legend>
      <div style={s.chipGrid}>
        {options.map(opt => {
          const active = selected.includes(opt)
          return (
            <button key={opt} type="button" aria-pressed={active}
              onClick={() => onChange(active ? selected.filter(v => v !== opt) : [...selected, opt])}
              style={{ ...s.chip, ...(active ? s.chipActive : {}) }}>
              {opt}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: 'var(--color-foam)', padding: 'var(--space-4)' },
  card: {
    background: '#fff', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
    maxWidth: '560px', margin: '0 auto', boxShadow: 'var(--shadow-md)',
    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
  },
  title: { fontSize: '1.5rem', color: 'var(--color-espresso)' },
  muted: { color: 'var(--color-muted)', fontSize: '0.875rem' },
  label: {
    display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
    fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-espresso)',
  },
  input: {
    padding: 'var(--space-3)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', fontSize: '1rem', fontFamily: 'inherit',
  },
  fieldset: { border: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' },
  legend: { fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-espresso)', marginBottom: 'var(--space-1)' },
  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' },
  radio: { display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: '0.875rem' },
  avatar: { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' },
  chip: {
    padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--color-border)',
    background: '#fff', fontSize: '0.8rem', color: 'var(--color-muted)',
  },
  chipActive: {
    background: 'var(--color-cream)', borderColor: 'var(--color-caramel)',
    color: 'var(--color-roast)', fontWeight: 600,
  },
  error: { color: 'var(--color-error)', fontSize: '0.875rem' },
  linkBtn: { background: 'none', border: 'none', color: 'var(--color-muted)', textDecoration: 'underline', fontSize: '0.8rem' },
  button: {
    padding: 'var(--space-3)', background: 'var(--color-caramel)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius-md)', fontSize: '1rem', fontWeight: 600,
  },
  cancel: { textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-muted)' },
}
