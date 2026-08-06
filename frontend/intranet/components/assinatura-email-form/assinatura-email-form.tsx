"use client";

import { useEffect, useMemo, useState } from "react";
import { FaDownload, FaRegEye, FaSignature } from "react-icons/fa";
import { getEnderecoPorPosto } from "@/lib/getEnderecoPorPosto";
import { AD_GROUPS } from "@/config/ad-groups";
import { isManagerOrDirector } from "@/lib/access-control";

type CertValue = "" | "CPA10" | "CPA20" | "CEA";

const CERT_OPTIONS: Array<{ value: CertValue; label: string }> = [
  { value: "", label: "Sem Cert." },
  { value: "CPA10", label: "CPA 10" },
  { value: "CPA20", label: "CPA 20" },
  { value: "CEA", label: "CEA" },
];

const TELEFONE_PADRAO = "(12) 3904-9555";
const SITE_PADRAO = "sicoobcressem.com.br";
const POSTO_PADRAO = "Sede";
const FUNCAO_PADRAO = "Sicoob Cressem";

const FONT_SEMIBOLD = "SicoobSansCndSemiBoldExact";
const FONT_MEDIUM = "SicoobSansCndMediumExact";

type AssinaturaDados = {
  nome: string;
  funcao: string;
  telefone: string;
  site: string;
  endereco: string;
  cert1Img: string;
  cert2Img: string;
};

function getCertImage(cert: CertValue) {
  if (cert === "CPA10") return "/assinatura-email/cpa10.jpg";
  if (cert === "CPA20") return "/assinatura-email/CPA20.jpg";
  if (cert === "CEA") return "/assinatura-email/CPACEA.jpg";
  return "";
}

const PALAVRAS_MINUSCULAS_PT = new Set([
  "a",
  "as",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
]);

const SIGLAS_UF = new Set([
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
]);

function capitalizarTokenPortugues(token: string, index: number) {
  const match = token.match(
    /^([^A-Za-zÀ-ÖØ-öø-ÿ]*)([A-Za-zÀ-ÖØ-öø-ÿ.]+)([^A-Za-zÀ-ÖØ-öø-ÿ]*)$/
  );

  if (!match) return token;

  const [, prefixo, palavraOriginal, sufixo] = match;
  const palavraMaiuscula = palavraOriginal.toUpperCase();
  const palavraMinuscula = palavraOriginal.toLowerCase();

  if (SIGLAS_UF.has(palavraMaiuscula)) {
    return `${prefixo}${palavraMaiuscula}${sufixo}`;
  }

  if (index > 0 && PALAVRAS_MINUSCULAS_PT.has(palavraMinuscula)) {
    return `${prefixo}${palavraMinuscula}${sufixo}`;
  }

  const palavraFormatada =
    palavraMinuscula.charAt(0).toUpperCase() + palavraMinuscula.slice(1);

  return `${prefixo}${palavraFormatada}${sufixo}`;
}

function capitalizarFrase(frase: string) {
  return String(frase || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token, index) => capitalizarTokenPortugues(token, index))
    .join(" ");
}

function formatarNomeAssinatura(nome: string) {
  return capitalizarFrase(nome);
}

function formatarEndereco(endereco: string) {
  return capitalizarFrase(endereco);
}

function formatarTelefoneBR(valor: string) {
  const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function formatarPrimeiroUltimoNome(nomeCompleto: string) {
  if (!nomeCompleto) return "";

  const partes = nomeCompleto.trim().split(/\s+/);

  if (partes.length === 1) return partes[0];

  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
    img.src = src;
  });
}

function desenharImagemContida(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  largura: number,
  altura: number
) {
  const larguraOriginal = img.naturalWidth || img.width;
  const alturaOriginal = img.naturalHeight || img.height;
  const escala = Math.min(largura / larguraOriginal, altura / alturaOriginal);
  const larguraFinal = larguraOriginal * escala;
  const alturaFinal = alturaOriginal * escala;
  const xFinal = x + (largura - larguraFinal) / 2;
  const yFinal = y + (altura - alturaFinal) / 2;

  const larguraPixel = Math.max(1, Math.round(larguraFinal));
  const alturaPixel = Math.max(1, Math.round(alturaFinal));
  const imagemPronta = reduzirImagemProgressivamente(
    img,
    larguraPixel,
    alturaPixel
  );

  ctx.drawImage(
    imagemPronta,
    Math.round(xFinal),
    Math.round(yFinal),
    larguraPixel,
    alturaPixel
  );
}

