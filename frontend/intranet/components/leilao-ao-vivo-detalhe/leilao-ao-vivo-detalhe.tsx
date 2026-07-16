"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import {
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaExpand,
    FaGavel,
    FaTimes,
    FaTrophy,
    FaUser,
} from "react-icons/fa";
import BackButton from "@/components/back-button/back-button";
import {
    buscarLeilaoPorId,
    darLance,
    listarLances,
    buscarVencedorLeilao,
    type VencedorLeilao,
    type Lance,
    type Leilao,
} from "@/services/leiloes.service";
import { getMeAdUser } from "@/services/auth.service";
import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function LeilaoAoVivoDetalhe({ idLeilao }: { idLeilao: number }) {
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [tipoMensagem, setTipoMensagem] = useState<"success" | "error">("success");

    const [leilao, setLeilao] = useState<Leilao | null>(null);
    const [lances, setLances] = useState<Lance[]>([]);
    const [valorLance, setValorLance] = useState("");
    const [usuario, setUsuario] = useState<any>(null);

    const [agora, setAgora] = useState(new Date());
    const [vencedor, setVencedor] = useState<VencedorLeilao | null>(null);

    const [imagemAtual, setImagemAtual] = useState(0);
    const [modalImagemAberta, setModalImagemAberta] = useState(false);

    const [modalHistoricoAberta, setModalHistoricoAberta] = useState(false);

    async function carregar() {
        try {
            setLoading(true);

            const leilaoResult = await buscarLeilaoPorId(idLeilao);
            setLeilao(leilaoResult);

            try {
                const lancesResult = await listarLances(idLeilao);
                setLances(Array.isArray(lancesResult) ? lancesResult : []);
            } catch (error) {
                console.error("Erro ao listar lances:", error);
                setLances([]);
            }

            try {
                const userResult = await getMeAdUser();
                setUsuario(userResult);
            } catch {
                setUsuario(null);
            }

            try {
                const fimLeilao = parseDataBR(leilaoResult?.DT_FIM);

                if (
                    leilaoResult?.ST_STATUS === "FINALIZADO" ||
                    (fimLeilao && fimLeilao.getTime() <= Date.now())
                ) {
                    const vencedorResult = await buscarVencedorLeilao(idLeilao);
                    setVencedor(vencedorResult);
                }
            } catch (e) {
                console.error(e);
            }
        } catch (error: any) {
            console.error(error);
            setLeilao(null);

            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Não foi possível carregar o leilão.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (idLeilao) carregar();

        const interval = setInterval(() => {
            if (idLeilao) {
                carregar().catch(console.error);
            }
        }, 1200000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idLeilao]);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!modalImagemAberta) return;

            if (e.key === "Escape") setModalImagemAberta(false);
            if (e.key === "ArrowLeft") imagemAnterior();
            if (e.key === "ArrowRight") proximaImagem();
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setAgora(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!idLeilao) return;

        const socketInstance = io(API_URL, {
            withCredentials: true,
            transports: ["websocket"],
        });

        socketInstance.emit("leilao:entrar", idLeilao);

        socketInstance.on("leilao:lance", async (payload) => {
            if (Number(payload.idLeilao) !== Number(idLeilao)) return;

            try {
                const [leilaoAtualizado, lancesAtualizados] = await Promise.all([
                    buscarLeilaoPorId(Number(idLeilao)),
                    listarLances(Number(idLeilao)),
                ]);

                setLeilao(leilaoAtualizado);
                setLances(lancesAtualizados);
            } catch (err) {
                console.error(err);
            }
        });

        return () => {
            socketInstance.emit("leilao:sair", idLeilao);
            socketInstance.off("leilao:lance");
            socketInstance.disconnect();
        };
    }, [idLeilao]);

    function parseDataBR(value?: string | null) {
        if (!value) return null;

        if (value.includes("/")) {
            const [data, hora = "00:00:00"] = value.split(" ");
            const [dd, mm, yyyy] = data.split("/");
            return new Date(`${yyyy}-${mm}-${dd}T${hora}`);
        }

        return new Date(value.replace(" ", "T"));
    }

    function tempoRestante() {
        const fim = parseDataBR(leilao?.DT_FIM);

        if (!fim) return "Sem data final";

        const diff = fim.getTime() - agora.getTime();

        if (diff <= 0) return "Leilão encerrado";

        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutos = Math.floor((diff / (1000 * 60)) % 60);
        const segundos = Math.floor((diff / 1000) % 60);

        if (dias > 0) return `${dias}d ${horas}h ${minutos}m ${segundos}s`;

        return `${horas}h ${minutos}m ${segundos}s`;
    }

    function leilaoEncerrado() {
        const fim = parseDataBR(leilao?.DT_FIM);

        if (!fim) return false;

        return fim.getTime() <= agora.getTime() || leilao?.ST_STATUS === "FINALIZADO";
    }

    function proximoLanceMinimo() {
        return lanceAtual() + Number(leilao?.VL_INCREMENTO_MINIMO || 1);
    }

    function preencherLanceRapido(valor: number) {
        setValorLance(
            valor.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
        );
    }

    function mostrarMensagem(texto: string, tipo: "success" | "error" = "success") {
        setMensagem(texto);
        setTipoMensagem(tipo);
    }

    function formatCurrency(value: any) {
        return Number(value || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        });
    }

    function formatMoneyInput(value: string) {
        const digits = String(value || "").replace(/\D/g, "");
        if (!digits) return "";

        return (Number(digits) / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function moneyToNumber(value: string) {
        return Number(String(value || "").replace(/\./g, "").replace(",", "."));
    }

    function getImagens() {
        try {
            if (!leilao?.IMAGEM_BASE64) return [];

            const parsed = JSON.parse(String(leilao.IMAGEM_BASE64));

            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return leilao?.IMAGEM_BASE64 ? [String(leilao.IMAGEM_BASE64)] : [];
        }
    }

    function lanceAtual() {
        if (lances.length > 0) return Number(lances[0]?.VL_LANCE || 0);
        return Number(leilao?.VL_LANCE_ATUAL || leilao?.VL_INICIAL || 0);
    }

    function nomeGanhando() {
        if (lances.length > 0) return lances[0]?.NM_USUARIO || "-";
        return leilao?.NM_USUARIO_GANHANDO || "-";
    }

    function proximaImagem() {
        const imagens = getImagens();
        if (imagens.length === 0) return;

        setImagemAtual((old) => (old + 1) % imagens.length);
    }

    function imagemAnterior() {
        const imagens = getImagens();
        if (imagens.length === 0) return;

        setImagemAtual((old) => (old - 1 + imagens.length) % imagens.length);
    }

    async function enviarLance() {
        try {
            setSalvando(true);
            setMensagem("");

            const valor = moneyToNumber(valorLance);

            if (!valor || valor <= 0) {
                mostrarMensagem("Informe um valor de lance válido.", "error");
                return;
            }

            const nomeUsuario =
                usuario?.nome ||
                usuario?.name ||
                usuario?.nome_completo ||
                usuario?.NM_USUARIO ||
                usuario?.displayName ||
                usuario?.username ||
                "USUÁRIO";

            const loginUsuario =
                usuario?.login ||
                usuario?.username ||
                usuario?.DS_LOGIN ||
                usuario?.email ||
                null;

            const emailUsuario =
                usuario?.email ||
                usuario?.mail ||
                usuario?.DS_EMAIL ||
                usuario?.userPrincipalName ||
                usuario?.user?.email ||
                usuario?.user?.mail ||
                null;

            await darLance(idLeilao, {
                VL_LANCE: valor,
                NM_USUARIO: nomeUsuario,
                DS_LOGIN: loginUsuario,
                DS_EMAIL: emailUsuario,
            });

            mostrarMensagem("Lance registrado com sucesso.", "success");
            setValorLance("");

            await carregar();
        } catch (error: any) {
            console.error(error);
            mostrarMensagem(
                error?.response?.data?.details ||
                error?.response?.data?.error ||
                "Erro ao registrar lance.",
                "error"
            );
        } finally {
            setSalvando(false);
        }
    }

    const imagens = getImagens();

    if (loading) {
        return (
            <div className="p-6 text-sm text-slate-500">
                Carregando leilão...
            </div>
        );
    }

    if (!leilao) {
        return (
            <div className="p-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Leilão não encontrado.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8">
            <BackButton />

            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7D300] bg-[#C7D300] text-emerald-700 shadow-sm">
                    <FaGavel size={18} />
                </div>

                <div>
                    <div
                        className={`mb-1 inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${leilaoEncerrado()
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-primary"
                            }`}
                    >
                        {leilaoEncerrado() ? "Leilão encerrado" : "Leilão ao vivo"}
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900">
                        {leilaoEncerrado() ? "Resultado do leilão" : "Participe do leilão"}
                    </h1>

                    <p className="text-sm text-slate-600">
                        {leilaoEncerrado()
                            ? "Confira o vencedor, o pódio e o histórico de lances."
                            : "Acompanhe o lance atual e envie sua oferta."}
                    </p>
                </div>
            </div>

            {mensagem && (
                <div
                    className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${tipoMensagem === "success"
                        ? "border border-emerald-200 bg-emerald-50 text-primary"
                        : "border border-red-200 bg-red-50 text-red-700"
                        }`}
                >
                    {mensagem}
                </div>
            )}

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="min-w-0 space-y-6">
                    <div className="overflow-hidden rounded-4xl bg-white shadow-sm ring-1 ring-slate-100">
                        <div className="bg-linear-to-r from-primary/10 via-white to-secondary/10 p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">
                                        {leilao.NM_PRODUTO}
                                    </h2>

                                    <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-600">
                                        {leilao.DS_PRODUTO || "Produto disponível para leilão."}
                                    </p>
                                </div>

                                <div
                                    className={`inline-flex w-fit shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${leilaoEncerrado()
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-emerald-100 text-primary"
                                        }`}
                                >
                                    {leilaoEncerrado() ? "🏆 Vendido" : "🟢 Ao vivo"}
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {imagens.length > 0 ? (
                                <div className="grid gap-5 lg:grid-cols-[104px_minmax(0,1fr)]">
                                    <div className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:flex-col lg:overflow-visible lg:pb-0">
                                        {imagens.map((img, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => setImagemAtual(index)}
                                                className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-white p-1 transition ${imagemAtual === index
                                                    ? "border-primary ring-4 ring-primary/15"
                                                    : "border-slate-200 hover:border-primary"
                                                    }`}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`Miniatura ${index + 1}`}
                                                    className="h-full w-full rounded-xl object-contain"
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="order-1 lg:order-2">
                                        <div className="group relative flex h-95 items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 p-4 lg:h-107.5">
                                            <img
                                                src={imagens[imagemAtual]}
                                                alt={leilao.NM_PRODUTO}
                                                className="max-h-full max-w-full rounded-2xl object-contain"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setModalImagemAberta(true)}
                                                className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-sm font-bold text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-primary hover:text-white cursor-pointer"
                                            >
                                                <FaExpand />
                                                Ampliar
                                            </button>

                                            {imagens.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={imagemAnterior}
                                                        className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-primary hover:text-white"
                                                    >
                                                        <FaChevronLeft />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={proximaImagem}
                                                        className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-primary hover:text-white"
                                                    >
                                                        <FaChevronRight />
                                                    </button>
                                                </>
                                            )}

                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-4 py-2 text-xs font-bold text-white">
                                                {imagemAtual + 1} / {imagens.length}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-80 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-slate-400">
                                    Sem imagem cadastrada
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                        <h3 className="mb-3 text-lg font-black text-slate-800">
                            Regras e observações
                        </h3>

                        <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                            {leilao.DS_REGRAS ||
                                "O maior lance até o horário final será o vencedor."}
                        </p>
                    </div>

                    {leilaoEncerrado() && lances.length > 0 && (
                        <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">
                                        🏅 Pódio do leilão
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Os três maiores lances registrados.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                {lances.slice(0, 3).map((lance, index) => {
                                    const medalha = ["🥇", "🥈", "🥉"][index];
                                    const titulo = ["1º lugar", "2º lugar", "3º lugar"][index];

                                    return (
                                        <div
                                            key={lance.ID_LANCE}
                                            className={`rounded-3xl border p-5 text-center shadow-sm ${index === 0
                                                ? "border-yellow-200 bg-yellow-50"
                                                : index === 1
                                                    ? "border-slate-200 bg-slate-50"
                                                    : "border-orange-200 bg-orange-50"
                                                }`}
                                        >
                                            <div className="text-5xl">{medalha}</div>

                                            <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">
                                                {titulo}
                                            </p>

                                            <h4 className="mt-2 truncate text-lg font-black text-slate-900">
                                                {lance.NM_USUARIO}
                                            </h4>

                                            <p className="mt-3 text-2xl font-black text-primary">
                                                {formatCurrency(lance.VL_LANCE)}
                                            </p>

                                            <p className="mt-2 text-xs text-slate-500">
                                                {lance.DT_LANCE}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <HistoricoLances
                        lances={lances}
                        formatCurrency={formatCurrency}
                        onAbrirCompleto={() => setModalHistoricoAberta(true)}
                    />
                </div>

                <div className="min-w-0 space-y-6">
                    {vencedor?.possuiVencedor && (
                        <CardVencedor vencedor={vencedor} formatCurrency={formatCurrency} />
                    )}

                    <div className="sticky top-6 rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                        {/*<div
                            className={`rounded-[28px] p-6 text-center ring-1 ${leilaoEncerrado()
                                ? "bg-amber-50 ring-amber-100"
                                : "bg-emerald-50 ring-emerald-100"
                                }`}
                        >
                            <p
                                className={`text-sm font-black uppercase tracking-wider ${leilaoEncerrado() ? "text-amber-700" : "text-primary"
                                    }`}
                            >
                                {leilaoEncerrado() ? "Lance final" : "Lance atual"}
                            </p>

                            <h2
                                className={`mt-2 text-4xl font-black ${leilaoEncerrado() ? "text-amber-800" : "text-primary"
                                    }`}
                            >
                                {formatCurrency(lanceAtual())}
                            </h2>

                            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                                <FaUser />
                                {leilaoEncerrado() ? "Vencedor" : "Ganhando"}: {nomeGanhando()}
                            </p>
                        </div>*/}

                        <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                            <div
                                className={`mb-4 rounded-2xl px-4 py-3 text-center ${leilaoEncerrado()
                                    ? "bg-red-50 text-red-700"
                                    : "bg-blue-50 text-fourth"
                                    }`}
                            >
                                <p className="text-xs font-black uppercase tracking-wider">
                                    {leilaoEncerrado() ? "Leilão encerrado" : "Termina em"}
                                </p>

                                <p className="mt-1 text-2xl font-black">{tempoRestante()}</p>
                            </div>

                            <div className="grid gap-3">
                                <InfoLinha
                                    label="Valor inicial"
                                    value={formatCurrency(leilao.VL_INICIAL)}
                                />

                                <InfoLinha
                                    label="Incremento mínimo"
                                    value={formatCurrency(leilao.VL_INCREMENTO_MINIMO)}
                                />

                                {!leilaoEncerrado() && (
                                    <InfoLinha
                                        label="Próximo lance mínimo"
                                        value={formatCurrency(proximoLanceMinimo())}
                                    />
                                )}

                                <InfoLinha
                                    label="Finaliza"
                                    value={leilao.DT_FIM || "-"}
                                    icon={<FaClock />}
                                />
                            </div>
                        </div>

                        <div className="mt-5">
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Seu lance
                            </label>

                            {!leilaoEncerrado() && (
                                <p className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-fourth">
                                    Você só poderá dar lance se não estiver liderando nenhum leilão no momento.
                                    Caso alguém ultrapasse seu lance, você poderá participar novamente.
                                </p>
                            )}

                            <input
                                value={valorLance}
                                onChange={(e) => setValorLance(formatMoneyInput(e.target.value))}
                                placeholder="0,00"
                                disabled={leilaoEncerrado()}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-black text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-100 disabled:text-slate-400"
                            />

                            {!leilaoEncerrado() && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {[
                                        { texto: "Mínimo", extra: 0 },
                                        { texto: "+ R$ 5,00", extra: 5 },
                                        { texto: "+ R$ 10,00", extra: 10 },
                                    ].map((item) => (
                                        <button
                                            key={item.texto}
                                            type="button"
                                            onClick={() =>
                                                preencherLanceRapido(proximoLanceMinimo() + item.extra)
                                            }
                                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-primary hover:bg-primary/5"
                                        >
                                            {item.texto}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={enviarLance}
                                disabled={salvando || leilaoEncerrado()}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg font-black text-white shadow-lg shadow-primary/20 transition hover:bg-secondary disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                            >
                                <FaGavel />
                                {leilaoEncerrado()
                                    ? "Leilão encerrado"
                                    : salvando
                                        ? "Enviando lance..."
                                        : "Dar lance"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {modalImagemAberta && imagens.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
                    <button
                        type="button"
                        onClick={() => setModalImagemAberta(false)}
                        className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <FaTimes />
                    </button>

                    <button
                        type="button"
                        onClick={imagemAnterior}
                        className="absolute left-5 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <FaChevronLeft />
                    </button>

                    <img
                        src={imagens[imagemAtual]}
                        alt="Imagem ampliada"
                        className="max-h-[86vh] max-w-[86vw] rounded-3xl object-contain"
                    />

                    <button
                        type="button"
                        onClick={proximaImagem}
                        className="absolute right-5 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <FaChevronRight />
                    </button>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-white">
                        {imagemAtual + 1} / {imagens.length}
                    </div>
                </div>
            )}
            {modalHistoricoAberta && (
                <HistoricoCompletoModal
                    lances={lances}
                    formatCurrency={formatCurrency}
                    onClose={() => setModalHistoricoAberta(false)}
                />
            )}
        </div>
    );
}

function CardVencedor({
    vencedor,
    formatCurrency,
}: {
    vencedor: VencedorLeilao;
    formatCurrency: (value: any) => string;
}) {
    return (
        <div className="overflow-hidden rounded-4xl border border-yellow-200 bg-linear-to-br from-yellow-50 via-amber-50 to-white shadow-xl">
            <div className="bg-linear-to-r from-yellow-400 to-amber-500 px-6 py-5 text-white">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-4xl">
                        🏆
                    </div>

                    <div>
                        <h2 className="text-2xl font-black">LEILÃO ENCERRADO</h2>
                        <p className="mt-1 text-sm text-yellow-100">
                            Produto vendido com sucesso
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-5 p-6">
                <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
                    <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                        Vencedor
                    </div>

                    <div className="truncate text-2xl font-black text-slate-900">
                        {vencedor.vencedor?.NM_USUARIO}
                    </div>

                    <div className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">
                        Lance vencedor
                    </div>

                    <div className="mt-2 text-4xl font-black text-emerald-700">
                        {formatCurrency(vencedor.vencedor?.VL_LANCE)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                            Encerrado em
                        </p>

                        <p className="mt-2 text-sm font-bold text-slate-800">
                            {vencedor.DT_FIM}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase text-slate-400">
                            Status
                        </p>

                        <p className="mt-2 text-sm font-bold text-yellow-700">
                            🏆 Finalizado
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function HistoricoLances({
    lances,
    formatCurrency,
    onAbrirCompleto,
}: {
    lances: Lance[];
    formatCurrency: (value: any) => string;
    onAbrirCompleto: () => void;
}) {

    const ultimosLances = lances.slice(0, 5);

    return (
        <div className="rounded-4xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-black text-slate-800">
                        <FaTrophy className="text-orange-500" />
                        Últimos lances
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Exibindo os 5 lances mais recentes.
                    </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {lances.length} lance(s)
                </span>
            </div>

            {ultimosLances.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    Nenhum lance registrado ainda.
                </p>
            ) : (
                <div className="space-y-3">
                    {ultimosLances.map((lance, index) => (
                        <div
                            key={lance.ID_LANCE}
                            className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition ${index === 0
                                ? "border-yellow-200 bg-yellow-50"
                                : "border-slate-200 bg-white"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full ${index === 0
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-slate-100 text-slate-600"
                                        }`}
                                >
                                    {index === 0 ? "🏆" : "👤"}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800">
                                            {lance.NM_USUARIO}
                                        </p>

                                        {index === 0 && (
                                            <span className="rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-black uppercase text-yellow-700">
                                                Liderando
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-slate-500">
                                        {lance.DT_LANCE}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-xl font-black text-primary">
                                    {formatCurrency(lance.VL_LANCE)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {lances.length > 5 && (
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={onAbrirCompleto}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                        Ver histórico completo ({lances.length} lances)
                    </button>
                </div>
            )}
        </div>
    );
}

function HistoricoCompletoModal({
    lances,
    formatCurrency,
    onClose,
}: {
    lances: Lance[];
    formatCurrency: (value: any) => string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-4xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 p-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            Histórico completo de lances
                        </h2>
                        <p className="text-sm text-slate-500">
                            Todos os {lances.length} lances registrados neste leilão.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="max-h-[65vh] overflow-auto p-6">
                    <div className="overflow-hidden rounded-3xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-4 py-4">Posição</th>
                                    <th className="px-4 py-4">Usuário</th>
                                    <th className="px-4 py-4">Data/Hora</th>
                                    <th className="px-4 py-4 text-right">Lance</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {lances.map((lance, index) => (
                                    <tr
                                        key={lance.ID_LANCE}
                                        className={index === 0 ? "bg-yellow-50" : "bg-white"}
                                    >
                                        <td className="px-4 py-4 font-black text-slate-700">
                                            {index === 0 ? "🏆 Líder" : `${index + 1}º`}
                                        </td>

                                        <td className="px-4 py-4 font-bold text-slate-800">
                                            {lance.NM_USUARIO}
                                        </td>

                                        <td className="px-4 py-4 font-semibold text-slate-500">
                                            {lance.DT_LANCE}
                                        </td>

                                        <td className="px-4 py-4 text-right font-black text-emerald-700">
                                            {formatCurrency(lance.VL_LANCE)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoLinha({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="inline-flex items-center gap-2 font-bold text-slate-500">
                {icon}
                {label}
            </span>

            <span className="text-right font-black text-slate-800">{value}</span>
        </div>
    );
}