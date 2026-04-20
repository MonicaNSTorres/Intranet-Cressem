import { Request, Response, NextFunction } from "express";

export function authorizeGroups(allowedGroups: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;
    const user = authReq.user;

    if (!user) {
      return res.status(401).json({
        detail: "Usuário não autenticado.",
      });
    }

    const grupos = Array.isArray(user.grupos) ? user.grupos : [];

    const autorizado = allowedGroups.some((group) => grupos.includes(group));

    if (!autorizado) {
      return res.status(403).json({
        detail: "Acesso negado.",
      });
    }

    next();
  };
}