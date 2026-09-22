import { Request, Response } from "express";
import oracledb from "oracledb";
import {
  oracleExecute,
  oracleExecuteCommitWithAudit,
} from "../services/oracle.service";

type OrientacaoImagem = "HORIZONTAL" | "VERTICAL" | "QUADRADA";
type StatusSN = "S" | "N";

const MIME_TYPES_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const LIMITE_MAXIMO_BYTES = 20 * 1024 * 1024;

function somenteSN(valor: unknown, padrao: StatusSN = "N"): StatusSN {
  return String(valor ?? padrao).toUpperCase() === "S" ? "S" : "N";
}

function textoOuNull(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  return texto ? texto : null;
}

function numeroInteiroOuNull(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return null;
  }

  return numero;
}

function normalizarOrientacao(valor: unknown): OrientacaoImagem | null {
  const orientacao = String(valor ?? "").trim().toUpperCase();

  if (
    orientacao === "HORIZONTAL" ||
    orientacao === "VERTICAL" ||
    orientacao === "QUADRADA"
  ) {
    return orientacao;
  }

  return null;
}

function normalizarData(valor: unknown): string | null {
  const data = String(valor ?? "").trim();

  if (!data) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return null;
  }

  return data;
}

function obterExtensao(nomeArquivo: string): string | null {
  const partes = nomeArquivo.split(".");

  if (partes.length < 2) {
    return null;
  }

  const extensao = partes.pop()?.trim().toLowerCase();

  return extensao ? extensao.slice(0, 20) : null;
}

function obterUsuario(req: Request): string {
  const usuario = (req as any).user || {};

  return String(
    usuario.sub ||
      usuario.username ||
      usuario.login ||
      usuario.email ||
      "sistema"
  );
}

function obterNomeUsuario(req: Request): string | null {
  const usuario = (req as any).user || {};

  return textoOuNull(
    usuario.nome_completo ||
      usuario.nome ||
      usuario.displayName ||
      usuario.email
  );
}

function obterIp(req: Request): string | null {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  return textoOuNull(req.ip || req.socket?.remoteAddress);
}

function validarArquivo(
  arquivo: Express.Multer.File | undefined
): string | null {
  if (!arquivo) {
    return "Selecione uma imagem.";
  }

  if (!MIME_TYPES_PERMITIDOS.has(arquivo.mimetype)) {
    return "Formato não permitido. Utilize PNG, JPG, JPEG, WebP ou GIF.";
  }

  if (!arquivo.buffer?.length) {
    return "O arquivo enviado está vazio.";
  }

  if (arquivo.size > LIMITE_MAXIMO_BYTES) {
    return "A imagem deve possuir no máximo 20 MB.";
  }

  return null;
}

function nomeArquivoSeguro(nomeArquivo: string): string {
  const nome = nomeArquivo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return nome || "imagem";
}

function obterPaginacao(req: Request) {
  const paginaRecebida = Number(req.query.pagina || 1);
  const limiteRecebido = Number(req.query.limite || 12);

  const pagina =
    Number.isInteger(paginaRecebida) && paginaRecebida > 0
      ? paginaRecebida
      : 1;

  const limite =
    Number.isInteger(limiteRecebido) &&
    limiteRecebido > 0 &&
    limiteRecebido <= 100
      ? limiteRecebido
      : 12;

  return {
    pagina,
    limite,
    offset: (pagina - 1) * limite,
  };
}

async function categoriaExiste(idCategoria: number): Promise<boolean> {
  const resultado = await oracleExecute(
    `
      SELECT 1 AS EXISTE
        FROM DBACRESSEM.INTRANET_BANCO_IMAGENS_CATEG
       WHERE ID_CATEGORIA = :idCategoria
         AND ST_ATIVO = 'S'
         AND ROWNUM = 1
    `,
    { idCategoria },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  return Boolean(resultado.rows?.length);
}

async function imagemExiste(idImagem: number): Promise<boolean> {
  const resultado = await oracleExecute(
    `
      SELECT 1 AS EXISTE
        FROM DBACRESSEM.INTRANET_BANCO_IMAGENS
       WHERE ID_IMAGEM = :idImagem
         AND ROWNUM = 1
    `,
    { idImagem },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    }
  );

  return Boolean(resultado.rows?.length);
}

