import { useEffect, useRef, useState } from 'react'
import api from '../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLE = {
  critical: { bg: '#fee2e2', color: '#991b1b', border: '#dc2626', label: 'CRITICAL' },
  high:     { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', label: 'HIGH' },
  normal:   { bg: '#dbeafe', color: '#1e3a8a', border: '#3b82f6', label: 'INFORMATION' },
}

const HAZARD_LABELS = {
  tsunami:     'Tsunami',
  storm_surge: 'Storm Surge',
  cyclone:     'Cyclone',
  high_waves:  'High Waves',
  flooding:    'Flooding',
  weather:     'Weather',
  emergency:   'Emergency',
  unspecified: 'Unspecified',
}

const NLP_COLOR = (c) => {
  if (c == null) return '#6B7280'
  if (c >= 80) return '#16A34A'
  if (c >= 50) return '#CA8A04'
  return '#DC2626'
}

const NLP_LABEL_TEXT = (c) => {
  if (c == null) return 'Pending'
  if (c >= 80) return 'HIGH'
  if (c >= 50) return 'MEDIUM'
  return 'LOW'
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function truncate(text, max = 160) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConfidenceRing({ value }) {
  const color = NLP_COLOR(value)
  const pct = value != null ? value : 0
  const deg = Math.round(pct * 3.6)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 62 }}>
      <div style={{
        width: 54, height: 54, borderRadius: '50%',
        background: `conic-gradient(${color} ${deg}deg, #E5E7EB ${deg}deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', background: '#fff',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1 }}>
            {value != null ? `${value}%` : '...'}
          </span>
        </div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 700, color: '#fff',
        background: color, borderRadius: 3, padding: '1px 5px', letterSpacing: 0.4
      }}>
        {NLP_LABEL_TEXT(value)}
      </span>
    </div>
  )
}

function PostCard({ post, onPromote, onDismiss, promotingId, dismissingId }) {
  const p = PRIORITY_STYLE[post.priority] || PRIORITY_STYLE.normal
  const isDone = post.nlp_alert_sent || post.nlp_dismissed
  const canPromote = (post.nlp_confidence || 0) >= 80 && !isDone
  const confColor = NLP_COLOR(post.nlp_confidence)

  return (
    <div style={{
      background: '#fff',
      border: `1px solid #e2e8f0`,
      borderTop: `4px solid ${p.border}`,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      opacity: post.nlp_dismissed ? 0.6 : 1,
    }}>
      {/* Priority bar */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          background: p.bg, color: p.color,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
          padding: '4px 9px', borderRadius: 4
        }}>
          {p.label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {HAZARD_LABELS[post.hazard_type] || 'Unspecified'}
        </span>
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
          {timeAgo(post.created_at)}
        </span>
      </div>

      {/* Title */}
      {post.title && (
        <h3 style={{ margin: '10px 16px 6px', fontSize: 15, fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
          {post.title}
        </h3>
      )}

      {/* Content */}
      <p style={{ margin: '0 16px 12px', color: '#475569', fontSize: 13, lineHeight: 1.6, fontWeight: 500 }}>
        {truncate(post.content)}
      </p>

      {/* NLP Confidence bar */}
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Confidence Level</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: confColor }}>
            {post.nlp_confidence != null ? `${post.nlp_confidence}%` : 'Pending analysis'}
          </span>
        </div>
        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${post.nlp_confidence || 0}%`, height: '100%',
            background: `linear-gradient(90deg, ${confColor}, ${confColor}88)`,
            borderRadius: 3, transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <ConfidenceRing value={post.nlp_confidence} />
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <div>@ {post.username || post.community || 'Community'}</div>
            {post.location && <div>Loc: {post.location}</div>}
            {post.source && (
              <div style={{ textTransform: 'capitalize', color: '#94a3b8' }}>
                via {post.source.replace(/_/g, ' ')}
              </div>
            )}
          </div>
          {post.nlp_alert_sent && (
            <span style={{ fontSize: 10, background: '#DCFCE7', color: '#16A34A', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              Alert Sent
            </span>
          )}
          {post.nlp_dismissed && (
            <span style={{ fontSize: 10, background: '#FEE2E2', color: '#DC2626', borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>
              Dismissed
            </span>
          )}
        </div>

        {!isDone && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => onPromote(post.id)}
              disabled={!canPromote || promotingId === post.id}
              title={!canPromote ? 'Requires confidence >= 80%' : 'Send as official alert'}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                border: 'none', cursor: canPromote ? 'pointer' : 'not-allowed',
                background: canPromote ? '#16A34A' : '#E5E7EB',
                color: canPromote ? '#fff' : '#9CA3AF',
              }}
            >
              {promotingId === post.id ? '...' : 'Send Alert'}
            </button>
            <button
              onClick={() => onDismiss(post.id)}
              disabled={dismissingId === post.id}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              {dismissingId === post.id ? '...' : 'Dismiss'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ScraperPanel({ onCreatePost, onScrapeNews, scrapeLoading, scrapeResult }) {
  const [tab, setTab] = useState('post')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hazardType, setHazardType] = useState('unspecified')
  const [location, setLocation] = useState('')
  const [community, setCommunity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setMsg({ type: 'error', text: 'Title and content are required.' })
      return
    }
    setSubmitting(true)
    try {
      await onCreatePost({ title, content, hazardType, location, community })
      setTitle(''); setContent(''); setHazardType('unspecified'); setLocation(''); setCommunity('')
      setMsg({ type: 'success', text: 'Post created! NLP analysis started.' })
      setTimeout(() => setMsg(null), 4000)
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create post.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6,
    fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#f0f9ff' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1e3a8a' }}>Contribute to Feed</h3>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
        {['post', 'news'].map(key => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: tab === key ? '#1e3a8a' : '#f8fafc',
            color: tab === key ? '#fff' : '#475569',
          }}>
            {key === 'post' ? 'Create Post' : 'Live Ocean News'}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {msg && (
          <div style={{
            padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, fontWeight: 600,
            background: msg.type === 'error' ? '#FEE2E2' : '#DCFCE7',
            color: msg.type === 'error' ? '#DC2626' : '#16A34A'
          }}>{msg.text}</div>
        )}

        {tab === 'post' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Title *</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Cyclone Alert - Tamil Nadu Coast" disabled={submitting} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Description / Content *</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={content}
                onChange={e => setContent(e.target.value)} rows={4}
                placeholder="Share details about the coastal hazard, observations, or safety info..."
                disabled={submitting} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Hazard Type</label>
                <select style={inputStyle} value={hazardType} onChange={e => setHazardType(e.target.value)} disabled={submitting}>
                  <option value="unspecified">Unspecified</option>
                  <option value="tsunami">Tsunami</option>
                  <option value="storm_surge">Storm Surge</option>
                  <option value="cyclone">Cyclone</option>
                  <option value="high_waves">High Waves</option>
                  <option value="flooding">Flooding</option>
                  <option value="weather">Weather</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Location</label>
                <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g., Mumbai Coast" disabled={submitting} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Community / Organisation</label>
              <input style={inputStyle} value={community} onChange={e => setCommunity(e.target.value)}
                placeholder="e.g., Tamil Nadu Fishermen Association" disabled={submitting} />
            </div>
            <button type="submit" disabled={submitting} style={{
              padding: '10px', background: submitting ? '#94a3b8' : '#1e3a8a', color: '#fff',
              border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13,
              cursor: submitting ? 'wait' : 'pointer'
            }}>
              {submitting ? 'Creating...' : 'Create Post'}
            </button>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
              Posts are auto-scored by NLP. Posts &gt;= 80% confidence can be promoted to official alerts.
            </p>
          </form>
        )}

        {tab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>Automated Ocean News Feed</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Fetches live ocean hazard news from free RSS feeds (Google News, BBC Science, NOAA NHC).
              Articles are deduplicated and automatically scored with NLP. New articles are also pulled every 30 minutes in the background.
            </p>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '10px 12px' }}>
              <strong style={{ fontSize: 12, color: '#0369a1' }}>Topics Covered</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#475569' }}>
                <li>Cyclones &amp; Storm Surges</li>
                <li>Tsunami Watches &amp; Warnings</li>
                <li>Coastal Flooding Alerts</li>
                <li>High Wave Advisories</li>
                <li>Maritime Weather Updates</li>
              </ul>
            </div>
            {scrapeResult && (
              <div style={{
                padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: scrapeResult.error ? '#FEE2E2' : '#DCFCE7',
                color: scrapeResult.error ? '#DC2626' : '#16A34A'
              }}>
                {scrapeResult.error ? `Error: ${scrapeResult.error}` : `${scrapeResult.message || `Injected ${scrapeResult.created} posts.`}`}
              </div>
            )}
            <button onClick={onScrapeNews} disabled={scrapeLoading} style={{
              padding: '10px', background: scrapeLoading ? '#94a3b8' : '#0284c7', color: '#fff',
              border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13,
              cursor: scrapeLoading ? 'wait' : 'pointer'
            }}>
              {scrapeLoading ? 'Fetching News...' : 'Fetch Latest Ocean News'}
            </button>
          </div>
        )}
      </div>

      {/* NLP Legend */}
      <div style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '12px 16px' }}>
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Confidence Guide</p>
        {[
          { color: '#16A34A', label: '>= 80% — HIGH — Alert eligible' },
          { color: '#CA8A04', label: '50-79% — MEDIUM — Monitor' },
          { color: '#DC2626', label: '< 50%  — LOW — Low credibility' },
          { color: '#6B7280', label: 'Pending NLP analysis' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
          </div>
        ))}
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          Rule: Only posts with &gt;= 80% NLP confidence can be sent as official alerts.
        </p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SocialFeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [promotingId, setPromotingId] = useState(null)
  const [dismissingId, setDismissingId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const pollingRef = useRef(null)

  const loadPosts = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/social-feed/admin/review?limit=200')
      setPosts(res.data.data || [])
    } catch { /* ignore */ }
    finally { if (!silent) setLoading(false) }
  }

  useEffect(() => {
    loadPosts()
    pollingRef.current = setInterval(() => loadPosts(true), 15000)
    return () => clearInterval(pollingRef.current)
  }, [])

  const handleAnalyzeAll = async () => {
    setAnalyzing(true); setAnalyzeResult(null)
    try {
      const res = await api.post('/social-feed/admin/analyze-all')
      setAnalyzeResult(res.data)
      await loadPosts(true)
    } catch (e) {
      setAnalyzeResult({ error: e.response?.data?.error || 'Failed to analyze' })
    } finally { setAnalyzing(false) }
  }

  const handleCreatePost = async (data) => {
    await api.post('/social-feed', data)
    setTimeout(() => loadPosts(true), 1500)
  }

  const handleScrapeNews = async () => {
    setScrapeLoading(true); setScrapeResult(null)
    try {
      const res = await api.post('/social-feed/admin/scrape-news')
      setScrapeResult(res.data)
      await loadPosts(true)
    } catch (e) {
      setScrapeResult({ error: e.response?.data?.message || e.response?.data?.error || 'Scrape failed' })
    } finally { setScrapeLoading(false) }
  }

  const handlePromote = async (postId) => {
    setPromotingId(postId)
    try {
      await api.post(`/social-feed/admin/${postId}/promote`, { alertType: 'warning', severity: 'yellow' })
      await loadPosts(true)
    } catch (e) {
      alert(e.response?.data?.error || 'Cannot promote this post')
    } finally { setPromotingId(null) }
  }

  const handleDismiss = async (postId) => {
    setDismissingId(postId)
    try {
      await api.post(`/social-feed/admin/${postId}/dismiss`)
      await loadPosts(true)
    } catch { /* ignore */ }
    finally { setDismissingId(null) }
  }

  const filtered = posts.filter(p => {
    const matchesFilter = (() => {
      if (filter === 'all') return true
      if (filter === 'critical') return p.priority === 'critical'
      if (filter === 'high') return p.priority === 'high'
      if (filter === 'high_nlp') return (p.nlp_confidence || 0) >= 80
      if (filter === 'medium') return (p.nlp_confidence || 0) >= 50 && (p.nlp_confidence || 0) < 80
      if (filter === 'low') return p.nlp_confidence != null && p.nlp_confidence < 50
      if (filter === 'unscored') return p.nlp_confidence == null
      return true
    })()
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q) ||
      (p.hazard_type || '').includes(q) ||
      (p.location || '').toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  const stats = {
    critical: posts.filter(p => p.priority === 'critical').length,
    high:     posts.filter(p => p.priority === 'high').length,
    info:     posts.filter(p => p.priority === 'normal').length,
    total:    posts.length,
    highNlp:  posts.filter(p => (p.nlp_confidence || 0) >= 80).length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        color: '#fff', padding: '20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>
            Ocean Hazard Social Feed
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#93c5fd' }}>
            Coastal alerts &amp; community reports &middot; Auto-scored by NLP &middot; Posts &ge; 80% confidence can be sent as alerts
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => loadPosts()} style={{
            padding: '9px 18px', background: 'rgba(255,255,255,0.1)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 7, fontWeight: 600,
            fontSize: 13, cursor: 'pointer'
          }}>
            Refresh Feed
          </button>
          <button onClick={handleAnalyzeAll} disabled={analyzing} style={{
            padding: '9px 20px',
            background: analyzing ? 'rgba(255,255,255,0.1)' : '#0ea5e9',
            color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700,
            fontSize: 13, cursor: analyzing ? 'wait' : 'pointer', whiteSpace: 'nowrap'
          }}>
            {analyzing ? 'Analysing...' : 'Analyse All News'}
          </button>
        </div>
      </div>

      {analyzeResult && (
        <div style={{
          background: analyzeResult.error ? '#FEE2E2' : '#DCFCE7',
          color: analyzeResult.error ? '#DC2626' : '#15803D',
          padding: '10px 28px', fontSize: 13, fontWeight: 600
        }}>
          {analyzeResult.error
            ? `Error: ${analyzeResult.error}`
            : `Analysed ${analyzeResult.analyzed} new post(s) out of ${analyzeResult.total} total.`}
        </div>
      )}

      <div style={{ padding: '24px 28px' }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { key: 'critical', label: 'CRITICAL', val: stats.critical, topColor: '#dc2626', bgGrad: 'rgba(220,38,38,0.03)', icon: '!' },
            { key: 'high',     label: 'HIGH',     val: stats.high,     topColor: '#f59e0b', bgGrad: 'rgba(245,158,11,0.03)', icon: '^' },
            { key: 'info',     label: 'INFO',     val: stats.info,     topColor: '#1e3a8a', bgGrad: 'rgba(30,58,138,0.03)',  icon: 'i' },
            { key: 'all',      label: 'TOTAL',    val: stats.total,    topColor: '#6b7280', bgGrad: 'rgba(107,114,128,0.03)', icon: '#' },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key === 'info' ? 'all' : s.key)} style={{
              background: `linear-gradient(180deg, ${s.bgGrad} 0%, white 100%)`,
              border: `1px solid #e2e8f0`,
              borderTop: `4px solid ${s.topColor}`,
              borderRadius: 10, padding: '24px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              cursor: 'pointer',
              boxShadow: filter === s.key ? `0 4px 14px ${s.topColor}44` : '0 1px 3px rgba(0,0,0,0.06)',
              outline: filter === s.key ? `2px solid ${s.topColor}` : 'none',
              outlineOffset: 2
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: s.topColor + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10, fontSize: 20, fontWeight: 900, color: s.topColor
              }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                {s.label}
              </span>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#1e3a8a', lineHeight: 1 }}>{s.val}</span>
            </button>
          ))}
        </div>

        {/* NLP filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'high_nlp', label: 'NLP >= 80%', count: stats.highNlp, color: '#16A34A' },
            { key: 'medium',   label: 'Medium',     count: posts.filter(p => (p.nlp_confidence||0) >= 50 && (p.nlp_confidence||0) < 80).length, color: '#CA8A04' },
            { key: 'low',      label: 'Low',        count: posts.filter(p => p.nlp_confidence != null && p.nlp_confidence < 50).length, color: '#DC2626' },
            { key: 'unscored', label: 'Pending',    count: posts.filter(p => p.nlp_confidence == null).length, color: '#6B7280' },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)} style={{
              padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${filter === s.key ? s.color : '#e2e8f0'}`,
              background: filter === s.key ? s.color : '#fff', color: filter === s.key ? '#fff' : s.color,
              fontSize: 12, fontWeight: 700, cursor: 'pointer'
            }}>
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Header + search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937', fontWeight: 800, letterSpacing: -0.3 }}>
              Posts from Ocean Hazard Social Media
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
              Coastal hazards including Tsunamis, Cyclones, High Waves &amp; more
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search posts..."
              style={{
                padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 13,
                outline: 'none', width: 220, background: '#fff'
              }}
            />
            <span style={{ fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>

          {/* Posts grid */}
          <div>
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #cbd5e1', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ margin: 0 }}>Loading ocean feed...</p>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '60px 20px', color: '#94a3b8',
                background: '#f8fafc', borderRadius: 10, border: '1px dashed #cbd5e1'
              }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#cbd5e1' }}>~ ~ ~</p>
                <p style={{ margin: '8px 0 0', fontSize: 15 }}>No posts found. Create one or fetch live news.</p>
              </div>
            )}
            {!loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {filtered.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onPromote={handlePromote}
                    onDismiss={handleDismiss}
                    promotingId={promotingId}
                    dismissingId={dismissingId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ position: 'sticky', top: 16 }}>
            <ScraperPanel
              onCreatePost={handleCreatePost}
              onScrapeNews={handleScrapeNews}
              scrapeLoading={scrapeLoading}
              scrapeResult={scrapeResult}
            />
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
