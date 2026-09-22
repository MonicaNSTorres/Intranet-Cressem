import { api } from "./api.service";

export type FavorecidoCnab = {
    CPF: string;
    IDCLIENTE?: string | null;
    BANCO: string;
    AGENCIA: string;
    CONTA: string;
    DV_CONTA: string;
    NOME: string;
    ENDERECO?: string | null;
    NUMERO?: string | null;
    COMPLEMENTO?: string | null;
    BAIRRO?: string | null;
    CEP?: string | null;
    CEP_COMPLEMENTO?: string | null;
    CIDADE?: string | null;
    UF?: string | null;
    CONTA_ATIVA?: string | null;

    TIPO_LAYOUT?: Exclude<
        TipoLayoutCnab,
        "SICOOB_BOLETO"
    >;

    BANCO_ORIGEM?: string;

    TIPO_TRANSFERENCIA?: 1 | 2;
    TIPO_TRANSFERENCIA_DESCRICAO?: string;
};

export type TransferenciaCnabPayload = {
    sequencia: number;
    cpfCnpj: string;
    banco: string;
    agencia: string;
    conta: string;
    dvConta: string;
    nome: string;
    valor: number;
    tipo: 1 | 2;
    descricao: string;
};

export type TipoInscricaoBoleto =
    | 0
    | 1
    | 2;

export type BoletoCnabPayload = {
    sequencia: number;
    codigoBarras: string;
    nomeCedente: string;
    dataVencimento?: string | null;
    valorTitulo: number;
    valorDescontoAbatimento?: number;
    valorMoraMulta?: number;
    dataPagamento?: string | null;
    valorPagamento: number;
    seuNumero?: string;
    nossoNumero?: string;
    sacadoTipoInscricao?: TipoInscricaoBoleto;
    sacadoDocumento?: string;
    sacadoNome?: string;
    cedenteTipoInscricao?: TipoInscricaoBoleto;
    cedenteDocumento?: string;
    cedenteNome?: string;
    sacadorTipoInscricao?: TipoInscricaoBoleto;
    sacadorDocumento?: string;
    sacadorNome?: string;
};

export type RegistroCnabPayload =
    | TransferenciaCnabPayload
    | BoletoCnabPayload;

export type RemessaCnab = {
    ID_REMESSA: number;
    NM_ARQUIVO: string;
    DT_GERACAO: string;
    QT_PAGAMENTOS: number;
    VL_TOTAL: number;
    STATUS: string;
    TIPO_LAYOUT?: TipoLayoutCnab;
};

export type DetalheRemessaCnab = {
    ID_DETALHE: number;
    ID_LOTE: number;
    NR_LOTE: number;
    SEQ: number;
    CPF: string;
    BANCO: string;
    AGENCIA: string;
    CONTA: string;
    DV_CONTA: string;
    NOME: string;
    VALOR: number;
    TIPO: number;
    DESCRICAO?: string | null;
    CREATED_AT: string;
};

export type BoletoRemessaCnab = {
    ID_DETALHE: number;
    ID_LOTE: number;
    NR_LOTE: number;
    SEQ: number;

    CODIGO_BARRAS: string;

    NOME_CEDENTE: string;
    TIPO_INSCRICAO_CEDENTE: TipoInscricaoBoleto;
    DOCUMENTO_CEDENTE?: string | null;

    DATA_VENCIMENTO?: string | null;

    VALOR_TITULO: number;
    VALOR_DESCONTO_ABATIMENTO: number;
    VALOR_MORA_MULTA: number;

    DATA_PAGAMENTO?: string | null;
    VALOR_PAGAMENTO: number;

    SEU_NUMERO?: string | null;
    NOSSO_NUMERO?: string | null;

    TIPO_INSCRICAO_SACADO: TipoInscricaoBoleto;
    DOCUMENTO_SACADO?: string | null;
    NOME_SACADO?: string | null;

    TIPO_INSCRICAO_SACADOR: TipoInscricaoBoleto;
    DOCUMENTO_SACADOR?: string | null;
    NOME_SACADOR?: string | null;

    CREATED_AT: string;
};

export type TipoLayoutCnab =
    | "SANTANDER"
    | "SICOOB"
    | "SICOOB_BOLETO";

export async function buscarFavorecidoPorCpf(
    cpf: string,
    tipoLayout: Exclude<
        TipoLayoutCnab,
        "SICOOB_BOLETO"
    >
): Promise<FavorecidoCnab> {
    const cpfLimpo =
        cpf.replace(/\D/g, "");

    const response =
        await api.get(
            `/v1/cnab240/favorecido/${cpfLimpo}`,
            {
                params: {
                    tipoLayout,
                },
            }
        );

    return response.data;
}

export async function listarRemessas(): Promise<RemessaCnab[]> {
    const response = await api.get(
        "/v1/cnab240/remessas"
    );

    return Array.isArray(response.data)
        ? response.data
        : [];
}

export async function gerarCnab240PorExcel(
    file: File,
    tipoLayout: TipoLayoutCnab
): Promise<Blob> {
    const formData = new FormData();

    formData.append("file", file, file.name);
    formData.append("tipoLayout", tipoLayout);

    const response = await api.post<Blob>(
        "/v1/cnab240/gerar",
        formData,
        {
            responseType: "blob",
            timeout: 60000,
        }
    );

    return response.data;
}

export async function gerarCnab240PorRegistros(
    registros: RegistroCnabPayload[],
    tipoLayout: TipoLayoutCnab
): Promise<Blob> {
    const response = await api.post<Blob>(
        "/v1/cnab240/gerar-transferencias",
        {
            registros,
            tipoLayout,
        },
        {
            responseType: "blob",
            timeout: 60000,
        }
    );

    return response.data;
}

export async function gerarCnab240PorTransferencias(
    transferencias: TransferenciaCnabPayload[],
    tipoLayout: TipoLayoutCnab
): Promise<Blob> {
    return gerarCnab240PorRegistros(
        transferencias,
        tipoLayout
    );
}

export async function importarRetorno(
    file: File
): Promise<any> {
    const formData = new FormData();

    formData.append("file", file, file.name);

    const response = await api.post(
        "/v1/cnab240/importar-retorno",
        formData,
        {
            timeout: 60000,
        }
    );

    return response.data;
}

export async function listarDetalhesRemessa(
    idLote: number
): Promise<DetalheRemessaCnab[]> {
    const response = await api.get(
        `/v1/cnab240/remessas/${idLote}/detalhes`
    );

    return Array.isArray(response.data)
        ? response.data
        : [];
}

export async function gerarCnab240PorBoletos(
    boletos: BoletoCnabPayload[]
): Promise<Blob> {
    return gerarCnab240PorRegistros(
        boletos,
        "SICOOB_BOLETO"
    );
}

export async function listarBoletosRemessa(
    idLote: number
): Promise<BoletoRemessaCnab[]> {
    const response = await api.get(
        `/v1/cnab240/remessas/${idLote}/boletos`
    );

    return Array.isArray(response.data)
        ? response.data
        : [];
}