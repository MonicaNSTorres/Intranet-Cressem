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
//const ENDERECO_PADRAO = "Rua Henrique Dias, 1000 - Vila Progresso,\nSão José dos Campos -SP, 12215-260";

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

export function AssinaturaEmailForm() {
    const [nome, setNome] = useState("Monica Torres");
    const [funcao, setFuncao] = useState("");
    const [loadingUsuario, setLoadingUsuario] = useState(true);

    const [cert1, setCert1] = useState<CertValue>("CPA10");
    const [cert2, setCert2] = useState<CertValue>("CPA10");
    const [gerada, setGerada] = useState(false);
    const [baixando, setBaixando] = useState(false);
    const [office, setOffice] = useState("");

    const ENDERECO_PADRAO = getEnderecoPorPosto(office);

    const assinaturaRef = useRef<HTMLDivElement | null>(null);

    function formatarPrimeiroUltimoNome(nomeCompleto: string) {
        if (!nomeCompleto) return "";

        const partes = nomeCompleto.trim().split(/\s+/);

        if (partes.length === 1) return partes[0];

        return `${partes[0]} ${partes[partes.length - 1]}`;
    }

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
                    setNome(formatarPrimeiroUltimoNome(data.nome_completo));
                }

                if (data?.physicalDeliveryOfficeName) {
                    setOffice(data.physicalDeliveryOfficeName);
                }

                if (data?.department) {
                    setFuncao(data.department);
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
            nome: nome.trim() || "Nome Sobrenome",
            funcao: funcao.trim() || "Setor não informado",
            telefone: TELEFONE_PADRAO,
            site: SITE_PADRAO,
            endereco: ENDERECO_PADRAO,
            cert1Img: getCertImage(cert1),
            cert2Img: getCertImage(cert2),
        }),
        [nome, funcao, cert1, cert2, office]
    );

    function handleGerar() {
        if (!nome.trim()) {
            alert("Informe o nome.");
            return;
        }

        setGerada(true);
    }

    async function handleBaixarImagem() {
        if (!assinaturaRef.current) return;

        try {
            setBaixando(true);

            const canvas = await html2canvas(assinaturaRef.current, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
            });

            const url = canvas.toDataURL("image/png");

            const link = document.createElement("a");
            link.href = url;
            link.download = `assinatura-${dados.nome.replace(/\s+/g, "-").toLowerCase()}.png`;
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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
                <div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_0.6fr_0.6fr_auto] md:items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <div className="grid grid-cols-[88px_1fr]">
                                    <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                                        Nome:
                                    </div>
                                    <input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Digite o nome"
                                        className="w-full px-4 py-3 text-sm text-gray-900 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Certificação 1</label>
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <div className="grid grid-cols-[74px_1fr]">
                                    <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                                        Cert.:
                                    </div>
                                    <select
                                        value={cert1}
                                        onChange={(e) => setCert1(e.target.value as CertValue)}
                                        className="w-full bg-white px-4 py-3 text-sm text-gray-900 outline-none"
                                    >
                                        {CERT_OPTIONS.map((option) => (
                                            <option key={`cert1-${option.label}`} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Certificação 2</label>
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <div className="grid grid-cols-[74px_1fr]">
                                    <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">
                                        Cert.:
                                    </div>
                                    <select
                                        value={cert2}
                                        onChange={(e) => setCert2(e.target.value as CertValue)}
                                        className="w-full bg-white px-4 py-3 text-sm text-gray-900 outline-none"
                                    >
                                        {CERT_OPTIONS.map((option) => (
                                            <option key={`cert2-${option.label}`} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex md:justify-end">
                            <button
                                onClick={handleGerar}
                                className="inline-flex items-center justify-center rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary cursor-pointer"
                            >
                                Gerar
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <FaSignature className="text-secondary" />
                            Dados fixos da assinatura
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            <InfoItem
                                label="Função"
                                value={loadingUsuario ? "Carregando..." : dados.funcao}
                            />
                            <InfoItem label="Telefone" value={TELEFONE_PADRAO} />
                            <InfoItem label="Site" value={SITE_PADRAO} />
                            <InfoItem label="Endereço" value={formatarEndereco(ENDERECO_PADRAO).replace("\n", " ")} />
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <FaRegEye className="text-secondary" />
                                Ações
                            </div>

                            <button
                                onClick={handleBaixarImagem}
                                disabled={!gerada || baixando}
                                className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                            >
                                <FaDownload size={12} />
                                {baixando ? "Baixando..." : "Baixar em imagem"}
                            </button>
                        </div>

                        <p className="mt-3 text-xs text-gray-500">
                            * Clique em gerar para atualizar a pré-visualização. Depois baixe em PNG.
                        </p>
                    </div>
                </div>

                <div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-gray-900">Pré-visualização</h2>
                            <span className="text-xs text-gray-500">
                                {gerada ? "Assinatura pronta" : "Aguardando geração"}
                            </span>
                        </div>

                        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-third p-4">
                            <div className="mx-auto max-w-205">
                                <div ref={assinaturaRef}>
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

                        <p className="mt-3 text-xs text-gray-500">
                            * Para ficar igual ao modelo, use arquivos com fundo transparente e boa resolução.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs font-medium text-gray-500">{label}</div>
            <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">{value}</div>
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
        <div
            className="relative overflow-hidden bg-white"
            style={{
                width: 600,
                height: 200,
                borderRadius: 18,
                fontFamily: "Arial, Helvetica, sans-serif",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "#ffffff",
                    borderRadius: 18,
                }}
            />

            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: 16,
                    background: "#00b0a0",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderTop: "38px solid #00b0a0",
                    borderLeft: "38px solid transparent",
                }}
            />

            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    padding: "22px 12px 12px 12px",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 10,
                        top: 24,
                        //fontFamily: "SicoobSansSemiBold, Arial, sans-serif",
                        color: "#003641",
                        fontSize: 24,
                        lineHeight: "24px",
                        fontWeight: 700,
                    }}
                >
                    {nome}
                </div>

                <div
                    style={{
                        position: "absolute",
                        left: 10,
                        top: 52,
                        //fontFamily: "SicoobSansMedium, Arial, sans-serif",
                        color: "#BED730",
                        fontSize: 18,
                        lineHeight: "18px",
                        fontWeight: 500,
                    }}
                >
                    {funcao}
                </div>

                <img
                    src="/assinatura-email/logo_sicoob_cressem.png"
                    alt="Sicoob Cressem"
                    style={{
                        position: "absolute",
                        top: 30,
                        right: 12,
                        width: 150,
                        height: "auto",
                        objectFit: "contain",
                    }}
                />

                <div style={{ position: "absolute", left: 10, top: 88 }}>
                    <ContatoLinha icon="/assinatura-email/icon-phone.png" text={telefone} />
                </div>

                <div style={{ position: "absolute", left: 10, top: 116 }}>
                    <ContatoLinha icon="/assinatura-email/icon-web.png" text={site} />
                </div>

                <div style={{ position: "absolute", left: 10, top: 144 }}>
                    <ContatoLinha
                        icon="/assinatura-email/icon-location.png"
                        text={formatarEndereco(endereco)}
                        multiline
                    />
                </div>

                {/*<div
          style={{
            position: "absolute",
            right: 194,
            top: 108,
          }}
        >
          <img
            src="/assinatura-email/logo-40-anos.png"
            alt="40 anos"
            style={{
              width: 78,
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>*/}

                <div
                    style={{
                        position: "absolute",
                        right: 92,
                        top: 130,
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-end",
                    }}
                >
                    {cert1Img ? (
                        <img
                            src={cert1Img}
                            alt="Certificação 1"
                            style={{ width: 52, height: 52, objectFit: "contain" }}
                        />
                    ) : null}

                    {cert2Img ? (
                        <img
                            src={cert2Img}
                            alt="Certificação 2"
                            style={{ width: 52, height: 52, objectFit: "contain" }}
                        />
                    ) : null}
                </div>

                <img
                    src="/assinatura-email/gptw.png"
                    alt="GPTW"
                    style={{
                        position: "absolute",
                        right: 8,
                        top: 96,
                        width: 62,
                        height: "auto",
                        objectFit: "contain",
                    }}
                />

                {/*<div
          style={{
            position: "absolute",
            right: 88,
            bottom: 10,
            textAlign: "right",
            fontFamily: "SicoobSansMedium, Arial, sans-serif",
            lineHeight: "15px",
          }}
        >
          <div
            style={{
              color: "#003641",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Tem coisas que
          </div>

          <div
            style={{
              color: "#003641",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            só uma{" "}
            <span
              style={{
                color: "#BED730",
                fontFamily: "SicoobSansSemiBold, Arial, sans-serif",
                fontWeight: 700,
              }}
            >
              Cooperativa
            </span>
          </div>

          <div
            style={{
              color: "#003641",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            traz para você.
          </div>
        </div>*/}
            </div>
        </div>
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
            style={{
                display: "flex",
                alignItems: multiline ? "flex-start" : "center",
                gap: 6,
                maxWidth: 320,
            }}
        >
            <img
                src={icon}
                alt=""
                style={{
                    width: 18,
                    height: 18,
                    objectFit: "contain",
                    marginTop: multiline ? 3 : 8,
                    flexShrink: 0,
                }}
            />

            <div
                style={{
                    //fontFamily: "SicoobSansMedium, Arial, sans-serif",
                    color: "#003641",
                    fontSize: 13,
                    lineHeight: multiline ? "15px" : "13px",
                    fontWeight: 600,
                    whiteSpace: multiline ? "pre-line" : "nowrap",
                }}
            >
                {text}
            </div>
        </div>
    );
}