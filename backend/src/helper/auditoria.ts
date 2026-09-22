import { Request } from "express";

export function getAuditoriaInfo(req: Request) {
  const usuario =
    (req as any).user?.username ||
    (req as any).user?.nome_completo ||
    (req as any).user?.email ||
    "USUARIO_NAO_IDENTIFICADO";

  const tela =
    req.headers.referer ||
    req.headers.origin ||
    req.originalUrl ||
    req.url ||
    "TELA_NAO_IDENTIFICADA";

  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "IP_NAO_IDENTIFICADO";

  return {
    usuario: String(usuario),
    tela: String(tela),
    ip: String(ip),
  };
}