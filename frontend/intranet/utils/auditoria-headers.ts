export function getAuditoriaHeaders() {
  return {
    "Content-Type": "application/json",
    "x-tela-origem":
      typeof window !== "undefined" ? window.location.href : "",
  };
}