function desenharLogoSicoobNitido(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  escala: (valor: number) => number
) {
  desenharImagemContida(
    ctx,
    logo,
    escala(840),
    escala(55),
    escala(315),
    escala(110)
  );
}

function reduzirImagemProgressivamente(
  img: HTMLImageElement,
  larguraDestino: number,
  alturaDestino: number
) {
  let origem: CanvasImageSource = img;
  let larguraAtual = img.naturalWidth || img.width;
  let alturaAtual = img.naturalHeight || img.height;

  while (
    larguraAtual / 2 > larguraDestino * 1.15 &&
    alturaAtual / 2 > alturaDestino * 1.15
  ) {
    const canvasEtapa = document.createElement("canvas");
    canvasEtapa.width = Math.max(larguraDestino, Math.round(larguraAtual / 2));
    canvasEtapa.height = Math.max(alturaDestino, Math.round(alturaAtual / 2));

    const ctxEtapa = canvasEtapa.getContext("2d");
    if (!ctxEtapa) break;

    ctxEtapa.imageSmoothingEnabled = true;
    ctxEtapa.imageSmoothingQuality = "high";
    ctxEtapa.drawImage(
      origem,
      0,
      0,
      larguraAtual,
      alturaAtual,
      0,
      0,
      canvasEtapa.width,
      canvasEtapa.height
    );

    origem = canvasEtapa;
    larguraAtual = canvasEtapa.width;
    alturaAtual = canvasEtapa.height;
  }

  const canvasFinal = document.createElement("canvas");
  canvasFinal.width = larguraDestino;
  canvasFinal.height = alturaDestino;

  const ctxFinal = canvasFinal.getContext("2d");
  if (!ctxFinal) return img;

  ctxFinal.imageSmoothingEnabled = true;
  ctxFinal.imageSmoothingQuality = "high";
  ctxFinal.drawImage(
    origem,
    0,
    0,
    larguraAtual,
    alturaAtual,
    0,
    0,
    larguraDestino,
    alturaDestino
  );

  return canvasFinal;
}

function quebrarTextoCanvas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMaxima: number
) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let linhaAtual = "";

  palavras.forEach((palavra) => {
    const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

    if (ctx.measureText(tentativa).width <= larguraMaxima) {
      linhaAtual = tentativa;
      return;
    }

    if (linhaAtual) linhas.push(linhaAtual);
    linhaAtual = palavra;
  });

  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

function criarCaminhoRetanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio: number
) {
  ctx.beginPath();
  ctx.moveTo(x + raio, y);
  ctx.lineTo(x + largura - raio, y);
  ctx.quadraticCurveTo(x + largura, y, x + largura, y + raio);
  ctx.lineTo(x + largura, y + altura - raio);
  ctx.quadraticCurveTo(
    x + largura,
    y + altura,
    x + largura - raio,
    y + altura
  );
  ctx.lineTo(x + raio, y + altura);
  ctx.quadraticCurveTo(x, y + altura, x, y + altura - raio);
  ctx.lineTo(x, y + raio);
  ctx.quadraticCurveTo(x, y, x + raio, y);
  ctx.closePath();
}

