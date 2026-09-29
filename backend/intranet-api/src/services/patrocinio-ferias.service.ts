import oracledb from "oracledb";

import { enviarEmailMarketingPatrocinio } from "../controllers/email.controller";
import { oracleExecute, oracleExecuteCommit } from "./oracle.service";

type PatrocinioPendenteComGerenteEmFerias = {
  ID_PATROCINIO: number;
  NM_GERENTE: string;
  DT_FERIAS_INICIO: string;
  DT_FERIAS_FIM: string;
};

export async function encaminharPatrociniosDeGerentesEmFerias() {
  const pendentesResult = await oracleExecute(
    `
      SELECT
        p.ID_PATROCINIO,
        gestor.NM_FUNCIONARIO AS NM_GERENTE,
        TO_CHAR(ferias.DT_DIA_INICIO, 'DD/MM/YYYY') AS DT_FERIAS_INICIO,
        TO_CHAR(ferias.DT_DIA_FIM, 'DD/MM/YYYY') AS DT_FERIAS_FIM
      FROM DBACRESSEM.PATROCINIO p
      JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM solicitante
        ON UPPER(TRIM(solicitante.NM_FUNCIONARIO)) = UPPER(TRIM(p.NM_FUNCIONARIO))
      JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM gestor
        ON gestor.ID_FUNCIONARIO = solicitante.CD_GERENCIA
      JOIN DBACRESSEM.FERIAS_FUNCIONARIOS ferias
        ON ferias.ID_FUNCIONARIO = gestor.ID_FUNCIONARIO
       AND TRUNC(SYSDATE) BETWEEN TRUNC(ferias.DT_DIA_INICIO) AND TRUNC(ferias.DT_DIA_FIM)
      WHERE UPPER(TRIM(p.NM_ANDAMENTO)) = 'PENDENTE GERENCIA'
      ORDER BY p.ID_PATROCINIO
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const pendentes = (pendentesResult.rows || []) as PatrocinioPendenteComGerenteEmFerias[];
  let encaminhados = 0;
  let emailsEnviados = 0;
  const errosEmail: Array<{ id: number; erro: string }> = [];

  for (const pendente of pendentes) {
    const updateResult = await oracleExecuteCommit(
      `
        UPDATE DBACRESSEM.PATROCINIO
           SET NM_ANDAMENTO = 'Pendente Marketing'
         WHERE ID_PATROCINIO = :id
           AND UPPER(TRIM(NM_ANDAMENTO)) = 'PENDENTE GERENCIA'
      `,
      { id: pendente.ID_PATROCINIO }
    );

    if (!updateResult.rowsAffected) continue;

    encaminhados += 1;

    try {
      await enviarEmailMarketingPatrocinio(pendente.ID_PATROCINIO, {
        gerente: String(pendente.NM_GERENTE || "Gerência"),
        inicio: String(pendente.DT_FERIAS_INICIO || ""),
        fim: String(pendente.DT_FERIAS_FIM || ""),
      });
      emailsEnviados += 1;
    } catch (error: any) {
      const erro = String(error?.message || error);
      errosEmail.push({ id: pendente.ID_PATROCINIO, erro });
      console.error(
        `[PATROCÍNIO/FÉRIAS] Solicitação ${pendente.ID_PATROCINIO} encaminhada ao Marketing, mas o e-mail falhou:`,
        error
      );
    }
  }

  return {
    encontrados: pendentes.length,
    encaminhados,
    emailsEnviados,
    errosEmail,
  };
}
