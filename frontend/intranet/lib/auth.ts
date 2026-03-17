export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("jwtToken");
}

export function getCurrentUsername() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("REMOTE_USER_INTRANET");
}

export function getCurrentUserFullName() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("NOME_COMPLETO");
}

export function getCurrentUserGroups(): string[] {
  if (typeof window === "undefined") return [];

  const raw = sessionStorage.getItem("GRUPOS_USUARIO");
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function isAuthenticated() {
  return !!getToken();
}