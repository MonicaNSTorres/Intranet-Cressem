"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { FaDownload, FaRegEye, FaSignature } from "react-icons/fa";
import { getEnderecoPorPosto } from "@/lib/getEnderecoPorPosto";

type CertValue = "" | "CPA10" | "CPA20" | "CEA";

const CERT_OPTIONS: Array<{ value: CertValue; label: string }> = [
  { value: "", label: "Sem Cert." },
  { value: "CPA10", label: "CPA 10" },
  { value: "CPA20", label: "CPA 20" },
  { value: "CEA", label: "CEA" },
];

const TELEFONE_PADRAO = "(12) 3904-9555";
const SITE_PADRAO = "sicoobcressem.com.br";

const FONT_SEMIBOLD = "SicoobSansCndSemiBoldExact";
const FONT_MEDIUM = "SicoobSansCndMediumExact";

function getCertImage(cert: CertValue) {
  if (cert === "CPA10") return "/assinatura-email/CPA10.jpg";
  if (cert === "CPA20") return "/assinatura-email/CPA20.jpg";
  if (cert === "CEA") return "/assinatura-email/CPACEA.jpg";
  return "";
}

function formatarEndereco(endereco: string) {
  if (!endereco) return "";

  return endereco
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\bSp\b/g, "SP")
    .replace(/\bRj\b/g, "RJ")
    .replace(/\bMg\b/g, "MG");
}

