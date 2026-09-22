"use client";

import { usePathname } from "next/navigation";
import SidebarAtual from "@/components/nav/nav";
import SidebarMenuTeste from "@/components/nav/nav_old_3";

export default function SidebarSwitcher() {
  const pathname = usePathname();

  const rotasComMenuTeste = [
    "/auth/ramais",
    "/auth/aniversariantes",
    "/auth/estoque_consumiveis",
  ];

  const usarMenuTeste = rotasComMenuTeste.some((rota) =>
    pathname.startsWith(rota)
  );

  if (usarMenuTeste) {
    return <SidebarMenuTeste />;
  }

  return <SidebarAtual />;
}

{/*
Autor: Mônica Torres

Para que esse component funcione, basta colocar no layout de auth esse codigo:

import type { ReactNode } from "react";
import SidebarSwitcher from "@/components/nav/sidebar-switcher";
import Footer from "@/components/footer/footer";
import { PopupAvisoGate } from "@/components/popup-aviso/popup-aviso";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-start bg-gray-100">
      <PopupAvisoGate />
      <SidebarSwitcher />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
*/}