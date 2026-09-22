import { Response } from "express";
import oracledb from "oracledb";
import { getOraclePool } from "../config/oracle.pool";
import { oracleExecute, setAuditoriaContext } from "../services/oracle.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { isConselhoParticipacao } from "../services/perfil-conselho.service";

const STATUS_PENDENTE = "PENDENTE_CONSELHO";
const STATUS_APROVADA = "APROVADA";
const STATUS_REPROVADA = "REPROVADA";
const GRUPO_SUPORTE = "GG_USERS_SUPORTE";

type UsuarioAutenticado = {
  nome: string;
  login: string;
  email: string | null;
  departamento: string | null;
  isConselho: boolean;
  isSuporte: boolean;
};

function texto(value: unknown) {
  return String(value ?? "").trim();
}

function textoOuNulo(value: unknown) {
  const result = texto(value);
  return result || null;
}

function normalizar(value: unknown) {
  return texto(value).toUpperCase();
}

function obterUsuario(req: AuthenticatedRequest): UsuarioAutenticado {
  const nome = texto(req.user?.nome_completo);
  const login = texto(req.user?.sub).toLowerCase();

  if (!nome || !login) {
    throw Object.assign(new Error("Usuário autenticado não identificado."), { statusCode: 401 });
  }

  const grupos = Array.isArray(req.user?.grupos) ? req.user!.grupos! : [];

  return {
    nome,
    login,
    email: textoOuNulo(req.user?.email),
    departamento: textoOuNulo(req.user?.department),
    isConselho: isConselhoParticipacao(nome),
    isSuporte: grupos.some((grupo) => normalizar(grupo) === GRUPO_SUPORTE),
  };
}

function dataHora(value: unknown, campo: string) {
  const raw = texto(value);

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) {
    throw Object.assign(new Error(`Informe ${campo}.`), { statusCode: 400 });
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw Object.assign(new Error(`${campo} inválida.`), { statusCode: 400 });
  }

  return raw;
}

function validarTipoViagem(value: unknown) {
  const tipo = normalizar(value);
  if (tipo !== "IDA_VOLTA" && tipo !== "SOMENTE_IDA") {
    throw Object.assign(new Error("Selecione o tipo de viagem."), { statusCode: 400 });
  }
  return tipo;
}

type DadosPeriodoMotorista = {
  tipoViagem: string;
  ida: string;
  volta: string | null;
  motoristaAguarda: string | null;
};

