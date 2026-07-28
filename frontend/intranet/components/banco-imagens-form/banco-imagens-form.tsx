"use client";

import {
    ChangeEvent,
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    FaArrowDown,
    FaArrowLeft,
    FaArrowRight,
    FaCheck,
    FaDownload,
    FaEye,
    FaFileImage,
    FaImage,
    FaMagnifyingGlass,
    FaPen,
    FaPlus,
    FaRegStar,
    FaRotate,
    FaStar,
    FaTrash,
    FaXmark,
} from "react-icons/fa6";
import {
    alterarDestaqueBancoImagem,
    alterarStatusBancoImagem,
    atualizarBancoImagem,
    baixarBancoImagem,
    BancoImagemFormData,
    BancoImagemItem,
    CategoriaBancoImagem,
    criarBancoImagem,
    excluirBancoImagem,
    FiltroDestaqueBancoImagem,
    FiltroStatusBancoImagem,
    listarBancoImagens,
    listarCategoriasBancoImagens,
    obterUrlPreviewBancoImagem,
    OrdenacaoBancoImagem,
    OrientacaoBancoImagem,
} from "@/services/banco_imagens.service";

type BancoImagensFormProps = {
    modo: "usuario" | "administracao";
};

type MensagemTela = {
    tipo: "sucesso" | "erro";
    texto: string;
} | null;

type EstadoFormulario = {
    titulo: string;
    descricao: string;
    palavrasChave: string;
    instrucoesUso: string;
    idCategoria: string;
    orientacao: OrientacaoBancoImagem;
    largura: string;
    altura: string;
    stAtivo: "S" | "N";
    stDestaque: "S" | "N";
    dtInicio: string;
    dtFim: string;
    file: File | null;
};

const FORMULARIO_INICIAL: EstadoFormulario = {
    titulo: "",
    descricao: "",
    palavrasChave: "",
    instrucoesUso: "",
    idCategoria: "",
    orientacao: "HORIZONTAL",
    largura: "",
    altura: "",
    stAtivo: "S",
    stDestaque: "N",
    dtInicio: "",
    dtFim: "",
    file: null,
};

const LIMITE_ARQUIVO_BYTES = 20 * 1024 * 1024;

function obterMensagemErro(error: unknown): string {
    const erro = error as {
        response?: {
            data?: {
                error?: string;
                details?: string;
            };
        };
        message?: string;
    };

    return (
        erro?.response?.data?.error ||
        erro?.response?.data?.details ||
        erro?.message ||
        "Não foi possível concluir a operação."
    );
}

