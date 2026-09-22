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

export interface CriarEmpresaOdontoPayload {
    nomeEmpresa: string;
    cnpj: string | null;
    cidade: string;
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

export interface ResultadoFolhaOdontologico {
    competencia: string;
    referencia: string;
    enviado: boolean;
    destinatario: string;
    empresas: Array<{
        empresa: string;
        titulares: number;
        total: number;
        arquivo?: string;
    }>;
    totalGeral: number;
    ignoradas: string[];
}

export interface CalendarioFolhaOdontologico {
    ID_ODONTO_FOLHA_CALENDARIO: number;
    CD_COMPETENCIA_CORTE: string;
    ID_EMPRESA: number;
    NM_EMPRESA: string;
    DT_CORTE: string;
    DT_CORTE_EFETIVO: string;
    DT_ENVIO_AVISO: string;
    DT_ENVIO_AVISO_EFETIVO: string;
    ST_FECHAMENTO: "ABERTO" | "FECHADO" | "ERRO";
    ST_AVISO: "PENDENTE" | "ENVIADO" | "FALHA";
    DS_ERRO_FECHAMENTO?: string | null;
    DS_ERRO_AVISO?: string | null;
}

export async function listarCalendarioFolhaOdontologico(competencia?: string): Promise<CalendarioFolhaOdontologico[]> {
    const { data } = await api.get<CalendarioFolhaOdontologico[]>(
        "/v1/convenio-odontologico/folha/calendario",
        { params: competencia ? { competencia } : undefined }
    );
    return Array.isArray(data) ? data : [];
}

export async function salvarCalendarioFolhaOdontologico(payload: { competencia: string; idEmpresa: number; dataCorte: string; dataEnvioAviso: string; }) {
    const { data } = await api.post(
        "/v1/convenio-odontologico/folha/calendario",
        payload,
        { headers: getAuditoriaHeaders() }
    );
    return data;
}

export interface FiltrosRelatorioOdonto {
    idEmpresa?: number;
    cpf?: string;
    idTipoBeneficiario?: number;
    idOperadora?: number;
    idPlano?: number;
    valor?: number;
    status?: "ATIVO" | "INATIVO";
    tipoCobranca?:
        | "POR_PESSOA"
        | "POR_PLANO";

    matricula?: string;
    titular?: string;
    dataInclusaoDe?: string;
    dataInclusaoAte?: string;
    dataExclusaoDe?: string;
    dataExclusaoAte?: string;
    possuiContaCapital?:
        | "SIM"
        | "NAO";

