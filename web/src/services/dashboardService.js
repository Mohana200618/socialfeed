import api from './api'

export async function getDashboardData() {
  const [profile, socialFeed, incidents, clusters, alerts, topAlerts] = await Promise.all([
    api.get('/auth/me'),
    api.get('/social-feed?limit=25'),
    api.get('/incidents'),
    api.get('/clusters'),
    api.get('/alerts'),
    api.get('/alerts/top?limit=5')
  ])

  return {
    profile: profile.data.data,
    socialFeed: socialFeed.data.data || [],
    incidents: incidents.data.data || [],
    clusters: clusters.data.data || [],
    alerts: alerts.data.data || [],
    topAlerts: topAlerts.data.data || []
  }
}

export async function createSocialPost(content) {
  const response = await api.post('/social-feed', { content })
  return response.data.data
}

export async function createIncident(payload) {
  const response = await api.post('/incidents', payload)
  return response.data.data
}

export async function updateIncidentStatus(id, status) {
  const response = await api.put(`/incidents/${id}`, { status })
  return response.data.data
}

export async function createCluster(payload) {
  const response = await api.post('/clusters', payload)
  return response.data.data
}

export async function createAlert(payload) {
  const response = await api.post('/alerts', payload)
  return response.data.data
}

export async function getSocialReviewPosts() {
  const response = await api.get('/social-feed/admin/review?limit=100')
  return response.data.data || []
}

export async function getPendingAlertPosts() {
  const response = await api.get('/social-feed/admin/pending-alerts')
  return response.data.data || []
}

export async function promotePostToAlert(id, payload = {}) {
  const response = await api.post(`/social-feed/admin/${id}/promote`, payload)
  return response.data
}

export async function dismissSocialPost(id) {
  const response = await api.post(`/social-feed/admin/${id}/dismiss`)
  return response.data
}
