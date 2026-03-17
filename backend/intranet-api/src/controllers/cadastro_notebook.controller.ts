import { Request, Response } from "express";
import { oracleExecute } from "../services/oracle.service";

export const cadastroNotebookController = {
  async criar(req: Request, res: Response) {
    try {
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

      if (!NM_NOTEBOOK || !String(NM_NOTEBOOK).trim()) {
        return res.status(400).json({
          error: "O campo NM_NOTEBOOK é obrigatório.",
        });
      }

      const sql = `
        INSERT INTO DBACRESSEM.NOTEBOOKS_SICOOB (
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
          DESC_SITUACAO
        ) VALUES (
          :NM_NOTEBOOK,
          :NM_MODELO,
          TO_DATE(NULLIF(:DT_INICIO_OPERACAO, ''), 'YYYY-MM-DD'),
          TO_DATE(NULLIF(:DT_GARANTIA, ''), 'YYYY-MM-DD'),
          :NR_MAC,
          :CD_PATRIMONIO,
          :NR_IP,
          :NR_BITLOCKER,
          :OBS_NOTEBOOKS_SICOOB,
          :ID_FUNCIONARIO,
          :NM_FUNCIONARIO_TI,
          :DESC_SITUACAO
        )
      `;

      await oracleExecute(
        sql,
        {
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
        { autoCommit: true }
      );

      return res.status(201).json({
        success: true,
        message: "Notebook cadastrado com sucesso.",
      });
    } catch (err: any) {
      console.error("cadastro notebook erro:", err);

      return res.status(500).json({
        error: "Falha ao cadastrar notebook.",
        details: String(err?.message || err),
      });
    }
  },
};