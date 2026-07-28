import { api } from "./api.service";

export type OrientacaoBancoImagem =
    | "HORIZONTAL"
    | "VERTICAL"
    | "QUADRADA";

export type StatusBancoImagem =
    | "S"
    | "N";

export type OrdenacaoBancoImagem =
    | "RECENTES"
    | "ANTIGAS"
    | "TITULO_ASC"
    | "TITULO_DESC"
    | "MAIS_BAIXADAS";

export type FiltroStatusBancoImagem =
    | "ATIVOS"
    | "INATIVOS"
    | "TODOS";

export type FiltroDestaqueBancoImagem =
    | "S"
    | "N"
    | "TODOS";

export type CategoriaBancoImagem = {
    ID_CATEGORIA: number;
    NM_CATEGORIA: string;
    DS_CATEGORIA?: string | null;
    ST_ATIVO: StatusBancoImagem;
    CRIADO_POR?: string | null;
    DT_CRIACAO?: string | null;
    ATUALIZADO_POR?: string | null;
    DT_ATUALIZACAO?: string | null;
    QTD_IMAGENS?: number;
};

export type BancoImagemItem = {
    ID_IMAGEM: number;
    ID_CATEGORIA: number;
    NM_CATEGORIA?: string | null;
    NM_TITULO: string;
    DS_DESCRICAO?: string | null;
    DS_PALAVRAS_CHAVE?: string | null;
    DS_INSTRUCOES_USO?: string | null;
    NM_ARQUIVO: string;
    TP_MIME: string;
    DS_EXTENSAO?: string | null;
    NR_TAMANHO_BYTES?: number | null;
    NR_LARGURA?: number | null;
    NR_ALTURA?: number | null;
    TP_ORIENTACAO: OrientacaoBancoImagem;
    ST_ATIVO: StatusBancoImagem;
    ST_DESTAQUE: StatusBancoImagem;
    DT_INICIO?: string | null;
    DT_FIM?: string | null;
    CRIADO_POR?: string | null;
    DT_CRIACAO?: string | null;
    ATUALIZADO_POR?: string | null;
    DT_ATUALIZACAO?: string | null;
    QTD_DOWNLOADS?: number;
};

export type PaginacaoBancoImagens = {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
    temAnterior: boolean;
    temProxima: boolean;
};

export type ListagemBancoImagensResponse = {
    items: BancoImagemItem[];
    pagination: PaginacaoBancoImagens;
};

export type FiltrosBancoImagens = {
    pagina?: number;
    limite?: number;
    busca?: string;
    idCategoria?: number | null;
    orientacao?: OrientacaoBancoImagem | null;
    status?: FiltroStatusBancoImagem;
    destaque?: FiltroDestaqueBancoImagem;
    ordenacao?: OrdenacaoBancoImagem;
};

export type BancoImagemFormData = {
    titulo: string;
    descricao?: string | null;
    palavrasChave?: string | null;
    instrucoesUso?: string | null;
    idCategoria: number;
    orientacao: OrientacaoBancoImagem;
    largura?: number | null;
    altura?: number | null;
    stAtivo?: StatusBancoImagem;
    stDestaque?: StatusBancoImagem;
    dtInicio?: string | null;
    dtFim?: string | null;
    file?: File | null;
};

export type CriarBancoImagemResponse = {
    message: string;
    idImagem?: number | null;
};

export type MensagemBancoImagemResponse = {
    message: string;
};

function criarFormData(
    dados: BancoImagemFormData,
    incluirArquivoObrigatorio: boolean
): FormData {
    const formData = new FormData();

    formData.append("titulo", dados.titulo.trim());
    formData.append("idCategoria", String(dados.idCategoria));
    formData.append("orientacao", dados.orientacao);
    formData.append("stAtivo", dados.stAtivo || "S");
    formData.append("stDestaque", dados.stDestaque || "N");

    if (dados.descricao?.trim()) {
        formData.append(
            "descricao",
            dados.descricao.trim()
        );
    }

    if (dados.palavrasChave?.trim()) {
        formData.append(
            "palavrasChave",
            dados.palavrasChave.trim()
        );
    }

    if (dados.instrucoesUso?.trim()) {
        formData.append(
            "instrucoesUso",
            dados.instrucoesUso.trim()
        );
    }

    if (dados.largura) {
        formData.append(
            "largura",
            String(dados.largura)
        );
    }

    if (dados.altura) {
        formData.append(
            "altura",
            String(dados.altura)
        );
    }

    if (dados.dtInicio) {
        formData.append(
            "dtInicio",
            dados.dtInicio
        );
    }

    if (dados.dtFim) {
        formData.append(
            "dtFim",
            dados.dtFim
        );
    }

    if (dados.file) {
        formData.append(
            "file",
            dados.file,
            dados.file.name
        );
    } else if (incluirArquivoObrigatorio) {
        throw new Error(
            "Selecione uma imagem para cadastrar."
        );
    }

    return formData;
}

