import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";

export const editarNotebookController = {
  async atualizar(req: Request, res: Response) {
    try {
      const id = String(req.params.id || "").trim();

      const {
        NM_NOTEBOOK,
        NM_MODELO,
        DT_INICIO_OPERACAO,
        DT_GARANTIA,
        NR_MAC,
        CD_PATRIMONIO,
        NR_IP,
        NR_BITLOCKER,
        OBS_NOTEBOOKS_SICOOB,
        ID_FUNCIONARIO,
        NM_FUNCIONARIO_TI,
        DESC_SITUACAO,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({
          error: "ID do notebook não informado.",
        });
      }

      if (!NM_NOTEBOOK || !String(NM_NOTEBOOK).trim()) {
        return res.status(400).json({
          error: "O campo NM_NOTEBOOK é obrigatório.",
        });
      }

      const sql = `
        UPDATE DBACRESSEM.NOTEBOOKS_SICOOB
        SET
          NM_NOTEBOOK = :NM_NOTEBOOK,
          NM_MODELO = :NM_MODELO,
          DT_INICIO_OPERACAO = TO_DATE(NULLIF(:DT_INICIO_OPERACAO, ''), 'YYYY-MM-DD'),
          DT_GARANTIA = TO_DATE(NULLIF(:DT_GARANTIA, ''), 'YYYY-MM-DD'),
          NR_MAC = :NR_MAC,
          CD_PATRIMONIO = :CD_PATRIMONIO,
          NR_IP = :NR_IP,
          NR_BITLOCKER = :NR_BITLOCKER,
          OBS_NOTEBOOKS_SICOOB = :OBS_NOTEBOOKS_SICOOB,
          ID_FUNCIONARIO = :ID_FUNCIONARIO,
          NM_FUNCIONARIO_TI = :NM_FUNCIONARIO_TI,
          DESC_SITUACAO = :DESC_SITUACAO
        WHERE ID_NOTEBOOKS_SICOOB = :ID_NOTEBOOKS_SICOOB
      `;

      const result = await oracleExecute(
        sql,
        {
          ID_NOTEBOOKS_SICOOB: Number(id),
          NM_NOTEBOOK: String(NM_NOTEBOOK).trim(),
          NM_MODELO: NM_MODELO ? String(NM_MODELO).trim() : null,
          DT_INICIO_OPERACAO: DT_INICIO_OPERACAO || "",
          DT_GARANTIA: DT_GARANTIA || "",
          NR_MAC: NR_MAC ? String(NR_MAC).trim() : null,
          CD_PATRIMONIO:
            CD_PATRIMONIO !== null &&
            CD_PATRIMONIO !== undefined &&
            String(CD_PATRIMONIO) !== ""
              ? Number(CD_PATRIMONIO)
              : null,
          NR_IP: NR_IP ? String(NR_IP).trim() : null,
          NR_BITLOCKER: NR_BITLOCKER ? String(NR_BITLOCKER).trim() : null,
          OBS_NOTEBOOKS_SICOOB: OBS_NOTEBOOKS_SICOOB
            ? String(OBS_NOTEBOOKS_SICOOB).trim()
            : null,
          ID_FUNCIONARIO:
            ID_FUNCIONARIO !== null &&
            ID_FUNCIONARIO !== undefined &&
            String(ID_FUNCIONARIO) !== ""
              ? Number(ID_FUNCIONARIO)
              : null,
          NM_FUNCIONARIO_TI: NM_FUNCIONARIO_TI
            ? String(NM_FUNCIONARIO_TI).trim()
            : null,
          DESC_SITUACAO: DESC_SITUACAO ? String(DESC_SITUACAO).trim() : null,
        },
        {
          autoCommit: true,
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      if (!result?.rowsAffected || result.rowsAffected < 1) {
        return res.status(404).json({
          error: "Nenhum notebook foi atualizado. Verifique se o ID existe.",
        });
      }

      return res.json({
        success: true,
        message: "Notebook atualizado com sucesso.",
        rowsAffected: result.rowsAffected,
      });
    } catch (err: any) {
      console.error("editar notebook erro:", err);
      return res.status(500).json({
        error: "Falha ao atualizar notebook.",
        details: String(err?.message || err),
      });
    }
  },
};