async function listarCategorias(req: Request, res: Response) {
  try {
    const somenteAtivas =
      String(req.query.somenteAtivas ?? "S").toUpperCase() !== "N";

    const resultado = await oracleExecute(
      `
        SELECT
          C.ID_CATEGORIA,
          C.NM_CATEGORIA,
          C.DS_CATEGORIA,
          C.ST_ATIVO,
          C.CRIADO_POR,
          TO_CHAR(C.DT_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_CRIACAO,
          C.ATUALIZADO_POR,
          TO_CHAR(C.DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO,
          (
            SELECT COUNT(*)
              FROM DBACRESSEM.INTRANET_BANCO_IMAGENS I
             WHERE I.ID_CATEGORIA = C.ID_CATEGORIA
          ) AS QTD_IMAGENS
        FROM DBACRESSEM.INTRANET_BANCO_IMAGENS_CATEG C
        WHERE (:somenteAtivas = 'N' OR C.ST_ATIVO = 'S')
        ORDER BY C.NM_CATEGORIA
      `,
      {
        somenteAtivas: somenteAtivas ? "S" : "N",
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    return res.json(resultado.rows || []);
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao listar categorias:", error);

    return res.status(500).json({
      error: "Erro ao listar categorias.",
      details: error?.message,
    });
  }
}

async function listar(req: Request, res: Response) {
  try {
    const { pagina, limite, offset } = obterPaginacao(req);

    const busca = textoOuNull(req.query.busca);
    const idCategoria = numeroInteiroOuNull(req.query.idCategoria);
    const orientacao = normalizarOrientacao(req.query.orientacao);

    const statusRecebido = String(req.query.status ?? "ATIVOS")
      .trim()
      .toUpperCase();

    const status =
      statusRecebido === "TODOS" ||
      statusRecebido === "ATIVOS" ||
      statusRecebido === "INATIVOS"
        ? statusRecebido
        : "ATIVOS";

    const destaqueRecebido = String(req.query.destaque ?? "TODOS")
      .trim()
      .toUpperCase();

    const destaque =
      destaqueRecebido === "S" || destaqueRecebido === "N"
        ? destaqueRecebido
        : "TODOS";

    const ordenacaoRecebida = String(req.query.ordenacao ?? "RECENTES")
      .trim()
      .toUpperCase();

    const ordenacaoSql: Record<string, string> = {
      RECENTES: "I.ST_DESTAQUE DESC, I.DT_CRIACAO DESC, I.ID_IMAGEM DESC",
      ANTIGAS: "I.DT_CRIACAO ASC, I.ID_IMAGEM ASC",
      TITULO_ASC: "UPPER(I.NM_TITULO) ASC",
      TITULO_DESC: "UPPER(I.NM_TITULO) DESC",
      MAIS_BAIXADAS: "QTD_DOWNLOADS DESC, I.DT_CRIACAO DESC",
    };

    const orderBy =
      ordenacaoSql[ordenacaoRecebida] || ordenacaoSql.RECENTES;

    const binds = {
      busca: busca ? `%${busca.toUpperCase()}%` : null,
      idCategoria,
      orientacao,
      status,
      destaque,
    };

    const whereSql = `
      WHERE (
        :busca IS NULL
        OR UPPER(I.NM_TITULO) LIKE :busca
        OR UPPER(NVL(I.DS_DESCRICAO, '')) LIKE :busca
        OR UPPER(NVL(I.DS_PALAVRAS_CHAVE, '')) LIKE :busca
        OR UPPER(NVL(C.NM_CATEGORIA, '')) LIKE :busca
      )
        AND (:idCategoria IS NULL OR I.ID_CATEGORIA = :idCategoria)
        AND (:orientacao IS NULL OR I.TP_ORIENTACAO = :orientacao)
        AND (
          :status = 'TODOS'
          OR (:status = 'ATIVOS' AND I.ST_ATIVO = 'S')
          OR (:status = 'INATIVOS' AND I.ST_ATIVO = 'N')
        )
        AND (:destaque = 'TODOS' OR I.ST_DESTAQUE = :destaque)
        AND (
          :status <> 'ATIVOS'
          OR (
            (I.DT_INICIO IS NULL OR TRUNC(SYSDATE) >= TRUNC(I.DT_INICIO))
            AND (I.DT_FIM IS NULL OR TRUNC(SYSDATE) <= TRUNC(I.DT_FIM))
          )
        )
    `;

    const [resultadoTotal, resultadoItens] = await Promise.all([
      oracleExecute(
        `
          SELECT COUNT(*) AS TOTAL
            FROM DBACRESSEM.INTRANET_BANCO_IMAGENS I
            LEFT JOIN DBACRESSEM.INTRANET_BANCO_IMAGENS_CATEG C
              ON C.ID_CATEGORIA = I.ID_CATEGORIA
          ${whereSql}
        `,
        binds,
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }
      ),

      oracleExecute(
        `
          SELECT
            I.ID_IMAGEM,
            I.ID_CATEGORIA,
            C.NM_CATEGORIA,
            I.NM_TITULO,
            I.DS_DESCRICAO,
            I.DS_PALAVRAS_CHAVE,
            I.DS_INSTRUCOES_USO,
            I.NM_ARQUIVO,
            I.TP_MIME,
            I.DS_EXTENSAO,
            I.NR_TAMANHO_BYTES,
            I.NR_LARGURA,
            I.NR_ALTURA,
            I.TP_ORIENTACAO,
            I.ST_ATIVO,
            I.ST_DESTAQUE,
            TO_CHAR(I.DT_INICIO, 'YYYY-MM-DD') AS DT_INICIO,
            TO_CHAR(I.DT_FIM, 'YYYY-MM-DD') AS DT_FIM,
            I.CRIADO_POR,
            TO_CHAR(I.DT_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_CRIACAO,
            I.ATUALIZADO_POR,
            TO_CHAR(I.DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO,
            (
              SELECT COUNT(*)
                FROM DBACRESSEM.INTRANET_BANCO_IMAGENS_DOWNLOAD D
               WHERE D.ID_IMAGEM = I.ID_IMAGEM
            ) AS QTD_DOWNLOADS
          FROM DBACRESSEM.INTRANET_BANCO_IMAGENS I
          LEFT JOIN DBACRESSEM.INTRANET_BANCO_IMAGENS_CATEG C
            ON C.ID_CATEGORIA = I.ID_CATEGORIA
          ${whereSql}
          ORDER BY ${orderBy}
          OFFSET :offset ROWS FETCH NEXT :limite ROWS ONLY
        `,
        {
          ...binds,
          offset,
          limite,
        },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: {
            DS_DESCRICAO: { type: oracledb.STRING },
            DS_PALAVRAS_CHAVE: { type: oracledb.STRING },
            DS_INSTRUCOES_USO: { type: oracledb.STRING },
          },
        }
      ),
    ]);

    const total = Number((resultadoTotal.rows?.[0] as any)?.TOTAL || 0);
    const totalPaginas = total > 0 ? Math.ceil(total / limite) : 0;

    return res.json({
      items: resultadoItens.rows || [],
      pagination: {
        pagina,
        limite,
        total,
        totalPaginas,
        temAnterior: pagina > 1,
        temProxima: pagina < totalPaginas,
      },
    });
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao listar imagens:", error);

    return res.status(500).json({
      error: "Erro ao listar imagens.",
      details: error?.message,
    });
  }
}