export async function listarCategoriasBancoImagens(
    somenteAtivas: boolean = true
): Promise<CategoriaBancoImagem[]> {
    const response = await api.get(
        "/v1/banco-imagens/categorias",
        {
            params: {
                somenteAtivas: somenteAtivas
                    ? "S"
                    : "N",
            },
        }
    );

    return Array.isArray(response.data)
        ? response.data
        : [];
}

export async function listarBancoImagens(
    filtros: FiltrosBancoImagens = {}
): Promise<ListagemBancoImagensResponse> {
    const response =
        await api.get<ListagemBancoImagensResponse>(
            "/v1/banco-imagens",
            {
                params: {
                    pagina: filtros.pagina || 1,
                    limite: filtros.limite || 12,
                    busca:
                        filtros.busca?.trim() ||
                        undefined,
                    idCategoria:
                        filtros.idCategoria ||
                        undefined,
                    orientacao:
                        filtros.orientacao ||
                        undefined,
                    status:
                        filtros.status ||
                        "ATIVOS",
                    destaque:
                        filtros.destaque ||
                        "TODOS",
                    ordenacao:
                        filtros.ordenacao ||
                        "RECENTES",
                },
            }
        );

    return {
        items: Array.isArray(
            response.data?.items
        )
            ? response.data.items
            : [],
        pagination: response.data?.pagination || {
            pagina: filtros.pagina || 1,
            limite: filtros.limite || 12,
            total: 0,
            totalPaginas: 0,
            temAnterior: false,
            temProxima: false,
        },
    };
}

export async function buscarBancoImagemPorId(
    idImagem: number
): Promise<BancoImagemItem> {
    const response =
        await api.get<BancoImagemItem>(
            `/v1/banco-imagens/${idImagem}`
        );

    return response.data;
}

export async function criarBancoImagem(
    dados: BancoImagemFormData
): Promise<CriarBancoImagemResponse> {
    const formData =
        criarFormData(dados, true);

    const response =
        await api.post<CriarBancoImagemResponse>(
            "/v1/banco-imagens",
            formData,
            {
                timeout: 60000,
            }
        );

    return response.data;
}

export async function atualizarBancoImagem(
    idImagem: number,
    dados: BancoImagemFormData
): Promise<MensagemBancoImagemResponse> {
    const formData =
        criarFormData(dados, false);

    const response =
        await api.put<MensagemBancoImagemResponse>(
            `/v1/banco-imagens/${idImagem}`,
            formData,
            {
                timeout: 60000,
            }
        );

    return response.data;
}

export async function alterarStatusBancoImagem(
    idImagem: number,
    stAtivo: StatusBancoImagem
): Promise<MensagemBancoImagemResponse> {
    const response =
        await api.patch<MensagemBancoImagemResponse>(
            `/v1/banco-imagens/${idImagem}/status`,
            {
                stAtivo,
            }
        );

    return response.data;
}

export async function alterarDestaqueBancoImagem(
    idImagem: number,
    stDestaque: StatusBancoImagem
): Promise<MensagemBancoImagemResponse> {
    const response =
        await api.patch<MensagemBancoImagemResponse>(
            `/v1/banco-imagens/${idImagem}/destaque`,
            {
                stDestaque,
            }
        );

    return response.data;
}

export async function excluirBancoImagem(
    idImagem: number
): Promise<MensagemBancoImagemResponse> {
    const response =
        await api.delete<MensagemBancoImagemResponse>(
            `/v1/banco-imagens/${idImagem}`
        );

    return response.data;
}

export function obterUrlPreviewBancoImagem(
    idImagem: number
): string {
    const baseURL =
        String(api.defaults.baseURL || "")
            .replace(/\/+$/, "");

    return `${baseURL}/v1/banco-imagens/${idImagem}/preview`;
}

export async function baixarBancoImagem(
    imagem: Pick<
        BancoImagemItem,
        "ID_IMAGEM" | "NM_ARQUIVO"
    >
): Promise<void> {
    const response =
        await api.get<Blob>(
            `/v1/banco-imagens/${imagem.ID_IMAGEM}/download`,
            {
                responseType: "blob",
                timeout: 60000,
            }
        );

    const blobUrl =
        window.URL.createObjectURL(
            response.data
        );

    const link =
        document.createElement("a");

    link.href = blobUrl;
    link.download =
        imagem.NM_ARQUIVO ||
        `imagem-${imagem.ID_IMAGEM}`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(blobUrl);
}