import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  createAlert,
  createCluster,
  createIncident,
  createSocialPost,
  getDashboardData,
  getSocialReviewPosts,
  promotePostToAlert,
  dismissSocialPost,
  updateIncidentStatus
} from '../services/dashboardService'

const MENU = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'User Profile' },
  { key: 'social', label: '📡 Social Feed (NLP)' },
  { key: 'socialReview', label: '🔍 Feed Review' },
  { key: 'incidents', label: 'Incident Management' },
  { key: 'clusters', label: '👥 Clusters' },
  { key: 'alerts', label: 'Manage Alerts' },
  { key: 'socialAlerts', label: 'Social Alerts' },
  { key: 'fishingZones', label: '🐠 Fishing Zones (GIS)' },
  { key: 'borderAlert', label: '🚨 Border Alert' },
  { key: 'newsAnalyzer', label: '🧠 News Analyzer' }
]

const INCIDENT_BUCKETS = [
  { key: 'pending', label: 'Pending' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' }
]

function normalizeIncidentStatus(status) {
  const normalized = String(status || '').toLowerCase().trim()
  if (normalized === 'resolved' || normalized === 'closed') return 'resolved'
  if (normalized === 'investigating' || normalized === 'in_progress' || normalized === 'in-progress' || normalized === 'in progress') {
    return 'in progress'
  }
  return 'pending'
}

function getIncidentBucket(status) {
  const normalized = normalizeIncidentStatus(status)
  if (normalized === 'resolved') return 'resolved'
  if (normalized === 'in progress') {
    return 'inProgress'
  }
  return 'pending'
}

function inferAttachmentType(attachment) {
  const type = String(attachment.type || '').toLowerCase()
  const mimeType = String(attachment.mimeType || '').toLowerCase()
  const fileRef = String(attachment.fileName || attachment.url || '').toLowerCase()
  if (type === 'image' || mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/.test(fileRef)) return 'image'
  if (type === 'video' || mimeType.startsWith('video/') || /\.(mp4|mov|webm|avi)$/.test(fileRef)) return 'video'
  if (type === 'audio' || mimeType.startsWith('audio/') || /\.(mp3|wav|m4a|aac)$/.test(fileRef)) return 'audio'
  return type || 'file'
}

function formatAttachmentMeta(attachment) {
  const parts = []
  const timestamp = attachment.capturedAt || attachment.uploadedAt
  if (timestamp) {
    const parsed = new Date(timestamp)
    if (!Number.isNaN(parsed.getTime())) parts.push(parsed.toLocaleString())
  }
  if (attachment.locationName) parts.push(attachment.locationName)
  if (attachment.latitude != null && attachment.longitude != null) {
    parts.push(`${Number(attachment.latitude).toFixed(5)}, ${Number(attachment.longitude).toFixed(5)}`)
  }
  return parts
}

function AdminDashboard() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState({
    profile: null,
    socialFeed: [],
    incidents: [],
    clusters: [],
    alerts: [],
    topAlerts: []
  })

  const [socialMessage, setSocialMessage] = useState('')
  const [reviewPosts, setReviewPosts] = useState([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState('all')
  const [promotingId, setPromotingId] = useState(null)
  const [incidentForm, setIncidentForm] = useState({ title: '', description: '', incidentType: 'other', location: '' })
  const [clusterForm, setClusterForm] = useState({ name: '', description: '', location: '' })
  const [alertForm, setAlertForm] = useState({ title: '', description: '', alertType: 'warning', severity: 'yellow', location: '' })
  const [selectedIncident, setSelectedIncident] = useState(null)

  const loadAll = async () => {
    try {
      setError('')
      setLoading(true)
      const payload = await getDashboardData()
      setData(payload)
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const loadReviewPosts = async () => {
    setReviewLoading(true)
    try {
      const posts = await getSocialReviewPosts()
      setReviewPosts(posts)
    } catch {
      /* non-critical */
    } finally {
      setReviewLoading(false)
    }
  }

  useEffect(() => {
    if (active === 'socialReview') loadReviewPosts()
  }, [active])

  const incidentStats = useMemo(() => {
    const total = data.incidents.length
    const resolved = data.incidents.filter((item) => item.status === 'resolved' || item.status === 'closed').length
    const progress = total ? Math.round((resolved / total) * 100) : 0
    return { total, resolved, progress }
  }, [data.incidents])

  const alertStats = useMemo(() => {
    const total = data.alerts.length
    return {
      total,
      red: data.alerts.filter((item) => item.severity === 'red').length,
      yellow: data.alerts.filter((item) => item.severity === 'yellow').length,
      green: data.alerts.filter((item) => item.severity === 'green').length
    }
  }, [data.alerts])

  const incidentGroups = useMemo(() => {
    return data.incidents.reduce(
      (acc, item) => {
        const bucket = getIncidentBucket(item.status)
        acc[bucket].push(item)
        return acc
      },
      { pending: [], inProgress: [], resolved: [] }
    )
  }, [data.incidents])

  const onCreatePost = async (event) => {
    event.preventDefault()
    if (!socialMessage.trim()) return
    await createSocialPost(socialMessage.trim())
    setSocialMessage('')
    await loadAll()
  }

  const onCreateIncident = async (event) => {
    event.preventDefault()
    if (!incidentForm.title.trim()) return
    await createIncident({
      title: incidentForm.title.trim(),
      description: incidentForm.description.trim(),
      incidentType: incidentForm.incidentType,
      location: incidentForm.location.trim()
    })
    setIncidentForm({ title: '', description: '', incidentType: 'other', location: '' })
    await loadAll()
  }

  const onCreateCluster = async (event) => {
    event.preventDefault()
    if (!clusterForm.name.trim()) return
    await createCluster({
      name: clusterForm.name.trim(),
      description: clusterForm.description.trim(),
      location: clusterForm.location.trim()
    })
    setClusterForm({ name: '', description: '', location: '' })
    await loadAll()
  }

  const onCreateAlert = async (event) => {
    event.preventDefault()
    if (!alertForm.title.trim()) return
    await createAlert({
      title: alertForm.title.trim(),
      description: alertForm.description.trim(),
      alertType: alertForm.alertType,
      severity: alertForm.severity,
      location: alertForm.location.trim()
    })
    setAlertForm({ title: '', description: '', alertType: 'warning', severity: 'yellow', location: '' })
    await loadAll()
  }

  const onIncidentStatusChange = async (id, status) => {
    const normalizedStatus = status === 'in progress' ? 'investigating' : status
    await updateIncidentStatus(id, normalizedStatus)
    await loadAll()
  }

  const renderIncidentColumn = (bucket) => {
    const items = incidentGroups[bucket.key] || []
    return (
      <div key={bucket.key} className={`status-column ${bucket.key}`}>
        <div className="status-column-header">
          <p>{bucket.label}</p>
          <span>{items.length}</span>
        </div>

        <div className="status-column-body">
          {items.length === 0 && <p className="card-muted">No incidents in this stage.</p>}

          {items.map((incident) => (
            <div key={incident.id} className="incident-card">
              <div>
                <p>{incident.title}</p>
                <small>{incident.location || 'Unknown location'} • {new Date(incident.created_at).toLocaleString()}</small>
              </div>

              <div className="incident-card-actions">
                <span className={`incident-badge ${getIncidentBucket(incident.status)}`}>{normalizeIncidentStatus(incident.status)}</span>
                <button
                  type="button"
                  className="btn-evidence"
                  onClick={() => setSelectedIncident(incident)}
                >
                  View Report
                </button>
                <select value={normalizeIncidentStatus(incident.status)} onChange={(event) => onIncidentStatusChange(incident.id, event.target.value)}>
                  <option value="pending">pending</option>
                  <option value="in progress">in progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderIncidentAttachment = (attachment, index) => {
    const type = inferAttachmentType(attachment)
    const key = attachment.id || `${index}-${attachment.url}`
    let url = attachment.url ? (attachment.url.startsWith('http') ? attachment.url : `${import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000'}${attachment.url}`) : null
    const metadata = formatAttachmentMeta(attachment)

    if (!url) {
      return (
        <div key={key} className="evidence-item">
          <p>{attachment.fileName || `Attachment ${index + 1}`}</p>
          <small>No URL available</small>
        </div>
      )
    }

    return (
      <div key={key} className="evidence-item">
        <p>{attachment.fileName || `${type === 'image' ? 'Image' : type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : 'File'} ${index + 1}`}</p>
        <small>{type.toUpperCase()}</small>
        {metadata.map((item, metaIndex) => (
          <small key={`${key}-meta-${metaIndex}`} className="evidence-meta">{item}</small>
        ))}
        {type === 'image' && (
          <img
            src={url}
            alt={attachment.fileName || `Image ${index + 1}`}
            crossOrigin="anonymous"
            onError={(e) => {
              console.error('Image load error:', url)
              e.target.style.display = 'none'
            }}
          />
        )}
        {type === 'video' && (
          <video
            controls
            controlsList="nodownload"
            crossOrigin="anonymous"
            onError={(e) => console.error('Video error:', e)}
          >
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        {type === 'audio' && (
          <audio
            controls
            crossOrigin="anonymous"
            onError={(e) => console.error('Audio error:', e)}
          >
            <source src={url} type="audio/mpeg" />
            Your browser does not support the audio tag.
          </audio>
        )}
        {!['image', 'video', 'audio'].includes(type) && (
          <a href={url} target="_blank" rel="noreferrer">Download file</a>
        )}
      </div>
    )
  }

  const heatBlocks = Array.from({ length: 42 }, (_, index) => {
    const hasIncident = data.incidents.length > 0 && index % 7 < Math.max(1, Math.min(6, data.incidents.length % 7))
    return <span key={index} className={`heat-cell ${hasIncident ? 'high' : 'low'}`} />
  })

  if (loading) {
    return <div className="screen-center">Loading admin dashboard...</div>
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div>
          <h2 className="brand">Blue Admin</h2>
          <nav>
            {MENU.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`menu-item ${active === item.key ? 'active' : ''}`}
                onClick={() => setActive(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <button type="button" className="logout-btn" onClick={logout}>Logout</button>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div>
            <h1>{active === 'dashboard' ? 'Dashboard' : MENU.find((item) => item.key === active)?.label}</h1>
          </div>
          <div className="profile-chip">
            <span className="avatar">{(user?.username || 'A').charAt(0).toUpperCase()}</span>
            <div>
              <p>{user?.username || 'Admin User'}</p>
              <small>{user?.role || 'admin'}</small>
            </div>
          </div>
        </header>

        {error && <p className="form-error">{error}</p>}

        {active === 'dashboard' && (
          <section className="grid dashboard-grid">
            <article className="card wide">
              <h3>Heatmap</h3>
              <p className="card-muted">Incident concentration across monitored coastal zones</p>
              <div className="heatmap-grid">{heatBlocks}</div>
            </article>

            <article className="card">
              <h3>Send Alerts Chart</h3>
              <div className="line-chart">
                <span style={{ height: '24%' }} />
                <span style={{ height: '34%' }} />
                <span style={{ height: '46%' }} />
                <span style={{ height: '61%' }} />
                <span style={{ height: '54%' }} />
                <span style={{ height: '72%' }} />
              </div>
            </article>

            <article className="card">
              <h3>Total Reports</h3>
              <p className="stat">{incidentStats.total}</p>
            </article>

            <article className="card">
              <h3>Progress Resolved</h3>
              <div className="progress-ring" style={{ '--value': `${incidentStats.progress}%` }}>
                <span>{incidentStats.progress}%</span>
              </div>
            </article>

            <article className="card">
              <h3>Red Alerts</h3>
              <p className="stat">{alertStats.red}</p>
            </article>

            <article className="card">
              <h3>Open Incidents</h3>
              <p className="stat">{data.incidents.filter((item) => item.status !== 'resolved' && item.status !== 'closed').length}</p>
            </article>
          </section>
        )}

        {active === 'profile' && (
          <section className="card stack">
            <h3>User Profile</h3>
            <div className="profile-grid">
              <div>
                <p className="label">Username</p>
                <p>{data.profile?.username || user?.username}</p>
              </div>
              <div>
                <p className="label">Phone</p>
                <p>{data.profile?.phone_number || user?.phoneNumber || '-'}</p>
              </div>
              <div>
                <p className="label">Role</p>
                <p>{data.profile?.role || user?.role}</p>
              </div>
              <div>
                <p className="label">Status</p>
                <p>{data.profile?.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </section>
        )}

        {active === 'social' && (
          <section style={{ padding: 0, margin: 0, height: 'calc(100vh - 120px)' }}>
            <iframe
              src="/social-feed"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              title="Social Feed NLP"
            />
          </section>
        )}

        {active === 'socialReview' && (() => {
          const filtered = reviewFilter === 'all'
            ? reviewPosts
            : reviewFilter === 'high'
            ? reviewPosts.filter(p => (p.nlp_confidence || 0) >= 80 && !p.nlp_alert_sent && !p.nlp_dismissed)
            : reviewFilter === 'medium'
            ? reviewPosts.filter(p => (p.nlp_confidence || 0) >= 50 && (p.nlp_confidence || 0) < 80)
            : reviewPosts.filter(p => (p.nlp_confidence || 0) < 50)

          const onPromote = async (postId) => {
            setPromotingId(postId)
            try {
              await promotePostToAlert(postId, { alertType: 'warning', severity: 'yellow' })
              await loadReviewPosts()
            } catch (err) {
              alert(err?.response?.data?.error || 'Failed to promote')
            } finally {
              setPromotingId(null)
            }
          }

          const onDismiss = async (postId) => {
            try {
              await dismissSocialPost(postId)
              await loadReviewPosts()
            } catch { /* ignore */ }
          }

          return (
            <section className="card stack" style={{ maxWidth: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>🔍 Feed Review — NLP Confidence Scores</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Filter:</span>
                  {[['all', 'All'], ['high', '🟢 High ≥80%'], ['medium', '🟡 Medium 50–79%'], ['low', '🔴 Low <50%']].map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReviewFilter(val)}
                      style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: reviewFilter === val ? '#1e3a5f' : '#e5e7eb',
                        color: reviewFilter === val ? '#fff' : '#374151'
                      }}
                    >{lbl}</button>
                  ))}
                  <button type="button" onClick={loadReviewPosts} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: '#e5e7eb', border: 'none', cursor: 'pointer' }}>↻ Refresh</button>
                </div>
              </div>

              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400E' }}>
                <strong>Rule:</strong> Only posts with NLP confidence ≥ 80% can be promoted to an official alert. Posts below 80% are informational only.
              </div>

              {reviewLoading && <p className="card-muted">Loading posts…</p>}
              {!reviewLoading && filtered.length === 0 && <p className="card-muted">No posts in this category.</p>}

              <div className="list-wrap">
                {filtered.map((post) => {
                  const conf = post.nlp_confidence != null ? post.nlp_confidence : null
                  const label = post.nlp_label || (conf == null ? null : conf >= 80 ? 'HIGH' : conf >= 50 ? 'MEDIUM' : 'LOW')
                  const badgeColor = label === 'HIGH' ? '#16A34A' : label === 'MEDIUM' ? '#CA8A04' : label === 'LOW' ? '#DC2626' : '#9CA3AF'
                  const canPromote = (conf || 0) >= 80 && !post.nlp_alert_sent && !post.nlp_dismissed
                  const isDone = post.nlp_alert_sent || post.nlp_dismissed

                  return (
                    <div key={post.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0',
                      borderBottom: '1px solid #e5e7eb', opacity: isDone ? 0.6 : 1
                    }}>
                      {/* Confidence meter */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 68, paddingTop: 2 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: `conic-gradient(${badgeColor} ${(conf || 0) * 3.6}deg, #e5e7eb 0deg)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor }}>{conf != null ? `${conf}%` : '…'}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: badgeColor, marginTop: 3 }}>{label || 'N/A'}</span>
                      </div>

                      {/* Post content */}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 14, lineHeight: 1.4 }}>{post.content}</p>
                        <small style={{ color: '#9CA3AF' }}>
                          {post.username || 'User'} • {new Date(post.created_at).toLocaleString()}
                          {post.nlp_alert_sent && <span style={{ color: '#16A34A', marginLeft: 8 }}>✅ Alert Sent</span>}
                          {post.nlp_dismissed && <span style={{ color: '#DC2626', marginLeft: 8 }}>🚫 Dismissed</span>}
                        </small>
                      </div>

                      {/* Actions */}
                      {!isDone && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 110 }}>
                          <button
                            type="button"
                            disabled={!canPromote || promotingId === post.id}
                            onClick={() => onPromote(post.id)}
                            title={!canPromote ? 'Confidence must be ≥ 80% to send alert' : 'Promote to official alert'}
                            style={{
                              padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: canPromote ? 'pointer' : 'not-allowed', border: 'none',
                              background: canPromote ? '#16A34A' : '#D1D5DB',
                              color: canPromote ? '#fff' : '#9CA3AF'
                            }}
                          >{promotingId === post.id ? 'Sending…' : '📢 Send Alert'}</button>
                          <button
                            type="button"
                            onClick={() => onDismiss(post.id)}
                            style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#FEE2E2', color: '#DC2626' }}
                          >🚫 Dismiss</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {active === 'incidents' && (
          <section>
            <article className="card stack incident-management-card">
              <div className="incident-board">
                {INCIDENT_BUCKETS.map((bucket) => renderIncidentColumn(bucket))}
              </div>
            </article>
          </section>
        )}

        {active === 'clusters' && (
          <section style={{ padding: 0, margin: 0, height: 'calc(100vh - 120px)' }}>
            <iframe
              src="/clusters"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              title="Fishermen Clusters"
            />
          </section>
        )}

        {active === 'alerts' && (
          <section className="grid two-col">
            <article className="card stack">
              <h3>Manage Alerts</h3>
              <form className="inline-form" onSubmit={onCreateAlert}>
                <input
                  value={alertForm.title}
                  onChange={(event) => setAlertForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Alert title"
                />
                <textarea
                  rows="3"
                  value={alertForm.description}
                  onChange={(event) => setAlertForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Description"
                />
                <input
                  value={alertForm.location}
                  onChange={(event) => setAlertForm((prev) => ({ ...prev, location: event.target.value }))}
                  placeholder="Location"
                />
                <div className="split">
                  <select
                    value={alertForm.alertType}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, alertType: event.target.value }))}
                  >
                    <option value="warning">warning</option>
                    <option value="weather">weather</option>
                    <option value="border">border</option>
                    <option value="tidal">tidal</option>
                  </select>
                  <select
                    value={alertForm.severity}
                    onChange={(event) => setAlertForm((prev) => ({ ...prev, severity: event.target.value }))}
                  >
                    <option value="red">red</option>
                    <option value="yellow">yellow</option>
                    <option value="green">green</option>
                  </select>
                </div>
                <button className="btn-primary" type="submit">Send Alert</button>
              </form>
            </article>

            <article className="card stack">
              <h3>Alert Queue</h3>
              <div className="list-wrap">
                {data.alerts.map((alert) => (
                  <div key={alert.id} className="list-item between">
                    <div>
                      <p>{alert.title}</p>
                      <small>{alert.alert_type} • {alert.location || '-'} </small>
                    </div>
                    <span className={`severity ${alert.severity}`}>{alert.severity}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {active === 'socialAlerts' && (
          <section className="card stack">
            <h3>Social Alerts</h3>
            <div className="list-wrap">
              {data.topAlerts.length === 0 && <p className="card-muted">No social alerts available.</p>}
              {data.topAlerts.map((alert) => (
                <div key={alert.id} className="list-item between">
                  <div>
                    <p>{alert.title}</p>
                    <small>{alert.description || 'No description'}</small>
                  </div>
                  <span className={`severity ${alert.severity}`}>{alert.severity}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {active === 'fishingZones' && (
          <section style={{ padding: 0, margin: 0, height: 'calc(100vh - 120px)' }}>
            <iframe
              src="/fishing-zones"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              title="Fishing Zones GIS"
            />
          </section>
        )}

        {active === 'borderAlert' && (
          <section style={{ padding: 0, margin: 0, height: 'calc(100vh - 120px)' }}>
            <iframe
              src="/border-alert"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              title="Border Alert"
            />
          </section>
        )}
        {active === 'newsAnalyzer' && (
          <section style={{ padding: 0, margin: 0, height: 'calc(100vh - 120px)' }}>
            <iframe
              src="/news-analyzer"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              title="News Confidence Analyzer"
            />
          </section>
        )}
      </main>

      {selectedIncident && (
        <div className="evidence-modal-backdrop" onClick={() => setSelectedIncident(null)}>
          <div className="evidence-modal" onClick={(event) => event.stopPropagation()}>
            <div className="between evidence-modal-head">
              <div>
                <h3>{selectedIncident.title}</h3>
                <small>{selectedIncident.location || 'Unknown location'} • {selectedIncident.status}</small>
              </div>
              <button type="button" className="btn-evidence close" onClick={() => setSelectedIncident(null)}>
                Close
              </button>
            </div>

            <div className="evidence-grid">
              {(selectedIncident.media_attachments || []).length === 0 && (
                <p className="card-muted">No photo, video, or audio uploaded for this report.</p>
              )}
              {(selectedIncident.media_attachments || []).map((attachment, index) =>
                renderIncidentAttachment(attachment, index)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