async function buscarPorId(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    const resultado = await oracleExecute(
      `
        SELECT
          I.ID_IMAGEM,
          I.ID_CATEGORIA,
          C.NM_CATEGORIA,
          I.NM_TITULO,
          I.DS_DESCRICAO,
          I.DS_PALAVRAS_CHAVE,
          I.DS_INSTRUCOES_USO,
          I.NM_ARQUIVO,
          I.TP_MIME,
          I.DS_EXTENSAO,
          I.NR_TAMANHO_BYTES,
          I.NR_LARGURA,
          I.NR_ALTURA,
          I.TP_ORIENTACAO,
          I.ST_ATIVO,
          I.ST_DESTAQUE,
          TO_CHAR(I.DT_INICIO, 'YYYY-MM-DD') AS DT_INICIO,
          TO_CHAR(I.DT_FIM, 'YYYY-MM-DD') AS DT_FIM,
          I.CRIADO_POR,
          TO_CHAR(I.DT_CRIACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_CRIACAO,
          I.ATUALIZADO_POR,
          TO_CHAR(I.DT_ATUALIZACAO, 'DD/MM/YYYY HH24:MI:SS') AS DT_ATUALIZACAO,
          (
            SELECT COUNT(*)
              FROM DBACRESSEM.INTRANET_BANCO_IMAGENS_DOWNLOAD D
             WHERE D.ID_IMAGEM = I.ID_IMAGEM
          ) AS QTD_DOWNLOADS
        FROM DBACRESSEM.INTRANET_BANCO_IMAGENS I
        LEFT JOIN DBACRESSEM.INTRANET_BANCO_IMAGENS_CATEG C
          ON C.ID_CATEGORIA = I.ID_CATEGORIA
        WHERE I.ID_IMAGEM = :idImagem
      `,
      { idImagem },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          DS_DESCRICAO: { type: oracledb.STRING },
          DS_PALAVRAS_CHAVE: { type: oracledb.STRING },
          DS_INSTRUCOES_USO: { type: oracledb.STRING },
        },
      }
    );

    const imagem = resultado.rows?.[0];

    if (!imagem) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    return res.json(imagem);
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao buscar imagem:", error);

    return res.status(500).json({
      error: "Erro ao buscar imagem.",
      details: error?.message,
    });
  }
}

