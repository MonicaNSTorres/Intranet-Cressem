export const VALORES_INTEGRALIZACAO = [
  { nivel: "1", valor: "27,32" },
  { nivel: "2", valor: "36,54" },
  { nivel: "3", valor: "51,09" },
  { nivel: "4", valor: "82,37" },
  { nivel: "5", valor: "111,47" },
  { nivel: "6", valor: "140,53" },
  { nivel: "7", valor: "162,28" },
  { nivel: "8", valor: "221,95" },
  { nivel: "9", valor: "256,13" },
  { nivel: "10", valor: "303,41" },
  { nivel: "11", valor: "383,00" },
  { nivel: "12", valor: "523,17" },
  { nivel: "13", valor: "628,27" },
  { nivel: "14", valor: "837,11" },
  { nivel: "15", valor: "1.149,49" },
];

export function valorIntegralizacaoComMoeda(valor: string) {
  return `R$ ${valor}`;
}
