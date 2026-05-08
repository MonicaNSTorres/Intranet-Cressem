"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    LogOut,
    ShieldCheck,
    Triangle,
    User,
    UserRound,
    X,
    Mail,
    Phone
} from "lucide-react";
import Image from "next/image";
import { getMeAdUser, logoutAdUser } from "@/services/auth.service";

const DEFAULT_AVATAR = "/user-default.png";

type UserSessionData = {
    username: string;
    nome_completo: string;
    grupos: string[];
    department: string;
    email: string;
    ramal: string;
};

export default function UserInfo() {
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const [user, setUser] = useState<UserSessionData>({
        username: "",
        nome_completo: "",
        grupos: [],
        department: "",
        email: "",
        ramal: "",
    });

    useEffect(() => {
        async function carregarUsuario() {
            try {
                const me = await getMeAdUser();

                const username =
                    me.username || sessionStorage.getItem("REMOTE_USER_INTRANET") || "";

                const nomeCompleto =
                    me.nome_completo || sessionStorage.getItem("NOME_COMPLETO") || "";

                const department =
                    me.department || sessionStorage.getItem("DEPARTMENT") || "";

                const grupos = Array.isArray(me.grupos) ? me.grupos : [];

                const email =
                    me.email || sessionStorage.getItem("EMAIL_USUARIO") || "";

                const ramal =
                    me.ramal || sessionStorage.getItem("RAMAL_USUARIO") || "";

                sessionStorage.setItem("REMOTE_USER_INTRANET", username);
                sessionStorage.setItem("NOME_COMPLETO", nomeCompleto);
                sessionStorage.setItem("DEPARTMENT", department);
                sessionStorage.setItem("GRUPOS_USUARIO", JSON.stringify(grupos));
                sessionStorage.setItem("EMAIL_USUARIO", email);
                sessionStorage.setItem("RAMAL_USUARIO", ramal);

                setUser({
                    username,
                    nome_completo: nomeCompleto,
                    department,
                    grupos,
                    email,
                    ramal,
                });
            } catch (error) {
                console.error("Erro ao buscar dados do usuário:", error);

                const username = sessionStorage.getItem("REMOTE_USER_INTRANET") || "";
                const nomeCompleto = sessionStorage.getItem("NOME_COMPLETO") || "";
                const department = sessionStorage.getItem("DEPARTMENT") || "";
                const gruposRaw = sessionStorage.getItem("GRUPOS_USUARIO");
                const email = sessionStorage.getItem("EMAIL_USUARIO") || "";
                const ramal = sessionStorage.getItem("RAMAL_USUARIO") || "";

                let grupos: string[] = [];

                if (gruposRaw) {
                    try {
                        grupos = JSON.parse(gruposRaw);
                    } catch {
                        grupos = [];
                    }
                }

                setUser({
                    username,
                    nome_completo: nomeCompleto,
                    department,
                    grupos,
                    email,
                    ramal,
                });
            }
        }

        carregarUsuario();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    async function handleLogout() {
        try {
            await logoutAdUser();
        } catch (error) {
            console.error("Erro ao fazer logout na API:", error);
        } finally {
            sessionStorage.removeItem("jwtToken");
            sessionStorage.removeItem("REMOTE_USER_INTRANET");
            sessionStorage.removeItem("NOME_COMPLETO");
            sessionStorage.removeItem("GRUPOS_USUARIO");
            sessionStorage.removeItem("DEPARTMENT");
            sessionStorage.removeItem("EMAIL_USUARIO");
            sessionStorage.removeItem("RAMAL_USUARIO");

            router.replace("/login");
        }
    }

    const displayName = user.nome_completo || "Usuário";
    const username = user.username || "sem.login";
    const departamento = user.department || "Não informado";
    const email = user.email || "Não informado";
    const ramal = user.ramal || "Não informado";

    return (
        <>
            <div
                ref={menuRef}
                className="relative flex items-center gap-3 text-left"
            >
                <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {displayName}
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-300">
                        {username}
                    </p>

                    <Image
                        src="/logo-icon.png"
                        alt="logo sicoob"
                        width={30}
                        height={30}
                    />
                </div>

                <Image
                    src={DEFAULT_AVATAR}
                    alt="Avatar do usuário"
                    width={40}
                    height={40}
                    className="h-11 w-11 rounded-full object-cover"
                />

                <button
                    onClick={() => setMenuOpen((prev) => !prev)}
                    type="button"
                    className="flex items-center justify-center"
                    aria-label="Abrir menu do usuário"
                >
                    <Triangle
                        className={`h-3 w-3 cursor-pointer text-black transition-transform duration-200 dark:text-white ${menuOpen ? "" : "rotate-180"
                            }`}
                        fill="currentColor"
                    />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                {displayName}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {username}
                            </p>
                        </div>

                        <ul className="py-2">
                            <li
                                onClick={() => {
                                    setMenuOpen(false);
                                    setProfileOpen(true);
                                }}
                                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-secondary hover:text-white dark:text-gray-200"
                            >
                                <UserRound className="h-4 w-4" />
                                Perfil do usuário
                            </li>

                            <li
                                onClick={handleLogout}
                                className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-red-600 transition hover:bg-secondary hover:text-white"
                            >
                                <LogOut className="h-4 w-4" />
                                Sair
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {profileOpen && (
                <div className="fixed inset-0 z-999 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-950">
                        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-r from-[#00AE9D] via-[#79B729] to-[#C7D300]" />

                        <button
                            onClick={() => setProfileOpen(false)}
                            type="button"
                            className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow-md transition hover:scale-105 hover:bg-white dark:bg-gray-900 dark:text-gray-200"
                            aria-label="Fechar modal"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative px-6 pb-6 pt-16">
                            <div className="flex flex-col items-center text-center">
                                <div className="rounded-full bg-white p-2 shadow-xl dark:bg-gray-900">
                                    <Image
                                        src={DEFAULT_AVATAR}
                                        alt="Avatar do usuário"
                                        width={92}
                                        height={92}
                                        className="h-24 w-24 rounded-full object-cover"
                                    />
                                </div>

                                <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                                    {displayName}
                                </h2>

                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Informações do usuário autenticado pelo AD
                                </p>
                            </div>

                            <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 rounded-xl bg-white p-2 text-[#00AE9D] shadow-sm dark:bg-gray-950">
                                            <User className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                Nome completo
                                            </p>
                                            <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
                                                {displayName}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 rounded-xl bg-white p-2 text-[#79B729] shadow-sm dark:bg-gray-950">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                Login de rede
                                            </p>
                                            <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
                                                {username}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 rounded-xl bg-white p-2 text-[#C7D300] shadow-sm dark:bg-gray-950">
                                            <Building2 className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                Departamento
                                            </p>
                                            <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
                                                {departamento}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 rounded-xl bg-white p-2 text-[#00AE9D] shadow-sm dark:bg-gray-950">
                                            <Mail className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                E-mail
                                            </p>
                                            <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
                                                {email}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 rounded-xl bg-white p-2 text-[#79B729] shadow-sm dark:bg-gray-950">
                                            <Phone className="h-5 w-5" />
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                                Ramal
                                            </p>
                                            <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
                                                {ramal}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 rounded-2xl border border-[#00AE9D]/20 bg-[#00AE9D]/5 p-4">
                                <p className="text-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                    Essas informações são carregadas automaticamente do AD e não podem ser editadas pela intranet.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}