"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import {
  FaSearch,
  FaExternalLinkAlt,
  FaBuilding,
  FaLaptop,
  FaUniversity,
  FaUsers,
  FaBriefcase,
  FaGraduationCap,
  FaIdCard,
  FaKey,
  FaChartLine,
  FaUserTie,
  FaGlobe,
  FaRegStar,
} from "react-icons/fa";

type LinkUtil = {
  title: string;
  url: string;
  category: string;
  description: string;
  icon: any;
};

const linksUteis: LinkUtil[] = [
  {
    title: "Prefeitura de Caçapava",
    url: "https://portal.econsig.com.br/cacapava/v3/autenticarUsuario?t=20231030135419#no-back",
    category: "Portal Consig",
    description: "Acesso ao portal consignado da Prefeitura de Caçapava.",
    icon: FaBuilding,
  },
  {
    title: "Prefeitura de Cachoeira Paulista",
    url: "https://portal.econsig.com.br/cachoeirapaulista/v3/autenticarUsuario?t=20230607154500#no-back",
    category: "Portal Consig",
    description: "Acesso ao portal consignado da Prefeitura de Cachoeira Paulista.",
    icon: FaBuilding,
  },
  {
    title: "Prefeitura de Campos do Jordão",
    url: "https://saec.consiglog.com.br/Login.aspx",
    category: "Portal Consig",
    description: "Acesso ao portal consignado de Campos do Jordão.",
    icon: FaBuilding,
  },
  {
    title: "Instituto Caraguatatuba",
    url: "https://www.neoconsig.com.br/site",
    category: "Portal Consig",
    description: "Acesso ao portal do Instituto de Caraguatatuba.",
    icon: FaUniversity,
  },
  {
    title: "Prefeitura de Caraguatatuba",
    url: "https://proconsig.com.br/login",
    category: "Portal Consig",
    description: "Acesso ao portal consignado da Prefeitura de Caraguatatuba.",
    icon: FaBuilding,
  },
  {
    title: "Prefeitura de Cruzeiro",
    url: "https://portal.econsig.com.br/cruzeiro/v3/autenticarUsuario?t=20230627131351#no-back",
    category: "Portal Consig",
    description: "Acesso ao portal consignado da Prefeitura de Cruzeiro.",
    icon: FaBuilding,
  },
  {
    title: "Instituto Ilhabela",
    url: "https://portal.econsig.com.br/ilhabelaprev/v3/autenticarUsuario#no-back",
    category: "Portal Consig",
    description: "Acesso ao portal do IlhabelaPrev.",
    icon: FaUniversity,
  },
  {
    title: "Prefeitura de Ilhabela",
    url: "https://portal.econsig.com.br/ilhabela/v3/autenticarUsuario#no-back",
    category: "Portal Consig",
    description: "Acesso ao portal consignado da Prefeitura de Ilhabela.",
    icon: FaBuilding,
  },
  {
    title: "Instituto de Jacareí",
    url: "https://www.www1.consignet.com.br/auth/login",
    category: "Portal Consig",
    description: "Acesso ao Consignet do Instituto de Jacareí.",
    icon: FaUniversity,
  },
  {
    title: "Prefeitura de Jacareí",
    url: "https://www.www1.consignet.com.br/auth/login",
    category: "Portal Consig",
    description: "Acesso ao Consignet da Prefeitura de Jacareí.",
    icon: FaBuilding,
  },
  {
    title: "SAAE de Jacareí",
    url: "https://www.www1.consignet.com.br/auth/login",
    category: "Portal Consig",
    description: "Acesso ao Consignet do SAAE de Jacareí.",
    icon: FaBuilding,
  },
  {
    title: "Instituto de São Sebastião",
    url: "https://saec.consiglog.com.br/Login.aspx",
    category: "Portal Consig",
    description: "Acesso ao portal consignado do Instituto de São Sebastião.",
    icon: FaUniversity,
  },
  {
    title: "Instituto de São José dos Campos",
    url: "https://smartconsig.com.br/sjc-ipsm/Login.aspx",
    category: "Portal Consig",
    description: "Acesso ao SmartConsig do Instituto de São José dos Campos.",
    icon: FaUniversity,
  },
  {
    title: "Prefeitura de São José dos Campos",
    url: "https://smartconsig.com.br/sjc/Login.aspx",
    category: "Portal Consig",
    description: "Acesso ao SmartConsig da Prefeitura de São José dos Campos.",
    icon: FaBuilding,
  },
  {
    title: "Prefeitura de Santo Antônio do Pinhal",
    url: "https://portal.econsig.com.br/santoantoniodopinhal/v3/autenticarUsuario#no-back",
    category: "Portal Consig",
    description: "Acesso ao portal consignado de Santo Antônio do Pinhal.",
    icon: FaBuilding,
  },
  {
    title: "Prefeitura de Taubaté",
    url: "https://taubate.safeconsig.com.br/safe/login",
    category: "Portal Consig",
    description: "Acesso ao SafeConsig da Prefeitura de Taubaté.",
    icon: FaBuilding,
  },
  {
    title: "Prefeitura de Ubatuba",
    url: "https://sicon.grupofasitec.com.br/",
    category: "Portal Consig",
    description: "Acesso ao portal consignado da Prefeitura de Ubatuba.",
    icon: FaBuilding,
  },
  {
    title: "GLPI",
    url: "http://glpi/",
    category: "Sistemas Internos",
    description: "Sistema interno para abertura e acompanhamento de chamados.",
    icon: FaLaptop,
  },
  {
    title: "CRM",
    url: "https://erpcressem.marketcode.app.br/?next=/home/",
    category: "Sistemas Internos",
    description: "Acesso ao CRM da Cressem.",
    icon: FaChartLine,
  },
  {
    title: "Blip",
    url: "https://sicoobcressem.blip.ai/application",
    category: "Atendimento",
    description: "Plataforma de atendimento e automação via Blip.",
    icon: FaUsers,
  },
  {
    title: "Portal de Serviços CCS",
    url: "https://portaldeservicos.sicoob.com.br/",
    category: "Sicoob",
    description: "Portal de serviços corporativos do Sicoob.",
    icon: FaGlobe,
  },
  {
    title: "R3SS - Sistema de Senhas",
    url: "https://portal.r3ss.com.br/?error=3",
    category: "Sistemas Internos",
    description: "Sistema de gerenciamento de senhas.",
    icon: FaKey,
  },
  {
    title: "SIPAGNET",
    url: "https://ssopagamentos.sisbr.coop.br/auth/realms/sisbr/protocol/openid-connect/auth?redirect_uri=https://portal.sisbr.coop.br/sipagnet/wrk/loginKeycloak.jsp&client_id=sipagnet-sisbr&response_type=code&response_mode=fragment",
    category: "Sicoob",
    description: "Portal de pagamentos SIPAGNET.",
    icon: FaIdCard,
  },
  {
    title: "Sicoob Negócios",
    url: "https://www.sicoobnegocios.com.br/login-usuario.html",
    category: "Sicoob",
    description: "Portal Sicoob Negócios.",
    icon: FaBriefcase,
  },
  {
    title: "Sicoob Universidade",
    url: "https://www.sicoob.com.br/web/sicoob-universidade",
    category: "Sicoob",
    description: "Portal de educação corporativa do Sicoob.",
    icon: FaGraduationCap,
  },
  {
    title: "Portal Meu RH",
    url: "https://portalmeurh.sicoob.com.br/FrameHTML/web/app/RH/PortalMeuRH/#/login",
    category: "RH",
    description: "Acesso ao Portal Meu RH.",
    icon: FaUserTie,
  },
  {
    title: "Aggilizador",
    url: "https://sicoobcressem.aggilizador.com.br/",
    category: "Sistemas Internos",
    description: "Acesso ao sistema Aggilizador.",
    icon: FaLaptop,
  },
  {
    title: "Intranet Sicoob",
    url: "https://sca.sicoob.com.br/cas/login?service=https%3A%2F%2Fintranet.sicoob.com.br%2F",
    category: "Sicoob",
    description: "Acesso à intranet corporativa do Sicoob.",
    icon: FaGlobe,
  },
];

