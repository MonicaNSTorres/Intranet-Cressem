import { api } from "./api.service";

export interface PlanoGestaoOdonto {
    ID_PLANO: number;
    ID_OPERADORA: number;
    NM_OPERADORA: string;
    NR_CNPJ_OPERADORA?: string | null;
    NM_PLANO: string;
    DS_PLANO?: string | null;
    TP_COBRANCA:
    | "POR_PESSOA"
    | "POR_PLANO";
    NR_IDADE_MINIMA?: number | null;
    NR_IDADE_MAXIMA?: number | null;
    DT_VIGENCIA_INICIO_PLANO?:
    | string
    | null;
    DT_VIGENCIA_FIM_PLANO?:
    | string
    | null;
    SN_PLANO_ATIVO: number;
    ID_PLANO_VALOR?: number | null;
    VL_MENSALIDADE?: number | null;
    DT_VIGENCIA_INICIO_VALOR?:
    | string
    | null;

    DT_VIGENCIA_FIM_VALOR?:
    | string
    | null;

    SN_VALOR_ATIVO?: number | null;
}

export interface HistoricoValorPlano {
    ID_PLANO_VALOR: number;
    ID_PLANO: number;
    VL_MENSALIDADE: number;
    DT_VIGENCIA_INICIO: string;
    DT_VIGENCIA_FIM?: string | null;
    DT_CRIACAO: string;
    NM_USUARIO_CRIACAO?: string | null;
    LOGIN_USUARIO_CRIACAO?: string | null;
    SN_ATIVO: number;

    STATUS_VIGENCIA:
    | "AGENDADO"
    | "VIGENTE"
    | "ENCERRADO";
}

export interface HistoricoPlanoResponse {
    plano: {
        ID_PLANO: number;
        NM_PLANO: string;
        ID_OPERADORA: number;
        NM_OPERADORA: string;

        TP_COBRANCA:
        | "POR_PESSOA"
        | "POR_PLANO";

        SN_ATIVO: number;
    };

    valores: HistoricoValorPlano[];
}

export interface ReajustePlanoPayload {
    novoValor: number;
    dataInicioVigencia: string;
    nomeUsuario?: string | null;
    loginUsuario?: string | null;
}

export interface ReajustePlanoResponse {
    success: boolean;
    message: string;

    plano: {
        idPlano: number;
        nomePlano: string;
        operadora: string;
    };

    valorAnterior: {
        idPlanoValor: number;
        valor: number;
        dataInicio: string;
        dataFim: string;
    };

    novoValor: {
        idPlanoValor: number;
        valor: number;
        dataInicio: string;
    };
}

export interface OperadoraPlano {
    ID_OPERADORA: number;
    NM_OPERADORA: string;
    NR_CNPJ?: string | null;
}

export interface CriarPlanoPayload {
    idOperadora: number;
    nomePlano: string;
    descricao?: string | null;
    tipoCobranca: "POR_PESSOA" | "POR_PLANO";
    dataVigenciaInicioPlano?: string | null;
    valorInicial: number;
    dataVigenciaInicioValor: string;
    nomeUsuario?: string | null;
    loginUsuario?: string | null;
}

export interface CriarPlanoResponse {
    success: boolean;
    message: string;

    plano: {
        idPlano: number;
        nomePlano: string;
        idOperadora: number;
        operadora: string;
        tipoCobranca: "POR_PESSOA" | "POR_PLANO";
    };

    valorInicial: {
        idPlanoValor: number;
        valor: number;
        dataInicio: string;
    };
}

export interface AtualizarPlanoPayload {
    nomePlano: string;
    descricao?: string | null;
    tipoCobranca: "POR_PESSOA" | "POR_PLANO";
    dataVigenciaInicioPlano?: string | null;
    nomeUsuario?: string | null;
    loginUsuario?: string | null;
}


export async function listarPlanosGestao(): Promise<
    PlanoGestaoOdonto[]
> {
    const { data } =
        await api.get<PlanoGestaoOdonto[]>(
            "/v1/convenio-odontologico/gestao/planos"
        );

    return Array.isArray(data)
        ? data
        : [];
}

export async function listarHistoricoValoresPlano(
    idPlano: number
): Promise<HistoricoPlanoResponse> {
    const { data } =
        await api.get<HistoricoPlanoResponse>(
            `/v1/convenio-odontologico/gestao/planos/${idPlano}/valores`
        );

    return data;
}

export async function reajustarPlano(
    idPlano: number,
    payload: ReajustePlanoPayload
): Promise<ReajustePlanoResponse> {
    const { data } =
        await api.post<ReajustePlanoResponse>(
            `/v1/convenio-odontologico/gestao/planos/${idPlano}/reajuste`,
            payload
        );

    return data;
}

export async function listarOperadorasPlanos(): Promise<OperadoraPlano[]> {
    const { data } = await api.get<OperadoraPlano[]>(
        "/v1/convenio-odontologico/operadoras"
    );

    return Array.isArray(data) ? data : [];
}

export async function criarPlano(
    payload: CriarPlanoPayload
): Promise<CriarPlanoResponse> {
    const { data } = await api.post<CriarPlanoResponse>(
        "/v1/convenio-odontologico/gestao/planos",
        payload
    );

    return data;
}

export async function atualizarPlano(
    idPlano: number,
    payload: AtualizarPlanoPayload
) {
    const { data } = await api.put(
        `/v1/convenio-odontologico/gestao/planos/${idPlano}`,
        payload
    );

    return data;
}

export async function alterarStatusPlano(
    idPlano: number,
    ativo: boolean
) {
    const { data } = await api.patch(
        `/v1/convenio-odontologico/gestao/planos/${idPlano}/status`,
        {
            ativo,
        }
    );

    return data;
}