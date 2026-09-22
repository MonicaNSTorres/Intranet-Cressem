export type PerfilTesteSubsidioFuneral = "FINANCEIRO" | "DIRETORIA" | null;

// Troque este valor quando quiser simular outro perfil no fluxo do subsidio funeral.
export const PERFIL_TESTE_SUBSIDIO_FUNERAL: PerfilTesteSubsidioFuneral = null;

const USUARIOS_TESTE = ["MARCELO.BUENO", "MARCELO.BUENO@SICOOB.COM.BR"];

function normalize(value: string | undefined | null) {
  return String(value || "").trim().toUpperCase();
}

export function usuarioEstaNoModoTesteSubsidio(username?: string | null, email?: string | null) {
  if (!PERFIL_TESTE_SUBSIDIO_FUNERAL) return false;

  const usernameNormalizado = normalize(username);
  const emailNormalizado = normalize(email);

  return USUARIOS_TESTE.includes(usernameNormalizado) || USUARIOS_TESTE.includes(emailNormalizado);
}

export function getHeadersPerfilTesteSubsidioFuneral() {
  if (!PERFIL_TESTE_SUBSIDIO_FUNERAL) {
    return {};
  }

  return {
    "x-subsidio-funeral-perfil-teste": PERFIL_TESTE_SUBSIDIO_FUNERAL,
  };
}
