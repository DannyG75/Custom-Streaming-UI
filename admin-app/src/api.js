// Thin REST client for the streaming-ui server. The base URL is set in
// admin-app/.env so the same build can talk to dev / NUC / Tailscale.
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

async function request(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  list: () => request('/api/sites'),
  create: (site) => request('/api/sites', { method: 'POST', body: JSON.stringify(site) }),
  update: (id, site) =>
    request(`/api/sites/${id}`, { method: 'PUT', body: JSON.stringify(site) }),
  remove: (id) => request(`/api/sites/${id}`, { method: 'DELETE' }),
  reorder: (ids) =>
    request('/api/sites/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
};
