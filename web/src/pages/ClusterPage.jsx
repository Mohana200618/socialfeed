import { useState, useEffect, useRef, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import api from '../services/api'

// Fix Leaflet default marker icons broken by Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLOR = { DANGER: '#DC2626', WARNING: '#EA580C', INFO: '#0EA5E9', SAFE: '#16A34A' }
const POLL_INTERVAL_MS = 10000 // refresh members + notifications every 10 s

export default function ClusterPage() {
  const { user } = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })()
  const userId = user?.id ?? null

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef({})
  const pollTimer = useRef(null)

  const [clusters, setClusters] = useState([])
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [members, setMembers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [myClusters, setMyClusters] = useState([])
  const [loading, setLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [tab, setTab] = useState('members') // 'members' | 'notifications'
  const [autoJoining, setAutoJoining] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadClusters()
    if (userId) loadMyClusters()
  }, [userId])

  // ── Map setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current) return
    const map = L.map(mapRef.current, { center: [9.5, 79.3], zoom: 7 })
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 13,
    }).addTo(map)
    L.control.scale({ imperial: false }).addTo(map)
    mapInstanceRef.current = map
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  // ── Update member markers when members change ────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    members
      .filter(m => m.latitude && m.longitude)
      .forEach(member => {
        const isMe = member.user_id === userId
        const minutesAgo = Math.floor((Date.now() - new Date(member.last_seen)) / 60000)
        const isOnline = minutesAgo < 5

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${isMe ? 18 : 14}px; height:${isMe ? 18 : 14}px;
            background:${isMe ? '#1E3A8A' : isOnline ? '#16A34A' : '#94A3B8'};
            border:3px solid #fff; border-radius:50%;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            position:relative;
          ">
            ${isMe ? '<div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);background:#1E3A8A;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">YOU</div>' : ''}
          </div>`,
          iconAnchor: [isMe ? 9 : 7, isMe ? 9 : 7],
        })

        const marker = L.marker([parseFloat(member.latitude), parseFloat(member.longitude)], { icon })
        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:160px">
            <b style="color:#1E3A8A">${member.username || member.full_name || 'Fisherman'}</b>
            ${isMe ? ' <span style="color:#1E3A8A;font-size:11px">(You)</span>' : ''}
            <br/>
            <span style="font-size:12px;color:${isOnline ? '#16A34A' : '#94A3B8'}">
              ${isOnline ? '🟢 Online' : `⚫ Last seen ${minutesAgo}m ago`}
            </span><br/>
            <span style="font-size:11px;color:#64748B">
              ${parseFloat(member.latitude).toFixed(4)}°N, ${parseFloat(member.longitude).toFixed(4)}°E
            </span>
          </div>
        `)
        marker.addTo(map)
        markersRef.current[member.user_id] = marker
      })

    // Fly to cluster centre if we have members with location
    const located = members.filter(m => m.latitude && m.longitude)
    if (located.length > 0 && selectedCluster) {
      const lats = located.map(m => parseFloat(m.latitude))
      const lngs = located.map(m => parseFloat(m.longitude))
      const bounds = L.latLngBounds(located.map(m => [parseFloat(m.latitude), parseFloat(m.longitude)]))
      map.fitBounds(bounds.pad(0.3))
    }
  }, [members])

  // ── Polling ──────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!selectedCluster) return
    try {
      const [memRes, notifRes] = await Promise.all([
        api.get(`/clusters/${selectedCluster.id}/members`),
        api.get(`/clusters/${selectedCluster.id}/notifications?limit=30`),
      ])
      setMembers(memRes.data.data || [])
      setNotifications(notifRes.data.data || [])
    } catch {}
  }, [selectedCluster])

  useEffect(() => {
    clearInterval(pollTimer.current)
    if (selectedCluster) {
      poll()
      pollTimer.current = setInterval(poll, POLL_INTERVAL_MS)
    }
    return () => clearInterval(pollTimer.current)
  }, [selectedCluster, poll])

  // ── Data loaders ─────────────────────────────────────────────────────────
  async function loadClusters() {
    try {
      const res = await api.get('/clusters')
      setClusters(res.data.data || [])
    } catch {}
  }

  async function loadMyClusters() {
    if (!userId) return
    try {
      const res = await api.get(`/clusters/my-clusters?userId=${userId}`)
      setMyClusters(res.data.data || [])
    } catch {}
  }

  async function selectCluster(cluster) {
    setSelectedCluster(cluster)
    setMembers([])
    setNotifications([])
    setTab('members')
  }

  // ── GPS auto-join ─────────────────────────────────────────────────────────
  function handleAutoJoin() {
    if (!userId) { showToast('Log in to join a cluster.', 'error'); return }
    if (!navigator.geolocation) { showToast('GPS not available.', 'error'); return }
    setAutoJoining(true)
    setGpsStatus('Detecting GPS location…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGpsStatus(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        try {
          const res = await api.post('/clusters/auto-join', { userId, lat, lng, radiusKm: 50 })
          const { cluster, created } = res.data.data
          showToast(created ? `Created & joined new cluster: ${cluster.name}` : `Joined cluster: ${cluster.name}`, 'success')
          await loadClusters()
          await loadMyClusters()
          selectCluster(cluster)
        } catch (e) {
          showToast(e.response?.data?.error || 'Auto-join failed.', 'error')
        } finally { setAutoJoining(false) }
      },
      (err) => { setGpsStatus(`GPS error: ${err.message}`); setAutoJoining(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Manual join ───────────────────────────────────────────────────────────
  async function handleManualJoin(cluster) {
    if (!userId) { showToast('Log in to join a cluster.', 'error'); return }
    try {
      await api.post(`/clusters/${cluster.id}/join`, { userId })
      showToast(`Joined cluster: ${cluster.name}`, 'success')
      await loadMyClusters()
      selectCluster(cluster)
    } catch (e) {
      showToast(e.response?.data?.error || 'Join failed.', 'error')
    }
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────
  async function handleBroadcast() {
    if (!broadcastMsg.trim() || !selectedCluster) return
    try {
      await api.post(`/clusters/${selectedCluster.id}/broadcast`, {
        message: broadcastMsg.trim(),
        type: 'INFO',
        sentBy: userId,
      })
      setBroadcastMsg('')
      showToast('Message broadcast to cluster!', 'success')
      poll()
    } catch (e) {
      showToast('Broadcast failed.', 'error')
    }
  }

  const isMemberOf = (cluster) => myClusters.some(c => c.id === cluster.id)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0F172A', fontFamily: 'sans-serif', color: '#F8FAFC' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? '#DC2626' : toast.type === 'success' ? '#16A34A' : '#0EA5E9',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontWeight: 700, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          maxWidth: 320
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Left sidebar: cluster list ───────────────────────────────────── */}
      <div style={{
        width: 280, background: '#1E293B', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#F8FAFC' }}>👥 Fishermen Clusters</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748B' }}>
            Fishermen in the same area are grouped automatically.
          </p>
        </div>

        {/* Auto-join */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
          <button
            onClick={handleAutoJoin}
            disabled={autoJoining}
            style={{
              width: '100%', padding: '10px 0', background: '#1E3A8A',
              color: '#fff', border: 'none', borderRadius: 8,
              fontWeight: 700, fontSize: 13, cursor: autoJoining ? 'not-allowed' : 'pointer',
              opacity: autoJoining ? 0.7 : 1
            }}
          >
            {autoJoining ? '⏳ Detecting GPS…' : '📡 Auto-Join Nearest Cluster'}
          </button>
          {gpsStatus && (
            <p style={{ fontSize: 11, color: '#64748B', marginTop: 6, marginBottom: 0 }}>{gpsStatus}</p>
          )}
        </div>

        {/* My clusters */}
        {myClusters.length > 0 && (
          <div style={{ padding: '10px 16px 4px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9', margin: '0 0 6px', letterSpacing: 1 }}>MY CLUSTERS</p>
            {myClusters.map(c => (
              <div key={c.id}
                onClick={() => selectCluster(c)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  background: selectedCluster?.id === c.id ? '#0EA5E9' : '#0F172A',
                  border: '1px solid #334155'
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{c.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{c.location || 'Sea Area'}</p>
              </div>
            ))}
          </div>
        )}

        {/* All clusters */}
        <div style={{ padding: '10px 16px 4px', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', margin: '0 0 6px', letterSpacing: 1 }}>ALL CLUSTERS</p>
          {clusters.length === 0 && <p style={{ fontSize: 12, color: '#475569' }}>No clusters yet.</p>}
          {clusters.map(c => (
            <div key={c.id}
              onClick={() => selectCluster(c)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                background: selectedCluster?.id === c.id ? '#1E3A8A' : '#0F172A',
                border: `1px solid ${selectedCluster?.id === c.id ? '#3B82F6' : '#334155'}`,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{c.name}</p>
                <span style={{
                  background: '#1E3A8A', color: '#93C5FD', fontSize: 11,
                  fontWeight: 700, padding: '2px 7px', borderRadius: 10
                }}>
                  {c.member_count || 0} 👤
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748B' }}>{c.location || 'Sea Area'}</p>
              {!isMemberOf(c) && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleManualJoin(c) }}
                  style={{
                    marginTop: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    background: '#16A34A', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                  }}
                >
                  + Join
                </button>
              )}
              {isMemberOf(c) && (
                <span style={{ marginTop: 4, display: 'inline-block', fontSize: 10, color: '#34D399', fontWeight: 700 }}>✓ Member</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Centre: Map ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Map header */}
        <div style={{
          background: '#1E293B', padding: '10px 16px', borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>
            {selectedCluster ? `📍 ${selectedCluster.name}` : '📍 Select a cluster to view members on map'}
          </span>
          {selectedCluster && (
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
              {' · '}
              {members.filter(m => (Date.now() - new Date(m.last_seen)) < 300000).length} online
            </span>
          )}
        </div>
        <div ref={mapRef} style={{ flex: 1 }} />
      </div>

      {/* ── Right panel: Members + Notifications ─────────────────────────── */}
      {selectedCluster && (
        <div style={{
          width: 320, background: '#1E293B', borderLeft: '1px solid #334155',
          display: 'flex', flexDirection: 'column', flexShrink: 0
        }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
            {['members', 'notifications'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '12px 0', background: 'none',
                border: 'none', borderBottom: `3px solid ${tab === t ? '#0EA5E9' : 'transparent'}`,
                color: tab === t ? '#F8FAFC' : '#64748B', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', textTransform: 'capitalize'
              }}>
                {t === 'members' ? `👤 Members (${members.length})` : `🔔 Alerts (${notifications.length})`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {tab === 'members' && (
              <div>
                {members.length === 0 && (
                  <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
                    No members in this cluster yet.
                  </p>
                )}
                {members.map(m => {
                  const minsAgo = Math.floor((Date.now() - new Date(m.last_seen)) / 60000)
                  const online = minsAgo < 5
                  const isMe = m.user_id === userId
                  return (
                    <div key={m.id} style={{
                      background: '#0F172A', borderRadius: 10, padding: '10px 12px',
                      marginBottom: 8, border: `1px solid ${isMe ? '#3B82F6' : '#334155'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>
                          {m.username || m.full_name || `User ${m.user_id}`}
                          {isMe && <span style={{ color: '#3B82F6', fontSize: 11, marginLeft: 6 }}>(You)</span>}
                        </span>
                        <span style={{
                          width: 9, height: 9, borderRadius: '50%',
                          background: online ? '#16A34A' : '#475569',
                          display: 'inline-block', flexShrink: 0
                        }} />
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748B' }}>
                        {online ? '🟢 Online' : `⚫ ${minsAgo}m ago`}
                        {m.latitude && ` · ${parseFloat(m.latitude).toFixed(3)}°N ${parseFloat(m.longitude).toFixed(3)}°E`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                {notifications.length === 0 && (
                  <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
                    No alerts yet. Will show here when any member hits DANGER or WARNING.
                  </p>
                )}
                {notifications.map(n => {
                  const color = STATUS_COLOR[n.type] || '#94A3B8'
                  const timeAgo = Math.floor((Date.now() - new Date(n.created_at)) / 60000)
                  return (
                    <div key={n.id} style={{
                      background: '#0F172A', borderRadius: 10, padding: '10px 12px',
                      marginBottom: 8, borderLeft: `4px solid ${color}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          background: color, color: '#fff', fontSize: 10, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 10
                        }}>{n.type}</span>
                        <span style={{ color: '#475569', fontSize: 11 }}>{timeAgo < 1 ? 'just now' : `${timeAgo}m ago`}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: '#E2E8F0' }}>{n.message}</p>
                      {n.sender_name && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748B' }}>From: {n.sender_name}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Broadcast bar */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid #334155' }}>
            <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 6px', fontWeight: 700 }}>📢 BROADCAST TO CLUSTER</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                placeholder="Type a message…"
                style={{
                  flex: 1, padding: '8px 10px', background: '#0F172A', color: '#F8FAFC',
                  border: '1px solid #334155', borderRadius: 8, fontSize: 13, outline: 'none'
                }}
              />
              <button
                onClick={handleBroadcast}
                disabled={!broadcastMsg.trim()}
                style={{
                  padding: '8px 14px', background: '#1E3A8A', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: broadcastMsg.trim() ? 'pointer' : 'not-allowed', opacity: broadcastMsg.trim() ? 1 : 0.5
                }}
              >
                Send
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#334155', margin: '6px 0 0' }}>
              Refreshes every 10s. DANGER/WARNING alerts auto-broadcast.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