async function gerarCanvasAssinaturaAltaQualidade(dados: AssinaturaDados) {
  const escalaAssinatura = 0.5;
  const escala = (valor: number) => valor * escalaAssinatura;
  const larguraBase = 600;
  const alturaBase = 200;

  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`400 ${escala(65)}px ${FONT_SEMIBOLD}`),
    document.fonts.load(`400 ${escala(50)}px ${FONT_MEDIUM}`),
    document.fonts.load(`400 ${escala(35)}px ${FONT_MEDIUM}`),
  ]);

  const imagens = await Promise.all([
    carregarImagem("/assinatura-email/logo_sicoob_cressem.png"),
    carregarImagem("/assinatura-email/icon-phone.png"),
    carregarImagem("/assinatura-email/icon-web.png"),
    carregarImagem("/assinatura-email/icon-location.png"),
    carregarImagem("/assinatura-email/GPTW_OFICIAL.png"),
    dados.cert1Img ? carregarImagem(dados.cert1Img) : Promise.resolve(null),
    dados.cert2Img ? carregarImagem(dados.cert2Img) : Promise.resolve(null),
  ]);

  const [logo, iconPhone, iconWeb, iconLocation, gptw, cert1, cert2] = imagens;
  const canvasBase = document.createElement("canvas");
  canvasBase.width = larguraBase;
  canvasBase.height = alturaBase;

  const ctx = canvasBase.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.save();
  criarCaminhoRetanguloArredondado(ctx, 0, 0, larguraBase, alturaBase, 20);
  ctx.clip();

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, larguraBase, alturaBase);

  ctx.fillStyle = "#00B0A0";
  ctx.fillRect(0, 0, larguraBase, escala(32));
  ctx.beginPath();
  ctx.moveTo(larguraBase - escala(96), 0);
  ctx.lineTo(larguraBase, 0);
  ctx.lineTo(larguraBase, escala(96));
  ctx.closePath();
  ctx.fill();

  ctx.textBaseline = "top";
  ctx.fillStyle = "#003641";
  ctx.font = `400 ${escala(65)}px "${FONT_SEMIBOLD}", Arial, Helvetica, sans-serif`;
  ctx.fillText(dados.nome, escala(20), escala(47));

  ctx.fillStyle = "#BED730";
  ctx.font = `400 ${escala(50)}px "${FONT_MEDIUM}", Arial, Helvetica, sans-serif`;
  ctx.fillText(dados.funcao, escala(20), escala(107));

  ctx.fillStyle = "#003641";
  ctx.font = `400 ${escala(35)}px "${FONT_MEDIUM}", Arial, Helvetica, sans-serif`;

  desenharImagemContida(ctx, iconPhone, escala(20), escala(182), escala(35), escala(50));
  ctx.fillText(dados.telefone, escala(65), escala(187));

  desenharImagemContida(ctx, iconWeb, escala(15), escala(247), escala(50), escala(49));
  ctx.fillText(dados.site, escala(70), escala(247));

  desenharImagemContida(ctx, iconLocation, escala(15), escala(312), escala(52), escala(50));
  const linhasEndereco = quebrarTextoCanvas(
    ctx,
    formatarEndereco(dados.endereco),
    escala(620)
  );
  linhasEndereco.slice(0, 2).forEach((linha, index) => {
    ctx.fillText(linha, escala(70), escala(299 + index * 40));
  });

  desenharLogoSicoobNitido(ctx, logo, escala);

  const certificacoes = [cert1, cert2].filter(Boolean) as HTMLImageElement[];

  if (certificacoes.length === 2) {
    desenharImagemContida(ctx, certificacoes[0], escala(725), escala(235), escala(140), escala(140));
    desenharImagemContida(ctx, certificacoes[1], escala(880), escala(235), escala(140), escala(140));
    desenharImagemContida(ctx, gptw, escala(1025), escala(185), escala(143), escala(210));
  } else if (certificacoes.length === 1) {
    desenharImagemContida(ctx, certificacoes[0], escala(790), escala(235), escala(145), escala(145));
    desenharImagemContida(ctx, gptw, escala(945), escala(175), escala(143), escala(210));
  } else {
    desenharImagemContida(ctx, gptw, escala(830), escala(175), escala(143), escala(210));
  }

  ctx.restore();

  return canvasBase;
}

