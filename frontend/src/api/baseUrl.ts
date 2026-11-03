export function apiBaseUrl(): string {
  const host = window.location.hostname
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    const target = host.includes(":") ? `[${host}]` : host
    return `http://${target}:8000/api`
  }
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "")
  return configured || "http://127.0.0.1:8000/api"
}
