"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    FaArrowLeft,
    FaArrowRight,
    FaCheck,
    FaChevronRight,
    FaCompass,
    FaHouse,
    FaLink,
    FaLock,
    FaMagnifyingGlass,
    FaRegCircleQuestion,
    FaRotate,
    FaShieldHalved,
    FaSignal,
} from "react-icons/fa6";

export default function NotFound() {
    const router = useRouter();
    const pathname = usePathname();
    const [carregado, setCarregado] = useState(false);
    const [mouse, setMouse] = useState({ x: 0, y: 0 });

    const rotaAtual = pathname || "/pagina-nao-encontrada";

    useEffect(() => {
        const timer = window.setTimeout(() => setCarregado(true), 80);

        return () => window.clearTimeout(timer);
    }, []);

    function acompanharMouse(event: React.MouseEvent<HTMLElement>) {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;

        setMouse({ x, y });
    }

    return (
        <main
            onMouseMove={acompanharMouse}
            className="relative min-h-screen overflow-hidden bg-[#F3F8F7]"
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="absolute -left-45 -top-47.5 h-130 w-130 rounded-full bg-[#00AE9D]/13 blur-[100px] transition-transform duration-700 ease-out"
                    style={{
                        transform: `translate(${mouse.x * 24}px, ${mouse.y * 24}px)`,
                    }}
                />

                <div
                    className="absolute -bottom-55 -right-45 h-150 w-150 rounded-full bg-[#C7D300]/12 blur-[120px] transition-transform duration-700 ease-out"
                    style={{
                        transform: `translate(${mouse.x * -34}px, ${mouse.y * -34}px)`,
                    }}
                />

                <div className="absolute right-[12%] top-[10%] h-65 w-65 rounded-full bg-[#79B729]/8 blur-[90px]" />

                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,54,65,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,54,65,0.025)_1px,transparent_1px)] bg-size-[32px_32px]" />

                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#00AE9D]/25 to-transparent" />
            </div>

            <div className="relative z-10 flex min-h-screen flex-col">
                <header
                    className={[
                        "flex items-center justify-between px-5 py-5 transition-all duration-700 sm:px-8 lg:px-12",
                        carregado
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-4 opacity-0",
                    ].join(" ")}
                >
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-3"
                    >
                        <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_rgba(0,174,157,0.20)] ring-1 ring-[#00AE9D]/15 transition-all duration-300 group-hover:scale-105">
                            <img
                                src="/logo-icon.png"
                                alt="Logo Cressem"
                                className="h-10 w-10 object-contain"
                            />

                            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#79B729]" />
                        </div>

                        <div>
                            <p className="text-sm font-bold tracking-[-0.02em] text-[#003641]">
                                Intranet Cressem
                            </p>

                            <p className="text-xs text-slate-500">
                                Desenvolvido pelo Departamento de Tecnologia
                            </p>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-2 rounded-full border border-[#00AE9D]/15 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-md sm:flex">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#79B729] opacity-40" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#79B729]" />
                        </span>

                        <span className="text-xs font-semibold text-[#42605F]">
                            Intranet disponível
                        </span>
                    </div>
                </header>

                <section className="flex flex-1 items-center px-5 pb-8 pt-2 sm:px-8 lg:px-12">
                    <div className="mx-auto grid w-full max-w-345 items-stretch gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                        <div
                            className={[
                                "flex flex-col justify-center py-4 transition-all delay-100 duration-700 xl:pr-8",
                                carregado
                                    ? "translate-x-0 opacity-100"
                                    : "-translate-x-8 opacity-0",
                            ].join(" ")}
                        >
                            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-[#E7F8F5] px-4 py-2 text-sm font-semibold text-primary">
                                <FaSignal className="text-xs" />
                                Rota não identificada
                            </div>

                            <div className="relative">
                                <div className="absolute -left-3 top-1/2 hidden h-[82%] w-1 -translate-y-1/2 rounded-full bg-linear-to-b from-primary via-secondary to-third lg:block" />

                                <h1 className="max-w-2xl text-[40px] font-bold leading-[1.04] tracking-[-0.055em] text-[#003641] sm:text-5xl lg:text-[64px]">
                                    Este caminho não leva a nenhuma página.
                                </h1>
                            </div>

                            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                                Talvez o endereço tenha mudado, o link esteja
                                incompleto ou essa funcionalidade ainda não esteja
                                disponível para esta rota.
                            </p>

                            <div className="mt-7 max-w-xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(0,54,65,0.06)]">
                                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#F6C453]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#79B729]" />

                                    <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        endereço solicitado
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 px-4 py-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F8F5] text-primary">
                                        <FaLock className="text-sm" />
                                    </div>

                                    <p className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-slate-600">
                                        {rotaAtual}
                                    </p>

                                    <span className="hidden rounded-lg bg-[#FFF3F3] px-2.5 py-1 text-xs font-bold text-[#D65B5B] sm:inline-flex">
                                        404
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/"
                                    className="group inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-primary via-secondary to-third px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_35px_rgba(0,174,157,0.27)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(0,174,157,0.34)]"
                                >
                                    <FaHouse className="text-sm" />
                                    Ir para a página inicial
                                    <FaArrowRight className="text-xs transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl border border-[#003641]/10 bg-white px-6 py-3.5 text-sm font-bold text-[#003641] shadow-[0_8px_25px_rgba(0,54,65,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00AE9D]/30 hover:bg-[#F2FFFC]"
                                >
                                    <FaArrowLeft className="text-xs" />
                                    Voltar
                                </button>

                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    aria-label="Recarregar página"
                                    className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-500 transition-all duration-300 hover:border-[#00AE9D]/25 hover:text-[#008B7E]"
                                >
                                    <FaRotate className="text-xs" />
                                    Recarregar
                                </button>
                            </div>
                        </div>

                        <div
                            className={[
                                "relative min-h-135 overflow-hidden rounded-[36px] bg-[#003641] p-4 shadow-[0_30px_90px_rgba(0,54,65,0.22)] transition-all delay-200 duration-700 sm:p-6 lg:min-h-152.5",
                                carregado
                                    ? "translate-x-0 scale-100 opacity-100"
                                    : "translate-x-8 scale-[0.98] opacity-0",
                            ].join(" ")}
                            style={{
                                transform: carregado
                                    ? `perspective(1200px) rotateX(${mouse.y * -1.8}deg) rotateY(${mouse.x * 2.2}deg)`
                                    : undefined,
                            }}
                        >
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute -right-20 -top-25 h-85 w-85 rounded-full bg-primary/30 blur-[90px]" />

                                <div className="absolute -bottom-30 -left-20 h-100 w-100s rounded-full bg-[#79B729]/18 blur-[100px]" />

                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-size-[28px_28px]" />

                                <div className="scanner-line absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#7CE3D8]/80 to-transparent opacity-70" />

                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,174,157,0.10),transparent_55%)]" />

                                <div className="absolute left-[14%] top-[18%] h-2 w-2 animate-pulse rounded-full bg-[#C7D300]" />
                                <div className="absolute right-[12%] top-[32%] h-2.5 w-2.5 animate-pulse rounded-full bg-[#00AE9D]" />
                                <div className="absolute bottom-[18%] right-[25%] h-2 w-2 animate-pulse rounded-full bg-white/70" />
                            </div>

                            <div className="relative flex h-full flex-col">
                                <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/7 px-4 py-3 backdrop-blur-xl sm:px-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                                            <FaShieldHalved className="text-sm" />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-white">
                                                Navegação segura
                                            </p>

                                            <p className="text-xs text-white/50">
                                                Ambiente interno Cressem
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 rounded-full bg-[#79B729]/15 px-3 py-1.5">
                                        <span className="h-2 w-2 rounded-full bg-[#C7D300]" />
                                        <span className="hidden text-xs font-semibold text-[#DDEC70] sm:inline">
                                            Online
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-1 items-center justify-center py-8">
                                    <div className="relative flex h-72.5 w-72.5 items-center justify-center sm:h-90 sm:w-90">
                                        <div className="absolute inset-0 animate-[spin_24s_linear_infinite] rounded-full border border-dashed border-white/12" />

                                        <div className="absolute inset-8.5 animate-[spin_18s_linear_infinite_reverse] rounded-full border border-white/10" />

                                        <div className="absolute inset-17.5 rounded-full border border-dashed border-[#00AE9D]/25" />

                                        <div className="absolute left-1/2 -top-1.25 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur-lg">
                                            <FaLink className="text-sm" />
                                        </div>

                                        <div className="absolute bottom-7 left-1.25 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#79B729]/30 bg-[#79B729]/20 text-[#DDED72] backdrop-blur-lg">
                                            <FaCheck className="text-xs" />
                                        </div>

                                        <div className="absolute right-0.5 top-25 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#00AE9D]/35 bg-[#00AE9D]/20 text-[#7CE3D8] backdrop-blur-lg">
                                            <FaMagnifyingGlass className="text-xs" />
                                        </div>

                                        <div className="card-404 relative flex h-47.5 w-47.5 flex-col items-center justify-center overflow-hidden rounded-[52px] border border-white/15 bg-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:h-55 sm:w-55">
                                            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#00AE9D] via-[#79B729] to-[#C7D300]" />

                                            <div className="shine-404 absolute inset-y-0 -left-1/2 w-1/3 rotate-12 bg-linear-to-r from-transparent via-white/15 to-transparent" />

                                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#00AE9D]/20 blur-2xl" />

                                            <p className="number-404 relative bg-linear-to-r from-white via-[#B8F3EA] to-[#DDEC70] bg-clip-text text-[72px] font-black leading-none tracking-[-0.09em] text-transparent sm:text-[86px]">
                                                404
                                            </p>

                                            <div className="relative mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#C7D300]" />

                                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">
                                                    destino ausente
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Link
                                        href="/"
                                        className="group flex items-center justify-between rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#00AE9D]/35 hover:bg-white/12"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00AE9D]/20 text-[#7CE3D8]">
                                                <FaHouse className="text-sm" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    Página inicial
                                                </p>

                                                <p className="text-xs text-white/45">
                                                    Voltar ao começo
                                                </p>
                                            </div>
                                        </div>

                                        <FaChevronRight className="text-xs text-white/35 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="group flex items-center justify-between rounded-3xl border border-white/10 bg-white/8 p-4 text-left backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#79B729]/35 hover:bg-white/12"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#79B729]/20 text-[#DDEC70]">
                                                <FaRegCircleQuestion className="text-sm" />
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    Página anterior
                                                </p>

                                                <p className="text-xs text-white/45">
                                                    Retomar navegação
                                                </p>
                                            </div>
                                        </div>

                                        <FaChevronRight className="text-xs text-white/35 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="flex flex-col items-center justify-between gap-2 px-5 pb-5 text-center sm:flex-row sm:px-8 lg:px-12">
                    <p className="text-xs text-slate-400">
                        Erro 404 · O endereço solicitado não foi encontrado
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <FaShieldHalved className="text-primary" />
                        Ambiente protegido da Intranet
                    </div>
                </footer>
            </div>

            <style jsx global>{`
                @keyframes scanner {
                    0% {
                        transform: translateY(-20px);
                        opacity: 0;
                    }

                    15% {
                        opacity: 0.8;
                    }

                    85% {
                        opacity: 0.45;
                    }

                    100% {
                        transform: translateY(610px);
                        opacity: 0;
                    }
                }

                @keyframes flutuar404 {
                    0%,
                    100% {
                        transform: translateY(0) rotate(0deg);
                    }

                    50% {
                        transform: translateY(-10px) rotate(0.4deg);
                    }
                }

                @keyframes brilho404 {
                    0% {
                        left: -55%;
                    }

                    45%,
                    100% {
                        left: 125%;
                    }
                }

                @keyframes pulsar404 {
                    0%,
                    100% {
                        filter: drop-shadow(0 0 0 rgba(199, 211, 0, 0));
                    }

                    50% {
                        filter: drop-shadow(0 0 18px rgba(199, 211, 0, 0.22));
                    }
                }

                .scanner-line {
                    animation: scanner 5.5s linear infinite;
                }

                .card-404 {
                    animation: flutuar404 5s ease-in-out infinite;
                    will-change: transform;
                }

                .shine-404 {
                    animation: brilho404 4.8s ease-in-out infinite;
                }

                .number-404 {
                    animation: pulsar404 3s ease-in-out infinite;
                }

                @media (prefers-reduced-motion: reduce) {
                    .scanner-line,
                    .card-404,
                    .shine-404,
                    .number-404 {
                        animation: none !important;
                    }
                }
            `}</style>
        </main>
    );
}