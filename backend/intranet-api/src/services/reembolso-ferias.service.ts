import oracledb from "oracledb";

import { getOraclePool } from "../config/oracle.pool";
import { enviarEmailPendenciaProximoAprovador } from "../controllers/solicitacao-reembolso-despesa.controller";

type EtapaReembolsoPendente = "Pendente Gerencia" | "Pendente Gerencia Superior";

type ReembolsoPendenteComAprovadorEmFerias = {
  ID_SOLICITACAO_REEMBOLSO_DESPESA: number;
  DESC_ANDAMENTO: EtapaReembolsoPendente;
  ID_APROV_GERENCIA: number | null;
  ID_APROV_GERENCIA_SUP: number | null;
  ID_APROV_DIRETORIA: number | null;
  NM_APROVADOR_EM_FERIAS: string;
  DT_FERIAS_INICIO: string;
  DT_FERIAS_FIM: string;
};

type ProximaEtapaReembolso = {
  andamento: "Pendente Gerencia Superior" | "Pendente Diretoria";
  idAprovador: number;
};

async function estaDeFeriasHoje(connection: oracledb.Connection, idFuncionario: number) {
  const result = await connection.execute(
    `
      SELECT 1
      FROM DBACRESSEM.FERIAS_FUNCIONARIOS ferias
      WHERE ferias.ID_FUNCIONARIO = :idFuncionario
        AND TRUNC(SYSDATE) BETWEEN TRUNC(ferias.DT_DIA_INICIO) AND TRUNC(ferias.DT_DIA_FIM)
        AND NVL(ferias.SN_EFETUADO, 0) <> 1
      FETCH FIRST 1 ROWS ONLY
    `,
    { idFuncionario },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return Boolean(result.rows?.length);
}

async function obterProximaEtapaDisponivel(
  connection: oracledb.Connection,
  reembolso: ReembolsoPendenteComAprovadorEmFerias
): Promise<ProximaEtapaReembolso | null> {
  const candidatos =
    reembolso.DESC_ANDAMENTO === "Pendente Gerencia"
      ? [
          {
            andamento: "Pendente Gerencia Superior" as const,
            idAprovador: Number(reembolso.ID_APROV_GERENCIA_SUP || 0),
          },
          {
            andamento: "Pendente Diretoria" as const,
            idAprovador: Number(reembolso.ID_APROV_DIRETORIA || 0),
          },
        ]
      : [
          {
            andamento: "Pendente Diretoria" as const,
            idAprovador: Number(reembolso.ID_APROV_DIRETORIA || 0),
          },
        ];

  for (const candidato of candidatos) {
    if (!candidato.idAprovador) continue;

    if (!(await estaDeFeriasHoje(connection, candidato.idAprovador))) {
      return candidato;
    }
  }

  return null;
}

export async function encaminharReembolsosDeAprovadoresEmFerias() {
  const connection = await getOraclePool().getConnection();
  const resumo = {
    encontrados: 0,
    encaminhados: 0,
    semProximoAprovadorDisponivel: 0,
    emailsEnviados: 0,
    errosEmail: [] as Array<{ id: number; erro: string }>,
  };

  try {
    const result = await connection.execute(
      `
        SELECT
          solicitacao.ID_SOLICITACAO_REEMBOLSO_DESPESA,
          solicitacao.DESC_ANDAMENTO,
          solicitacao.ID_APROV_GERENCIA,
          solicitacao.ID_APROV_GERENCIA_SUP,
          solicitacao.ID_APROV_DIRETORIA,
          aprovador.NM_FUNCIONARIO AS NM_APROVADOR_EM_FERIAS,
          TO_CHAR(ferias.DT_DIA_INICIO, 'DD/MM/YYYY') AS DT_FERIAS_INICIO,
          TO_CHAR(ferias.DT_DIA_FIM, 'DD/MM/YYYY') AS DT_FERIAS_FIM
        FROM DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA solicitacao
        INNER JOIN DBACRESSEM.FERIAS_FUNCIONARIOS ferias
          ON ferias.ID_FUNCIONARIO = CASE
            WHEN solicitacao.DESC_ANDAMENTO = 'Pendente Gerencia' THEN solicitacao.ID_APROV_GERENCIA
            WHEN solicitacao.DESC_ANDAMENTO = 'Pendente Gerencia Superior' THEN solicitacao.ID_APROV_GERENCIA_SUP
          END
         AND TRUNC(SYSDATE) BETWEEN TRUNC(ferias.DT_DIA_INICIO) AND TRUNC(ferias.DT_DIA_FIM)
         AND NVL(ferias.SN_EFETUADO, 0) <> 1
        LEFT JOIN DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM aprovador
          ON aprovador.ID_FUNCIONARIO = ferias.ID_FUNCIONARIO
        WHERE solicitacao.DESC_ANDAMENTO IN ('Pendente Gerencia', 'Pendente Gerencia Superior')
        ORDER BY solicitacao.ID_SOLICITACAO_REEMBOLSO_DESPESA
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const reembolsos = (result.rows || []) as ReembolsoPendenteComAprovadorEmFerias[];
    resumo.encontrados = reembolsos.length;

    for (const reembolso of reembolsos) {
      const proximaEtapa = await obterProximaEtapaDisponivel(connection, reembolso);

      if (!proximaEtapa) {
        resumo.semProximoAprovadorDisponivel += 1;
        continue;
      }

      const updateResult = await connection.execute(
        `
          UPDATE DBACRESSEM.SOLICITACAO_REEMBOLSO_DESPESA
             SET DESC_ANDAMENTO = :proximoAndamento
           WHERE ID_SOLICITACAO_REEMBOLSO_DESPESA = :id
             AND DESC_ANDAMENTO = :andamentoAtual
        `,
        {
          id: Number(reembolso.ID_SOLICITACAO_REEMBOLSO_DESPESA),
          andamentoAtual: reembolso.DESC_ANDAMENTO,
          proximoAndamento: proximaEtapa.andamento,
        }
      );

      if (!updateResult.rowsAffected) continue;

      await connection.commit();
      resumo.encaminhados += 1;

      try {
        await enviarEmailPendenciaProximoAprovador(connection, {
          idSolicitacao: Number(reembolso.ID_SOLICITACAO_REEMBOLSO_DESPESA),
          etapaAtual: proximaEtapa.andamento,
          idAprovGerencia: Number(reembolso.ID_APROV_GERENCIA || 0),
          idAprovGerenciaSup: Number(reembolso.ID_APROV_GERENCIA_SUP || 0),
          idAprovDiretoria: Number(reembolso.ID_APROV_DIRETORIA || 0),
          introducao: `O encaminhamento foi realizado automaticamente porque ${String(reembolso.NM_APROVADOR_EM_FERIAS || "o aprovador responsável").trim()} está de férias de ${String(reembolso.DT_FERIAS_INICIO || "-").trim()} a ${String(reembolso.DT_FERIAS_FIM || "-").trim()}. A solicitação aguarda sua análise na etapa "${proximaEtapa.andamento}".`,
        });
        resumo.emailsEnviados += 1;
      } catch (error: any) {
        const erro = String(error?.message || error);
        resumo.errosEmail.push({
          id: Number(reembolso.ID_SOLICITACAO_REEMBOLSO_DESPESA),
          erro,
        });
        console.error(
          `[REEMBOLSO/FÉRIAS] Solicitação ${reembolso.ID_SOLICITACAO_REEMBOLSO_DESPESA} encaminhada, mas o e-mail falhou:`,
          error
        );
      }
    }

    return resumo;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    await connection.close();
  }
}
