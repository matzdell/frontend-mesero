// src/api.js
export const API = "https://backend-comandas-7nds.onrender.com";

export async function apiFetch(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const method = options.method || "GET";

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const body =
    options.body == null
      ? undefined
      : typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);

  const res = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
    headers,
    body,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data && typeof data === "object"
        ? data.error || data.message || "Error en la petición"
        : "Error en la petición";
    throw new Error(msg);
  }

  return data;
}
