"use client";

import { FormEvent, useMemo, useState } from "react";
import { IoLockClosedOutline, IoEyeOffOutline, IoEyeOutline, IoPersonOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoginBackground from "@/public/backgrounds/login_background.png";
import { loginAdUser } from "@/services/auth.service";

type LoginErrors = {
    username?: string;
    password?: string;
    general?: string;
};

export default function LoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<LoginErrors>({});

    const isFormDisabled = useMemo(() => {
        return loading;
    }, [loading]);

    function validateForm() {
        const newErrors: LoginErrors = {};

        if (!username.trim()) {
            newErrors.username = "O usuário é obrigatório.";
        }

        if (!password.trim()) {
            newErrors.password = "A senha é obrigatória.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setErrors({});

        const isValid = validateForm();
        if (!isValid) return;

        setLoading(true);

        try {
            const result = await loginAdUser(username.trim(), password);

            if (!result?.access_token) {
                setErrors({
                    general: "Não foi possível concluir o login. Token não retornado pela API.",
                });
                return;
            }

            sessionStorage.removeItem("jwtToken");
            sessionStorage.removeItem("REMOTE_USER_INTRANET");
            sessionStorage.removeItem("NOME_COMPLETO");
            sessionStorage.removeItem("GRUPOS_USUARIO");

            sessionStorage.setItem("jwtToken", result.access_token);
            sessionStorage.setItem("REMOTE_USER_INTRANET", result.username || username.trim());
            sessionStorage.setItem("NOME_COMPLETO", result.nome_completo || "");
            sessionStorage.setItem("GRUPOS_USUARIO", JSON.stringify(result.grupos || []));

            router.replace("/auth/home");
        } catch (error: any) {
            console.error("Erro no login:", error);

            if (error?.response?.status === 401) {
                setErrors({ general: "Usuário ou senha incorretos." });
            } else if (error?.response?.data?.detail) {
                setErrors({ general: String(error.response.data.detail) });
            } else {
                setErrors({ general: "Erro ao realizar login. Tente novamente." });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen bg-white">
            <div className="flex basis-full items-center justify-center px-6 py-10 lg:basis-1/2 lg:px-[9%] lg:py-0">
                <div className="w-full max-w-xl">
                    <div className="mb-8">
                        <Image
                            src="/logo-icon.png"
                            alt="logo sicoob"
                            width={70}
                            height={70}
                            className="mb-6"
                        />
                        <h1 className="text-4xl font-bold leading-tight text-gray-600">
                            Plataforma Intranet Cressem
                        </h1>
                        <p className="mt-3 text-base text-gray-600">
                            Acesse com seu usuário e senha corporativos.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        <div>
                            <label className="mb-2 block text-3xl font-semibold text-gray-600">
                                Login
                            </label>
                            <span className="block text-base text-gray-600">
                                Insira seus dados de acesso abaixo
                            </span>
                        </div>

                        <div>
                            <div className="relative h-12">
                                <IoPersonOutline className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder="Insira seu usuário"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className={`h-12 w-full rounded-lg border-2 bg-gray-50 pl-12 pr-4 text-gray-900 outline-none transition ${errors.username ? "border-red-400" : "border-gray-200 focus:border-secondary"
                                        }`}
                                    disabled={isFormDisabled}
                                />
                            </div>

                            {errors.username && (
                                <span className="mt-2 block text-sm text-red-500">
                                    {errors.username}
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="relative h-12">
                                <IoLockClosedOutline className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />

                                <input
                                    id="password"
                                    name="password"
                                    type={isPasswordVisible ? "text" : "password"}
                                    placeholder="Senha"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`h-12 w-full rounded-lg border-2 bg-gray-50 pl-12 pr-12 text-gray-900 outline-none transition ${errors.password ? "border-red-400" : "border-gray-200 focus:border-secondary"
                                        }`}
                                    disabled={isFormDisabled}
                                />

                                <button
                                    type="button"
                                    aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                                    onClick={() => setPasswordVisible((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary cursor-pointer"
                                    disabled={isFormDisabled}
                                >
                                    {isPasswordVisible ? (
                                        <IoEyeOutline className="h-5 w-5" />
                                    ) : (
                                        <IoEyeOffOutline className="h-5 w-5" />
                                    )}
                                </button>
                            </div>

                            {errors.password && (
                                <span className="mt-2 block text-sm text-red-500">
                                    {errors.password}
                                </span>
                            )}
                        </div>

                        {errors.general && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {errors.general}
                            </div>
                        )}

                        {/*<a
                            className="block text-right text-sm font-semibold text-secondary hover:underline"
                            //href="/forget_password"
                            href="http://glpi/glpi/front/ticket.form.php"
                            //target="_blank"
                        >
                            Esqueci minha senha
                        </a>*/}

                        <button
                            type="submit"
                            disabled={isFormDisabled}
                            className="w-full rounded-lg bg-secondary p-3 text-lg font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </button>
                    </form>
                </div>
            </div>

            <div className="relative hidden lg:block lg:basis-1/2">
                <div className="absolute inset-0 overflow-hidden rounded-bl-[92px] rounded-tl-[92px]">
                    <Image
                        src={LoginBackground}
                        alt="Imagem de fundo login"
                        fill
                        priority
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10" />
                </div>
            </div>
        </div>
    );
}