const categorias = ["Todos", ...Array.from(new Set(linksUteis.map((item) => item.category)))];

export function LinksExternos() {
  const [search, setSearch] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todos");

  const filteredLinks = useMemo(() => {
    const term = search.toLowerCase().trim();

    return linksUteis.filter((item) => {
      const matchCategoria =
        categoriaAtiva === "Todos" || item.category === categoriaAtiva;

      const matchSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.url.toLowerCase().includes(term);

      return matchCategoria && matchSearch;
    });
  }, [search, categoriaAtiva]);

  const portalConsigTotal = linksUteis.filter(
    (item) => item.category === "Portal Consig"
  ).length;

  return (
    <div className="w-full">
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-[#00AE9D] via-[#79B729] to-[#C7D300] p-6 shadow-xl md:p-8">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-20 left-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20">
              {/*<FaRegStar size={13} />*/}
              Central de acessos externos
            </span>

            <h2 className="text-2xl font-bold text-white md:text-4xl">
              Tudo que o usuário precisa, em um só lugar
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 md:text-base">
              Consulte rapidamente portais consignados, sistemas internos,
              ferramentas Sicoob e acessos operacionais usados no dia a dia.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/15 p-4 text-white ring-1 ring-white/20 backdrop-blur">
                <p className="text-2xl font-bold">{linksUteis.length}</p>
                <p className="text-xs text-white/85">links cadastrados</p>
              </div>

              <div className="rounded-2xl bg-white/15 p-4 text-white ring-1 ring-white/20 backdrop-blur">
                <p className="text-2xl font-bold">{portalConsigTotal}</p>
                <p className="text-xs text-white/85">portais consig</p>
              </div>

              <div className="rounded-2xl bg-white/15 p-4 text-white ring-1 ring-white/20 backdrop-blur">
                <p className="text-2xl font-bold">{categorias.length - 1}</p>
                <p className="text-xs text-white/85">categorias</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FaSearch size={18} />
              </div>

              <input
                type="text"
                placeholder="Buscar por portal, cidade, sistema ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 md:text-base"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {categorias.map((categoria) => {
            const active = categoriaAtiva === categoria;

            return (
              <button
                key={categoria}
                type="button"
                onClick={() => setCategoriaAtiva(categoria)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[#00AE9D] text-white shadow-md shadow-emerald-100"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#00AE9D]/40 hover:bg-[#F4FFFD]",
                ].join(" ")}
              >
                {categoria}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Acessos disponíveis
            </h3>

            <p className="text-sm text-slate-500">
              {filteredLinks.length} resultado
              {filteredLinks.length !== 1 ? "s" : ""} encontrado
              {filteredLinks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {filteredLinks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <FaSearch size={24} />
          </div>

          <h3 className="text-lg font-semibold text-slate-800">
            Nenhum link encontrado
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Tente buscar por “consig”, “Sicoob”, “RH”, “GLPI” ou pelo nome da cidade.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredLinks.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={`${item.title}-${item.url}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00AE9D]/40 hover:shadow-xl"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#00AE9D] via-[#79B729] to-[#C7D300] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF8F6] text-[#00AE9D] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#00AE9D] group-hover:text-white">
                    <Icon size={23} />
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {item.category}
                  </span>
                </div>

                <h3 className="text-lg font-semibold leading-6 text-slate-800">
                  {item.title}
                </h3>

                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-4 truncate rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {item.url}
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white transition-all duration-300 group-hover:bg-[#00AE9D]">
                  <span>Acessar portal</span>
                  <FaExternalLinkAlt size={12} />
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}