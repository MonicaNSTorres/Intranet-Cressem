import { Request, Response } from "express";
import oracledb from "oracledb";
import {
  oracleExecute,
  oracleExecuteCommitWithAudit,
} from "../services/oracle.service";
import { sendEmail } from "../services/email.service";

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}


function documentoValido(documento: string) {
  return documento.length === 11 || documento.length === 14;
}

function montarEmailConvenioHtml(documentoTitular: string, pessoas: any[]) {
  const linhas = pessoas
    .map(
      (p) => `
        <tr>
          <td>${p.NM_USUARIO || ""}</td>
          <td>${p.NR_CPF_USUARIO || ""}</td>
          <td>${p.DESC_PARENTESCO || p.NM_PARENTESCO || ""}</td>
          <td>${p.DT_EXCLUSAO || ""}</td>
        </tr>
      `
    )
    .join("");

  return `
    <h3>Desativação realizada via formulário de Demissão</h3>
    <p>CPF/CNPJ do titular: <b>${documentoTitular}</b></p>
    <p>Total desativados: <b>${pessoas.length}</b></p>

    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF/CNPJ</th>
          <th>Parentesco</th>
          <th>Data Exclusão</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `;
}

export const demissaoController = {
  async buscarAssociado(req: Request, res: Response) {
    try {
      const documento = somenteNumeros(String(req.params.cpf || ""));

      if (!documentoValido(documento)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido ou não informado",
        });
      }

      const sql = `
        SELECT
          a.NM_CLIENTE AS NOME,
          a.NR_MATRICULA AS MATRICULA,
          a.NM_EMPRESA AS EMPRESA,
          a.NM_CIDADE AS CIDADE,
          a.NR_TELEFONE AS TELEFONE,
          a.SL_CONTA_CAPITAL AS SL_CONTA_CAPITAL
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ,'[^0-9]','') = :documento
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { documento },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({
          error: "Associado não encontrado",
        });
      }

      return res.json(row);
    } catch (error: any) {
      console.error("Erro ao buscar associado demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar associado",
        details: error.message,
      });
    }
  },

  async buscarConvenio(req: Request, res: Response) {
    try {
      const documento = somenteNumeros(
        String(req.params.cpf || "")
      );

      if (!documentoValido(documento)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido ou não informado",
        });
      }

      const ativoSql = `
      SELECT
        B.ID_BENEFICIARIO,
        B.NM_BENEFICIARIO,
        B.NR_CPF,
        B.ID_TITULAR,
        B.DT_INCLUSAO_PLANO,
        B.DT_EXCLUSAO_PLANO,

        TB.CD_TIPO_BENEFICIARIO,
        TB.NM_TIPO_BENEFICIARIO,

        P.ID_PLANO,
        P.NM_PLANO,
        P.TP_COBRANCA,

        O.ID_OPERADORA,
        O.NM_OPERADORA,

        PV.ID_PLANO_VALOR,
        PV.VL_MENSALIDADE,
        PV.DT_VIGENCIA_INICIO,
        PV.DT_VIGENCIA_FIM

      FROM DBACRESSEM.ODONTO_BENEFICIARIO B

      INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
        ON TB.ID_TIPO_BENEFICIARIO =
           B.ID_TIPO_BENEFICIARIO

      INNER JOIN DBACRESSEM.ODONTO_PLANO P
        ON P.ID_PLANO =
           B.ID_PLANO

      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
        ON O.ID_OPERADORA =
           P.ID_OPERADORA

      LEFT JOIN DBACRESSEM.ODONTO_PLANO_VALOR PV
        ON PV.ID_PLANO =
           P.ID_PLANO

       AND TRUNC(SYSDATE) >=
           TRUNC(PV.DT_VIGENCIA_INICIO)

       AND (
         PV.DT_VIGENCIA_FIM IS NULL
         OR SYSDATE <= PV.DT_VIGENCIA_FIM
       )

      WHERE REGEXP_REPLACE(
        B.NR_CPF,
        '[^0-9]',
        ''
      ) = :documento

        AND B.SN_ATIVO = 1
        AND P.SN_ATIVO = 1
        AND O.SN_ATIVO = 1

      FETCH FIRST 1 ROWS ONLY
    `;

      const ativoResult = await oracleExecute(
        ativoSql,
        { documento },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      );

      const ativo: any =
        ativoResult.rows?.[0];

      if (ativo) {
        const ehTitular =
          ativo.CD_TIPO_BENEFICIARIO ===
          "TITULAR";

        return res.json({
          situacao: "ATIVO",

          titular_ativo: true,

          eh_titular: ehTitular,

          total_custo:
            Number(
              ativo.VL_MENSALIDADE || 0
            ),

          idBeneficiario:
            ativo.ID_BENEFICIARIO,

          tipoBeneficiario:
            ativo.CD_TIPO_BENEFICIARIO,

          nomeTipoBeneficiario:
            ativo.NM_TIPO_BENEFICIARIO,

          idOperadora:
            ativo.ID_OPERADORA,

          operadora:
            ativo.NM_OPERADORA,

          idPlano:
            ativo.ID_PLANO,

          plano:
            ativo.NM_PLANO,

          tipoCobranca:
            ativo.TP_COBRANCA,

          valorMensalidade:
            Number(
              ativo.VL_MENSALIDADE || 0
            ),

          dataInicioVigenciaValor:
            ativo.DT_VIGENCIA_INICIO,

          dataFimVigenciaValor:
            ativo.DT_VIGENCIA_FIM,
        });
      }

      const historicoSql = `
      SELECT
        B.ID_BENEFICIARIO,
        B.NM_BENEFICIARIO,
        B.NR_CPF,
        B.DT_INCLUSAO_PLANO,
        B.DT_EXCLUSAO_PLANO,

        TB.CD_TIPO_BENEFICIARIO,
        TB.NM_TIPO_BENEFICIARIO,

        P.ID_PLANO,
        P.NM_PLANO,
        P.TP_COBRANCA,

        O.ID_OPERADORA,
        O.NM_OPERADORA

      FROM DBACRESSEM.ODONTO_BENEFICIARIO B

      INNER JOIN DBACRESSEM.ODONTO_TIPO_BENEFICIARIO TB
        ON TB.ID_TIPO_BENEFICIARIO =
           B.ID_TIPO_BENEFICIARIO

      INNER JOIN DBACRESSEM.ODONTO_PLANO P
        ON P.ID_PLANO =
           B.ID_PLANO

      INNER JOIN DBACRESSEM.ODONTO_OPERADORA O
        ON O.ID_OPERADORA =
           P.ID_OPERADORA

      WHERE REGEXP_REPLACE(
        B.NR_CPF,
        '[^0-9]',
        ''
      ) = :documento

        AND B.SN_ATIVO = 0

      ORDER BY
        B.DT_EXCLUSAO_PLANO DESC NULLS LAST,
        B.ID_BENEFICIARIO DESC

      FETCH FIRST 1 ROWS ONLY
    `;

      const historicoResult =
        await oracleExecute(
          historicoSql,
          { documento },
          {
            outFormat:
              oracledb.OUT_FORMAT_OBJECT,
          }
        );

      const historico: any =
        historicoResult.rows?.[0];

      if (historico) {
        return res.json({
          situacao: "INATIVO",

          titular_ativo: false,

          total_custo: 0,

          idBeneficiario:
            historico.ID_BENEFICIARIO,

          tipoBeneficiario:
            historico.CD_TIPO_BENEFICIARIO,

          nomeTipoBeneficiario:
            historico.NM_TIPO_BENEFICIARIO,

          operadora:
            historico.NM_OPERADORA,

          plano:
            historico.NM_PLANO,

          tipoCobranca:
            historico.TP_COBRANCA,

          dataInclusaoPlano:
            historico.DT_INCLUSAO_PLANO,

          dataExclusaoPlano:
            historico.DT_EXCLUSAO_PLANO,
        });
      }

      return res.json({
        situacao: "NAO_ENCONTRADO",
        titular_ativo: false,
        total_custo: 0,
      });
    } catch (error: any) {
      console.error(
        "Erro ao buscar convênio demissão:",
        error
      );

      return res.status(500).json({
        error:
          "Erro ao consultar convênio odontológico",
        details:
          error.message,
      });
    }
  },

  async desativarConvenio(req: Request, res: Response) {
    try {
      const documento = somenteNumeros(String(req.params.cpf || ""));
      const atendente = String(req.body?.atendente || "Atendente");

      if (!documentoValido(documento)) {
        return res.status(400).json({
          error: "CPF/CNPJ inválido ou não informado",
        });
      }

      const buscarSql = `
        SELECT
          p.ID_CONVENIO_PESSOAS,
          p.NM_USUARIO,
          p.NR_CPF_USUARIO,
          p.NR_CPF_TITULAR,
          p.DESC_PARENTESCO
        FROM DBACRESSEM.CONVENIO_PESSOAS p
        WHERE p.SN_ATIVO = 1
          AND (
            REGEXP_REPLACE(p.NR_CPF_TITULAR, '[^0-9]', '') = :documento
            OR REGEXP_REPLACE(p.NR_CPF_USUARIO, '[^0-9]', '') = :documento
          )
      `;

      const busca = await oracleExecute(
        buscarSql,
        { documento },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const pessoas: any[] = busca.rows || [];

      if (!pessoas.length) {
        return res.status(404).json({
          error: "Nenhum convênio ativo encontrado para desativação.",
          desativados: 0,
          email_enviado: false,
        });
      }

      const documentoTitular =
        pessoas.find((p) => p.NR_CPF_TITULAR)?.NR_CPF_TITULAR || documento;

      const ids = pessoas.map((p) => p.ID_CONVENIO_PESSOAS);

      const updateSql = `
        UPDATE DBACRESSEM.CONVENIO_PESSOAS
        SET
          SN_ATIVO = 0,
          DT_EXCLUSAO = SYSDATE,
          NM_ATENDENTE_EDICAO = :atendente
        WHERE ID_CONVENIO_PESSOAS IN (${ids.map((_, i) => `:id${i}`).join(",")})
      `;

      const binds: any = { atendente };

      ids.forEach((id, index) => {
        binds[`id${index}`] = id;
      });

      await oracleExecuteCommitWithAudit(
        req,
        updateSql,
        binds,
        {} as any
      );

      const pessoasComExclusao = pessoas.map((p) => ({
        ...p,
        DT_EXCLUSAO: new Date().toLocaleDateString("pt-BR"),
      }));

      const destinatarios = [
        "lucio.guska@sicoob.com.br",
        "cleandiza.santos@sicoob.com.br",
        "diego.adriano@sicoob.com.br",
        "cadastro.cressem@sicoob.com.br",
        "misael.oliveira@sicoob.com.br",
        "marcelo.bueno@sicoob.com.br",
        "monica.torres@sicoob.com.br",
      ];

      const assunto = `[Odonto] Desativação via Demissão concluída - CPF/CNPJ Titular ${documentoTitular}`;

      const html = montarEmailConvenioHtml(documentoTitular, pessoasComExclusao);

      await sendEmail(destinatarios, assunto, html);

      return res.json({
        desativados: pessoasComExclusao.length,
        email_enviado: true,
        atendente,
        cpf_titular: documentoTitular,
        pessoas: pessoasComExclusao,
      });
    } catch (error: any) {
      console.error("Erro ao desativar convênio demissão:", error);

      return res.status(500).json({
        error: "Erro ao desativar convênio odontológico",
        details: error.message,
        email_enviado: false,
      });
    }
  },

  async buscarMotivos(req: Request, res: Response) {
    try {
      const sql = `
      SELECT
        NM_MOTIVO AS VALUE,
        NM_MOTIVO AS LABEL
      FROM DBACRESSEM.MOTIVO_DEMISSAO
      WHERE SN_ATIVO = 1
      ORDER BY NM_MOTIVO
    `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao buscar motivos demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar motivos da demissão",
        details: error.message,
      });
    }
  },

  async buscarCidades(req: Request, res: Response) {
    try {
      const sql = `
      SELECT
        NM_CIDADE AS VALUE,
        NM_CIDADE AS LABEL
      FROM DBACRESSEM.CIDADES
      ORDER BY NM_CIDADE
    `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao buscar cidades demissão:", error);

      return res.status(500).json({
        error: "Erro ao buscar cidades",
        details: error.message,
      });
    }
  },
};
