import { Request, Response } from "express";
import oracledb from "oracledb";
import { oracleExecute } from "../services/oracle.service";
import { sendEmail } from "../services/email.service"; // ajuste o caminho se o nome do arquivo for diferente

function somenteNumeros(valor: string) {
  return String(valor || "").replace(/\D/g, "");
}


function montarEmailConvenioHtml(cpfTitular: string, pessoas: any[]) {
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
    <p>CPF do titular: <b>${cpfTitular}</b></p>
    <p>Total desativados: <b>${pessoas.length}</b></p>

    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
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
      const cpf = somenteNumeros(String(req.params.cpf || ""));

      if (!cpf) {
        return res.status(400).json({
          error: "CPF não informado",
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
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ,'[^0-9]','') = :cpf
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { cpf },
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
      const cpf = somenteNumeros(String(req.params.cpf || ""));

      if (!cpf) {
        return res.status(400).json({
          error: "CPF não informado",
        });
      }

      const sql = `
      SELECT
        p.ID_CONVENIO_PESSOAS,
        p.NM_USUARIO,
        p.NR_CPF_USUARIO,
        p.NR_CPF_TITULAR,
        p.DESC_PARENTESCO,
        p.SN_ATIVO,
        NVL(f.VL_AJUSTE, 0) AS VL_AJUSTE
      FROM DBACRESSEM.CONVENIO_PESSOAS p
      LEFT JOIN DBACRESSEM.CONVENIO_FATOR_AJUSTE f
        ON f.ID_CONVENIO_FATOR_AJUSTE = p.ID_CONVENIO_FATOR_AJUSTE
      WHERE p.SN_ATIVO = 1
        AND (
          REGEXP_REPLACE(p.NR_CPF_TITULAR, '[^0-9]', '') = :cpf
          OR REGEXP_REPLACE(p.NR_CPF_USUARIO, '[^0-9]', '') = :cpf
        )
    `;

      const result = await oracleExecute(
        sql,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const pessoas: any[] = result.rows || [];

      if (!pessoas.length) {
        return res.status(404).json({
          error: "Convênio odontológico não encontrado",
        });
      }

      // verifica se o cpf pesquisado é titular
      const ehTitular = pessoas.some(
        (p) =>
          somenteNumeros(p.NR_CPF_TITULAR) === cpf &&
          somenteNumeros(p.NR_CPF_USUARIO) === cpf
      );

      let totalCusto = 0;

      // somente titular mostra valor
      if (ehTitular) {
        totalCusto = pessoas.reduce(
          (total, pessoa) =>
            total + Number(pessoa.VL_AJUSTE || 0),
          0
        );
      }

      return res.json({
        titular_ativo: true,
        eh_titular: ehTitular,
        total_custo: totalCusto,
        pessoas,
      });

    } catch (error: any) {

      console.error("Erro ao buscar convênio demissão:", error);

      return res.status(500).json({
        error: "Erro ao consultar convênio odontológico",
        details: error.message,
      });
    }
  },

  async desativarConvenio(req: Request, res: Response) {
    try {
      const cpf = somenteNumeros(String(req.params.cpf || ""));
      const atendente = String(req.body?.atendente || "Atendente");

      if (!cpf) {
        return res.status(400).json({
          error: "CPF não informado",
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
            REGEXP_REPLACE(p.NR_CPF_TITULAR, '[^0-9]', '') = :cpf
            OR REGEXP_REPLACE(p.NR_CPF_USUARIO, '[^0-9]', '') = :cpf
          )
      `;

      const busca = await oracleExecute(
        buscarSql,
        { cpf },
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

      const cpfTitular =
        pessoas.find((p) => p.NR_CPF_TITULAR)?.NR_CPF_TITULAR || cpf;

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

      await oracleExecute(updateSql, binds, {
        autoCommit: true,
      });

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

      const assunto = `[Odonto] Desativação via Demissão concluída - CPF Titular ${cpfTitular}`;

      const html = montarEmailConvenioHtml(cpfTitular, pessoasComExclusao);

      await sendEmail(destinatarios, assunto, html);

      return res.json({
        desativados: pessoasComExclusao.length,
        email_enviado: true,
        atendente,
        cpf_titular: cpfTitular,
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
