import { api } from "./api.service";
import { getAuditoriaHeaders } from "@/utils/auditoria-headers";

export interface TipoBeneficiario {
    ID_TIPO_BENEFICIARIO: number;
    CD_TIPO_BENEFICIARIO: string;
    NM_TIPO_BENEFICIARIO: string;
}

export interface Operadora {
    ID_OPERADORA: number;
    NM_OPERADORA: string;
    NR_CNPJ?: string | null;
}

export interface EmpresaOdonto {
    ID_EMPRESA: number;
    NM_EMPRESA: string;
    NR_CNPJ?: string | null;
}

export interface PlanoOdonto {
    ID_PLANO: number;
    ID_OPERADORA: number;
    NM_OPERADORA: string;
    NM_PLANO: string;
    DS_PLANO?: string | null;
    TP_COBRANCA: "POR_PESSOA" | "POR_PLANO";
    NR_IDADE_MINIMA?: number | null;
    NR_IDADE_MAXIMA?: number | null;
    DT_VIGENCIA_INICIO?: string | null;
    DT_VIGENCIA_FIM?: string | null;
}

export interface ValorPlanoOdonto {
    ID_PLANO_VALOR: number;
    ID_PLANO: number;
    NM_PLANO: string;
    TP_COBRANCA: "POR_PESSOA" | "POR_PLANO";
    VL_MENSALIDADE: number;
    DT_VIGENCIA_INICIO: string;
    DT_VIGENCIA_FIM?: string | null;
}

export interface BeneficiarioOdonto {
    ID_BENEFICIARIO: number;
    NM_BENEFICIARIO: string;
    NR_CPF: string;
    DT_NASCIMENTO: string;
    ID_TIPO_BENEFICIARIO: number;
    CD_TIPO_BENEFICIARIO?: string;
    NM_TIPO_BENEFICIARIO?: string;
    ID_EMPRESA: number;
    NM_EMPRESA?: string;
    ID_PLANO: number;
    NM_PLANO?: string;
    TP_COBRANCA?: "POR_PESSOA" | "POR_PLANO";
    ID_OPERADORA?: number;
    NM_OPERADORA?: string;
    ID_TITULAR?: number | null;
    NM_TITULAR?: string | null;
    NR_MATRICULA?: string | null;
    DT_INCLUSAO_PLANO?: string | null;
    DT_EXCLUSAO_PLANO?: string | null;
    DS_OBSERVACAO?: string | null;
    SN_ATIVO: number;
    VL_MENSALIDADE?: number | null;
    NR_CONTA_CAPITAL?: number | null;
    DT_MATRICULA_CONTA_CAPITAL?: string | null;
    DT_SAIDA_CONTA_CAPITAL?: string | null;
    SN_CONTA_CAPITAL?: string | null;
    SN_INDICADOR_POSSUI_INTEGRALIZACAO_INDETERMINADA?:
    | string
    | null;
    DT_MOVIMENTO_CONTA_CAPITAL?: string | null;
    DT_ATUALIZACAO_CONTA_CAPITAL?: string | null;
}

export interface EditarBeneficiarioPayload {
    nome: string;
    cpf: string;
    dataNascimento: string;
    idTipoBeneficiario: number;
    idEmpresa: number;
    idPlano: number;
    idTitular: number | null;
    nrMatricula: string | null;
    observacao: string | null;
    nomeUsuario: string;
    loginUsuario: string;
}

export interface CriarBeneficiarioPayload {
    nome: string;
    cpf: string;
    dataNascimento: string;
    idTipoBeneficiario: number;
    idEmpresa: number;
    idPlano: number;
    idTitular: number | null;
    nrMatricula: string | null;
    observacao: string | null;
    nomeUsuario: string;
    loginUsuario: string;
}

export interface InativarBeneficiarioPayload {
    nomeUsuario: string;
    loginUsuario: string;
    observacao?: string | null;
}

export async function listarTiposBeneficiario(): Promise<
    TipoBeneficiario[]
> {
    const { data } = await api.get<TipoBeneficiario[]>(
        "/v1/convenio-odontologico/tipos-beneficiario"
    );

    return Array.isArray(data) ? data : [];
}

export async function listarOperadoras(): Promise<Operadora[]> {
    const { data } = await api.get<Operadora[]>(
        "/v1/convenio-odontologico/operadoras"
    );

    return Array.isArray(data) ? data : [];
}

export async function listarEmpresasOdonto(): Promise<EmpresaOdonto[]> {
    const { data } = await api.get<EmpresaOdonto[]>(
        "/v1/convenio-odontologico/empresas"
    );

    return Array.isArray(data) ? data : [];
}

export async function listarPlanos(
    idOperadora?: number
): Promise<PlanoOdonto[]> {
    const { data } = await api.get<PlanoOdonto[]>(
        "/v1/convenio-odontologico/planos",
        {
            params: idOperadora
                ? {
                    idOperadora,
                }
                : undefined,
        }
    );

    return Array.isArray(data) ? data : [];
}

export async function buscarValorVigentePlano(
    idPlano: number
): Promise<ValorPlanoOdonto> {
    const { data } = await api.get<ValorPlanoOdonto>(
        `/v1/convenio-odontologico/planos/${idPlano}/valor-vigente`
    );

    return data;
}

export async function listarBeneficiarios(
    somenteAtivos = true
): Promise<BeneficiarioOdonto[]> {
    const { data } = await api.get<BeneficiarioOdonto[]>(
        "/v1/convenio-odontologico/beneficiarios",
        {
            params: {
                somenteAtivos: somenteAtivos ? 1 : 0,
            },
        }
    );

    return Array.isArray(data) ? data : [];
}

export async function buscarBeneficiarioPorCpf(
    cpf: string
): Promise<BeneficiarioOdonto> {
    const cpfLimpo = cpf.replace(/\D/g, "");

    const { data } = await api.get<BeneficiarioOdonto>(
        `/v1/convenio-odontologico/beneficiarios/cpf/${cpfLimpo}`
    );

    return data;
}

export async function buscarBeneficiarioPorId(
    id: number
): Promise<BeneficiarioOdonto> {
    const { data } = await api.get<BeneficiarioOdonto>(
        `/v1/convenio-odontologico/beneficiarios/${id}`
    );

    return data;
}

export async function listarDependentes(
    idTitular: number
): Promise<BeneficiarioOdonto[]> {
    const { data } = await api.get<BeneficiarioOdonto[]>(
        `/v1/convenio-odontologico/titulares/${idTitular}/dependentes`
    );

    return Array.isArray(data) ? data : [];
}

export async function editarBeneficiario(
    id: number,
    payload: EditarBeneficiarioPayload
) {
    const { data } = await api.put(
        `/v1/convenio-odontologico/beneficiarios/${id}`,
        payload,
        {
            headers: getAuditoriaHeaders(),
        }
    );

    return data;
}

export async function inativarBeneficiario(
    id: number,
    payload: InativarBeneficiarioPayload
) {
    const { data } = await api.patch(
        `/v1/convenio-odontologico/beneficiarios/${id}/inativar`,
        payload,
        {
            headers: getAuditoriaHeaders(),
        }
    );

    return data;
}

export async function criarBeneficiario(
    payload: CriarBeneficiarioPayload
) {
    const { data } = await api.post(
        "/v1/convenio-odontologico/beneficiarios",
        payload,
        {
            headers: getAuditoriaHeaders(),
        }
    );

    return data;
}