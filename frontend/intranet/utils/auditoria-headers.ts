export function getAuditoriaHeaders() {
  return {
    "x-tela-origem":
      typeof window !== "undefined"
        ? window.location.href
        : "",
  };
}