async function criar(req: Request, res: Response) {
  try {
    const arquivo = req.file;
    const erroArquivo = validarArquivo(arquivo);

    if (erroArquivo || !arquivo) {
      return res.status(400).json({
        error: erroArquivo || "Arquivo inválido.",
      });
    }

    const titulo = textoOuNull(req.body.titulo);
    const descricao = textoOuNull(req.body.descricao);
    const palavrasChave = textoOuNull(req.body.palavrasChave);
    const instrucoesUso = textoOuNull(req.body.instrucoesUso);
    const idCategoria = numeroInteiroOuNull(req.body.idCategoria);
    const orientacao = normalizarOrientacao(req.body.orientacao);
    const largura = numeroInteiroOuNull(req.body.largura);
    const altura = numeroInteiroOuNull(req.body.altura);
    const stAtivo = somenteSN(req.body.stAtivo, "S");
    const stDestaque = somenteSN(req.body.stDestaque, "N");
    const dtInicio = normalizarData(req.body.dtInicio);
    const dtFim = normalizarData(req.body.dtFim);

    if (!titulo) {
      return res.status(400).json({
        error: "O título é obrigatório.",
      });
    }

    if (!idCategoria) {
      return res.status(400).json({
        error: "Selecione uma categoria válida.",
      });
    }

    if (!(await categoriaExiste(idCategoria))) {
      return res.status(400).json({
        error: "A categoria informada não existe ou está inativa.",
      });
    }

    if (!orientacao) {
      return res.status(400).json({
        error: "Informe a orientação da imagem.",
      });
    }

    if (req.body.dtInicio && !dtInicio) {
      return res.status(400).json({
        error: "A data inicial é inválida.",
      });
    }

    if (req.body.dtFim && !dtFim) {
      return res.status(400).json({
        error: "A data final é inválida.",
      });
    }

    if (dtInicio && dtFim && dtFim < dtInicio) {
      return res.status(400).json({
        error: "A data final não pode ser anterior à data inicial.",
      });
    }

    const criadoPor = obterUsuario(req);
    const extensao = obterExtensao(arquivo.originalname);

    const resultado = await oracleExecuteCommitWithAudit(
      req,
      `
        INSERT INTO DBACRESSEM.INTRANET_BANCO_IMAGENS (
          ID_CATEGORIA,
          NM_TITULO,
          DS_DESCRICAO,
          DS_PALAVRAS_CHAVE,
          DS_INSTRUCOES_USO,
          NM_ARQUIVO,
          TP_MIME,
          DS_EXTENSAO,
          NR_TAMANHO_BYTES,
          NR_LARGURA,
          NR_ALTURA,
          TP_ORIENTACAO,
          BL_ARQUIVO,
          ST_ATIVO,
          ST_DESTAQUE,
          DT_INICIO,
          DT_FIM,
          CRIADO_POR,
          DT_CRIACAO
        ) VALUES (
          :idCategoria,
          :titulo,
          :descricao,
          :palavrasChave,
          :instrucoesUso,
          :nomeArquivo,
          :tipoMime,
          :extensao,
          :tamanhoBytes,
          :largura,
          :altura,
          :orientacao,
          :arquivo,
          :stAtivo,
          :stDestaque,
          CASE
            WHEN :dtInicio IS NOT NULL
            THEN TO_DATE(:dtInicio, 'YYYY-MM-DD')
            ELSE NULL
          END,
          CASE
            WHEN :dtFim IS NOT NULL
            THEN TO_DATE(:dtFim, 'YYYY-MM-DD')
            ELSE NULL
          END,
          :criadoPor,
          SYSDATE
        )
        RETURNING ID_IMAGEM INTO :idImagem
      `,
      {
        idCategoria,
        titulo,
        descricao,
        palavrasChave,
        instrucoesUso,
        nomeArquivo: arquivo.originalname,
        tipoMime: arquivo.mimetype,
        extensao,
        tamanhoBytes: arquivo.size,
        largura,
        altura,
        orientacao,
        arquivo: arquivo.buffer,
        stAtivo,
        stDestaque,
        dtInicio,
        dtFim,
        criadoPor,
        idImagem: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      }
    );

    const outBinds = resultado.outBinds as any;
    const idImagemCriada = Array.isArray(outBinds?.idImagem)
      ? outBinds.idImagem[0]
      : outBinds?.idImagem;

    return res.status(201).json({
      message: "Imagem cadastrada com sucesso.",
      idImagem: idImagemCriada || null,
    });
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao cadastrar imagem:", error);

    return res.status(500).json({
      error: "Erro ao cadastrar imagem.",
      details: error?.message,
    });
  }
}

