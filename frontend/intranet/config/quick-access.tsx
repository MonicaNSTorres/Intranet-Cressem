import type { ReactNode } from "react";

import {
    FaBirthdayCake,
    FaFileInvoiceDollar,
    FaFolderOpen,
    FaHandshake,
    FaMapSigns,
    FaPhoneAlt,
} from "react-icons/fa";

export type QuickAccessConfigItem = {
    title: string;
    desc: string;
    icon: ReactNode;
    badge?: string;
};

export const QUICK_ACCESS_MAP: Record<
    string,
    QuickAccessConfigItem
> = {
    "/auth/links_uteis": {
        title: "Telas intranet",
        desc: "Veja todas as telas e acesse.",
        icon: <FaMapSigns className="h-5 w-5" />,
        badge: "rápido",
    },

    "/auth/aniversariantes": {
        title: "Aniversariantes",
        desc: "Consulte aniversariantes do dia e do mês.",
        icon: <FaBirthdayCake className="h-5 w-5" />,
    },

    "/auth/cadastro_reembolso_despesa": {
        title: "Reembolso",
        desc: "Solicite, acompanhe ou gerencie reembolsos.",
        icon: <FaFileInvoiceDollar className="h-5 w-5" />,
    },

    "/auth/conversor_arquivos": {
        title: "Arquivos PDF",
        desc: "Ferramentas rápidas para documentos.",
        icon: <FaFolderOpen className="h-5 w-5" />,
    },

    "/auth/gerenciamento_convenio_odonto": {
        title: "Convênios",
        desc: "Consulta e gerenciamento de convênios.",
        icon: <FaHandshake className="h-5 w-5" />,
    },

    "/auth/ramais": {
        title: "Ramal",
        desc: "Localize contatos internos com rapidez.",
        icon: <FaPhoneAlt className="h-5 w-5" />,
    },
};