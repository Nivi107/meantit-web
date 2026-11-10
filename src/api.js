// Render passes the backend's host name (no scheme), e.g. "meantit-api.onrender.com".
// Locally, VITE_API_URL is unset and we use the FastAPI dev server.
const raw = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_URL = (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/$/, "");

export async function api(path, { method = "GET", body, userId } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (userId) headers["X-User-Id"] = userId;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail === "string" ? detail : `Backend returned ${response.status}`);
  }
  return data;
}

export const getHealth = () => api("/health");