async function buscarMotoristaAtivo(conn: oracledb.Connection, idFuncionario: number) {
  const result = await conn.execute(
    `
      SELECT
        f.ID_FUNCIONARIO,
        f.NM_FUNCIONARIO,
        c.NM_CARGO
      FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
      INNER JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
        ON c.ID_CARGO = f.ID_CARGO
      WHERE f.ID_FUNCIONARIO = :ID_FUNCIONARIO
        AND f.SN_ATIVO = 1
        AND c.SN_ATIVO = 1
        AND UPPER(TRIM(c.NM_CARGO)) LIKE 'MOTORISTA%'
    `,
    { ID_FUNCIONARIO: idFuncionario },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows?.[0] as any;
}

function sobrepoeIntervalo(inicioA: string, fimA: string, inicioB: string, fimB: string) {
  return inicioA <= fimB && inicioB <= fimA;
}

function pontosDeterminaveis(periodo: DadosPeriodoMotorista) {
  return [periodo.ida, ...(periodo.volta ? [periodo.volta] : [])];
}

function motoristaEstaOcupado(solicitada: DadosPeriodoMotorista, existente: any) {
  const periodoExistente: DadosPeriodoMotorista = {
    tipoViagem: texto(existente.TP_VIAGEM),
    ida: texto(existente.DT_IDA),
    volta: textoOuNulo(existente.DT_VOLTA),
    motoristaAguarda: textoOuNulo(existente.SN_MOTORISTA_AGUARDA),
  };
  const solicitadaAguarda = solicitada.tipoViagem === "IDA_VOLTA" && solicitada.motoristaAguarda === "S" && solicitada.volta;
  const existenteAguarda = periodoExistente.tipoViagem === "IDA_VOLTA" && periodoExistente.motoristaAguarda === "S" && periodoExistente.volta;

  if (solicitadaAguarda && existenteAguarda) {
    return sobrepoeIntervalo(solicitada.ida, solicitada.volta!, periodoExistente.ida, periodoExistente.volta!);
  }

  if (solicitadaAguarda) {
    return pontosDeterminaveis(periodoExistente).some((ponto) => ponto >= solicitada.ida && ponto <= solicitada.volta!);
  }

  if (existenteAguarda) {
    return pontosDeterminaveis(solicitada).some((ponto) => ponto >= periodoExistente.ida && ponto <= periodoExistente.volta!);
  }

  return pontosDeterminaveis(solicitada).some((ponto) => pontosDeterminaveis(periodoExistente).includes(ponto));
}

async function buscarIndisponibilidadesMotorista(
  conn: oracledb.Connection,
  idFuncionarioMotorista: number,
  periodo: DadosPeriodoMotorista
) {
  const result = await conn.execute(
    `
      SELECT
        ID_VIAGEM,
        DS_DESTINO,
        TO_CHAR(DT_IDA, 'YYYY-MM-DD"T"HH24:MI:SS') AS DT_IDA,
        TO_CHAR(DT_VOLTA, 'YYYY-MM-DD"T"HH24:MI:SS') AS DT_VOLTA,
        TP_VIAGEM,
        SN_MOTORISTA_AGUARDA,
        ST_VIAGEM
      FROM DBACRESSEM.VIAGENS
      WHERE ID_FUNCIONARIO_MOTORISTA = :ID_FUNCIONARIO_MOTORISTA
        AND ST_VIAGEM IN (:STATUS_PENDENTE, :STATUS_APROVADA)
      ORDER BY DT_IDA ASC
    `,
    {
      ID_FUNCIONARIO_MOTORISTA: idFuncionarioMotorista,
      STATUS_PENDENTE,
      STATUS_APROVADA,
    },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return (result.rows || []).filter((viagem: any) => motoristaEstaOcupado(periodo, viagem));
}

async function obterAcompanhantes(conn: oracledb.Connection, idViagem: number) {
  const result = await conn.execute(
    `
      SELECT ID_FUNCIONARIO, NM_ACOMPANHANTE
      FROM DBACRESSEM.VIAGEM_ACOMPANHANTES
      WHERE ID_VIAGEM = :ID_VIAGEM
      ORDER BY NM_ACOMPANHANTE
    `,
    { ID_VIAGEM: idViagem },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return result.rows || [];
}

function wherePermissaoAgenda(usuario: UsuarioAutenticado, binds: Record<string, unknown>) {
  if (usuario.isConselho || usuario.isSuporte) return "1 = 1";

  binds.LOGIN_SOLICITANTE = usuario.login;
  return "(LOWER(v.DS_LOGIN_SOLICITANTE) = :LOGIN_SOLICITANTE OR v.ST_VIAGEM = 'APROVADA')";
}

async function validarAcompanhantes(
  conn: oracledb.Connection,
  acompanhantesRecebidos: unknown,
  solicitante: UsuarioAutenticado
) {
  const itens = Array.isArray(acompanhantesRecebidos) ? acompanhantesRecebidos : [];
  const ids = new Set<number>();
  const acompanhantes: Array<{ id: number; nome: string }> = [];

  if (itens.length > 20) {
    throw Object.assign(new Error("Informe no máximo 20 acompanhantes."), { statusCode: 400 });
  }

  for (const item of itens) {
    const id = Number((item as any)?.ID_FUNCIONARIO);
    if (!Number.isInteger(id) || id <= 0 || ids.has(id)) {
      throw Object.assign(new Error("Existem acompanhantes inválidos ou duplicados."), { statusCode: 400 });
    }

    const result = await conn.execute(
      `
        SELECT ID_FUNCIONARIO, NM_FUNCIONARIO
        FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM
        WHERE ID_FUNCIONARIO = :ID_FUNCIONARIO
      `,
      { ID_FUNCIONARIO: id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const funcionario: any = result.rows?.[0];

    if (!funcionario?.NM_FUNCIONARIO) {
      throw Object.assign(new Error("Um dos acompanhantes não foi encontrado."), { statusCode: 400 });
    }

    if (normalizar(funcionario.NM_FUNCIONARIO) === normalizar(solicitante.nome)) {
      throw Object.assign(new Error("O solicitante não deve ser incluído como acompanhante."), { statusCode: 400 });
    }

    ids.add(id);
    acompanhantes.push({ id, nome: texto(funcionario.NM_FUNCIONARIO) });
  }

  return acompanhantes;
}

export const viagensController = {
  async meuPerfil(req: AuthenticatedRequest, res: Response) {
    try {
      const usuario = obterUsuario(req);
      return res.json({
        NM_USUARIO: usuario.nome,
        IS_CONSELHO: usuario.isConselho,
        IS_SUPORTE: usuario.isSuporte,
      });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao identificar usuário." });
    }
  },

  async pesquisarFuncionarios(req: AuthenticatedRequest, res: Response) {
    try {
      obterUsuario(req);
      const busca = texto(req.query.busca);
      if (busca.length < 2) return res.json({ items: [] });

      const result = await oracleExecute(
        `
          SELECT * FROM (
            SELECT ID_FUNCIONARIO, NM_FUNCIONARIO
            FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM
            WHERE UPPER(TRIM(NM_FUNCIONARIO)) LIKE '%' || UPPER(TRIM(:BUSCA)) || '%'
            ORDER BY UPPER(NM_FUNCIONARIO)
          ) WHERE ROWNUM <= 20
        `,
        { BUSCA: busca },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return res.json({ items: result.rows || [] });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao pesquisar funcionários." });
    }
  },

  async listarMotoristas(req: AuthenticatedRequest, res: Response) {
    try {
      obterUsuario(req);
      const result = await oracleExecute(
        `
          SELECT f.ID_FUNCIONARIO, f.NM_FUNCIONARIO
          FROM DBACRESSEM.FUNCIONARIOS_SICOOB_CRESSEM f
          INNER JOIN DBACRESSEM.CARGO_GERENTES_SICOOB_CRESSEM c
            ON c.ID_CARGO = f.ID_CARGO
          WHERE f.SN_ATIVO = 1
            AND c.SN_ATIVO = 1
            AND UPPER(TRIM(c.NM_CARGO)) LIKE 'MOTORISTA%'
          ORDER BY UPPER(f.NM_FUNCIONARIO)
        `,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return res.json({ items: result.rows || [] });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao listar motoristas." });
    }
  },

  async consultarDisponibilidadeMotorista(req: AuthenticatedRequest, res: Response) {
    let conn: oracledb.Connection | undefined;
    try {
      obterUsuario(req);
      const tipoViagem = validarTipoViagem(req.query.tipo_viagem);
      const ida = dataHora(req.query.dt_ida, "a data e hora da ida");
      const volta = tipoViagem === "IDA_VOLTA"
        ? dataHora(req.query.dt_volta, "a data e hora da volta")
        : null;

      if (volta && new Date(volta).getTime() <= new Date(ida).getTime()) {
        return res.status(400).json({ error: "O retorno deve ser posterior à ida." });
      }

      const idFuncionarioMotorista = Number(req.query.id_funcionario_motorista);
      if (!Number.isInteger(idFuncionarioMotorista) || idFuncionarioMotorista <= 0) {
        return res.status(400).json({ error: "Selecione um motorista válido." });
      }

      const motoristaAguarda = tipoViagem === "IDA_VOLTA" ? normalizar(req.query.sn_motorista_aguarda) : null;
      if (tipoViagem === "IDA_VOLTA" && motoristaAguarda !== "S" && motoristaAguarda !== "N") {
        return res.status(400).json({ error: "Informe se o motorista deve aguardar no destino." });
      }

      conn = await getOraclePool().getConnection();
      const motorista = await buscarMotoristaAtivo(conn, idFuncionarioMotorista);
      if (!motorista) return res.status(400).json({ error: "O motorista selecionado não é válido ou não está ativo." });

      const indisponibilidades = await buscarIndisponibilidadesMotorista(conn, idFuncionarioMotorista, {
        tipoViagem,
        ida,
        volta,
        motoristaAguarda,
      });

      return res.json({
        DISPONIVEL: indisponibilidades.length === 0,
        MOTORISTA: motorista,
        items: indisponibilidades,
      });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao consultar disponibilidade do motorista." });
    } finally {
      if (conn) await conn.close();
    }
  },

  async criar(req: AuthenticatedRequest, res: Response) {
    let conn: oracledb.Connection | undefined;
    try {
      const usuario = obterUsuario(req);
      const body = req.body || {};
      const tipoViagem = validarTipoViagem(body.TP_VIAGEM);
      const destino = texto(body.DS_DESTINO);
      const ida = dataHora(body.DT_IDA, "a data e hora da ida");
      const volta = tipoViagem === "IDA_VOLTA"
        ? dataHora(body.DT_VOLTA, "a data e hora da volta")
        : null;

      if (!destino) {
        return res.status(400).json({ error: "Informe o destino." });
      }

      if (volta && new Date(volta).getTime() <= new Date(ida).getTime()) {
        return res.status(400).json({ error: "O retorno deve ser posterior à ida." });
      }

      const motoristaAguarda = tipoViagem === "IDA_VOLTA" ? normalizar(body.SN_MOTORISTA_AGUARDA) : null;
      if (tipoViagem === "IDA_VOLTA" && motoristaAguarda !== "S" && motoristaAguarda !== "N") {
        return res.status(400).json({ error: "Informe se o motorista deve aguardar no destino." });
      }

      const idFuncionarioMotorista = Number(body.ID_FUNCIONARIO_MOTORISTA);
      if (!Number.isInteger(idFuncionarioMotorista) || idFuncionarioMotorista <= 0) {
        return res.status(400).json({ error: "Selecione um motorista válido." });
      }

      conn = await getOraclePool().getConnection();
      await setAuditoriaContext(conn, req);

      const acompanhantes = await validarAcompanhantes(conn, body.ACOMPANHANTES, usuario);
      const motorista = await buscarMotoristaAtivo(conn, idFuncionarioMotorista);
      if (!motorista) {
        await conn.rollback();
        return res.status(400).json({ error: "O motorista selecionado não é válido ou não está ativo." });
      }

      const indisponibilidades = await buscarIndisponibilidadesMotorista(conn, idFuncionarioMotorista, {
        tipoViagem,
        ida,
        volta,
        motoristaAguarda,
      });
      if (indisponibilidades.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          error: "Este motorista já possui uma viagem neste horário.",
          items: indisponibilidades,
        });
      }

      const status = usuario.isConselho ? STATUS_APROVADA : STATUS_PENDENTE;
      const result = await conn.execute(
        `
          INSERT INTO DBACRESSEM.VIAGENS (
            NM_SOLICITANTE, DS_LOGIN_SOLICITANTE, DS_EMAIL_SOLICITANTE, DS_DEPARTAMENTO,
            TP_VIAGEM, DT_IDA, DT_VOLTA, SN_MOTORISTA_AGUARDA, DS_DESTINO,
            ID_FUNCIONARIO_MOTORISTA, NM_MOTORISTA, ST_VIAGEM, NM_APROVADOR, DS_LOGIN_APROVADOR,
            DT_APROVACAO, SN_APROVACAO_AUTOMATICA, DS_ORIGEM_APROVACAO
          ) VALUES (
            :NM_SOLICITANTE, :DS_LOGIN_SOLICITANTE, :DS_EMAIL_SOLICITANTE, :DS_DEPARTAMENTO,
            :TP_VIAGEM,
            TO_TIMESTAMP(:DT_IDA, 'YYYY-MM-DD"T"HH24:MI:SS'),
            CASE WHEN :DT_VOLTA IS NULL THEN NULL ELSE TO_TIMESTAMP(:DT_VOLTA, 'YYYY-MM-DD"T"HH24:MI:SS') END,
            :SN_MOTORISTA_AGUARDA, :DS_DESTINO,
            :ID_FUNCIONARIO_MOTORISTA, :NM_MOTORISTA, :ST_VIAGEM, :NM_APROVADOR, :DS_LOGIN_APROVADOR,
            CASE WHEN :SN_APROVACAO_AUTOMATICA = 'S' THEN CURRENT_TIMESTAMP ELSE NULL END,
            :SN_APROVACAO_AUTOMATICA, :DS_ORIGEM_APROVACAO
          ) RETURNING ID_VIAGEM INTO :ID_VIAGEM
        `,
        {
          NM_SOLICITANTE: usuario.nome,
          DS_LOGIN_SOLICITANTE: usuario.login,
          DS_EMAIL_SOLICITANTE: usuario.email,
          DS_DEPARTAMENTO: usuario.departamento,
          TP_VIAGEM: tipoViagem,
          DT_IDA: ida,
          DT_VOLTA: volta,
          SN_MOTORISTA_AGUARDA: motoristaAguarda,
          DS_DESTINO: destino,
          ID_FUNCIONARIO_MOTORISTA: idFuncionarioMotorista,
          NM_MOTORISTA: texto(motorista.NM_FUNCIONARIO),
          ST_VIAGEM: status,
          NM_APROVADOR: usuario.isConselho ? usuario.nome : null,
          DS_LOGIN_APROVADOR: usuario.isConselho ? usuario.login : null,
          SN_APROVACAO_AUTOMATICA: usuario.isConselho ? "S" : "N",
          DS_ORIGEM_APROVACAO: usuario.isConselho ? "PERFIL_CONSELHO" : null,
          ID_VIAGEM: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: false } as any
      );

      const idViagem = Number((result.outBinds as any)?.ID_VIAGEM?.[0] || (result.outBinds as any)?.ID_VIAGEM);

      for (const acompanhante of acompanhantes) {
        await conn.execute(
          `
            INSERT INTO DBACRESSEM.VIAGEM_ACOMPANHANTES (ID_VIAGEM, ID_FUNCIONARIO, NM_ACOMPANHANTE)
            VALUES (:ID_VIAGEM, :ID_FUNCIONARIO, :NM_ACOMPANHANTE)
          `,
          { ID_VIAGEM: idViagem, ID_FUNCIONARIO: acompanhante.id, NM_ACOMPANHANTE: acompanhante.nome },
          { autoCommit: false }
        );
      }

      await conn.commit();
      return res.status(201).json({
        ID_VIAGEM: idViagem,
        ST_VIAGEM: status,
        mensagem: usuario.isConselho
          ? "Viagem registrada e aprovada automaticamente."
          : "Solicitação enviada e encaminhada para aprovação da Secretaria.",
      });
    } catch (error: any) {
      if (conn) await conn.rollback();
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao cadastrar viagem." });
    } finally {
      if (conn) await conn.close();
    }
  },

  async listar(req: AuthenticatedRequest, res: Response) {
    try {
      const usuario = obterUsuario(req);
      const page = Math.max(Number(req.query.page || 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 100);
      const offset = (page - 1) * limit;
      const binds: any = {};
      const filtros = [wherePermissaoAgenda(usuario, binds)];
      const status = normalizar(req.query.status);
      const solicitante = texto(req.query.solicitante);
      const periodoInicio = texto(req.query.periodo_inicio);
      const periodoFim = texto(req.query.periodo_fim);

      if ([STATUS_PENDENTE, STATUS_APROVADA, STATUS_REPROVADA].includes(status)) {
        filtros.push("v.ST_VIAGEM = :STATUS");
        binds.STATUS = status;
      }
      if (solicitante) {
        filtros.push("UPPER(v.NM_SOLICITANTE) LIKE '%' || UPPER(:SOLICITANTE) || '%'");
        binds.SOLICITANTE = solicitante;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(periodoInicio)) {
        filtros.push("v.DT_IDA >= TO_TIMESTAMP(:PERIODO_INICIO, 'YYYY-MM-DD')");
        binds.PERIODO_INICIO = periodoInicio;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(periodoFim)) {
        filtros.push("v.DT_IDA < TO_TIMESTAMP(:PERIODO_FIM, 'YYYY-MM-DD') + INTERVAL '1' DAY");
        binds.PERIODO_FIM = periodoFim;
      }

      const where = filtros.join(" AND ");
      const countResult = await oracleExecute(
        `SELECT COUNT(*) AS TOTAL FROM DBACRESSEM.VIAGENS v WHERE ${where}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = Number((countResult.rows?.[0] as any)?.TOTAL || 0);

      const result = await oracleExecute(
        `
          SELECT * FROM (
            SELECT
              v.*,
              (
                SELECT LISTAGG(a.NM_ACOMPANHANTE, ', ') WITHIN GROUP (ORDER BY a.NM_ACOMPANHANTE)
                FROM DBACRESSEM.VIAGEM_ACOMPANHANTES a
                WHERE a.ID_VIAGEM = v.ID_VIAGEM
              ) AS NM_ACOMPANHANTES,
              ROW_NUMBER() OVER (ORDER BY v.DT_IDA ASC, v.ID_VIAGEM DESC) AS RN
            FROM DBACRESSEM.VIAGENS v
            WHERE ${where}
          ) WHERE RN > :OFFSET AND RN <= (:OFFSET + :LIMIT)
          ORDER BY RN
        `,
        { ...binds, OFFSET: offset, LIMIT: limit },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return res.json({ items: result.rows || [], total, page, limit, total_pages: Math.max(Math.ceil(total / limit), 1) });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao listar viagens." });
    }
  },

  async buscarPorId(req: AuthenticatedRequest, res: Response) {
    let conn: oracledb.Connection | undefined;
    try {
      const usuario = obterUsuario(req);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Viagem inválida." });

      conn = await getOraclePool().getConnection();
      const binds: any = { ID_VIAGEM: id };
      const permissao = wherePermissaoAgenda(usuario, binds);
      const result = await conn.execute(
        `SELECT v.* FROM DBACRESSEM.VIAGENS v WHERE v.ID_VIAGEM = :ID_VIAGEM AND ${permissao}`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const viagem: any = result.rows?.[0];
      if (!viagem) return res.status(404).json({ error: "Viagem não encontrada." });

      viagem.ACOMPANHANTES = await obterAcompanhantes(conn, id);
      return res.json(viagem);
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao consultar viagem." });
    } finally {
      if (conn) await conn.close();
    }
  },

  async listarPendentes(req: AuthenticatedRequest, res: Response) {
    try {
      const usuario = obterUsuario(req);
      if (!usuario.isConselho) return res.status(403).json({ error: "Você não possui permissão da Secretaria para aprovar esta solicitação." });

      const result = await oracleExecute(
        `
          SELECT
            v.*,
            (
              SELECT LISTAGG(a.NM_ACOMPANHANTE, ', ') WITHIN GROUP (ORDER BY a.NM_ACOMPANHANTE)
              FROM DBACRESSEM.VIAGEM_ACOMPANHANTES a
              WHERE a.ID_VIAGEM = v.ID_VIAGEM
            ) AS NM_ACOMPANHANTES
          FROM DBACRESSEM.VIAGENS v
          WHERE v.ST_VIAGEM = :STATUS
          ORDER BY v.DT_IDA ASC, v.ID_VIAGEM DESC
        `,
        { STATUS: STATUS_PENDENTE },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return res.json({ items: result.rows || [] });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao listar aprovações." });
    }
  },

  async decidir(req: AuthenticatedRequest, res: Response) {
    let conn: oracledb.Connection | undefined;
    try {
      const usuario = obterUsuario(req);
      if (!usuario.isConselho) return res.status(403).json({ error: "Você não possui permissão da Secretaria para aprovar esta solicitação." });

      const id = Number(req.params.id);
      const acao = normalizar(req.body?.ACAO);
      const motivo = texto(req.body?.DS_MOTIVO_REPROVACAO);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Viagem inválida." });
      if (acao !== STATUS_APROVADA && acao !== STATUS_REPROVADA) return res.status(400).json({ error: "Ação de aprovação inválida." });
      if (acao === STATUS_REPROVADA && !motivo) return res.status(400).json({ error: "Informe o motivo da reprovação." });

      conn = await getOraclePool().getConnection();
      await setAuditoriaContext(conn, req);
      const result = await conn.execute(
        `
          UPDATE DBACRESSEM.VIAGENS
          SET
            ST_VIAGEM = :ST_VIAGEM,
            NM_APROVADOR = :NM_APROVADOR,
            DS_LOGIN_APROVADOR = :DS_LOGIN_APROVADOR,
            DT_APROVACAO = CURRENT_TIMESTAMP,
            DS_MOTIVO_REPROVACAO = :DS_MOTIVO_REPROVACAO,
            SN_APROVACAO_AUTOMATICA = 'N',
            DS_ORIGEM_APROVACAO = 'CONSELHO'
          WHERE ID_VIAGEM = :ID_VIAGEM
            AND ST_VIAGEM = :STATUS_PENDENTE
        `,
        {
          ST_VIAGEM: acao,
          NM_APROVADOR: usuario.nome,
          DS_LOGIN_APROVADOR: usuario.login,
          DS_MOTIVO_REPROVACAO: acao === STATUS_REPROVADA ? motivo : null,
          ID_VIAGEM: id,
          STATUS_PENDENTE,
        },
        { autoCommit: false }
      );

      if (!result.rowsAffected) {
        await conn.rollback();
        return res.status(409).json({ error: "Esta viagem não está mais pendente de aprovação." });
      }

      await conn.commit();
      return res.json({ success: true, ST_VIAGEM: acao });
    } catch (error: any) {
      if (conn) await conn.rollback();
      return res.status(error?.statusCode || 500).json({ error: error?.message || "Falha ao registrar decisão." });
    } finally {
      if (conn) await conn.close();
    }
  },
};