async function atualizar(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    if (!(await imagemExiste(idImagem))) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    const arquivo = req.file;

    if (arquivo) {
      const erroArquivo = validarArquivo(arquivo);

      if (erroArquivo) {
        return res.status(400).json({
          error: erroArquivo,
        });
      }
    }

    const titulo = textoOuNull(req.body.titulo);
    const descricao = textoOuNull(req.body.descricao);
    const palavrasChave = textoOuNull(req.body.palavrasChave);
    const instrucoesUso = textoOuNull(req.body.instrucoesUso);
    const idCategoria = numeroInteiroOuNull(req.body.idCategoria);
    const orientacao = normalizarOrientacao(req.body.orientacao);
    const largura = numeroInteiroOuNull(req.body.largura);
    const altura = numeroInteiroOuNull(req.body.altura);
    const stAtivo = somenteSN(req.body.stAtivo, "S");
    const stDestaque = somenteSN(req.body.stDestaque, "N");
    const dtInicio = normalizarData(req.body.dtInicio);
    const dtFim = normalizarData(req.body.dtFim);

    if (!titulo) {
      return res.status(400).json({
        error: "O título é obrigatório.",
      });
    }

    if (!idCategoria) {
      return res.status(400).json({
        error: "Selecione uma categoria válida.",
      });
    }

    if (!(await categoriaExiste(idCategoria))) {
      return res.status(400).json({
        error: "A categoria informada não existe ou está inativa.",
      });
    }

    if (!orientacao) {
      return res.status(400).json({
        error: "Informe a orientação da imagem.",
      });
    }

    if (req.body.dtInicio && !dtInicio) {
      return res.status(400).json({
        error: "A data inicial é inválida.",
      });
    }

    if (req.body.dtFim && !dtFim) {
      return res.status(400).json({
        error: "A data final é inválida.",
      });
    }

    if (dtInicio && dtFim && dtFim < dtInicio) {
      return res.status(400).json({
        error: "A data final não pode ser anterior à data inicial.",
      });
    }

    const atualizadoPor = obterUsuario(req);

    const camposArquivo = arquivo
      ? `
          NM_ARQUIVO = :nomeArquivo,
          TP_MIME = :tipoMime,
          DS_EXTENSAO = :extensao,
          NR_TAMANHO_BYTES = :tamanhoBytes,
          BL_ARQUIVO = :arquivo,
        `
      : "";

    const binds: Record<string, any> = {
      idImagem,
      idCategoria,
      titulo,
      descricao,
      palavrasChave,
      instrucoesUso,
      largura,
      altura,
      orientacao,
      stAtivo,
      stDestaque,
      dtInicio,
      dtFim,
      atualizadoPor,
    };

    if (arquivo) {
      binds.nomeArquivo = arquivo.originalname;
      binds.tipoMime = arquivo.mimetype;
      binds.extensao = obterExtensao(arquivo.originalname);
      binds.tamanhoBytes = arquivo.size;
      binds.arquivo = arquivo.buffer;
    }

    await oracleExecuteCommitWithAudit(
      req,
      `
        UPDATE DBACRESSEM.INTRANET_BANCO_IMAGENS
           SET ID_CATEGORIA = :idCategoria,
               NM_TITULO = :titulo,
               DS_DESCRICAO = :descricao,
               DS_PALAVRAS_CHAVE = :palavrasChave,
               DS_INSTRUCOES_USO = :instrucoesUso,
               ${camposArquivo}
               NR_LARGURA = :largura,
               NR_ALTURA = :altura,
               TP_ORIENTACAO = :orientacao,
               ST_ATIVO = :stAtivo,
               ST_DESTAQUE = :stDestaque,
               DT_INICIO = CASE
                 WHEN :dtInicio IS NOT NULL
                 THEN TO_DATE(:dtInicio, 'YYYY-MM-DD')
                 ELSE NULL
               END,
               DT_FIM = CASE
                 WHEN :dtFim IS NOT NULL
                 THEN TO_DATE(:dtFim, 'YYYY-MM-DD')
                 ELSE NULL
               END,
               ATUALIZADO_POR = :atualizadoPor,
               DT_ATUALIZACAO = SYSDATE
         WHERE ID_IMAGEM = :idImagem
      `,
      binds
    );

    return res.json({
      message: "Imagem atualizada com sucesso.",
    });
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao atualizar imagem:", error);

    return res.status(500).json({
      error: "Erro ao atualizar imagem.",
      details: error?.message,
    });
  }
}