function formatarTamanho(bytes?: number | null): string {
    if (!bytes || bytes <= 0) {
        return "Tamanho não informado";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarExtensao(imagem: BancoImagemItem): string {
    return (
        imagem.DS_EXTENSAO ||
        imagem.NM_ARQUIVO.split(".").pop() ||
        "Imagem"
    ).toUpperCase();
}

function obterDimensoes(imagem: BancoImagemItem): string {
    if (imagem.NR_LARGURA && imagem.NR_ALTURA) {
        return `${imagem.NR_LARGURA} × ${imagem.NR_ALTURA}`;
    }

    return "Dimensão não informada";
}

function obterRotuloOrientacao(
    orientacao: OrientacaoBancoImagem
): string {
    const rotulos: Record<OrientacaoBancoImagem, string> = {
        HORIZONTAL: "Horizontal",
        VERTICAL: "Vertical",
        QUADRADA: "Quadrada",
    };

    return rotulos[orientacao];
}

function converterImagemParaFormulario(
    imagem: BancoImagemItem
): EstadoFormulario {
    return {
        titulo: imagem.NM_TITULO || "",
        descricao: imagem.DS_DESCRICAO || "",
        palavrasChave: imagem.DS_PALAVRAS_CHAVE || "",
        instrucoesUso: imagem.DS_INSTRUCOES_USO || "",
        idCategoria: String(imagem.ID_CATEGORIA || ""),
        orientacao: imagem.TP_ORIENTACAO || "HORIZONTAL",
        largura: imagem.NR_LARGURA
            ? String(imagem.NR_LARGURA)
            : "",
        altura: imagem.NR_ALTURA
            ? String(imagem.NR_ALTURA)
            : "",
        stAtivo: imagem.ST_ATIVO || "S",
        stDestaque: imagem.ST_DESTAQUE || "N",
        dtInicio: imagem.DT_INICIO || "",
        dtFim: imagem.DT_FIM || "",
        file: null,
    };
}

export default function BancoImagensForm({
    modo,
}: BancoImagensFormProps) {
    const podeAdministrar =
        modo === "administracao";
    const [categorias, setCategorias] = useState<
        CategoriaBancoImagem[]
    >([]);

    const [imagens, setImagens] = useState<
        BancoImagemItem[]
    >([]);

    const [carregando, setCarregando] =
        useState(true);

    const [salvando, setSalvando] =
        useState(false);

    const [processandoId, setProcessandoId] =
        useState<number | null>(null);

    const [mensagem, setMensagem] =
        useState<MensagemTela>(null);

    const [buscaDigitada, setBuscaDigitada] =
        useState("");

    const [buscaAplicada, setBuscaAplicada] =
        useState("");

    const [idCategoria, setIdCategoria] =
        useState<number | null>(null);

    const [orientacao, setOrientacao] =
        useState<OrientacaoBancoImagem | null>(null);

    const [status, setStatus] =
        useState<FiltroStatusBancoImagem>(
            podeAdministrar ? "TODOS" : "ATIVOS"
        );

    const [destaque, setDestaque] =
        useState<FiltroDestaqueBancoImagem>("TODOS");

    const [ordenacao, setOrdenacao] =
        useState<OrdenacaoBancoImagem>("RECENTES");

    const [pagina, setPagina] =
        useState(1);

    const [total, setTotal] =
        useState(0);

    const [totalPaginas, setTotalPaginas] =
        useState(0);

    const [modalFormularioAberto, setModalFormularioAberto] =
        useState(false);

    const [modalVisualizacaoAberto, setModalVisualizacaoAberto] =
        useState(false);

    const [imagemSelecionada, setImagemSelecionada] =
        useState<BancoImagemItem | null>(null);

    const [imagemEmEdicao, setImagemEmEdicao] =
        useState<BancoImagemItem | null>(null);

    const [formulario, setFormulario] =
        useState<EstadoFormulario>(
            FORMULARIO_INICIAL
        );

    const [previewArquivo, setPreviewArquivo] =
        useState<string | null>(null);

    const carregarCategorias =
        useCallback(async () => {
            try {
                const resultado =
                    await listarCategoriasBancoImagens(
                        true
                    );

                setCategorias(resultado);
            } catch (error) {
                setMensagem({
                    tipo: "erro",
                    texto: obterMensagemErro(error),
                });
            }
        }, []);

    const carregarImagens =
        useCallback(async () => {
            try {
                setCarregando(true);

                const resultado =
                    await listarBancoImagens({
                        pagina,
                        limite: 12,
                        busca: buscaAplicada,
                        idCategoria,
                        orientacao,
                        status,
                        destaque,
                        ordenacao,
                    });

                setImagens(resultado.items);
                setTotal(
                    resultado.pagination.total
                );
                setTotalPaginas(
                    resultado.pagination
                        .totalPaginas
                );
            } catch (error) {
                setMensagem({
                    tipo: "erro",
                    texto: obterMensagemErro(error),
                });

                setImagens([]);
                setTotal(0);
                setTotalPaginas(0);
            } finally {
                setCarregando(false);
            }
        }, [
            buscaAplicada,
            destaque,
            idCategoria,
            ordenacao,
            orientacao,
            pagina,
            status,
        ]);

    useEffect(() => {
        carregarCategorias();
    }, [carregarCategorias]);

    useEffect(() => {
        carregarImagens();
    }, [carregarImagens]);

    useEffect(() => {
        return () => {
            if (previewArquivo) {
                URL.revokeObjectURL(
                    previewArquivo
                );
            }
        };
    }, [previewArquivo]);

    const categoriaSelecionada =
        useMemo(() => {
            if (!idCategoria) {
                return null;
            }

            return categorias.find(
                (categoria) =>
                    categoria.ID_CATEGORIA ===
                    idCategoria
            );
        }, [categorias, idCategoria]);

    function aplicarBusca(
        event?: FormEvent
    ) {
        event?.preventDefault();
        setPagina(1);
        setBuscaAplicada(
            buscaDigitada.trim()
        );
    }

    function limparFiltros() {
        setBuscaDigitada("");
        setBuscaAplicada("");
        setIdCategoria(null);
        setOrientacao(null);
        setStatus(
            podeAdministrar
                ? "TODOS"
                : "ATIVOS"
        );
        setDestaque("TODOS");
        setOrdenacao("RECENTES");
        setPagina(1);
    }

    function abrirNovoCadastro() {
        setImagemEmEdicao(null);
        setFormulario(
            FORMULARIO_INICIAL
        );
        setPreviewArquivo(null);
        setMensagem(null);
        setModalFormularioAberto(true);
    }

    function abrirEdicao(
        imagem: BancoImagemItem
    ) {
        setImagemEmEdicao(imagem);
        setFormulario(
            converterImagemParaFormulario(
                imagem
            )
        );
        setPreviewArquivo(null);
        setMensagem(null);
        setModalFormularioAberto(true);
    }

    function fecharFormulario() {
        if (salvando) {
            return;
        }

        if (previewArquivo) {
            URL.revokeObjectURL(
                previewArquivo
            );
        }

        setPreviewArquivo(null);
        setModalFormularioAberto(false);
        setImagemEmEdicao(null);
        setFormulario(
            FORMULARIO_INICIAL
        );
    }

    function abrirVisualizacao(
        imagem: BancoImagemItem
    ) {
        setImagemSelecionada(imagem);
        setModalVisualizacaoAberto(true);
    }

    function fecharVisualizacao() {
        setModalVisualizacaoAberto(false);
        setImagemSelecionada(null);
    }

    function atualizarCampoFormulario(
        campo: keyof EstadoFormulario,
        valor:
            | string
            | File
            | null
    ) {
        setFormulario((estadoAtual) => ({
            ...estadoAtual,
            [campo]: valor,
        }));
    }

    function selecionarArquivo(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const arquivo =
            event.target.files?.[0] ||
            null;

        if (!arquivo) {
            return;
        }

        const tiposPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
        ];

        if (
            !tiposPermitidos.includes(
                arquivo.type
            )
        ) {
            setMensagem({
                tipo: "erro",
                texto:
                    "Selecione uma imagem PNG, JPG, JPEG, WebP ou GIF.",
            });
            event.target.value = "";
            return;
        }

        if (
            arquivo.size >
            LIMITE_ARQUIVO_BYTES
        ) {
            setMensagem({
                tipo: "erro",
                texto:
                    "A imagem deve possuir no máximo 20 MB.",
            });
            event.target.value = "";
            return;
        }

        if (previewArquivo) {
            URL.revokeObjectURL(
                previewArquivo
            );
        }

        const urlTemporaria =
            URL.createObjectURL(arquivo);

        setPreviewArquivo(urlTemporaria);
        atualizarCampoFormulario(
            "file",
            arquivo
        );

        const imagem =
            new window.Image();

        imagem.onload = () => {
            let novaOrientacao:
                OrientacaoBancoImagem =
                "HORIZONTAL";

            if (
                imagem.naturalWidth ===
                imagem.naturalHeight
            ) {
                novaOrientacao =
                    "QUADRADA";
            } else if (
                imagem.naturalHeight >
                imagem.naturalWidth
            ) {
                novaOrientacao =
                    "VERTICAL";
            }

            setFormulario(
                (estadoAtual) => ({
                    ...estadoAtual,
                    largura: String(
                        imagem.naturalWidth
                    ),
                    altura: String(
                        imagem.naturalHeight
                    ),
                    orientacao:
                        novaOrientacao,
                })
            );
        };

        imagem.src = urlTemporaria;
    }

    async function salvarFormulario(
        event: FormEvent
    ) {
        event.preventDefault();

        if (
            !formulario.titulo.trim()
        ) {
            setMensagem({
                tipo: "erro",
                texto:
                    "Informe o título da imagem.",
            });
            return;
        }

        if (!formulario.idCategoria) {
            setMensagem({
                tipo: "erro",
                texto:
                    "Selecione uma categoria.",
            });
            return;
        }

        if (
            !imagemEmEdicao &&
            !formulario.file
        ) {
            setMensagem({
                tipo: "erro",
                texto:
                    "Selecione a imagem que será cadastrada.",
            });
            return;
        }

        if (
            formulario.dtInicio &&
            formulario.dtFim &&
            formulario.dtFim <
                formulario.dtInicio
        ) {
            setMensagem({
                tipo: "erro",
                texto:
                    "A data final não pode ser anterior à data inicial.",
            });
            return;
        }

        const dados: BancoImagemFormData = {
            titulo:
                formulario.titulo,
            descricao:
                formulario.descricao,
            palavrasChave:
                formulario.palavrasChave,
            instrucoesUso:
                formulario.instrucoesUso,
            idCategoria: Number(
                formulario.idCategoria
            ),
            orientacao:
                formulario.orientacao,
            largura: formulario.largura
                ? Number(
                      formulario.largura
                  )
                : null,
            altura: formulario.altura
                ? Number(
                      formulario.altura
                  )
                : null,
            stAtivo:
                formulario.stAtivo,
            stDestaque:
                formulario.stDestaque,
            dtInicio:
                formulario.dtInicio ||
                null,
            dtFim:
                formulario.dtFim ||
                null,
            file: formulario.file,
        };

        try {
            setSalvando(true);
            setMensagem(null);

            if (imagemEmEdicao) {
                const resposta =
                    await atualizarBancoImagem(
                        imagemEmEdicao.ID_IMAGEM,
                        dados
                    );

                setMensagem({
                    tipo: "sucesso",
                    texto:
                        resposta.message,
                });
            } else {
                const resposta =
                    await criarBancoImagem(
                        dados
                    );

                setMensagem({
                    tipo: "sucesso",
                    texto:
                        resposta.message,
                });
            }

            fecharFormulario();
            setPagina(1);
            await Promise.all([
                carregarCategorias(),
                carregarImagens(),
            ]);
        } catch (error) {
            setMensagem({
                tipo: "erro",
                texto: obterMensagemErro(
                    error
                ),
            });
        } finally {
            setSalvando(false);
        }
    }

    async function realizarDownload(
        imagem: BancoImagemItem
    ) {
        try {
            setProcessandoId(
                imagem.ID_IMAGEM
            );

            await baixarBancoImagem(
                imagem
            );

            setMensagem({
                tipo: "sucesso",
                texto:
                    "Download iniciado com sucesso.",
            });

            await carregarImagens();
        } catch (error) {
            setMensagem({
                tipo: "erro",
                texto: obterMensagemErro(
                    error
                ),
            });
        } finally {
            setProcessandoId(null);
        }
    }

    async function alternarStatus(
        imagem: BancoImagemItem
    ) {
        const novoStatus =
            imagem.ST_ATIVO === "S"
                ? "N"
                : "S";

        const acao =
            novoStatus === "S"
                ? "ativar"
                : "desativar";

        const confirmou =
            window.confirm(
                `Deseja ${acao} a imagem "${imagem.NM_TITULO}"?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessandoId(
                imagem.ID_IMAGEM
            );

            const resposta =
                await alterarStatusBancoImagem(
                    imagem.ID_IMAGEM,
                    novoStatus
                );

            setMensagem({
                tipo: "sucesso",
                texto:
                    resposta.message,
            });

            await Promise.all([
                carregarCategorias(),
                carregarImagens(),
            ]);
        } catch (error) {
            setMensagem({
                tipo: "erro",
                texto: obterMensagemErro(
                    error
                ),
            });
        } finally {
            setProcessandoId(null);
        }
    }

    async function alternarDestaque(
        imagem: BancoImagemItem
    ) {
        const novoDestaque =
            imagem.ST_DESTAQUE === "S"
                ? "N"
                : "S";

        try {
            setProcessandoId(
                imagem.ID_IMAGEM
            );

            const resposta =
                await alterarDestaqueBancoImagem(
                    imagem.ID_IMAGEM,
                    novoDestaque
                );

            setMensagem({
                tipo: "sucesso",
                texto:
                    resposta.message,
            });

            await carregarImagens();
        } catch (error) {
            setMensagem({
                tipo: "erro",
                texto: obterMensagemErro(
                    error
                ),
            });
        } finally {
            setProcessandoId(null);
        }
    }

    async function excluirImagem(
        imagem: BancoImagemItem
    ) {
        const confirmou =
            window.confirm(
                `A imagem "${imagem.NM_TITULO}" será excluída definitivamente. Deseja continuar?`
            );

        if (!confirmou) {
            return;
        }

        try {
            setProcessandoId(
                imagem.ID_IMAGEM
            );

            const resposta =
                await excluirBancoImagem(
                    imagem.ID_IMAGEM
                );

            setMensagem({
                tipo: "sucesso",
                texto:
                    resposta.message,
            });

            if (
                imagens.length === 1 &&
                pagina > 1
            ) {
                setPagina(
                    (paginaAtual) =>
                        paginaAtual - 1
                );
            } else {
                await carregarImagens();
            }

            await carregarCategorias();
        } catch (error) {
            setMensagem({
                tipo: "erro",
                texto: obterMensagemErro(
                    error
                ),
            });
        } finally {
            setProcessandoId(null);
        }
    }

    return (
        <>
            {mensagem && (
                <div
                    className={`mb-6 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${
                        mensagem.tipo ===
                        "sucesso"
                            ? "border-[#79B729]/25 bg-[#79B729]/10 text-[#41640F]"
                            : "border-red-200 bg-red-50 text-red-700"
                    }`}
                >
                    <div className="flex items-start gap-3">
                        {mensagem.tipo ===
                        "sucesso" ? (
                            <FaCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                            <FaXmark className="mt-0.5 h-4 w-4 shrink-0" />
                        )}

                        <span>
                            {mensagem.texto}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setMensagem(null)
                        }
                        className="rounded-lg p-1 transition hover:bg-black/5"
                        aria-label="Fechar mensagem"
                    >
                        <FaXmark />
                    </button>
                </div>
            )}

            <section className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.05)] sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="w-full">
                        <form
                            onSubmit={aplicarBusca}
                            className="relative"
                        >
                            <FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />

                            <input
                                type="text"
                                value={
                                    buscaDigitada
                                }
                                onChange={(event) =>
                                    setBuscaDigitada(
                                        event.target
                                            .value
                                    )
                                }
                                placeholder="Pesquisar por título, descrição, categoria ou palavra-chave"
                                className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white pl-11 pr-28 text-sm text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-primary focus:ring-4 focus:ring-primary/10"
                            />

                            <button
                                type="submit"
                                className="absolute right-1.5 top-1.5 h-9 rounded-xl bg-secondary px-4 text-sm font-semibold text-white transition hover:bg-primary"
                            >
                                Buscar
                            </button>
                        </form>
                    </div>

                    {podeAdministrar && (
                        <button
                            type="button"
                            onClick={
                                abrirNovoCadastro
                            }
                            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-secondary px-5 text-sm font-semibold text-white hover:bg-primary cursor-pointer"
                        >
                            <FaPlus />
                            Nova imagem
                        </button>
                    )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <select
                        value={
                            idCategoria || ""
                        }
                        onChange={(event) => {
                            setIdCategoria(
                                event.target.value
                                    ? Number(
                                          event.target
                                              .value
                                      )
                                    : null
                            );
                            setPagina(1);
                        }}
                        className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                    >
                        <option value="">
                            Todas as categorias
                        </option>

                        {categorias.map(
                            (categoria) => (
                                <option
                                    key={
                                        categoria.ID_CATEGORIA
                                    }
                                    value={
                                        categoria.ID_CATEGORIA
                                    }
                                >
                                    {
                                        categoria.NM_CATEGORIA
                                    }
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            orientacao || ""
                        }
                        onChange={(event) => {
                            setOrientacao(
                                (event.target
                                    .value ||
                                    null) as OrientacaoBancoImagem | null
                            );
                            setPagina(1);
                        }}
                        className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                    >
                        <option value="">
                            Todas as orientações
                        </option>
                        <option value="HORIZONTAL">
                            Horizontal
                        </option>
                        <option value="VERTICAL">
                            Vertical
                        </option>
                        <option value="QUADRADA">
                            Quadrada
                        </option>
                    </select>

                    {podeAdministrar && (
                        <select
                            value={status}
                            onChange={(event) => {
                                setStatus(
                                    event.target
                                        .value as FiltroStatusBancoImagem
                                );
                                setPagina(1);
                            }}
                            className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                        >
                            <option value="TODOS">
                                Todos os status
                            </option>
                            <option value="ATIVOS">
                                Ativas
                            </option>
                            <option value="INATIVOS">
                                Inativas
                            </option>
                        </select>
                    )}

                    <select
                        value={destaque}
                        onChange={(event) => {
                            setDestaque(
                                event.target
                                    .value as FiltroDestaqueBancoImagem
                            );
                            setPagina(1);
                        }}
                        className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                    >
                        <option value="TODOS">
                            Todas as imagens
                        </option>
                        <option value="S">
                            Somente destaques
                        </option>
                        {podeAdministrar && (
                            <option value="N">
                                Sem destaque
                            </option>
                        )}
                    </select>

                    <select
                        value={ordenacao}
                        onChange={(event) => {
                            setOrdenacao(
                                event.target
                                    .value as OrdenacaoBancoImagem
                            );
                            setPagina(1);
                        }}
                        className="h-11 rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                    >
                        <option value="RECENTES">
                            Mais recentes
                        </option>
                        <option value="ANTIGAS">
                            Mais antigas
                        </option>
                        <option value="TITULO_ASC">
                            Título A–Z
                        </option>
                        <option value="TITULO_DESC">
                            Título Z–A
                        </option>
                        <option value="MAIS_BAIXADAS">
                            Mais baixadas
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={limparFiltros}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:border-primary hover:text-[#007F73]"
                    >
                        <FaRotate />
                        Limpar filtros
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-sm text-[#667085]">
                        <span className="font-semibold text-[#101828]">
                            {total}
                        </span>{" "}
                        {total === 1
                            ? "imagem encontrada"
                            : "imagens encontradas"}
                        {categoriaSelecionada
                            ? ` em ${categoriaSelecionada.NM_CATEGORIA}`
                            : ""}
                    </p>

                    <p className="text-xs text-[#98A2B3]">
                        Clique em uma imagem para
                        visualizar os detalhes.
                    </p>
                </div>
            </section>

            {carregando ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({
                        length: 8,
                    }).map((_, index) => (
                        <div
                            key={index}
                            className="animate-pulse overflow-hidden rounded-[26px] border border-slate-200 bg-white"
                        >
                            <div className="aspect-4/3 bg-slate-200" />
                            <div className="space-y-3 p-5">
                                <div className="h-5 w-3/4 rounded bg-slate-200" />
                                <div className="h-4 w-1/2 rounded bg-slate-100" />
                                <div className="h-10 rounded-xl bg-slate-100" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : imagens.length === 0 ? (
                <div className="flex min-h-90 flex-col items-center justify-center rounded-[28px] border border-dashed border-[#D0D5DD] bg-white px-6 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FaImage className="h-7 w-7" />
                    </div>

                    <h2 className="text-lg font-semibold text-[#101828]">
                        Nenhuma imagem encontrada
                    </h2>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[#667085]">
                        Ajuste os filtros ou faça uma
                        nova busca. Administradores
                        também podem cadastrar o
                        primeiro material desta
                        categoria.
                    </p>

                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={limparFiltros}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:border-primary hover:text-[#007F73]"
                        >
                            <FaRotate />
                            Limpar filtros
                        </button>

                        {podeAdministrar && (
                            <button
                                type="button"
                                onClick={
                                    abrirNovoCadastro
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary"
                            >
                                <FaPlus />
                                Nova imagem
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {imagens.map(
                            (imagem) => {
                                const processando =
                                    processandoId ===
                                    imagem.ID_IMAGEM;

                                return (
                                    <article
                                        key={
                                            imagem.ID_IMAGEM
                                        }
                                        className={`group overflow-hidden rounded-[26px] border bg-white shadow-[0_10px_30px_rgba(16,24,40,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(16,24,40,0.11)] ${
                                            imagem.ST_ATIVO ===
                                            "N"
                                                ? "border-red-200 opacity-75"
                                                : "border-slate-200"
                                        }`}
                                    >
                                        <div className="relative aspect-4/3 overflow-hidden bg-[#F2F4F7]">
                                            <img
                                                src={obterUrlPreviewBancoImagem(
                                                    imagem.ID_IMAGEM
                                                )}
                                                alt={
                                                    imagem.NM_TITULO
                                                }
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                            />

                                            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/5 to-transparent opacity-0 transition group-hover:opacity-100" />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirVisualizacao(
                                                        imagem
                                                    )
                                                }
                                                className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                                                aria-label={`Visualizar ${imagem.NM_TITULO}`}
                                            >
                                                <span className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-[#101828] shadow-lg backdrop-blur">
                                                    <FaEye />
                                                    Visualizar
                                                </span>
                                            </button>

                                            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                                {imagem.ST_DESTAQUE ===
                                                    "S" && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow">
                                                        <FaStar />
                                                        Destaque
                                                    </span>
                                                )}

                                                {imagem.ST_ATIVO ===
                                                    "N" && (
                                                    <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                                                        Inativa
                                                    </span>
                                                )}
                                            </div>

                                            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                                                {formatarExtensao(
                                                    imagem
                                                )}
                                            </span>
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-3">
                                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                                                    {imagem.NM_CATEGORIA ||
                                                        "Sem categoria"}
                                                </p>

                                                <h3
                                                    className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[#101828]"
                                                    title={
                                                        imagem.NM_TITULO
                                                    }
                                                >
                                                    {
                                                        imagem.NM_TITULO
                                                    }
                                                </h3>
                                            </div>

                                            <div className="mb-4 flex flex-wrap gap-2 text-xs text-[#667085]">
                                                <span className="rounded-lg bg-[#F2F4F7] px-2.5 py-1.5">
                                                    {obterDimensoes(
                                                        imagem
                                                    )}
                                                </span>
                                                <span className="rounded-lg bg-[#F2F4F7] px-2.5 py-1.5">
                                                    {formatarTamanho(
                                                        imagem.NR_TAMANHO_BYTES
                                                    )}
                                                </span>
                                                <span className="rounded-lg bg-[#F2F4F7] px-2.5 py-1.5">
                                                    {imagem.QTD_DOWNLOADS ||
                                                        0}{" "}
                                                    downloads
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        processando
                                                    }
                                                    onClick={() =>
                                                        realizarDownload(
                                                            imagem
                                                        )
                                                    }
                                                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary cursor-pointer disabled:opacity-60"
                                                >
                                                    <FaDownload />
                                                    Baixar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        abrirVisualizacao(
                                                            imagem
                                                        )
                                                    }
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D0D5DD] text-[#475467] transition hover:border-primary hover:text-primary"
                                                    aria-label="Visualizar imagem"
                                                >
                                                    <FaEye />
                                                </button>
                                            </div>

                                            {podeAdministrar && (
                                                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                                    <div className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                processando
                                                            }
                                                            onClick={() =>
                                                                alternarDestaque(
                                                                    imagem
                                                                )
                                                            }
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-amber-500 transition hover:bg-amber-50 disabled:opacity-50 cursor-pointer"
                                                            aria-label={
                                                                imagem.ST_DESTAQUE ===
                                                                "S"
                                                                    ? "Remover destaque"
                                                                    : "Destacar imagem"
                                                            }
                                                        >
                                                            {imagem.ST_DESTAQUE ===
                                                            "S" ? (
                                                                <FaStar />
                                                            ) : (
                                                                <FaRegStar />
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                processando
                                                            }
                                                            onClick={() =>
                                                                abrirEdicao(
                                                                    imagem
                                                                )
                                                            }
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#475467] transition hover:bg-[#F2F4F7] hover:text-[#101828] disabled:opacity-50 cursor-pointer"
                                                            aria-label="Editar imagem"
                                                        >
                                                            <FaPen />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                processando
                                                            }
                                                            onClick={() =>
                                                                excluirImagem(
                                                                    imagem
                                                                )
                                                            }
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                                                            aria-label="Excluir imagem"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processando
                                                        }
                                                        onClick={() =>
                                                            alternarStatus(
                                                                imagem
                                                            )
                                                        }
                                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                                            imagem.ST_ATIVO ===
                                                            "S"
                                                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                                                : "bg-[#79B729]/10 text-[#527D16] hover:bg-[#79B729]/20"
                                                        }`}
                                                    >
                                                        {imagem.ST_ATIVO ===
                                                        "S"
                                                            ? "Desativar"
                                                            : "Ativar"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>

                    {totalPaginas > 1 && (
                        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row">
                            <p className="text-sm text-[#667085]">
                                Página{" "}
                                <span className="font-semibold text-[#101828]">
                                    {pagina}
                                </span>{" "}
                                de{" "}
                                <span className="font-semibold text-[#101828]">
                                    {totalPaginas}
                                </span>
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        pagina <= 1
                                    }
                                    onClick={() =>
                                        setPagina(
                                            (valor) =>
                                                Math.max(
                                                    1,
                                                    valor -
                                                        1
                                                )
                                        )
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#344054] transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <FaArrowLeft />
                                    Anterior
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        pagina >=
                                        totalPaginas
                                    }
                                    onClick={() =>
                                        setPagina(
                                            (valor) =>
                                                Math.min(
                                                    totalPaginas,
                                                    valor +
                                                        1
                                                )
                                        )
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Próxima
                                    <FaArrowRight />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {modalVisualizacaoAberto &&
                imagemSelecionada && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#101828]/70 p-4 backdrop-blur-sm">
                        <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
                            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                        {imagemSelecionada.NM_CATEGORIA ||
                                            "Banco de Imagens"}
                                    </p>
                                    <h2 className="mt-1 text-xl font-semibold text-[#101828]">
                                        {
                                            imagemSelecionada.NM_TITULO
                                        }
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        fecharVisualizacao
                                    }
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-[#475467] transition hover:bg-slate-50"
                                    aria-label="Fechar visualização"
                                >
                                    <FaXmark />
                                </button>
                            </div>

                            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
                                <div className="flex min-h-90 items-center justify-center bg-[#F2F4F7] p-4 sm:p-6">
                                    <img
                                        src={obterUrlPreviewBancoImagem(
                                            imagemSelecionada.ID_IMAGEM
                                        )}
                                        alt={
                                            imagemSelecionada.NM_TITULO
                                        }
                                        className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-lg"
                                    />
                                </div>

                                <aside className="space-y-6 p-5 sm:p-6">
                                    {imagemSelecionada.DS_DESCRICAO && (
                                        <div>
                                            <h3 className="mb-2 text-sm font-semibold text-[#101828]">
                                                Descrição
                                            </h3>
                                            <p className="whitespace-pre-line text-sm leading-6 text-[#667085]">
                                                {
                                                    imagemSelecionada.DS_DESCRICAO
                                                }
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold text-[#101828]">
                                            Informações do arquivo
                                        </h3>

                                        <dl className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                                                <dt className="text-xs text-[#98A2B3]">
                                                    Formato
                                                </dt>
                                                <dd className="mt-1 text-sm font-semibold text-[#344054]">
                                                    {formatarExtensao(
                                                        imagemSelecionada
                                                    )}
                                                </dd>
                                            </div>

                                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                                                <dt className="text-xs text-[#98A2B3]">
                                                    Tamanho
                                                </dt>
                                                <dd className="mt-1 text-sm font-semibold text-[#344054]">
                                                    {formatarTamanho(
                                                        imagemSelecionada.NR_TAMANHO_BYTES
                                                    )}
                                                </dd>
                                            </div>

                                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                                                <dt className="text-xs text-[#98A2B3]">
                                                    Dimensões
                                                </dt>
                                                <dd className="mt-1 text-sm font-semibold text-[#344054]">
                                                    {obterDimensoes(
                                                        imagemSelecionada
                                                    )}
                                                </dd>
                                            </div>

                                            <div className="rounded-xl bg-[#F8FAFC] p-3">
                                                <dt className="text-xs text-[#98A2B3]">
                                                    Orientação
                                                </dt>
                                                <dd className="mt-1 text-sm font-semibold text-[#344054]">
                                                    {obterRotuloOrientacao(
                                                        imagemSelecionada.TP_ORIENTACAO
                                                    )}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {imagemSelecionada.DS_INSTRUCOES_USO && (
                                        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                                            <h3 className="mb-2 text-sm font-semibold text-primary">
                                                Instruções de uso
                                            </h3>
                                            <p className="whitespace-pre-line text-sm leading-6 text-[#475467]">
                                                {
                                                    imagemSelecionada.DS_INSTRUCOES_USO
                                                }
                                            </p>
                                        </div>
                                    )}

                                    {imagemSelecionada.DS_PALAVRAS_CHAVE && (
                                        <div>
                                            <h3 className="mb-2 text-sm font-semibold text-[#101828]">
                                                Palavras-chave
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {imagemSelecionada.DS_PALAVRAS_CHAVE.split(
                                                    /[,;]/
                                                )
                                                    .map(
                                                        (
                                                            palavra
                                                        ) =>
                                                            palavra.trim()
                                                    )
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .map(
                                                        (
                                                            palavra
                                                        ) => (
                                                            <span
                                                                key={
                                                                    palavra
                                                                }
                                                                className="rounded-full bg-[#F2F4F7] px-3 py-1.5 text-xs font-medium text-[#475467]"
                                                            >
                                                                {
                                                                    palavra
                                                                }
                                                            </span>
                                                        )
                                                    )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-100 pt-5">
                                        <button
                                            type="button"
                                            disabled={
                                                processandoId ===
                                                imagemSelecionada.ID_IMAGEM
                                            }
                                            onClick={() =>
                                                realizarDownload(
                                                    imagemSelecionada
                                                )
                                            }
                                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,174,157,0.22)] transition hover:bg-primary disabled:opacity-60 cursor-pointer"
                                        >
                                            <FaArrowDown />
                                            Baixar imagem
                                        </button>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                )}

            {modalFormularioAberto && (
                <div className="fixed inset-0 z-110 flex items-end justify-center bg-[#101828]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4 lg:p-6">
                    <form
                        onSubmit={salvarFormulario}
                        className="flex h-dvh w-full flex-col overflow-hidden rounded-none border border-white/50 bg-white shadow-[0_30px_90px_rgba(16,24,40,0.35)] sm:h-auto sm:max-h-[94dvh] sm:max-w-6xl sm:rounded-[30px]"
                    >
                        <header className="relative shrink-0 overflow-hidden border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
                            <div className="absolute -right-14 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
                            <div className="absolute right-24 top-0 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" />

                            <div className="relative flex items-start justify-between gap-3 sm:gap-4">
                                <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_12px_28px_rgba(0,174,157,0.25)] sm:h-12 sm:w-12 sm:rounded-2xl">
                                        <FaFileImage className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                                            Banco de Imagens
                                        </p>

                                        <h2 className="text-lg font-bold tracking-tight text-[#101828] sm:text-2xl">
                                            {imagemEmEdicao
                                                ? "Editar imagem"
                                                : "Cadastrar nova imagem"}
                                        </h2>

                                        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#667085] sm:text-sm">
                                            Preencha apenas as informações do material. Os dados técnicos da imagem serão identificados automaticamente.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharFormulario}
                                    disabled={salvando}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#475467] transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                                    aria-label="Fechar formulário"
                                >
                                    <FaXmark />
                                </button>
                            </div>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="grid gap-0 xl:grid-cols-[380px_minmax(0,1fr)]">
                                <aside className="border-b border-slate-100 bg-[#F8FAFC] p-4 sm:p-5 lg:p-6 xl:border-b-0 xl:border-r xl:p-7">
                                    <div className="xl:sticky xl:top-0">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <label className="text-sm font-semibold text-[#344054]">
                                                Arquivo da imagem
                                                {!imagemEmEdicao && (
                                                    <span className="text-red-500">
                                                        {" "}*
                                                    </span>
                                                )}
                                            </label>

                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#667085] shadow-sm">
                                                Máx. 20 MB
                                            </span>
                                        </div>

                                        <label className="group relative flex min-h-55 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed border-[#D0D5DD] bg-white p-4 text-center transition hover:border-primary hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)] sm:min-h-65 xl:min-h-77.5 xl:rounded-3xl">
                                            {(previewArquivo || imagemEmEdicao) && (
                                                <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                                            )}

                                            {previewArquivo ? (
                                                <img
                                                    src={previewArquivo}
                                                    alt="Pré-visualização da imagem"
                                                    className="max-h-55 w-full rounded-2xl object-contain sm:max-h-70 xl:max-h-90"
                                                />
                                            ) : imagemEmEdicao ? (
                                                <img
                                                    src={obterUrlPreviewBancoImagem(
                                                        imagemEmEdicao.ID_IMAGEM
                                                    )}
                                                    alt={imagemEmEdicao.NM_TITULO}
                                                    className="max-h-55 w-full rounded-2xl object-contain sm:max-h-70 xl:max-h-90"
                                                />
                                            ) : (
                                                <>
                                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:scale-105">
                                                        <FaImage className="h-7 w-7" />
                                                    </div>

                                                    <p className="text-base font-semibold text-[#344054]">
                                                        Clique para selecionar
                                                    </p>

                                                    <p className="mt-2 max-w-xs text-xs leading-5 text-[#667085]">
                                                        PNG, JPG, JPEG, WebP ou GIF
                                                    </p>
                                                </>
                                            )}

                                            {(previewArquivo || imagemEmEdicao) && (
                                                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-white/95 px-4 py-2 text-xs font-semibold text-[#344054] opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
                                                    Clique para trocar a imagem
                                                </span>
                                            )}

                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/gif"
                                                onChange={selecionarArquivo}
                                                className="hidden"
                                            />
                                        </label>

                                        {formulario.file && (
                                            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <FaFileImage />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-[#344054]">
                                                            {formulario.file.name}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-[#667085]">
                                                            {formatarTamanho(
                                                                formulario.file.size
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                                                    <FaCheck className="h-3.5 w-3.5" />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-primary">
                                                        Preenchimento automático
                                                    </p>

                                                    <p className="mt-1 text-xs leading-5 text-[#475467]">
                                                        Você não precisa alterar a orientação, a largura ou a altura. O sistema identifica essas informações assim que a imagem é selecionada.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {(formulario.largura ||
                                            formulario.altura) && (
                                            <div className="mt-4 grid grid-cols-1 gap-2 xs:grid-cols-3 sm:grid-cols-3">
                                                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
                                                        Orientação
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-[#344054]">
                                                        {obterRotuloOrientacao(
                                                            formulario.orientacao
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
                                                        Largura
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-[#344054]">
                                                        {formulario.largura
                                                            ? `${formulario.largura}px`
                                                            : "—"}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
                                                        Altura
                                                    </p>
                                                    <p className="mt-1 text-xs font-bold text-[#344054]">
                                                        {formulario.altura
                                                            ? `${formulario.altura}px`
                                                            : "—"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </aside>

                                <section className="p-4 sm:p-5 lg:p-6 xl:p-7">
                                    <div className="grid gap-4 sm:gap-5">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                                Título
                                                <span className="text-red-500">
                                                    {" "}*
                                                </span>
                                            </label>

                                            <input
                                                type="text"
                                                value={formulario.titulo}
                                                onChange={(event) =>
                                                    atualizarCampoFormulario(
                                                        "titulo",
                                                        event.target.value
                                                    )
                                                }
                                                maxLength={200}
                                                className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-primary focus:ring-4 focus:ring-primary/10"
                                                placeholder="Ex.: Campanha de Cooperativismo 2026"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                                Categoria
                                                <span className="text-red-500">
                                                    {" "}*
                                                </span>
                                            </label>

                                            <select
                                                value={formulario.idCategoria}
                                                onChange={(event) =>
                                                    atualizarCampoFormulario(
                                                        "idCategoria",
                                                        event.target.value
                                                    )
                                                }
                                                className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm text-[#344054] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                            >
                                                <option value="">
                                                    Selecione uma categoria
                                                </option>

                                                {categorias.map((categoria) => (
                                                    <option
                                                        key={
                                                            categoria.ID_CATEGORIA
                                                        }
                                                        value={
                                                            categoria.ID_CATEGORIA
                                                        }
                                                    >
                                                        {categoria.NM_CATEGORIA}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                                Descrição
                                            </label>

                                            <textarea
                                                value={formulario.descricao}
                                                onChange={(event) =>
                                                    atualizarCampoFormulario(
                                                        "descricao",
                                                        event.target.value
                                                    )
                                                }
                                                rows={4}
                                                className="w-full resize-y rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm leading-6 text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-primary focus:ring-4 focus:ring-primary/10"
                                                placeholder="Explique brevemente o conteúdo e a finalidade da imagem."
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                                Palavras-chave
                                            </label>

                                            <input
                                                type="text"
                                                value={formulario.palavrasChave}
                                                onChange={(event) =>
                                                    atualizarCampoFormulario(
                                                        "palavrasChave",
                                                        event.target.value
                                                    )
                                                }
                                                className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-primary focus:ring-4 focus:ring-primary/10"
                                                placeholder="Ex.: cooperativismo, campanha, institucional"
                                            />

                                            <p className="mt-1.5 text-xs text-[#98A2B3]">
                                                Separe as palavras por vírgula.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-[#344054]">
                                                Instruções de uso
                                            </label>

                                            <textarea
                                                value={formulario.instrucoesUso}
                                                onChange={(event) =>
                                                    atualizarCampoFormulario(
                                                        "instrucoesUso",
                                                        event.target.value
                                                    )
                                                }
                                                rows={3}
                                                className="w-full resize-y rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm leading-6 text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-primary focus:ring-4 focus:ring-primary/10"
                                                placeholder="Ex.: utilizar apenas em comunicações internas e não alterar a identidade visual."
                                            />
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                                            <div className="mb-4">
                                                <h3 className="text-sm font-semibold text-[#344054]">
                                                    Período de disponibilidade
                                                </h3>
                                                <p className="mt-1 text-xs text-[#667085]">
                                                    Opcional. Deixe em branco para manter a imagem disponível sem limite de data.
                                                </p>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block text-xs font-semibold text-[#475467]">
                                                        Exibir a partir de
                                                    </label>

                                                    <input
                                                        type="date"
                                                        value={formulario.dtInicio}
                                                        onChange={(event) =>
                                                            atualizarCampoFormulario(
                                                                "dtInicio",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-2 block text-xs font-semibold text-[#475467]">
                                                        Exibir até
                                                    </label>

                                                    <input
                                                        type="date"
                                                        value={formulario.dtFim}
                                                        onChange={(event) =>
                                                            atualizarCampoFormulario(
                                                                "dtFim",
                                                                event.target.value
                                                            )
                                                        }
                                                        className="h-11 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 text-sm text-[#344054] outline-none focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            <label
                                                className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                                                    formulario.stAtivo === "S"
                                                        ? "border-primary/30 bg-primary/5"
                                                        : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-[#344054]">
                                                        Imagem ativa
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-[#667085]">
                                                        Disponível na galeria dos funcionários.
                                                    </p>
                                                </div>

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        formulario.stAtivo ===
                                                        "S"
                                                    }
                                                    onChange={(event) =>
                                                        atualizarCampoFormulario(
                                                            "stAtivo",
                                                            event.target.checked
                                                                ? "S"
                                                                : "N"
                                                        )
                                                    }
                                                    className="h-5 w-5 accent-primary"
                                                />
                                            </label>

                                            <label
                                                className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                                                    formulario.stDestaque ===
                                                    "S"
                                                        ? "border-amber-300 bg-amber-50"
                                                        : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-[#344054]">
                                                        Destacar imagem
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-[#667085]">
                                                        Exibe o material antes das demais imagens.
                                                    </p>
                                                </div>

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        formulario.stDestaque ===
                                                        "S"
                                                    }
                                                    onChange={(event) =>
                                                        atualizarCampoFormulario(
                                                            "stDestaque",
                                                            event.target.checked
                                                                ? "S"
                                                                : "N"
                                                        )
                                                    }
                                                    className="h-5 w-5 accent-primary"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-7">
                            <div className="flex items-center justify-between gap-4">
                                <p className="hidden text-xs text-[#98A2B3] lg:block">
                                    Os campos com * são obrigatórios.
                                </p>

                                <div className="grid w-full grid-cols-2 gap-3 lg:w-auto">
                                <button
                                    type="button"
                                    onClick={fecharFormulario}
                                    disabled={salvando}
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-slate-50 disabled:opacity-50 sm:px-5"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,174,157,0.22)] transition hover:-translate-y-0.5 hover:bg-[#00998A] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:px-6"
                                >
                                    {salvando ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck />
                                            {imagemEmEdicao
                                                ? "Salvar alterações"
                                                : "Cadastrar imagem"}
                                        </>
                                    )}
                                </button>
                                </div>
                            </div>
                        </footer>
                    </form>
                </div>
            )}
        </>
    );
}