import enderecos from "@/data/enderecosPostos.json";

export function getEnderecoPorPosto(office?: string) {
  if (!office) return "";

  return enderecos[office as keyof typeof enderecos] || "";
}