    integralizacaoIndeterminada?:
        | "S"
        | "N";
}

export interface InformeCompetencia {
    MES_REFERENCIA: number;
    NM_ARQUIVO: string;
    NR_TOTAL_REGISTROS: number;
    SN_PROCESSADO: number;
}

export interface InformeDependente {
    cpf: string;
    nome: string;
    parentesco?: string | null;
    valorAnual: number;
    mesesPresente: number;
}

export interface InformeFamilia {
    matricula?: string | null;
    cpfTitular: string;
    nomeTitular: string;
    valorProprioTitular: number;
    valorTotalFamilia: number;
    mesesTitular: number;
    dependentes: InformeDependente[];
}

export interface InformeConsolidadoResponse {
    anoCalendario: number;
    totalCompetencias: number;
    competencias: InformeCompetencia[];
    resumo: {
        totalFamilias: number;
        totalFamiliasComTitular: number;
        totalFamiliasSemTitular: number;
        totalPessoas: number;
    };
    familias: InformeFamilia[];
    inconsistencias: {
        familiasSemTitular: any[];
    };
}

export interface HistoricoEmpresaBeneficiario {
    ID_HISTORICO: number;
    ID_BENEFICIARIO: number;
    ID_EMPRESA: number;
    NM_EMPRESA: string;
    NR_CNPJ?: string | null;
    DT_INICIO: string;
    DT_FIM?: string | null;
    NM_USUARIO_CRIACAO?: string | null;
    LOGIN_USUARIO_CRIACAO?: string | null;
    DT_CRIACAO: string;
    STATUS_VINCULO: "ATUAL" | "ENCERRADO";
}

export interface HistoricoEmpresasBeneficiarioResponse {
    beneficiario: {
        ID_BENEFICIARIO: number;
        NM_BENEFICIARIO: string;
        NR_CPF: string;
    };
    historico: HistoricoEmpresaBeneficiario[];
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

export async function criarEmpresaOdonto(
    payload: CriarEmpresaOdontoPayload
) {
    const { data } = await api.post(
        "/v1/convenio-odontologico/empresas",
        payload,
        {
            headers: getAuditoriaHeaders(),
        }
    );

    return data;
}

export async function testarEnvioFolhaOdontologico(): Promise<ResultadoFolhaOdontologico> {
    const { data } = await api.post<ResultadoFolhaOdontologico>(
        "/v1/convenio-odontologico/folha/testar-envio",
        {},
        { headers: getAuditoriaHeaders() }
    );

    return data;
}

export type ResultadoTestePendenciaOdonto = {
    processadas: number;
    resolvidasManualmente: number;
    avisos: number;
    desligadas: number;
    erros: number;
    ignoradasTeste: number;
};

export async function executarTestePendenciasOdonto(nivel: 1 | 2 | 3): Promise<ResultadoTestePendenciaOdonto> {
    const { data } = await api.post<ResultadoTestePendenciaOdonto>(
        "/v1/convenio-odontologico/folha/testar-automacao",
        { nivel },
        { headers: getAuditoriaHeaders() }
    );
    return data;
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
    somenteAtivos = false,
    somenteInativos = false
): Promise<BeneficiarioOdonto[]> {
    const { data } = await api.get<BeneficiarioOdonto[]>(
        "/v1/convenio-odontologico/beneficiarios",
        {
            params: {
                somenteAtivos: somenteAtivos ? 1 : 0,
                somenteInativos: somenteInativos ? 1 : 0,
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

export async function buscarRelatorioBeneficiarios(
    filtros: FiltrosRelatorioOdonto
): Promise<BeneficiarioOdonto[]> {
    const { data } = await api.get<
        BeneficiarioOdonto[]
    >(
        "/v1/convenio-odontologico/relatorios/beneficiarios",
        {
            params: filtros,
        }
    );

    return Array.isArray(data)
        ? data
        : [];
}

export async function buscarInformeConsolidado(
    ano: number
): Promise<InformeConsolidadoResponse> {
    const { data } =
        await api.get<InformeConsolidadoResponse>(
            "/v1/convenio-odontologico/informes/consolidado",
            {
                params: {
                    ano,
                },
            }
        );

    return data;
}

export async function listarImportacoesInforme(
    ano: number
) {
    const { data } = await api.get(
        "/v1/convenio-odontologico/informes/importacoes",
        {
            params: {
                ano,
            },
        }
    );

    return Array.isArray(data)
        ? data
        : [];
}

export async function importarInformeOdontologico(
    anoCalendario: number,
    mesReferencia: number,
    arquivo: File
) {
    const { data } = await api.postForm(
        "/v1/convenio-odontologico/informes/importar",
        {
            anoCalendario: String(anoCalendario),
            mesReferencia: String(mesReferencia),
            file: arquivo,
        },
        {
            headers: {
                ...getAuditoriaHeaders(),
            },
        }
    );

    return data;
}

export async function listarHistoricoEmpresasBeneficiario(
    id: number
): Promise<HistoricoEmpresasBeneficiarioResponse> {
    const { data } =
        await api.get<HistoricoEmpresasBeneficiarioResponse>(
            `/v1/convenio-odontologico/beneficiarios/${id}/historico-empresas`
        );

    return {
        beneficiario: data.beneficiario,
        historico: Array.isArray(data.historico)
            ? data.historico
            : [],
    };
}
