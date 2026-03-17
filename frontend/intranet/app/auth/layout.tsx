import type { ReactNode } from "react";
import Sidebar from "@/components/nav/nav";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-100">
                {children}
            </main>
        </div>
    );
}