function capitalizarFrase(frase: string) {
  return String(frase || "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function formatarPrimeiroUltimoNome(nomeCompleto: string) {
  if (!nomeCompleto) return "";

  const partes = nomeCompleto.trim().split(/\s+/);

  if (partes.length === 1) return partes[0];

  return `${partes[0]} ${partes[partes.length - 1]}`;
}

export function AssinaturaEmailForm() {
  const [nome, setNome] = useState("Monica Torres");
  const [funcao, setFuncao] = useState("");
  const [loadingUsuario, setLoadingUsuario] = useState(true);

  const [cert1, setCert1] = useState<CertValue>("CPA10");
  const [cert2, setCert2] = useState<CertValue>("CPA10");
  const [gerada, setGerada] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [office, setOffice] = useState("");

  const assinaturaDownloadRef = useRef<HTMLDivElement | null>(null);

  const ENDERECO_PADRAO = getEnderecoPorPosto(office);

  useEffect(() => {
    async function carregarUsuarioLogado() {
      try {
        setLoadingUsuario(true);

        const base = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${base}/v1/me`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar os dados do usuário.");
        }

        const data = await response.json();

        if (data?.nome_completo) {
          setNome(
            capitalizarFrase(formatarPrimeiroUltimoNome(data.nome_completo))
          );
        }

        if (data?.physicalDeliveryOfficeName) {
          setOffice(data.physicalDeliveryOfficeName);
        }

        if (data?.department) {
          setFuncao(capitalizarFrase(data.department));
        }
      } catch (error) {
        console.error("Erro ao buscar usuário logado:", error);
      } finally {
        setLoadingUsuario(false);
      }
    }

    carregarUsuarioLogado();
  }, []);

  const dados = useMemo(
    () => ({
      nome: capitalizarFrase(nome.trim()) || "Nome Sobrenome",
      funcao: capitalizarFrase(funcao.trim()) || "Setor não informado",
      telefone: TELEFONE_PADRAO,
      site: SITE_PADRAO,
      endereco: ENDERECO_PADRAO,
      cert1Img: getCertImage(cert1),
      cert2Img: getCertImage(cert2),
    }),
    [nome, funcao, cert1, cert2, ENDERECO_PADRAO]
  );

  function handleGerar() {
    if (!nome.trim()) {
      alert("Informe o nome.");
      return;
    }

    setGerada(true);
  }

  async function handleBaixarImagem() {
    if (!assinaturaDownloadRef.current) return;

    try {
      setBaixando(true);

      await document.fonts.ready;

      await Promise.all([
        document.fonts.load(`400 24px ${FONT_SEMIBOLD}`),
        document.fonts.load(`400 18px ${FONT_MEDIUM}`),
        document.fonts.load(`400 13px ${FONT_MEDIUM}`),
      ]);

      const canvas = await html2canvas(assinaturaDownloadRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = 495;
      finalCanvas.height = 165;

      const ctx = finalCanvas.getContext("2d");

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
      }

      const url = finalCanvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = url;
      link.download = `assinatura-${dados.nome
        .replace(/\s+/g, "-")
        .toLowerCase()}.png`;
      link.click();
    } catch (error) {
      console.error("Erro ao baixar assinatura:", error);
      alert("Não foi possível gerar a imagem da assinatura.");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="min-w-225 mx-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <style jsx global>{`
        @font-face {
          font-family: "${FONT_MEDIUM}";
          src: url("/assinatura-email/SicoobSansCnd-Medium.ttf")
            format("truetype");
          font-style: normal;
          font-weight: 400;
          font-display: swap;
        }

        @font-face {
          font-family: "${FONT_SEMIBOLD}";
          src: url("/assinatura-email/SicoobSansCnd-SemiBold.ttf")
            format("truetype");
          font-style: normal;
          font-weight: 400;
          font-display: swap;
        }
      `}</style>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="space-y-4">
            <FieldWrapper label="Nome" prefix="Nome:">
              <input
                value={nome}
                readOnly
                className="w-full cursor-not-allowed bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none"
              />
            </FieldWrapper>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <CertSelect
                label="Certificação 1"
                value={cert1}
                onChange={setCert1}
              />

              <CertSelect
                label="Certificação 2"
                value={cert2}
                onChange={setCert2}
              />

              <div className="flex md:justify-end">
                <button
                  type="button"
                  onClick={handleGerar}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
                >
                  Gerar
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FaSignature className="text-secondary" />
              Dados fixos da assinatura
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoItem
                label="Setor"
                value={loadingUsuario ? "Carregando..." : dados.funcao}
              />
              <InfoItem label="Telefone" value={TELEFONE_PADRAO} />
              <InfoItem label="Site" value={SITE_PADRAO} />
              <InfoItem
                label="Endereço"
                value={formatarEndereco(ENDERECO_PADRAO).replace("\n", " ")}
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FaRegEye className="text-secondary" />
                Ações
              </div>

              <button
                type="button"
                onClick={handleBaixarImagem}
                disabled={!gerada || baixando}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaDownload size={12} />
                {baixando ? "Baixando..." : "Baixar em imagem"}
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              * Clique em gerar para atualizar a pré-visualização. Depois baixe
              em PNG.
            </p>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Pré-visualização
              </h2>

              <span className="text-xs text-gray-500">
                {gerada ? "Assinatura pronta" : "Aguardando geração"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-third p-4">
              <div className="mx-auto w-full max-w-105 overflow-hidden">
                <div className="h-35 w-105">
                  <div className="origin-top-left scale-[0.7]">
                    <AssinaturaPreview
                      nome={dados.nome}
                      funcao={dados.funcao}
                      telefone={dados.telefone}
                      site={dados.site}
                      endereco={dados.endereco}
                      cert1Img={dados.cert1Img}
                      cert2Img={dados.cert2Img}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              * Para ficar igual ao modelo, use arquivos com fundo transparente e
              boa resolução.
            </p>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed -left-2499.75 -top-2499.75 opacity-0"
      >
        <div ref={assinaturaDownloadRef}>
          <AssinaturaPreview
            nome={dados.nome}
            funcao={dados.funcao}
            telefone={dados.telefone}
            site={dados.site}
            endereco={dados.endereco}
            cert1Img={dados.cert1Img}
            cert2Img={dados.cert2Img}
          />
        </div>
      </div>
    </div>
  );
}

function FieldWrapper({
  label,
  prefix,
  children,
}: {
  label: string;
  prefix: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="grid grid-cols-[88px_1fr]">
          <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
            {prefix}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

function CertSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CertValue;
  onChange: (value: CertValue) => void;
}) {
  return (
    <FieldWrapper label={label} prefix="Cert.:">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CertValue)}
        className="w-full bg-white px-4 py-3 text-sm text-gray-900 outline-none"
      >
        {CERT_OPTIONS.map((option) => (
          <option key={`${label}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 whitespace-pre-line text-sm text-gray-900">
        {value}
      </div>
    </div>
  );
}

function AssinaturaPreview({
  nome,
  funcao,
  telefone,
  site,
  endereco,
  cert1Img,
  cert2Img,
}: {
  nome: string;
  funcao: string;
  telefone: string;
  site: string;
  endereco: string;
  cert1Img?: string;
  cert2Img?: string;
}) {
  return (
    <div className="relative h-50 w-150 overflow-hidden rounded-[18px] bg-white font-['SicoobSansCndMediumExact',Arial,Helvetica,sans-serif]">
      <SignatureBackground />

      <div className="absolute inset-0 px-3 pb-3 pt-5.5">
        <div className="absolute left-2.5 top-6 font-['SicoobSansCndSemiBoldExact',Arial,Helvetica,sans-serif] text-[24px] font-normal leading-6 text-[#003641]">
          {nome}
        </div>

        <div className="absolute left-2.5 top-13 font-['SicoobSansCndMediumExact',Arial,Helvetica,sans-serif] text-[18px] font-normal leading-4.5 text-[#BED730]">
          {funcao}
        </div>

        <img
          src="/assinatura-email/logo_sicoob_cressem.png"
          alt="Sicoob Cressem"
          className="absolute right-3 top-7.5 h-auto w-37.5 object-contain"
        />

        <div className="absolute left-2.5 top-22">
          <ContatoLinha
            icon="/assinatura-email/icon-phone.png"
            text={telefone}
          />
        </div>

        <div className="absolute left-2.5 top-29">
          <ContatoLinha icon="/assinatura-email/icon-web.png" text={site} />
        </div>

        <div className="absolute left-2.5 top-36">
          <ContatoLinha
            icon="/assinatura-email/icon-location.png"
            text={formatarEndereco(endereco)}
            multiline
          />
        </div>

        <div className="absolute right-23 top-32.5 flex items-end gap-2">
          {cert1Img ? (
            <img
              src={cert1Img}
              alt="Certificação 1"
              className="h-13 w-13 object-contain"
            />
          ) : null}

          {cert2Img ? (
            <img
              src={cert2Img}
              alt="Certificação 2"
              className="h-13 w-13 object-contain"
            />
          ) : null}
        </div>

        <img
          src="/assinatura-email/gptw.png"
          alt="GPTW"
          className="absolute right-2 top-24 h-auto w-15.5 object-contain"
        />
      </div>
    </div>
  );
}

function SignatureBackground() {
  return (
    <>
      <div className="absolute inset-0 rounded-[18px] bg-white" />

      <div className="absolute left-0 top-0 h-4 w-full bg-[#00B0A0]" />

      <div className="absolute right-0 top-0 h-0 w-0 border-l-38 border-l-transparent border-t-38 border-t-[#00B0A0]" />
    </>
  );
}

function ContatoLinha({
  icon,
  text,
  multiline = false,
}: {
  icon: string;
  text: string;
  multiline?: boolean;
}) {
  return (
    <div
      className={[
        "flex max-w-[320px] gap-1.5",
        multiline ? "items-start" : "items-center",
      ].join(" ")}
    >
      <img
        src={icon}
        alt=""
        className={[
          "h-4.5 w-4.5 shrink-0 object-contain",
          multiline ? "mt-0.75" : "mt-2",
        ].join(" ")}
      />

      <div
        className={[
          "font-['SicoobSansCndMediumExact',Arial,Helvetica,sans-serif] text-[13px] font-normal text-[#003641]",
          multiline
            ? "whitespace-pre-line leading-3.75"
            : "whitespace-nowrap leading-3.25",
        ].join(" ")}
      >
        {text}
      </div>
    </div>
  );
}