async function alterarStatus(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    const stAtivo = somenteSN(req.body.stAtivo, "N");
    const atualizadoPor = obterUsuario(req);

    const resultado = await oracleExecuteCommitWithAudit(
      req,
      `
        UPDATE DBACRESSEM.INTRANET_BANCO_IMAGENS
           SET ST_ATIVO = :stAtivo,
               ATUALIZADO_POR = :atualizadoPor,
               DT_ATUALIZACAO = SYSDATE
         WHERE ID_IMAGEM = :idImagem
      `,
      {
        idImagem,
        stAtivo,
        atualizadoPor,
      }
    );

    if (!resultado.rowsAffected) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    return res.json({
      message:
        stAtivo === "S"
          ? "Imagem ativada com sucesso."
          : "Imagem desativada com sucesso.",
    });
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao alterar status:", error);

    return res.status(500).json({
      error: "Erro ao alterar status da imagem.",
      details: error?.message,
    });
  }
}

async function alterarDestaque(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    const stDestaque = somenteSN(req.body.stDestaque, "N");
    const atualizadoPor = obterUsuario(req);

    const resultado = await oracleExecuteCommitWithAudit(
      req,
      `
        UPDATE DBACRESSEM.INTRANET_BANCO_IMAGENS
           SET ST_DESTAQUE = :stDestaque,
               ATUALIZADO_POR = :atualizadoPor,
               DT_ATUALIZACAO = SYSDATE
         WHERE ID_IMAGEM = :idImagem
      `,
      {
        idImagem,
        stDestaque,
        atualizadoPor,
      }
    );

    if (!resultado.rowsAffected) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    return res.json({
      message:
        stDestaque === "S"
          ? "Imagem destacada com sucesso."
          : "Destaque removido com sucesso.",
    });
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao alterar destaque:", error);

    return res.status(500).json({
      error: "Erro ao alterar destaque da imagem.",
      details: error?.message,
    });
  }
}

