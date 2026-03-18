import { useState } from 'react'
import api from '../services/api'

const LABEL_CONFIG = {
  HIGH:   { color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0', icon: '✅', bar: '#16A34A' },
  MEDIUM: { color: '#CA8A04', bg: '#FEF9C3', border: '#FDE68A', icon: '⚠️', bar: '#EAB308' },
  LOW:    { color: '#DC2626', bg: '#FEE2E2', border: '#FECACA', icon: '🚨', bar: '#DC2626' },
}

const FACTOR_LABELS = {
  bayesClassifier:     'AI Classifier',
  specificity:         'Specificity',
  attribution:         'Official Sources',
  structure:           'Text Structure',
  sentimentNeutrality: 'Neutrality',
  alarmismPenalty:     'Alarmism',
  hedgingPenalty:      'Rumour Language',
}

const EXAMPLES = [
  {
    label: 'High confidence (official)',
    text: 'The Indian Meteorological Department issued a bulletin warning of Cyclone Vardah expected to make landfall near Chennai within 48 hours with wind speeds of 120 km/h. Fisheries Department advised all 1,200 registered boats in Nagapattinam district to return to harbour immediately.',
  },
  {
    label: 'Medium confidence',
    text: 'Reports suggest that rough weather is expected near the coast this week. Some fishermen have been told to avoid deep sea fishing. Authorities are apparently monitoring the situation closely.',
  },
  {
    label: 'Low confidence (rumour)',
    text: 'HUGE TSUNAMI COMING RIGHT NOW!!! My uncle heard from someone that the government is hiding a massive disaster!!! Share this to every fisherman you know BEFORE THEY DELETE THIS!!!',
  },
]

export default function NewsAnalyzerPage() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [batchText, setBatchText] = useState('')
  const [batchResults, setBatchResults] = useState([])
  const [activeTab, setActiveTab] = useState('single')

  async function handleAnalyze() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.post('/nlp/analyze', { text: text.trim(), title: title.trim() || undefined })
      setResult(res.data.data)
    } catch (e) {
      const msg = e.response?.data?.error || e.message || ''
      if (!e.response || e.code === 'ERR_NETWORK' || e.code === 'ECONNREFUSED') {
        setError('Cannot reach the server. Make sure the backend is running on port 5000.')
      } else {
        setError(msg || 'Analysis failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleBatchAnalyze() {
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    setLoading(true)
    setError('')
    setBatchResults([])
    try {
      const items = lines.map((text, i) => ({ id: i + 1, text }))
      const res = await api.post('/nlp/batch-analyze', { items })
      setBatchResults(res.data.data || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Batch analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  function loadExample(ex) {
    setTitle('')
    setText(ex.text)
    setResult(null)
    setActiveTab('single')
  }

  const cfg = result ? (LABEL_CONFIG[result.label] || LABEL_CONFIG.MEDIUM) : null

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', fontFamily: 'sans-serif', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#F8FAFC' }}>
          🧠 News Confidence Analyzer
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748B', maxWidth: 640 }}>
          Powered by a Naive Bayes classifier trained on maritime/fishing news, combined with
          specificity, attribution, and linguistic feature analysis. Paste any news or alert
          text to get an instant credibility score.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: Input panel ─────────────────────────────────────── */}
        <div style={{ flex: '1 1 480px', minWidth: 320 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#1E293B', borderRadius: 10, padding: 4 }}>
            {['single', 'batch'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                flex: 1, padding: '8px 0', background: activeTab === t ? '#0EA5E9' : 'none',
                border: 'none', borderRadius: 8, color: activeTab === t ? '#fff' : '#64748B',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize'
              }}>
                {t === 'single' ? '📄 Single Analysis' : '📋 Batch Analysis'}
              </button>
            ))}
          </div>

          {activeTab === 'single' && (
            <div style={{ background: '#1E293B', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                HEADLINE / TITLE (optional)
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Coast Guard issues warning for Bay of Bengal"
                style={{
                  width: '100%', padding: '10px 12px', background: '#0F172A',
                  color: '#F8FAFC', border: '1px solid #334155', borderRadius: 8,
                  fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box'
                }}
              />
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                NEWS / ALERT TEXT *
              </label>
              <textarea
                rows={7}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the news article or alert message here…"
                style={{
                  width: '100%', padding: '10px 12px', background: '#0F172A',
                  color: '#F8FAFC', border: '1px solid #334155', borderRadius: 8,
                  fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !text.trim()}
                  style={{
                    padding: '10px 28px', background: loading || !text.trim() ? '#334155' : '#1E3A8A',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800,
                    fontSize: 14, cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  {loading ? '⏳ Analyzing…' : '🔍 Analyze'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'batch' && (
            <div style={{ background: '#1E293B', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                PASTE ONE NEWS ITEM PER LINE (max 50)
              </label>
              <textarea
                rows={10}
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                placeholder={'Line 1: First news item…\nLine 2: Second news item…\nLine 3: Another alert…'}
                style={{
                  width: '100%', padding: '10px 12px', background: '#0F172A',
                  color: '#F8FAFC', border: '1px solid #334155', borderRadius: 8,
                  fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                <button
                  onClick={handleBatchAnalyze}
                  disabled={loading || !batchText.trim()}
                  style={{
                    padding: '10px 28px', background: loading || !batchText.trim() ? '#334155' : '#1E3A8A',
                    color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800,
                    fontSize: 14, cursor: loading || !batchText.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '⏳ Analyzing…' : '🔍 Analyze All'}
                </button>
              </div>
              {/* Batch results */}
              {batchResults.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', margin: '0 0 10px' }}>
                    RESULTS ({batchResults.length} items)
                  </p>
                  {batchResults.map(r => {
                    const c = LABEL_CONFIG[r.label] || LABEL_CONFIG.MEDIUM
                    return (
                      <div key={r.id} style={{
                        background: '#0F172A', borderRadius: 8, padding: '10px 14px',
                        marginBottom: 8, borderLeft: `4px solid ${c.color}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <span style={{ fontSize: 13, color: '#E2E8F0', flex: 1, marginRight: 12 }}>
                          #{r.id} {r.text?.substring(0, 80)}{(r.text?.length ?? 0) > 80 ? '…' : ''}
                        </span>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{r.confidence ?? '—'}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: c.color }}>{r.label}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#450A0A', borderRadius: 8, color: '#FCA5A5', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Examples */}
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: '0 0 10px', letterSpacing: 1 }}>
              TRY EXAMPLE TEXTS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => loadExample(ex)} style={{
                  padding: '8px 14px', background: '#1E293B', border: '1px solid #334155',
                  borderRadius: 8, color: '#94A3B8', fontSize: 12, cursor: 'pointer',
                  textAlign: 'left', transition: 'border-color 0.15s'
                }}>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Result panel ───────────────────────────────────── */}
        <div style={{ flex: '1 1 360px', minWidth: 300 }}>
          {!result && (
            <div style={{
              background: '#1E293B', borderRadius: 12, border: '1px dashed #334155',
              padding: 48, textAlign: 'center'
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
              <p style={{ color: '#475569', margin: 0, fontSize: 14 }}>
                Paste a news text on the left and click Analyze to see the confidence report.
              </p>
            </div>
          )}

          {result && cfg && (
            <div style={{ background: '#1E293B', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
              {/* Score header */}
              <div style={{ background: cfg.bg, padding: '24px 24px 20px', textAlign: 'center', borderBottom: `1px solid ${cfg.border}` }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
                  {result.confidence}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>/ 100</div>
                <div style={{
                  display: 'inline-block', marginTop: 10, padding: '4px 20px',
                  background: cfg.color, color: '#fff', borderRadius: 20,
                  fontSize: 14, fontWeight: 900, letterSpacing: 1
                }}>
                  {cfg.icon} {result.label} CONFIDENCE
                </div>
                {/* Bar */}
                <div style={{ marginTop: 14, background: '#E2E8F0', borderRadius: 99, height: 8, width: '100%' }}>
                  <div style={{
                    background: cfg.bar, height: '100%', borderRadius: 99,
                    width: `${result.confidence}%`, transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', lineHeight: 1.6 }}>{result.description}</p>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#475569' }}>
                  {result.wordCount} words · analyzed {new Date(result.analyzedAt).toLocaleTimeString()}
                </p>
              </div>

              {/* Factor breakdown */}
              <div style={{ padding: '16px 20px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', margin: '0 0 12px', letterSpacing: 1 }}>
                  FACTOR BREAKDOWN
                </p>
                {Object.entries(result.factors).map(([key, val]) => {
                  const isNeg = val.score < 0
                  const absScore = Math.abs(val.score)
                  const barColor = isNeg ? '#DC2626' : '#0EA5E9'
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>{FACTOR_LABELS[key] ?? key}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isNeg ? '#F87171' : '#38BDF8' }}>
                          {isNeg ? `−${absScore}` : `+${val.score}`}
                        </span>
                      </div>
                      <div style={{ background: '#0F172A', borderRadius: 99, height: 5 }}>
                        <div style={{
                          background: barColor, height: '100%', borderRadius: 99,
                          width: `${Math.min(absScore, 100)}%`
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Model info footer */}
              <div style={{ padding: '12px 20px', background: '#0F172A', borderTop: '1px solid #1E293B' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#334155', textAlign: 'center' }}>
                  Naive Bayes Classifier · AFINN Sentiment · Linguistic Feature Analysis
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
