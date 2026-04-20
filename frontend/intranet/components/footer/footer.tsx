import Image from "next/image";

export default function Footer() {
    return (
        <footer className="mt-8 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">

            <div className="h-0.75 w-full bg-linear-to-r from-primary via-secondary to-third" />

            <div className="flex flex-col items-center justify-center gap-2 px-3 py-3 text-center">

                {/*}Image
                    src="/sicoob-cressem-logo.png"
                    alt="Sicoob"
                    width={82}
                    height={82}
                    priority
                />*/}

                <span className="text-md font-semibold text-primary">
                    Sicoob Cressem © 2026
                </span>

                <span className="text-sm text-gray-500">
                    Desenvolvido pelo Departamento de Tecnologia
                </span>

            </div>
        </footer>
    );
}