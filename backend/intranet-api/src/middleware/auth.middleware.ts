import { Request, Response, NextFunction } from "express";
import jwt, { Secret } from "jsonwebtoken";

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "4d38b779b34fd8ed1153eb6a1ad00f6b";

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    nome_completo?: string;
    department?: string;
    physicalDeliveryOfficeName?: string;
    grupos?: string[];
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    let token = cookieToken || "";

    if (!token && authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }

    if (!token) {
      return res.status(401).json({
        detail: "Não autenticado.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest["user"];

    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      detail: "Token inválido ou expirado.",
    });
  }
}