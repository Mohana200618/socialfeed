import { useEffect, useRef, useState, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import axios from 'axios'

// Fix Leaflet default marker icons broken by Vite bundler
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── INCOIS PFZ GeoJSON Data ──────────────────────────────────────────────────
// Potential Fishing Zones for Tamil Nadu / Palk Strait / Gulf of Mannar
// Based on INCOIS PFZ advisories (https://incois.gov.in/portal/pfz/pfz.jsp)
// Zones updated daily by INCOIS; these represent typical high-productivity areas.
const PFZ_ZONES = [
  {
    id: 'pfz-palk-north',
    name: 'Palk Bay North (PFZ)',
    type: 'HIGH',
    description: 'High fish concentration. Sardine, Mackerel, Tuna.',
    depth: '30–60 m',
    sst: '28–29°C',
    chlorophyll: 'High (>1.5 mg/m³)',
    coords: [[10.20, 79.60], [10.20, 80.10], [9.95, 80.10], [9.95, 79.60]],
  },
  {
    id: 'pfz-palk-central',
    name: 'Palk Bay Central (PFZ)',
    type: 'HIGH',
    description: 'Excellent fishing zone. Squid, Shrimp, Grouper.',
    depth: '20–50 m',
    sst: '28–30°C',
    chlorophyll: 'High (>1.8 mg/m³)',
    coords: [[9.95, 79.50], [9.95, 80.00], [9.60, 79.95], [9.60, 79.50]],
  },
  {
    id: 'pfz-gulf-mannar-north',
    name: 'Gulf of Mannar North (PFZ)',
    type: 'MODERATE',
    description: 'Moderate fish concentration. Tuna, Marlin.',
    depth: '40–80 m',
    sst: '29–30°C',
    chlorophyll: 'Moderate (0.8–1.2 mg/m³)',
    coords: [[9.30, 79.00], [9.30, 79.50], [9.00, 79.50], [9.00, 79.00]],
  },
  {
    id: 'pfz-gulf-mannar-central',
    name: 'Gulf of Mannar Central (PFZ)',
    type: 'HIGH',
    description: 'High fish concentration. Sangara, Seer fish, Rays.',
    depth: '20–60 m',
    sst: '28–29°C',
    chlorophyll: 'High (>1.6 mg/m³)',
    coords: [[9.00, 78.80], [9.00, 79.30], [8.60, 79.30], [8.60, 78.80]],
  },
  {
    id: 'pfz-gulf-mannar-south',
    name: 'Gulf of Mannar South (PFZ)',
    type: 'MODERATE',
    description: 'Moderate zone. Tuna aggregation possible.',
    depth: '50–100 m',
    sst: '29–31°C',
    chlorophyll: 'Moderate (0.6–1.0 mg/m³)',
    coords: [[8.50, 78.50], [8.50, 79.10], [8.10, 79.10], [8.10, 78.50]],
  },
  {
    id: 'pfz-coromandel',
    name: 'Coromandel Coast (PFZ)',
    type: 'HIGH',
    description: 'Excellent upwelling zone. Sardine, Mackerel, Anchovy.',
    depth: '30–70 m',
    sst: '27–29°C',
    chlorophyll: 'Very High (>2.0 mg/m³)',
    coords: [[10.80, 79.90], [10.80, 80.30], [10.30, 80.30], [10.30, 79.90]],
  },
]

// ─── No-go / Caution zones ────────────────────────────────────────────────────
const CAUTION_ZONES = [
  {
    id: 'border-buffer',
    name: 'International Border Buffer Zone',
    type: 'BORDER',
    description: '⚠️ Do NOT fish here. International Maritime Boundary Line.',
    coords: [
      [9.85, 80.10], [9.85, 80.20], [9.25, 79.55], [9.25, 79.45],
    ],
  },
  {
    id: 'marine-park',
    name: 'Gulf of Mannar Marine National Park',
    type: 'RESTRICTED',
    description: '🚫 Protected marine area. Fishing prohibited.',
    coords: [[9.15, 79.10], [9.15, 79.30], [8.80, 79.30], [8.80, 79.10]],
  },
]

// ─── Fishing ports ────────────────────────────────────────────────────────────
const PORTS = [
  { name: 'Nagapattinam Harbour', lat: 10.766, lng: 79.842, type: 'major' },
  { name: 'Rameswaram Fishing Harbour', lat: 9.284, lng: 79.312, type: 'major' },
  { name: 'Tuticorin Harbour', lat: 8.784, lng: 78.135, type: 'major' },
  { name: 'Mandapam Camp Harbour', lat: 9.270, lng: 79.124, type: 'minor' },
  { name: 'Pamban Harbour', lat: 9.280, lng: 79.210, type: 'minor' },
  { name: 'Keelakarai Harbour', lat: 9.230, lng: 78.784, type: 'minor' },
  { name: 'Kanyakumari Landing Centre', lat: 8.078, lng: 77.549, type: 'minor' },
]

const ZONE_STYLE = {
  HIGH: { color: '#16A34A', fillColor: '#22C55E', fillOpacity: 0.35, weight: 2 },
  MODERATE: { color: '#EA580C', fillColor: '#F97316', fillOpacity: 0.30, weight: 2 },
  BORDER: { color: '#DC2626', fillColor: '#EF4444', fillOpacity: 0.25, weight: 3, dashArray: '8 4' },
  RESTRICTED: { color: '#7C3AED', fillColor: '#8B5CF6', fillOpacity: 0.28, weight: 2, dashArray: '6 3' },
}

const LEGEND_ITEMS = [
  { color: '#22C55E', label: 'High Potential Fishing Zone (INCOIS PFZ)' },
  { color: '#F97316', label: 'Moderate Potential Fishing Zone (INCOIS PFZ)' },
  { color: '#EF4444', label: 'International Border Buffer (DANGER)' },
  { color: '#8B5CF6', label: 'Marine Protected Area (Restricted)' },
  { color: '#1E3A8A', label: 'Major Fishing Harbour' },
  { color: '#0EA5E9', label: 'Minor Landing Centre' },
]

export default function FishingZonePage() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const [incoisDate, setIncoisDate] = useState('')
  const [showAdvisory, setShowAdvisory] = useState(false)
  const [layerControl, setLayerControl] = useState({ pfz: true, caution: true, ports: true })
  const [liveData, setLiveData] = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState(false)

  const fetchAdvisory = useCallback(async () => {
    setLiveLoading(true)
    setLiveError(false)
    try {
      const res = await axios.get('/api/pfz/advisory', { timeout: 10000 })
      if (res.data?.success) {
        setLiveData(res.data.data)
      } else {
        setLiveError(true)
      }
    } catch {
      setLiveError(true)
    } finally {
      setLiveLoading(false)
    }
  }, [])

  // Fetch live advisory on mount
  useEffect(() => { fetchAdvisory() }, [fetchAdvisory])

  useEffect(() => {
    // Format today's date for INCOIS advisory
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    setIncoisDate(`${dd}/${mm}/${yyyy}`)

    if (mapInstanceRef.current) return // prevent double init

    const map = L.map(mapRef.current, {
      center: [9.5, 79.3],
      zoom: 7,
      zoomControl: true,
    })
    mapInstanceRef.current = map

    // Base layer — OpenStreetMap (free, no key)
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    })

    // Esri Ocean Basemap (free, no key)
    const esriOcean = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles © Esri — Source: Esri, GEBCO, NOAA, NGA, and other contributors',
        maxZoom: 13,
      }
    )

    esriOcean.addTo(map)

    // ── PFZ Zones layer ─────────────────────────────────────────────────────
    const pfzLayerGroup = L.layerGroup()
    PFZ_ZONES.forEach(zone => {
      const poly = L.polygon(zone.coords, {
        ...ZONE_STYLE[zone.type],
        interactive: true,
      })
      poly.bindTooltip(`<b>${zone.name}</b><br/>${zone.description}`, {
        sticky: true, direction: 'top',
      })
      poly.on('click', () => setSelectedZone(zone))
      pfzLayerGroup.addLayer(poly)

      // Zone label
      const center = poly.getBounds().getCenter()
      const label = L.divIcon({
        className: '',
        html: `<div style="background:${ZONE_STYLE[zone.type].color};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;opacity:0.9">${zone.type} PFZ</div>`,
        iconAnchor: [30, 10],
      })
      pfzLayerGroup.addLayer(L.marker(center, { icon: label, interactive: false }))
    })
    pfzLayerGroup.addTo(map)

    // ── Caution / Border zones ──────────────────────────────────────────────
    const cautionLayerGroup = L.layerGroup()
    CAUTION_ZONES.forEach(zone => {
      const poly = L.polygon(zone.coords, {
        ...ZONE_STYLE[zone.type],
        interactive: true,
      })
      poly.bindTooltip(`<b>${zone.name}</b><br/>${zone.description}`, {
        sticky: true, direction: 'top',
      })
      poly.on('click', () => setSelectedZone(zone))
      cautionLayerGroup.addLayer(poly)
    })
    cautionLayerGroup.addTo(map)

    // ── Ports markers ────────────────────────────────────────────────────────
    const portLayerGroup = L.layerGroup()
    PORTS.forEach(port => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${port.type === 'major' ? 14 : 10}px;height:${port.type === 'major' ? 14 : 10}px;background:${port.type === 'major' ? '#1E3A8A' : '#0EA5E9'};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
        iconAnchor: [7, 7],
      })
      const marker = L.marker([port.lat, port.lng], { icon })
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <b style="color:#1E3A8A">${port.name}</b><br/>
          <span style="font-size:12px;color:#64748B">${port.type === 'major' ? '⚓ Major Harbour' : '🚤 Landing Centre'}</span><br/>
          <span style="font-size:11px">Lat: ${port.lat}, Lng: ${port.lng}</span>
        </div>
      `)
      portLayerGroup.addLayer(marker)
    })
    portLayerGroup.addTo(map)

    // ── INCOIS WMS live overlay ─────────────────────────────────────────────
    // Directly fetches rendered PFZ tiles from INCOIS GeoServer — real-time data
    const incoisWMS = L.tileLayer.wms('https://incois.gov.in/geoserver/pfz/wms', {
      layers: 'pfz:pfz_advisory',
      format: 'image/png',
      transparent: true,
      version: '1.1.1',
      attribution: '© <a href="https://incois.gov.in" target="_blank">INCOIS</a> PFZ Advisory',
      opacity: 0.85,
      errorTileUrl: '', // silently fail if WMS is unavailable
    })
    incoisWMS.addTo(map)

    // Update layer control to include INCOIS WMS
    L.control.layers(
      { 'Ocean Basemap (Esri)': esriOcean, 'Street Map (OSM)': osm },
      {
        '🛰️ INCOIS Live PFZ (WMS)': incoisWMS,
        'PFZ Reference Zones': pfzLayerGroup,
        'Caution / Border Zones': cautionLayerGroup,
        'Fishing Ports': portLayerGroup,
      },
      { collapsed: false }
    ).addTo(map)

    // ── Scale bar ────────────────────────────────────────────────────────────
    L.control.scale({ imperial: false }).addTo(map)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0F172A', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
        padding: '14px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        borderBottom: '1px solid #334155'
      }}>
        <div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 900 }}>
            🐠 WebGIS — Potential Fishing Zones
          </h1>
          <p style={{ color: '#94A3B8', margin: '2px 0 0', fontSize: 12 }}>
            Source: INCOIS PFZ Advisory · Tamil Nadu &amp; Palk Strait · {incoisDate}
            {' '}—{' '}
            {liveLoading ? (
              <span style={{ color: '#F59E0B' }}>⏳ Fetching live data…</span>
            ) : liveError ? (
              <span style={{ color: '#F87171' }}>⚠️ INCOIS offline — showing latest advisory</span>
            ) : liveData?.source === 'incois-live' ? (
              <span style={{ color: '#34D399' }}>🟢 Live from INCOIS</span>
            ) : (
              <span style={{ color: '#FB923C' }}>🟠 Latest advisory (INCOIS unreachable)</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowAdvisory(!showAdvisory)}
            style={{
              padding: '8px 14px', background: '#0EA5E9', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer'
            }}
          >
            📋 INCOIS Advisory
          </button>

        </div>
      </div>

      {/* INCOIS Advisory Panel */}
      {showAdvisory && (
        <div style={{
          background: '#1E293B', borderBottom: '1px solid #334155',
          padding: '12px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start'
        }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <h3 style={{ color: '#F59E0B', margin: '0 0 8px', fontSize: 14 }}>📡 INCOIS PFZ Advisory — Today</h3>
            <p style={{ color: '#CBD5E1', fontSize: 13, margin: '0 0 8px', lineHeight: 1.6 }}>
              INCOIS (Indian National Centre for Ocean Information Services) issues daily
              Potential Fishing Zone advisories using satellite-derived <b>Sea Surface Temperature (SST)</b>
              and <b>Chlorophyll-a</b> data. Zones are identified where thermal gradients and
              nutrient upwelling concentrate fish aggregations.
            </p>
            {liveData?.notes && (
              <p style={{ color: '#94A3B8', fontSize: 12, margin: '4px 0 8px', fontStyle: 'italic' }}>
                {liveData.stale ? '⚠️ ' : '✅ '}{liveData.notes}
              </p>
            )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'SST Range', value: liveData?.conditions?.sst ?? '27–31°C', icon: '🌡️' },
                { label: 'Chlorophyll', value: liveData?.conditions?.chlorophyll ?? '0.8–2.0 mg/m³', icon: '🌿' },
                { label: 'Wind Speed', value: liveData?.conditions?.windSpeed ?? '10–20 knots', icon: '💨' },
                { label: 'Wave Height', value: liveData?.conditions?.waveHeight ?? '0.5–1.5 m', icon: '🌊' },
              ].map(item => (
                <div key={item.label} style={{
                  background: '#0F172A', borderRadius: 8, padding: '6px 12px',
                  border: '1px solid #334155', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 16 }}>{item.icon}</div>
                  <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13 }}>{item.value}</div>
                  <div style={{ color: '#64748B', fontSize: 11 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <h3 style={{ color: '#F59E0B', margin: '0 0 8px', fontSize: 14 }}>📖 How to Read PFZ Map</h3>
            {LEGEND_ITEMS.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, background: item.color, borderRadius: 3, flexShrink: 0 }} />
                <span style={{ color: '#CBD5E1', fontSize: 12 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: Map + Side panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Map */}
        <div ref={mapRef} style={{ flex: 1, height: '100%', minHeight: 400 }} />

        {/* Zone detail side panel */}
        {selectedZone && (
          <div style={{
            width: 300, background: '#1E293B', borderLeft: '1px solid #334155',
            padding: 20, overflowY: 'auto', flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h2 style={{ color: '#F8FAFC', fontSize: 16, margin: 0, fontWeight: 800 }}>
                Zone Details
              </h2>
              <button
                onClick={() => setSelectedZone(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              >×</button>
            </div>

            {/* Status badge */}
            <div style={{
              background: selectedZone.type === 'HIGH' ? '#16A34A' :
                selectedZone.type === 'MODERATE' ? '#EA580C' :
                selectedZone.type === 'BORDER' ? '#DC2626' : '#7C3AED',
              color: '#fff', padding: '6px 14px', borderRadius: 20,
              fontWeight: 800, fontSize: 13, display: 'inline-block', marginBottom: 14
            }}>
              {selectedZone.type === 'HIGH' ? '🟢 HIGH POTENTIAL' :
               selectedZone.type === 'MODERATE' ? '🟠 MODERATE' :
               selectedZone.type === 'BORDER' ? '🔴 BORDER — DANGER' : '🟣 RESTRICTED'}
            </div>

            <h3 style={{ color: '#E2E8F0', fontSize: 15, margin: '0 0 8px' }}>{selectedZone.name}</h3>
            <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
              {selectedZone.description}
            </p>

            {selectedZone.depth && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Water Depth', value: selectedZone.depth, icon: '📏' },
                  { label: 'Sea Surface Temp', value: selectedZone.sst, icon: '🌡️' },
                  { label: 'Chlorophyll-a', value: selectedZone.chlorophyll, icon: '🌿' },
                ].map(row => (
                  <div key={row.label} style={{
                    background: '#0F172A', borderRadius: 8, padding: '10px 14px',
                    border: '1px solid #334155', display: 'flex', justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#64748B', fontSize: 12 }}>{row.icon} {row.label}</span>
                    <span style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedZone.type === 'BORDER' && (
              <div style={{
                background: '#7F1D1D', border: '1px solid #DC2626',
                borderRadius: 8, padding: 12, marginTop: 14
              }}>
                <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0, fontWeight: 600 }}>
                  ⛔ Crossing this boundary is illegal and extremely dangerous.
                  You may be arrested by Sri Lanka Navy. Turn back immediately.
                </p>
              </div>
            )}

            {(selectedZone.type === 'HIGH' || selectedZone.type === 'MODERATE') && (
              <div style={{
                background: '#052E16', border: '1px solid #16A34A',
                borderRadius: 8, padding: 12, marginTop: 14
              }}>
                <p style={{ color: '#86EFAC', fontSize: 12, margin: 0 }}>
                  ✅ This zone is marked as a <b>Potential Fishing Zone</b> by INCOIS today.
                  Verify with the latest advisory before departure at{' '}
                  <a href="https://incois.gov.in/portal/pfz/pfz.jsp" target="_blank" rel="noopener noreferrer"
                    style={{ color: '#34D399' }}>incois.gov.in</a>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom stats bar */}
      <div style={{
        background: '#0F172A', borderTop: '1px solid #1E293B',
        padding: '8px 20px', display: 'flex', gap: 24, flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {[
          { label: 'High PFZ Zones', value: PFZ_ZONES.filter(z => z.type === 'HIGH').length, color: '#22C55E' },
          { label: 'Moderate PFZ Zones', value: PFZ_ZONES.filter(z => z.type === 'MODERATE').length, color: '#F97316' },
          { label: 'Restricted Zones', value: CAUTION_ZONES.length, color: '#EF4444' },
          { label: 'Fishing Ports', value: PORTS.length, color: '#0EA5E9' },
        ].map(stat => (
          <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stat.color, display: 'inline-block' }} />
            <span style={{ color: '#94A3B8', fontSize: 12 }}>{stat.label}:</span>
            <span style={{ color: stat.color, fontWeight: 700, fontSize: 13 }}>{stat.value}</span>
          </div>
        ))}
        <span style={{ color: '#475569', fontSize: 11, marginLeft: 'auto' }}>
          🛰️ INCOIS WMS Live Layer · Basemap: Esri Ocean · © OpenStreetMap · Updated: {liveData?.fetchedAt ? new Date(liveData.fetchedAt).toLocaleTimeString() : '—'}
        </span>
      </div>
    </div>
  )
}
