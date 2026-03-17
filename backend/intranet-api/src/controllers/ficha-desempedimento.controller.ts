import { Request, Response } from "express";
import oracledb from "oracledb";
import { randomUUID } from "crypto";
import { oracleExecute } from "../services/oracle.service";

function gerarIdCurto(): string {
  return randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase();
}

function normalizarValor(valor: any): number {
  if (valor === null || valor === undefined || valor === "") return 0;

  if (typeof valor === "number") return valor;

  const texto = String(valor).trim();

  // remove separador de milhar e troca vírgula por ponto
  const normalizado = texto.replace(/\./g, "").replace(",", ".");
  const numero = parseFloat(normalizado);

  return isNaN(numero) ? 0 : numero;
}

function calcularTotalNumerico(contas: any[] = []): number {
  return contas.reduce((soma, conta) => soma + normalizarValor(conta?.valor), 0);
}

async function getConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  });
}

export const fichaDesimpedimentoController = {
  async buscarAssociadoPorCpf(req: Request, res: Response) {
    try {
      const cpf = String(req.query.cpf || "").replace(/\D/g, "");

      if (cpf.length !== 11) {
        return res.status(400).json({ error: "CPF inválido. Informe 11 dígitos." });
      }

      const sql = `
        SELECT
          a.NM_CLIENTE AS NOME,
          a.NR_CPF_CNPJ AS CPF,
          a.NR_MATRICULA AS PRONTUARIO,
          a.NM_EMPRESA AS EMPRESA,
          a.DS_ENDERECO AS ENDERECO,
          a.NM_BAIRRO AS NM_BAIRRO,
          a.NM_CIDADE AS NM_CIDADE,
          a.NR_CEP AS NR_CEP,
          a.NR_TELEFONE AS TELEFONE,
          a.DS_EMAIL AS DS_EMAIL
        FROM DBACRESSEM.ASSOCIADO_ANALITICO a
        WHERE REGEXP_REPLACE(a.NR_CPF_CNPJ, '[^0-9]', '') = :cpf
        FETCH FIRST 1 ROWS ONLY
      `;

      const result = await oracleExecute(
        sql,
        { cpf },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0];

      if (!row) {
        return res.status(404).json({ error: "Associado não encontrado." });
      }

      return res.json({
        nome: row.NOME || "",
        cpf: row.CPF || "",
        prontuario: row.PRONTUARIO || "",
        empresa: row.EMPRESA || "",
        endereco: row.ENDERECO || "",
        nm_bairro: row.NM_BAIRRO || "",
        nm_cidade: row.NM_CIDADE || "",
        nr_cep: row.NR_CEP || "",
        telefone: row.TELEFONE || "",
        ds_email: row.DS_EMAIL || "",
      });
    } catch (error: any) {
      console.error("Erro ao buscar associado por CPF:", error);
      return res.status(500).json({
        error: "Erro ao buscar associado por CPF",
        details: error.message,
      });
    }
  },

  async proximoSequencial(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT NVL(MAX(SEQUENCIAL), 9999) + 1 AS SEQUENCIAL
        FROM FICHAS_FINANCEIRAS
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row: any = result.rows?.[0] || {};
      return res.json({ sequencial: Number(row.SEQUENCIAL || 10000) });
    } catch (error: any) {
      console.error("Erro ao buscar próximo sequencial:", error);
      return res.status(500).json({
        error: "Erro ao buscar próximo sequencial",
        details: error.message,
      });
    }
  },

  async listarFichas(_req: Request, res: Response) {
    try {
      const sql = `
        SELECT
          ID_FICHAS,
          TIPO_FICHA,
          NOME,
          CPF,
          PRONTUARIO,
          EMPRESA,
          ENDERECO,
          TELEFONE,
          OBSERVACAO,
          RISCO,
          TEMPO_ASSOCIADO,
          TO_CHAR(DATA_FICHA, 'YYYY-MM-DD') AS DATA_FICHA,
          OBSERVACOES_GERAIS,
          RESPONSAVEL,
          TOTAL_DEBITOS,
          TOTAL_CREDITOS,
          LIQUIDO_DEVEDOR,
          DS_EMAIL,
          NM_BAIRRO,
          NM_CIDADE,
          NR_CEP,
          SEQUENCIAL,
          CREATED_AT
        FROM FICHAS_FINANCEIRAS
        ORDER BY CREATED_AT DESC NULLS LAST, SEQUENCIAL DESC
      `;

      const result = await oracleExecute(
        sql,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao listar fichas:", error);
      return res.status(500).json({
        error: "Erro ao listar fichas",
        details: error.message,
      });
    }
  },

  async listarContasDevedoras(req: Request, res: Response) {
    try {
      const idFicha = String(req.query.idFicha || "");

      if (!idFicha) {
        return res.status(400).json({ error: "Parâmetro idFicha é obrigatório." });
      }

      const sql = `
        SELECT DESCRICAO, VALOR
        FROM CONTAS_DEVEDORAS
        WHERE ID_FICHAS = :idFicha
        ORDER BY DESCRICAO
      `;

      const result = await oracleExecute(
        sql,
        { idFicha },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao listar contas devedoras:", error);
      return res.status(500).json({
        error: "Erro ao listar contas devedoras",
        details: error.message,
      });
    }
  },

  async listarContasCredoras(req: Request, res: Response) {
    try {
      const idFicha = String(req.query.idFicha || "");

      if (!idFicha) {
        return res.status(400).json({ error: "Parâmetro idFicha é obrigatório." });
      }

      const sql = `
        SELECT DESCRICAO, VALOR
        FROM CONTAS_CREDORAS
        WHERE ID_FICHAS = :idFicha
        ORDER BY DESCRICAO
      `;

      const result = await oracleExecute(
        sql,
        { idFicha },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao listar contas credoras:", error);
      return res.status(500).json({
        error: "Erro ao listar contas credoras",
        details: error.message,
      });
    }
  },

  async listarContasBancarias(req: Request, res: Response) {
    try {
      const idFicha = String(req.query.idFicha || "");

      if (!idFicha) {
        return res.status(400).json({ error: "Parâmetro idFicha é obrigatório." });
      }

      const sql = `
        SELECT DESCRICAO, VALOR
        FROM CONTAS_BANCARIAS
        WHERE ID_FICHAS = :idFicha
        ORDER BY DESCRICAO
      `;

      const result = await oracleExecute(
        sql,
        { idFicha },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json(result.rows || []);
    } catch (error: any) {
      console.error("Erro ao listar contas bancárias:", error);
      return res.status(500).json({
        error: "Erro ao listar contas bancárias",
        details: error.message,
      });
    }
  },

  async criarFicha(req: Request, res: Response) {
    let conn: oracledb.Connection | undefined;

    try {
      const body = req.body;

      const {
        tipo,
        nome,
        cpf,
        prontuario,
        empresa,
        endereco,
        telefone,
        observacao,
        risco,
        tempo_associado,
        data_ficha,
        observacoes_gerais,
        responsavel,
        ds_email,
        nm_bairro,
        nm_cidade,
        nr_cep,
        sequencial,
        contasDevedoras = [],
        contasCredoras = [],
        contasBancarias = [],
      } = body;

      const total_debitos = calcularTotalNumerico(contasDevedoras);
      const total_creditos = calcularTotalNumerico(contasCredoras);
      const liquido_devedor = total_debitos - total_creditos;

      conn = await getConnection();

      const idFicha = gerarIdCurto();

      await conn.execute(
        `
          INSERT INTO FICHAS_FINANCEIRAS (
            ID_FICHAS,
            TIPO_FICHA,
            NOME,
            CPF,
            PRONTUARIO,
            EMPRESA,
            ENDERECO,
            TELEFONE,
            OBSERVACAO,
            RISCO,
            TEMPO_ASSOCIADO,
            DATA_FICHA,
            OBSERVACOES_GERAIS,
            RESPONSAVEL,
            TOTAL_DEBITOS,
            TOTAL_CREDITOS,
            LIQUIDO_DEVEDOR,
            DS_EMAIL,
            NM_BAIRRO,
            NM_CIDADE,
            NR_CEP,
            SEQUENCIAL
          ) VALUES (
            :id,
            :tipo,
            :nome,
            :cpf,
            :prontuario,
            :empresa,
            :endereco,
            :telefone,
            :observacao,
            :risco,
            :tempo_associado,
            TO_DATE(:data_ficha, 'YYYY-MM-DD'),
            :observacoes_gerais,
            :responsavel,
            :total_debitos,
            :total_creditos,
            :liquido_devedor,
            :ds_email,
            :nm_bairro,
            :nm_cidade,
            :nr_cep,
            :sequencial
          )
        `,
        {
          id: idFicha,
          tipo: tipo || null,
          nome: nome || null,
          cpf: cpf || null,
          prontuario: prontuario || null,
          empresa: empresa || null,
          endereco: endereco || null,
          telefone: telefone || null,
          observacao: observacao || null,
          risco: risco || null,
          tempo_associado: tempo_associado || null,
          data_ficha: data_ficha || null,
          observacoes_gerais: observacoes_gerais || null,
          responsavel: responsavel || null,
          total_debitos,
          total_creditos,
          liquido_devedor,
          ds_email: ds_email || null,
          nm_bairro: nm_bairro || null,
          nm_cidade: nm_cidade || null,
          nr_cep: nr_cep || null,
          sequencial:
            Number.isFinite(Number(sequencial)) && Number(sequencial) > 0
              ? Number(sequencial)
              : 10000,
        }
      );

      for (const conta of contasDevedoras) {
        await conn.execute(
          `
            INSERT INTO CONTAS_DEVEDORAS (
              ID_CONTAS_DEVEDORAS,
              ID_FICHAS,
              DESCRICAO,
              VALOR
            ) VALUES (
              :id,
              :idFicha,
              :descricao,
              :valor
            )
          `,
          {
            id: gerarIdCurto(),
            idFicha,
            descricao: conta?.descricao || null,
            valor: normalizarValor(conta?.valor),
          }
        );
      }

      for (const conta of contasCredoras) {
        if (!conta?.descricao) continue;

        await conn.execute(
          `
            INSERT INTO CONTAS_CREDORAS (
              ID_CONTAS_CREDORAS,
              ID_FICHAS,
              DESCRICAO,
              VALOR
            ) VALUES (
              :id,
              :idFicha,
              :descricao,
              :valor
            )
          `,
          {
            id: gerarIdCurto(),
            idFicha,
            descricao: conta?.descricao || null,
            valor: normalizarValor(conta?.valor),
          }
        );
      }

      for (const conta of contasBancarias) {
        if (!conta?.descricao) continue;

        await conn.execute(
          `
            INSERT INTO CONTAS_BANCARIAS (
              ID_CONTAS_BANCARIAS,
              ID_FICHAS,
              DESCRICAO,
              VALOR
            ) VALUES (
              :id,
              :idFicha,
              :descricao,
              :valor
            )
          `,
          {
            id: gerarIdCurto(),
            idFicha,
            descricao: conta?.descricao || null,
            valor: normalizarValor(conta?.valor),
          }
        );
      }

      await conn.commit();

      return res.status(201).json({
        success: true,
        id: idFicha,
      });
    } catch (error: any) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {}
      }

      console.error("Erro ao criar ficha:", error);
      return res.status(500).json({
        error: "Erro ao criar ficha",
        details: error.message,
      });
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch {}
      }
    }
  },

  async editarFicha(req: Request, res: Response) {
    let conn: oracledb.Connection | undefined;

    try {
      const body = req.body;

      const {
        id,
        tipo,
        nome,
        cpf,
        prontuario,
        empresa,
        endereco,
        telefone,
        observacao,
        risco,
        tempo_associado,
        data_ficha,
        observacoes_gerais,
        responsavel,
        ds_email,
        nm_bairro,
        nm_cidade,
        nr_cep,
        contasDevedoras = [],
        contasCredoras = [],
        contasBancarias = [],
      } = body;

      if (!id) {
        return res.status(400).json({ error: "ID da ficha é obrigatório." });
      }

      const total_debitos = calcularTotalNumerico(contasDevedoras);
      const total_creditos = calcularTotalNumerico(contasCredoras);
      const liquido_devedor = total_debitos - total_creditos;

      conn = await getConnection();

      await conn.execute(
        `
          UPDATE FICHAS_FINANCEIRAS
          SET
            TIPO_FICHA = :tipo,
            NOME = :nome,
            CPF = :cpf,
            PRONTUARIO = :prontuario,
            EMPRESA = :empresa,
            ENDERECO = :endereco,
            TELEFONE = :telefone,
            OBSERVACAO = :observacao,
            RISCO = :risco,
            TEMPO_ASSOCIADO = :tempo_associado,
            DATA_FICHA = TO_DATE(:data_ficha, 'YYYY-MM-DD'),
            OBSERVACOES_GERAIS = :observacoes_gerais,
            RESPONSAVEL = :responsavel,
            TOTAL_DEBITOS = :total_debitos,
            TOTAL_CREDITOS = :total_creditos,
            LIQUIDO_DEVEDOR = :liquido_devedor,
            DS_EMAIL = :ds_email,
            NM_BAIRRO = :nm_bairro,
            NM_CIDADE = :nm_cidade,
            NR_CEP = :nr_cep
          WHERE ID_FICHAS = :id
        `,
        {
          id,
          tipo: tipo || null,
          nome: nome || null,
          cpf: cpf || null,
          prontuario: prontuario || null,
          empresa: empresa || null,
          endereco: endereco || null,
          telefone: telefone || null,
          observacao: observacao || null,
          risco: risco || null,
          tempo_associado: tempo_associado || null,
          data_ficha: data_ficha || null,
          observacoes_gerais: observacoes_gerais || null,
          responsavel: responsavel || null,
          total_debitos,
          total_creditos,
          liquido_devedor,
          ds_email: ds_email || null,
          nm_bairro: nm_bairro || null,
          nm_cidade: nm_cidade || null,
          nr_cep: nr_cep || null,
        }
      );

      await conn.execute(
        `DELETE FROM CONTAS_DEVEDORAS WHERE ID_FICHAS = :id`,
        { id }
      );
      await conn.execute(
        `DELETE FROM CONTAS_CREDORAS WHERE ID_FICHAS = :id`,
        { id }
      );
      await conn.execute(
        `DELETE FROM CONTAS_BANCARIAS WHERE ID_FICHAS = :id`,
        { id }
      );

      for (const conta of contasDevedoras) {
        await conn.execute(
          `
            INSERT INTO CONTAS_DEVEDORAS (
              ID_CONTAS_DEVEDORAS,
              ID_FICHAS,
              DESCRICAO,
              VALOR
            ) VALUES (
              :idConta,
              :idFicha,
              :descricao,
              :valor
            )
          `,
          {
            idConta: gerarIdCurto(),
            idFicha: id,
            descricao: conta?.descricao || null,
            valor: normalizarValor(conta?.valor),
          }
        );
      }

      for (const conta of contasCredoras) {
        if (!conta?.descricao) continue;

        await conn.execute(
          `
            INSERT INTO CONTAS_CREDORAS (
              ID_CONTAS_CREDORAS,
              ID_FICHAS,
              DESCRICAO,
              VALOR
            ) VALUES (
              :idConta,
              :idFicha,
              :descricao,
              :valor
            )
          `,
          {
            idConta: gerarIdCurto(),
            idFicha: id,
            descricao: conta?.descricao || null,
            valor: normalizarValor(conta?.valor),
          }
        );
      }

      for (const conta of contasBancarias) {
        if (!conta?.descricao) continue;

        await conn.execute(
          `
            INSERT INTO CONTAS_BANCARIAS (
              ID_CONTAS_BANCARIAS,
              ID_FICHAS,
              DESCRICAO,
              VALOR
            ) VALUES (
              :idConta,
              :idFicha,
              :descricao,
              :valor
            )
          `,
          {
            idConta: gerarIdCurto(),
            idFicha: id,
            descricao: conta?.descricao || null,
            valor: normalizarValor(conta?.valor),
          }
        );
      }

      await conn.commit();

      return res.json({ success: true });
    } catch (error: any) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {}
      }

      console.error("Erro ao editar ficha:", error);
      return res.status(500).json({
        error: "Erro ao editar ficha",
        details: error.message,
      });
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch {}
      }
    }
  },

  async excluirFicha(req: Request, res: Response) {
    let conn: oracledb.Connection | undefined;

    try {
      const id = String(req.query.id || "");

      if (!id) {
        return res.status(400).json({ error: "ID da ficha não informado." });
      }

      conn = await getConnection();

      await conn.execute(
        `DELETE FROM CONTAS_DEVEDORAS WHERE ID_FICHAS = :id`,
        { id }
      );
      await conn.execute(
        `DELETE FROM CONTAS_CREDORAS WHERE ID_FICHAS = :id`,
        { id }
      );
      await conn.execute(
        `DELETE FROM CONTAS_BANCARIAS WHERE ID_FICHAS = :id`,
        { id }
      );
      await conn.execute(
        `DELETE FROM FICHAS_FINANCEIRAS WHERE ID_FICHAS = :id`,
        { id }
      );

      await conn.commit();

      return res.json({ success: true });
    } catch (error: any) {
      if (conn) {
        try {
          await conn.rollback();
        } catch {}
      }

      console.error("Erro ao excluir ficha:", error);
      return res.status(500).json({
        error: "Erro ao excluir ficha",
        details: error.message,
      });
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch {}
      }
    }
  },
};