export function AssinaturaEmailForm() {
  const [nome, setNome] = useState("Fulano de Tal");
  const [funcao, setFuncao] = useState("Setor Exemplo");
  const [celular, setCelular] = useState("");
  const [loadingUsuario, setLoadingUsuario] = useState(true);
  const [podePersonalizar, setPodePersonalizar] = useState(false);

  const [cert1, setCert1] = useState<CertValue>("");
  const [cert2, setCert2] = useState<CertValue>("");
  const [gerada, setGerada] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [office, setOffice] = useState("");
  const [enderecoCadastro, setEnderecoCadastro] = useState("");

  const ENDERECO_PADRAO =
    enderecoCadastro.trim() ||
    getEnderecoPorPosto(office) ||
    getEnderecoPorPosto(POSTO_PADRAO);

  useEffect(() => {
    async function carregarUsuarioLogado() {
      try {
        setLoadingUsuario(true);

        const base = process.env.NEXT_PUBLIC_API_URL;

        const response = await fetch(`${base}/v1/assinatura-email/dados-usuario`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
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
            formatarNomeAssinatura(formatarPrimeiroUltimoNome(data.nome_completo))
          );
        }

        const setorBanco = String(data?.nm_setor || "").trim();
        const cargoBanco = String(data?.nm_cargo || "").trim();
        const enderecoBanco = String(data?.endereco_setor || "").trim();
        const posto = String(
          data?.physicalDeliveryOfficeName || setorBanco || ""
        ).trim();

        setOffice(posto || POSTO_PADRAO);
        setEnderecoCadastro(enderecoBanco);

        const funcaoUsuario = String(
          cargoBanco || setorBanco || data?.department || ""
        ).trim();
        setFuncao(capitalizarFrase(funcaoUsuario || FUNCAO_PADRAO));

        const gruposUsuario = Array.isArray(data?.grupos) ? data.grupos : [];
        setPodePersonalizar(
          gruposUsuario.includes(AD_GROUPS.META_PA) || isManagerOrDirector(data)
        );
      } catch (error) {
        console.error("Erro ao buscar usuário logado:", error);
        setPodePersonalizar(false);
      } finally {
        setLoadingUsuario(false);
      }
    }

    carregarUsuarioLogado();
  }, []);

  const dados = useMemo(
    () => ({
      nome: formatarNomeAssinatura(nome.trim()) || "Nome Sobrenome",
      funcao: capitalizarFrase(funcao.trim()) || "Setor não informado",
      telefone: celular.trim()
        ? `${TELEFONE_PADRAO} / ${formatarTelefoneBR(celular)}`
        : TELEFONE_PADRAO,
      site: SITE_PADRAO,
      endereco: ENDERECO_PADRAO,
      cert1Img: getCertImage(cert1),
      cert2Img: getCertImage(cert2),
    }),
    [nome, funcao, celular, cert1, cert2, ENDERECO_PADRAO]
  );

  function handleGerar() {
    if (!nome.trim()) {
      alert("Informe o nome.");
      return;
    }

    setNome(formatarNomeAssinatura(nome));
    setFuncao(capitalizarFrase(funcao));
    setCelular(formatarTelefoneBR(celular));
    setGerada(true);
  }

  async function handleBaixarImagem() {
    try {
      setBaixando(true);

      const canvas = await gerarCanvasAssinaturaAltaQualidade(dados);
      const url = canvas.toDataURL("image/png");

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
    <div className="mx-auto w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <FieldWrapper label="Nome" prefix="Nome:">
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  onBlur={() => setNome(formatarNomeAssinatura(nome))}
                  className="h-10 w-full bg-white px-3 text-sm text-gray-900 outline-none transition focus:bg-[#00AE9D]/5"
                />
              </FieldWrapper>

              <button
                type="button"
                onClick={handleGerar}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary"
              >
                Gerar
              </button>
            </div>

            {podePersonalizar ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldWrapper label="Setor/Função" prefix="Setor:">
                    <input
                      value={funcao}
                      onChange={(event) => setFuncao(event.target.value)}
                      onBlur={() => setFuncao(capitalizarFrase(funcao))}
                      className="h-10 w-full bg-white px-3 text-sm text-gray-900 outline-none transition focus:bg-[#00AE9D]/5"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Celular opcional" prefix="Cel.:">
                    <input
                      value={celular}
                      onChange={(event) =>
                        setCelular(formatarTelefoneBR(event.target.value))
                      }
                      placeholder="Ex.: (12) 99999-9999"
                      className="h-10 w-full bg-white px-3 text-sm text-gray-900 outline-none transition focus:bg-[#00AE9D]/5"
                    />
                  </FieldWrapper>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>
              </>
            ) : null}

          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FaSignature className="text-secondary" />
              Dados fixos da assinatura
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoItem
                label="Setor/Função"
                value={loadingUsuario ? "Carregando..." : dados.funcao}
              />
              <InfoItem label="Telefone exibido" value={dados.telefone} />
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
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#00AE9D] px-4 text-sm font-semibold text-white transition hover:bg-[#49479D] disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="mt-4 rounded-2xl border border-dashed border-[#00AE9D]/40 bg-[#F5FBEA] p-4">
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

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-[88px_1fr]">
          <div className="flex h-10 items-center border-r border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
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
  disabled = false,
}: {
  label: string;
  value: CertValue;
  onChange: (value: CertValue) => void;
  disabled?: boolean;
}) {
  return (
    <FieldWrapper label={label} prefix="Cert.:">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as CertValue)}
        className="h-10 w-full bg-white px-3 text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
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
  const certificacoes = [cert1Img, cert2Img].filter(Boolean) as string[];
  const gptwBox =
    certificacoes.length === 2
      ? { left: 512.5, top: 92.5, width: 71.5, height: 105 }
      : certificacoes.length === 1
        ? { left: 472.5, top: 87.5, width: 71.5, height: 105 }
        : { left: 415, top: 87.5, width: 71.5, height: 105 };

  return (
    <div className="relative h-50 w-150 overflow-hidden rounded-[18px] bg-white font-['SicoobSansCndMediumExact',Arial,Helvetica,sans-serif]">
      <SignatureBackground />

      <div className="absolute inset-0 px-3 pb-3 pt-5.5">
        <div
          className="absolute font-['SicoobSansCndSemiBoldExact',Arial,Helvetica,sans-serif] text-[32.5px] font-normal leading-none text-[#003641]"
          style={{ left: 10, top: 23.5 }}
        >
          {nome}
        </div>

        <div
          className="absolute font-['SicoobSansCndMediumExact',Arial,Helvetica,sans-serif] text-[25px] font-normal leading-none text-[#BED730]"
          style={{ left: 10, top: 53.5 }}
        >
          {funcao}
        </div>

        <img
          src="/assinatura-email/logo_sicoob_cressem.png"
          alt="Sicoob Cressem"
          className="absolute object-contain"
          style={{ left: 420, top: 27.5, width: 157.5, height: 55 }}
        />

        <div className="absolute" style={{ left: 10, top: 91 }}>
          <ContatoLinha
            icon="/assinatura-email/icon-phone.png"
            text={telefone}
          />
        </div>

        <div className="absolute" style={{ left: 7.5, top: 123.5 }}>
          <ContatoLinha icon="/assinatura-email/icon-web.png" text={site} />
        </div>

        <div className="absolute" style={{ left: 7.5, top: 156 }}>
          <ContatoLinha
            icon="/assinatura-email/icon-location.png"
            text={formatarEndereco(endereco)}
            multiline
          />
        </div>

        {certificacoes.length === 2 ? (
          <>
            <img
              src={certificacoes[0]}
              alt="Certificação 1"
              className="absolute object-contain"
              style={{ left: 362.5, top: 117.5, width: 70, height: 70 }}
            />
            <img
              src={certificacoes[1]}
              alt="Certificação 2"
              className="absolute object-contain"
              style={{ left: 440, top: 117.5, width: 70, height: 70 }}
            />
          </>
        ) : null}

        {certificacoes.length === 1 ? (
          <img
            src={certificacoes[0]}
            alt="Certificação 1"
            className="absolute object-contain"
            style={{ left: 395, top: 117.5, width: 72.5, height: 72.5 }}
          />
        ) : null}

        <img
          src="/assinatura-email/GPTW_OFICIAL.png"
          alt="GPTW"
          className="absolute object-contain"
          style={gptwBox}
        />
      </div>
    </div>
  );
}

function SignatureBackground() {
  return (
    <>
      <div className="absolute inset-0 rounded-[18px] bg-white" />

      <div
        className="absolute left-0 top-0 w-full bg-[#00B0A0]"
        style={{ height: 16 }}
      />

      <div
        className="absolute right-0 top-0 h-0 w-0 border-l-transparent border-t-[#00B0A0]"
        style={{
          borderLeftWidth: 48,
          borderTopWidth: 48,
        }}
      />
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