async function excluir(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    if (!(await imagemExiste(idImagem))) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    await oracleExecuteCommitWithAudit(
      req,
      `
        BEGIN
          DELETE FROM DBACRESSEM.INTRANET_BANCO_IMAGENS_DOWNLOAD
           WHERE ID_IMAGEM = :idImagem;

          DELETE FROM DBACRESSEM.INTRANET_BANCO_IMAGENS
           WHERE ID_IMAGEM = :idImagem;
        END;
      `,
      { idImagem }
    );

    return res.json({
      message: "Imagem excluída com sucesso.",
    });
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao excluir imagem:", error);

    return res.status(500).json({
      error: "Erro ao excluir imagem.",
      details: error?.message,
    });
  }
}

async function obterArquivo(
  idImagem: number
): Promise<{
  ID_IMAGEM: number;
  NM_ARQUIVO: string;
  TP_MIME: string;
  NR_TAMANHO_BYTES: number | null;
  BL_ARQUIVO: Buffer;
  ST_ATIVO: StatusSN;
} | null> {
  const resultado = await oracleExecute(
    `
      SELECT
        ID_IMAGEM,
        NM_ARQUIVO,
        TP_MIME,
        NR_TAMANHO_BYTES,
        BL_ARQUIVO,
        ST_ATIVO
      FROM DBACRESSEM.INTRANET_BANCO_IMAGENS
      WHERE ID_IMAGEM = :idImagem
    `,
    { idImagem },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchInfo: {
        BL_ARQUIVO: { type: oracledb.BUFFER },
      },
    }
  );

  return (resultado.rows?.[0] as any) || null;
}

async function visualizar(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    const imagem = await obterArquivo(idImagem);

    if (!imagem) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    if (!imagem.BL_ARQUIVO) {
      return res.status(404).json({
        error: "O arquivo da imagem não foi encontrado.",
      });
    }

    res.setHeader("Content-Type", imagem.TP_MIME || "application/octet-stream");
    res.setHeader("Content-Length", String(imagem.BL_ARQUIVO.length));
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.send(imagem.BL_ARQUIVO);
  } catch (error: any) {
    console.error("[banco-imagens] Erro ao visualizar imagem:", error);

    return res.status(500).json({
      error: "Erro ao carregar a imagem.",
      details: error?.message,
    });
  }
}

async function download(req: Request, res: Response) {
  try {
    const idImagem = numeroInteiroOuNull(req.params.id);

    if (!idImagem) {
      return res.status(400).json({
        error: "Identificador da imagem inválido.",
      });
    }

    const imagem = await obterArquivo(idImagem);

    if (!imagem) {
      return res.status(404).json({
        error: "Imagem não encontrada.",
      });
    }

    if (!imagem.BL_ARQUIVO) {
      return res.status(404).json({
        error: "O arquivo da imagem não foi encontrado.",
      });
    }

    const loginUsuario = obterUsuario(req);
    const nomeUsuario = obterNomeUsuario(req);
    const ipUsuario = obterIp(req);

    await oracleExecuteCommitWithAudit(
      req,
      `
        INSERT INTO DBACRESSEM.INTRANET_BANCO_IMAGENS_DOWNLOAD (
          ID_IMAGEM,
          LOGIN_USUARIO,
          NOME_USUARIO,
          IP_USUARIO,
          DT_DOWNLOAD
        ) VALUES (
          :idImagem,
          :loginUsuario,
          :nomeUsuario,
          :ipUsuario,
          SYSDATE
        )
      `,
      {
        idImagem,
        loginUsuario,
        nomeUsuario,
        ipUsuario,
      }
    );

    const nomeOriginal = imagem.NM_ARQUIVO || `imagem-${idImagem}`;
    const nomeSeguro = nomeArquivoSeguro(nomeOriginal);
    const nomeUtf8 = encodeURIComponent(nomeOriginal);

    res.setHeader("Content-Type", imagem.TP_MIME || "application/octet-stream");
    res.setHeader("Content-Length", String(imagem.BL_ARQUIVO.length));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nomeSeguro}"; filename*=UTF-8''${nomeUtf8}`
    );
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.send(imagem.BL_ARQUIVO);
  } catch (error: any) {
    console.error("[banco-imagens] Erro no download:", error);

    return res.status(500).json({
      error: "Erro ao baixar a imagem.",
      details: error?.message,
    });
  }
}

export const bancoImagensController = {
  listarCategorias,
  listar,
  buscarPorId,
  criar,
  atualizar,
  alterarStatus,
  alterarDestaque,
  excluir,
  visualizar,
  download,
};