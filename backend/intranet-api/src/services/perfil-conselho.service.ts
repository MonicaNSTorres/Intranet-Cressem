const NOMES_CONSELHO_PARTICIPACAO = [
  "JANAINA GABRIELA",
  "ISABELI LOHANA CARVALHO MARTINS",
  "VITORIA BEATRIZ FONTOURA CAVALHEIRO DOS SANTOS",
] as const;

function normalizarNome(nome: string) {
  return String(nome || "").trim().toUpperCase();
}

// Fonte de verdade já utilizada pelo fluxo de Participação/Patrocínio.
// Centralizada para que os módulos não mantenham listas independentes.
export function isConselhoParticipacao(nome: string) {
  return NOMES_CONSELHO_PARTICIPACAO.includes(
    normalizarNome(nome) as (typeof NOMES_CONSELHO_PARTICIPACAO)[number]
  );
}
