"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Triangle } from "lucide-react";
import Image from "next/image";
import { logoutAdUser } from "@/services/auth.service";

{/*const DEFAULT_AVATAR =
  "https://cdn-icons-png.flaticon.com/512/6681/6681221.png";*/}

const DEFAULT_AVATAR = "/user-default.png";

type UserSessionData = {
    username: string;
    nome_completo: string;
    grupos: string[];
};

export default function UserInfo() {
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement | null>(null);

    const [menuOpen, setMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [user, setUser] = useState<UserSessionData>({
        username: "",
        nome_completo: "",
        grupos: [],
    });

    useEffect(() => {
        const username = sessionStorage.getItem("REMOTE_USER_INTRANET") || "";
        const nomeCompleto = sessionStorage.getItem("NOME_COMPLETO") || "";
        const gruposRaw = sessionStorage.getItem("GRUPOS_USUARIO");

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
            grupos,
        });
    }, []);

    useEffect(() => {
        const theme = localStorage.getItem("theme") || "light";
        setIsDark(theme === "dark");
        document.documentElement.classList.toggle("dark", theme === "dark");
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

    function toggleTheme() {
        const newTheme = isDark ? "light" : "dark";
        setIsDark(!isDark);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    }

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

            router.replace("/login");
        }
    }

    const displayName = user.nome_completo || "Usuário";
    const username = user.username || "sem.login";
    const grupos = user.grupos || "não informado";

    return (
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
                {/*<p className="text-xs text-gray-500 dark:text-gray-300">
                    {grupos}
                </p>*/}

                <Image
                    src="/logo-icon.png"
                    alt="logo sicoob"
                    width={30}
                    height={30}
                    //className="mb-3"
                />

                {/*<button
                onClick={toggleTheme}
                className={`relative mt-2 h-8 w-16 rounded-full transition-colors duration-300 ${
                    isDark ? "bg-gray-800" : "bg-yellow-300"
                }`}
                type="button"
                >
                <div
                    className={`absolute top-0.75 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ${
                    isDark ? "right-0.75" : "left-0.75"
                    }`}
                >
                    {isDark ? (
                    <Moon className="h-5 w-5 text-gray-900" />
                    ) : (
                    <Sun className="h-5 w-5 text-yellow-500" />
                    )}
                </div>
                </button>*/}
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
                    className={`h-3 w-3 text-black cursor-pointer transition-transform duration-200 dark:text-white ${menuOpen ? "" : "rotate-180"
                        }`}
                    fill="currentColor"
                />
            </button>

            {menuOpen && (
                <div className="absolute right-0 top-14 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <ul className="py-2">
                        {/*<li
                            onClick={() => {
                                setMenuOpen(false);
                                router.push("/auth/profile_settings");
                            }}
                            className="cursor-pointer px-4 py-3 text-sm text-gray-700 hover:bg-secondary hover:text-white dark:text-gray-200"
                        >
                            Perfil do usuário
                        </li>*/}

                        <li
                            onClick={handleLogout}
                            className="cursor-pointer px-4 py-3 text-sm text-red-600 hover:bg-secondary hover:text-white"
                        >
                            Sair
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}