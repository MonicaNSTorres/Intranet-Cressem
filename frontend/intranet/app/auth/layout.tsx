import type { ReactNode } from "react";
import Sidebar from "@/components/nav/nav";
import Footer from "@/components/footer/footer";
import { PopupAvisoGate } from "@/components/popup-aviso/popup-aviso";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-start bg-gray-100">
      <PopupAvisoGate />
      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}