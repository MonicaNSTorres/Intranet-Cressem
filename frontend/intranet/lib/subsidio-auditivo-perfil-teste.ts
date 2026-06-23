export type PerfilTesteSubsidioAuditivo = "FINANCEIRO" | "DIRETORIA" | null;

// Troque este valor quando quiser simular outro perfil no fluxo do subsidio auditivo.
export const PERFIL_TESTE_SUBSIDIO_AUDITIVO: PerfilTesteSubsidioAuditivo = null;

const USUARIOS_TESTE = ["MARCELO.BUENO", "MARCELO.BUENO@SICOOB.COM.BR"];

function normalize(value: string | undefined | null) {
  return String(value || "").trim().toUpperCase();
}

export function usuarioEstaNoModoTesteSubsidioAuditivo(
  username?: string | null,
  email?: string | null
) {
  if (!PERFIL_TESTE_SUBSIDIO_AUDITIVO) {
    return false;
  }

  const usernameNormalizado = normalize(username);
  const emailNormalizado = normalize(email);

  return (
    USUARIOS_TESTE.includes(usernameNormalizado) ||
    USUARIOS_TESTE.includes(emailNormalizado)
  );
}

export function getHeadersPerfilTesteSubsidioAuditivo() {
  if (!PERFIL_TESTE_SUBSIDIO_AUDITIVO) {
    return {};
  }

  return {
    "x-subsidio-auditivo-perfil-teste": PERFIL_TESTE_SUBSIDIO_AUDITIVO,
  };
}
