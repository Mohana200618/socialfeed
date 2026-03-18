import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

const STATUS_CONFIG = {
  DANGER: {
    bg: '#FEE2E2',
    border: '#DC2626',
    color: '#991B1B',
    badgeBg: '#DC2626',
    icon: '🚨',
    pulse: true,
  },
  WARNING: {
    bg: '#FFF7ED',
    border: '#EA580C',
    color: '#9A3412',
    badgeBg: '#EA580C',
    icon: '⚠️',
    pulse: false,
  },
  SAFE: {
    bg: '#F0FDF4',
    border: '#16A34A',
    color: '#166534',
    badgeBg: '#16A34A',
    icon: '✅',
    pulse: false,
  },
}

function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-IN'
  utt.rate = 0.9
  utt.volume = 1
  window.speechSynthesis.speak(utt)
}

export default function BorderAlertPage() {
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('')
  const [alertCount, setAlertCount] = useState(0)   // how many notifications sent (1–3)
  const lastAlertStatus = useRef(null)
  const notifyCount = useRef(0)
  const autoTimer = useRef(null)

  // Try GPS on mount
  useEffect(() => {
    tryGps()
    return () => clearInterval(autoTimer.current)
  }, [])

  // Auto-refresh every 30 s once we have coords
  useEffect(() => {
    clearInterval(autoTimer.current)
    if (lat && lng) {
      autoTimer.current = setInterval(() => {
        doCheck(parseFloat(lat), parseFloat(lng), false)
      }, 30000)
    }
    return () => clearInterval(autoTimer.current)
  }, [lat, lng])

  function tryGps() {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not available in this browser.')
      return
    }
    setGpsStatus('Detecting your location via GPS…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude.toFixed(6)
        const lg = pos.coords.longitude.toFixed(6)
        setLat(la)
        setLng(lg)
        setGpsStatus(`GPS: ${la}, ${lg}`)
        doCheck(parseFloat(la), parseFloat(lg), true)
      },
      (err) => {
        setGpsStatus(`GPS unavailable (${err.message}). Enter coordinates manually.`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function doCheck(latVal, lngVal, firstTime) {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/border/check-border', { lat: latVal, lng: lngVal })
      const data = res.data.data
      setResult(data)

      // Reset notify count when status changes
      if (data.status !== lastAlertStatus.current) {
        notifyCount.current = 0
        lastAlertStatus.current = data.status
      }

      // Speak for DANGER/WARNING up to 3 times per alert session
      if (data.status === 'DANGER' || data.status === 'WARNING') {
        if (notifyCount.current < 3) {
          notifyCount.current += 1
          setAlertCount(notifyCount.current)
          speakAlert(data)
        }
      } else {
        // SAFE: speak once on first check or when returning to safe
        if (firstTime || lastAlertStatus.current !== 'SAFE') {
          speakAlert(data)
        }
        notifyCount.current = 0
        setAlertCount(0)
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to reach server.')
    } finally {
      setLoading(false)
    }
  }

  function speakAlert(data) {
    const km = data.distanceKm.toFixed(1)
    const dir = data.safeDirection || 'West'
    if (data.status === 'DANGER') {
      speak(`Danger! Danger! You are only ${km} kilometres from the international border. Steer your boat ${dir} immediately to move away from the border!`)
    } else if (data.status === 'WARNING') {
      speak(`Warning. You are ${km} kilometres from the international border. Steer your boat ${dir} to return to safe waters.`)
    } else {
      speak(`You are safe. You are ${km} kilometres from the border. You are in a safe fishing zone.`)
    }
  }

  function handleManualCheck(e) {
    e.preventDefault()
    const la = parseFloat(lat)
    const lg = parseFloat(lng)
    if (isNaN(la) || isNaN(lg)) {
      setError('Please enter valid numeric coordinates.')
      return
    }
    doCheck(la, lg, true)
  }

  const cfg = result ? STATUS_CONFIG[result.status] : null

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', margin: 0 }}>
            🌊 Border Alert System
          </h1>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: 14 }}>
            Real-time international maritime border proximity check for fishermen.
          </p>
        </div>

        {/* GPS status */}
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          color: '#1D4ED8', marginBottom: 20
        }}>
          📡 {gpsStatus || 'Waiting for GPS…'}
        </div>

        {/* Coordinate Input Form */}
        <form onSubmit={handleManualCheck} style={{
          background: '#fff', borderRadius: 14, padding: 20,
          border: '1px solid #E2E8F0', marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
            Enter / Verify Coordinates
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                LATITUDE
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 9.50"
                value={lat}
                onChange={e => setLat(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #CBD5E1', fontSize: 15, outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>
                LONGITUDE
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 79.90"
                value={lng}
                onChange={e => setLng(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #CBD5E1', fontSize: 15, outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '12px 0', background: '#1E3A8A', color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Checking…' : '🔍 Check Border Status'}
            </button>
            <button
              type="button"
              onClick={tryGps}
              style={{
                padding: '12px 18px', background: '#F1F5F9', color: '#0F172A',
                border: '1px solid #CBD5E1', borderRadius: 8, fontWeight: 600,
                fontSize: 14, cursor: 'pointer'
              }}
            >
              📡 Use GPS
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 10, padding: '12px 16px', color: '#991B1B',
            marginBottom: 20, fontSize: 14
          }}>
            ❌ {error}
          </div>
        )}

        {/* Result Card */}
        {result && cfg && (
          <div style={{
            background: cfg.bg,
            border: `2px solid ${cfg.border}`,
            borderRadius: 16, padding: 24,
            boxShadow: cfg.pulse ? `0 0 0 6px ${cfg.border}33` : 'none',
            animation: cfg.pulse ? 'borderPulse 1s ease-in-out infinite' : 'none',
            marginBottom: 20
          }}>
            {/* Status Badge */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 64 }}>{cfg.icon}</span>
              <div style={{
                display: 'inline-block', background: cfg.badgeBg,
                color: '#fff', padding: '8px 28px', borderRadius: 50,
                fontWeight: 900, fontSize: 22, letterSpacing: 3,
                margin: '12px auto 0', display: 'block', width: 'fit-content',
                boxShadow: `0 4px 16px ${cfg.badgeBg}66`
              }}>
                {result.status}
              </div>
              {/* Alert repeat counter */}
              {(result.status === 'DANGER' || result.status === 'WARNING') && alertCount > 0 && (
                <div style={{
                  marginTop: 10, display: 'inline-block',
                  background: '#1E293B', color: '#F8FAFC',
                  padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700
                }}>
                  🔔 Alert {alertCount} of 3
                </div>
              )}
            </div>

            {/* Message */}
            <div style={{
              background: `${cfg.badgeBg}18`,
              border: `1px solid ${cfg.badgeBg}44`,
              borderRadius: 10, padding: '12px 16px',
              color: cfg.color, fontWeight: 600, fontSize: 15,
              textAlign: 'center', marginBottom: 18, lineHeight: 1.6
            }}>
              {result.message}
            </div>

            {/* Info rows */}
            {[
              { label: '📏 Distance from Border', value: `${result.distanceKm} km` },
              { label: '📌 Nearest Reference Point', value: result.nearestBorderPoint },
              { label: '🗺️ Your Coordinates', value: `${result.lat.toFixed(4)}°N, ${result.lng.toFixed(4)}°E` },
              ...(result.safeDirection ? [{ label: '🧭 Steer Boat Towards', value: `${result.safeDirection} (safe zone)` }] : []),
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#fff', borderRadius: 8, padding: '10px 14px',
                marginBottom: 8, border: `1px solid ${cfg.border}33`
              }}>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{row.value}</span>
              </div>
            ))}

            {/* Escape instruction banner */}
            {result.escapeInstruction && result.status !== 'SAFE' && (
              <div style={{
                background: `${cfg.badgeBg}22`,
                border: `1.5px solid ${cfg.badgeBg}`,
                borderRadius: 10, padding: '12px 16px',
                color: cfg.color, fontWeight: 700, fontSize: 14,
                textAlign: 'center', marginBottom: 12, lineHeight: 1.5
              }}>
                🧭 {result.escapeInstruction}
              </div>
            )}

            {/* Speak again button */}
            <button
              onClick={() => speakAlert(result)}
              style={{
                marginTop: 8, width: '100%', padding: '12px 0',
                background: 'transparent', color: cfg.color,
                border: `2px solid ${cfg.border}`,
                borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer'
              }}
            >
              🔊 Repeat Voice Alert
            </button>
          </div>
        )}

        {/* Quick Test Buttons */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: 18,
          border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#64748B' }}>
            QUICK TEST COORDINATES
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: '🔴 DANGER (0.8 km)', lat: 9.58, lng: 79.89 },
              { label: '🟠 WARNING (14.9 km)', lat: 9.45, lng: 79.70 },
              { label: '🟢 SAFE (46 km)', lat: 9.10, lng: 79.00 },
            ].map(pt => (
              <button
                key={pt.label}
                onClick={() => {
                  setLat(String(pt.lat))
                  setLng(String(pt.lng))
                  doCheck(pt.lat, pt.lng, true)
                }}
                style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid #CBD5E1',
                  background: '#F8FAFC', cursor: 'pointer', fontSize: 13, fontWeight: 600
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 10, marginBottom: 0 }}>
            Auto-refreshes every 30 seconds. Notifications sent up to 3 times per alert.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 0 0 4px #DC262633; }
          50%       { box-shadow: 0 0 0 12px #DC262611; }
        }
      `}</style>
    </div>
  )
}
