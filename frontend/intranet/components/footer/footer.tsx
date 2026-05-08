import Image from "next/image";
import { FaCode } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="relative mt-10 overflow-hidden border-t border-white/10 bg-linear-to-br from-white via-[#f8fffd] to-[#f3fdf8] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">

            <div className="h-1 w-full bg-linear-to-r from-[#00AE9D] via-[#79B729] to-[#C7D300]" />

            <div className="absolute left-1/2 top-0 h-24 w-72 -translate-x-1/2 rounded-full bg-[#00AE9D]/10 blur-3xl" />

            <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-6 text-center">

                <div className="flex flex-col items-center gap-2">

                    <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-md">
                        <Image
                            src="/logo-icon.png"
                            alt="Sicoob Cressem"
                            width={32}
                            height={32}
                            priority
                        />
                    </div>

                    <div className="text-center">
                        <h2 className="text-base font-bold text-gray-800">
                            Sicoob Cressem
                        </h2>

                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-500">
                            <FaCode className="text-[#00AE9D]" />
                            <span>Desenvolvido pelo Departamento de Tecnologia</span>
                        </div>
                    </div>
                </div>

                <div className="text-xs text-gray-400">
                    © 2026 Sicoob Cressem • Versão 1.0
                </div>
            </div>
        </footer>
    );
}