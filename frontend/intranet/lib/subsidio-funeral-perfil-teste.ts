export type PerfilTesteSubsidioFuneral = "FINANCEIRO" | "DIRETORIA" | null;

// Troque este valor quando quiser simular outro perfil no fluxo do subsidio funeral.
export const PERFIL_TESTE_SUBSIDIO_FUNERAL: PerfilTesteSubsidioFuneral = null;

const USUARIOS_TESTE = ["MARCELO.BUENO", "MARCELO.BUENO@SICOOB.COM.BR"];

function normalize(value: string | undefined | null) {
  return String(value || "").trim().toUpperCase();
}

export function usuarioEstaNoModoTesteSubsidio(username?: string | null, email?: string | null) {
  const usernameNormalizado = normalize(username);
  const emailNormalizado = normalize(email);

  return USUARIOS_TESTE.includes(usernameNormalizado) || USUARIOS_TESTE.includes(emailNormalizado);
}
