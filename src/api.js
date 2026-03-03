// src/api.js

// En Vercel: VITE_API_URL = https://backend-comandas-7nds.onrender.com
// En local:  VITE_API_URL = http://localhost:3000
export const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function apiFetch(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...(options.body != null ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message))
        ? (data.error || data.message)
        : "Error en la petición";
    throw new Error(msg);
  }

  return data;
}
