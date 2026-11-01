// Render passes the backend's host name (no scheme), e.g. "meantit-api.onrender.com".
// Locally, VITE_API_URL is unset and we use the FastAPI dev server.
const raw = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_URL = (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/$/, "");

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }
  return response.json();
}
