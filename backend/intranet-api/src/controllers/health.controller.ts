import { Request, Response } from "express";
import { oracleExecute } from "../services/oracle.service";

export const healthController = {
  async oracle(_req: Request, res: Response) {
    try {
      const r = await oracleExecute("SELECT 1 AS OK FROM DUAL");
      return res.json({ ok: true, result: r.rows?.[0] ?? null });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? "Erro Oracle" });
    }
  },
};