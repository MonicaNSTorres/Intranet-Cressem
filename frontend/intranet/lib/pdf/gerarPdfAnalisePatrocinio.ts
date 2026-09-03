import jsPDF from "jspdf";

import autoTable from "jspdf-autotable";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { PatrocinioItem } from "@/services/gerenciamento_participacao.service";

type PareceresAtuais = {
  gerencia?: string;
  parecerGerencia?: string;
  marketing?: string;
  parecerMarketing?: string;
  responsavelEvento?: string;
  sugestoesParticipantes?: string;
  diretoria?: string;
  parecerDiretoria?: string;
  conselho?: string;
  parecerConselho?: string;
  parecerConselhoFinal?: string;
};

const COLORS = {

  primary: [0, 174, 157] as [number, number, number],

  secondary: [121, 183, 41] as [number, number, number],

  section: [243, 249, 239] as [number, number, number],

  border: [202, 217, 194] as [number, number, number],

  title: [0, 54, 65] as [number, number, number],

  text: [16, 24, 40] as [number, number, number],

  muted: [71, 84, 103] as [number, number, number],

};

const TAMANHOS_FONTE = [8, 7.5, 7, 6.5, 6, 5.5, 5];

type IdentificacaoProposta = {

  atual: number;

  total: number;

};

export type PacotePropostaConselho = {

  registro: PatrocinioItem;

  arquivo: Blob;

};

export async function criarPdfAnalisePatrocinio(

  registro: PatrocinioItem,

  pareceres: PareceresAtuais = {}

) {

  // Reduz progressivamente apenas o corpo do documento até todo o registro

  // caber na mesma folha A4, sem descartar páginas ou informações.

  let doc: jsPDF | null = null;

  for (const tamanho of TAMANHOS_FONTE) {

    doc = await montarDocumento(registro, pareceres, tamanho);

    if (doc.getNumberOfPages() === 1) break;

  }

  if (!doc) {

    throw new Error("Não foi possível gerar o formulário da solicitação.");

  }

  if (doc.getNumberOfPages() > 1) {

    throw new Error(

      "Não foi possível acomodar o registro completo em uma única página."

    );

  }

  return doc;

}

export async function criarPdfPropostasConselho(

  registros: PatrocinioItem[]

) {

  if (!registros.length) {

    throw new Error("Nenhuma proposta pendente de conselho foi encontrada.");

  }

  const doc = criarDocumento();

  for (let index = 0; index < registros.length; index += 1) {

    const identificacao = { atual: index + 1, total: registros.length };

    const tamanho = await encontrarTamanhoFonte(registros[index], {}, identificacao);

    if (index > 0) doc.addPage("a4", "portrait");

    const paginaInicial = doc.getNumberOfPages();

    await desenharDocumento(doc, registros[index], {}, tamanho, identificacao);

    if (doc.getNumberOfPages() !== paginaInicial) {

      throw new Error(

        `Não foi possível acomodar a proposta ${index + 1} em uma única página.`

      );

    }

  }

  return doc;

}


export async function criarCadernoPropostasConselho(

  pacotes: PacotePropostaConselho[]

) {

  if (!pacotes.length) {

    throw new Error("Nenhuma proposta pendente do Conselho foi encontrada.");

  }

  const finalPdf = await PDFDocument.create();

  const paginasPorPacote = await Promise.all(

    pacotes.map((pacote) => contarPaginasPdf(pacote.arquivo))

  );

  const capaBlob = await criarCapaConselho(pacotes.length);

  const sumarioProvisorio = await criarSumarioConselho(

    pacotes.map((item) => item.registro),

    pacotes.map(() => 1)

  );

  const paginasSumario = await contarPaginasPdf(sumarioProvisorio);

  const paginasIniciais: number[] = [];

  let paginaAtual = 1 + paginasSumario + 1;

  for (let index = 0; index < pacotes.length; index += 1) {

    paginasIniciais.push(paginaAtual);

    paginaAtual += 1 + paginasPorPacote[index];

  }

  const sumarioBlob = await criarSumarioConselho(

    pacotes.map((item) => item.registro),

    paginasIniciais

  );

  await adicionarPdf(finalPdf, capaBlob);

  await adicionarPdf(finalPdf, sumarioBlob);

  for (let index = 0; index < pacotes.length; index += 1) {

    const pacote = pacotes[index];

    const separador = await criarPaginaProposta(

      pacote.registro,

      index + 1,

      pacotes.length

    );

    await adicionarPdf(finalPdf, separador);

    await adicionarPdf(finalPdf, pacote.arquivo);

  }

  const fonteRodape = await finalPdf.embedFont(StandardFonts.Helvetica);

  const paginas = finalPdf.getPages();

  paginas.forEach((pagina, index) => {

    const { width } = pagina.getSize();

    pagina.drawText(`Página ${index + 1} de ${paginas.length}`, {

      x: width - 82,

      y: 10,

      size: 6,

      font: fonteRodape,

      color: rgb(71 / 255, 84 / 255, 103 / 255),

    });

  });

  const bytes = await finalPdf.save();

  const buffer = bytes.buffer.slice(

    bytes.byteOffset,

    bytes.byteOffset + bytes.byteLength

  ) as ArrayBuffer;

  return new Blob([buffer], { type: "application/pdf" });

}

async function criarCapaConselho(quantidade: number) {

  const doc = criarDocumento();

  const pageW = doc.internal.pageSize.getWidth();

  const pageH = doc.internal.pageSize.getHeight();

  const margin = 48;

  try {

    const logo = await carregarImagem("/sicoob-cressem-logo.png?v=2");

    const maxW = 150;

    const maxH = 50;

    const escala = Math.min(maxW / logo.width, maxH / logo.height);

    doc.addImage(

      logo.dataUrl,

      logo.type,

      margin,

      48,

      logo.width * escala,

      logo.height * escala,

      undefined,

      "MEDIUM"

    );

  } catch {

    // Mantém o documento válido mesmo se a logo não estiver disponível.

  }

  doc.setDrawColor(...COLORS.primary);

  doc.setLineWidth(3);

  doc.line(margin, 135, pageW - margin, 135);

  doc.setFont("helvetica", "bold");

  doc.setTextColor(...COLORS.title);

  doc.setFontSize(28);

  doc.text("CADERNO DE", margin, 230);

  doc.setTextColor(...COLORS.primary);

  doc.text("PROPOSTAS", margin, 266);

  doc.setTextColor(...COLORS.title);

  doc.setFontSize(16);

  doc.text("Conselho", margin, 305);

  const hoje = new Date().toLocaleDateString("pt-BR");

  doc.setFont("helvetica", "normal");

  doc.setFontSize(11);

  doc.setTextColor(...COLORS.muted);

  doc.text(`Propostas discutidas em ${hoje}`, margin, 355);

  doc.text(`${quantidade} proposta(s) para análise`, margin, 378);

  doc.setFontSize(8);

  doc.text(

    "Documento de apoio à análise e deliberação do Conselho",

    margin,

    420

  );

  doc.setDrawColor(...COLORS.primary);

  doc.setLineWidth(0.7);

  doc.line(margin, pageH - 40, pageW - margin, pageH - 40);

  doc.setFontSize(6);

  doc.text(

    "Sicoob Cressem · Documento gerado pela Intranet",

    margin,

    pageH - 25

  );

  return doc.output("blob");

}

async function criarSumarioConselho(

  registros: PatrocinioItem[],

  paginasIniciais: number[]

) {

  const doc = criarDocumento();

  const pageW = doc.internal.pageSize.getWidth();

  const pageH = doc.internal.pageSize.getHeight();

  const margin = 42;

  let y = 48;

  const desenharCabecalho = (continuacao = false) => {

    doc.setFont("helvetica", "bold");

    doc.setFontSize(20);

    doc.setTextColor(...COLORS.title);

    doc.text(continuacao ? "SUMÁRIO — CONTINUAÇÃO" : "SUMÁRIO", margin, y);

    y += 15;

    doc.setDrawColor(...COLORS.primary);

    doc.setLineWidth(1.5);

    doc.line(margin, y, pageW - margin, y);

    y += 35;

  };

  desenharCabecalho();

  registros.forEach((registro, index) => {

    if (y > pageH - 56) {

      doc.addPage("a4", "portrait");

      y = 48;

      desenharCabecalho(true);

    }

    const numero = String(index + 1).padStart(2, "0");

    const nome = texto(registro.NM_SOLICITANTE);

    const pagina = paginasIniciais[index] || 1;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(9);

    doc.setTextColor(...COLORS.title);

    doc.text(`PROPOSTA ${numero}`, margin, y);

    doc.setFont("helvetica", "normal");

    doc.setFontSize(8);

    doc.setTextColor(...COLORS.text);

    const larguraNome = pageW - margin * 2 - 178;

    const linhasNome = doc.splitTextToSize(nome, larguraNome);

    doc.text(linhasNome.slice(0, 2), margin + 78, y);

    doc.setFont("helvetica", "bold");

    doc.text(`Página ${pagina}`, pageW - margin, y, { align: "right" });

    y += Math.max(23, linhasNome.slice(0, 2).length * 11 + 8);

  });

  return doc.output("blob");

}

async function criarPaginaProposta(

  registro: PatrocinioItem,

  numero: number,

  total: number

) {

  const doc = criarDocumento();

  const pageW = doc.internal.pageSize.getWidth();

  const pageH = doc.internal.pageSize.getHeight();

  const margin = 42;

  try {

    const logo = await carregarImagem("/sicoob-cressem-logo.png?v=2");

    const maxW = 105;

    const maxH = 32;

    const escala = Math.min(maxW / logo.width, maxH / logo.height);

    doc.addImage(

      logo.dataUrl,

      logo.type,

      margin,

      36,

      logo.width * escala,

      logo.height * escala,

      undefined,

      "MEDIUM"

    );

  } catch {

    // Mantém o documento válido mesmo se a logo não estiver disponível.

  }

  doc.setDrawColor(...COLORS.primary);

  doc.setLineWidth(2);

  doc.line(margin, 88, pageW - margin, 88);

  doc.setFont("helvetica", "bold");

  doc.setTextColor(...COLORS.title);

  doc.setFontSize(11);

  doc.text("CADERNO DE PROPOSTAS DO CONSELHO", margin, 115);

  doc.setFontSize(30);

  doc.text(`PROPOSTA ${String(numero).padStart(2, "0")}`, margin, 180);

  doc.setFont("helvetica", "normal");

  doc.setFontSize(10);

  doc.setTextColor(...COLORS.muted);

  doc.text(`Proposta ${numero} de ${total}`, margin, 200);

  let y = 260;

  const adicionarInformacao = (label: string, value: string) => {

    doc.setFont("helvetica", "bold");

    doc.setFontSize(8);

    doc.setTextColor(...COLORS.muted);

    doc.text(label.toUpperCase(), margin, y);

    y += 16;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(14);

    doc.setTextColor(...COLORS.text);

    const linhas = doc.splitTextToSize(value || "Não informado", pageW - margin * 2);

    doc.text(linhas, margin, y);

    y += linhas.length * 17 + 24;

  };

  adicionarInformacao("Proponente", texto(registro.NM_SOLICITANTE));

  adicionarInformacao("Cidade", texto(registro.NM_CIDADE));

  adicionarInformacao("Valor solicitado", moeda(registro.VL_PATROCINIO));

  adicionarInformacao("Solicitante interno", texto(registro.NM_FUNCIONARIO));

  y += 8;

  doc.setFillColor(...COLORS.section);

  doc.setDrawColor(...COLORS.border);

  doc.roundedRect(margin, y, pageW - margin * 2, 92, 8, 8, "FD");

  doc.setFont("helvetica", "bold");

  doc.setFontSize(9);

  doc.setTextColor(...COLORS.title);

  doc.text("DOCUMENTOS DESTA PROPOSTA", margin + 14, y + 20);

  doc.setFont("helvetica", "normal");

  doc.setFontSize(9);

  doc.setTextColor(...COLORS.text);

  const documentos = [

    "Formulário de análise da participação",

    registro.DIR_OFICIO ? "Ofício anexado" : "Ofício não anexado",

    registro.DIR_DOC_SEM_FINS_LUCRATIVO

      ? "Declaração de utilidade pública anexada"

      : "Declaração de utilidade pública não anexada",

  ];

  documentos.forEach((item, index) => {

    doc.text(`• ${item}`, margin + 16, y + 42 + index * 15);

  });

  doc.setDrawColor(...COLORS.primary);

  doc.setLineWidth(0.7);

  doc.line(margin, pageH - 34, pageW - margin, pageH - 34);

  doc.setFont("helvetica", "normal");

  doc.setFontSize(6);

  doc.setTextColor(...COLORS.muted);

  doc.text("Sicoob Cressem · Conselho", margin, pageH - 20);

  return doc.output("blob");

}

async function contarPaginasPdf(blob: Blob) {

  const bytes = await blob.arrayBuffer();

  const pdf = await PDFDocument.load(bytes);

  return pdf.getPageCount();

}

async function adicionarPdf(destino: PDFDocument, blob: Blob) {

  const bytes = await blob.arrayBuffer();

  const origem = await PDFDocument.load(bytes);

  const paginas = await destino.copyPages(origem, origem.getPageIndices());

  paginas.forEach((pagina) => destino.addPage(pagina));

}

export async function gerarPdfAnalisePatrocinio(

  registro: PatrocinioItem,

  pareceres: PareceresAtuais = {}

) {

  const doc = await criarPdfAnalisePatrocinio(registro, pareceres);

  doc.save(`analise_patrocinio_${slug(registro.NM_SOLICITANTE || "registro")}.pdf`);

}

async function montarDocumento(

  r: PatrocinioItem,

  p: PareceresAtuais,

  fontSize: number,

  identificacao?: IdentificacaoProposta

) {

  const doc = criarDocumento();

  await desenharDocumento(doc, r, p, fontSize, identificacao);

  return doc;

}

function criarDocumento() {

  return new jsPDF({

    orientation: "portrait",

    unit: "pt",

    format: "a4",

    compress: true,

    putOnlyUsedFonts: true,

  });

}

async function encontrarTamanhoFonte(

  registro: PatrocinioItem,

  pareceres: PareceresAtuais,

  identificacao?: IdentificacaoProposta

) {

  for (const tamanho of TAMANHOS_FONTE) {

    const teste = await montarDocumento(registro, pareceres, tamanho, identificacao);

    if (teste.getNumberOfPages() === 1) return tamanho;

  }

  throw new Error("Não foi possível acomodar uma proposta em uma única página.");

}

async function desenharDocumento(

  doc: jsPDF,

  r: PatrocinioItem,

  p: PareceresAtuais,

  fontSize: number,

  identificacao?: IdentificacaoProposta

) {

  const paginaInicial = doc.getNumberOfPages();

  const pageW = doc.internal.pageSize.getWidth();

  const margin = 28;

  const contentW = pageW - margin * 2;

  let y = 18;

  try {

    const logo = await carregarImagem("/sicoob-cressem-logo.png?v=2");

    const maxW = 88;

    const maxH = 27;

    const escala = Math.min(maxW / logo.width, maxH / logo.height);

    doc.addImage(

      logo.dataUrl,

      logo.type,

      margin,

      y,

      logo.width * escala,

      logo.height * escala,

      undefined,

      "MEDIUM"

    );

  } catch {

    // O documento continua válido mesmo se o ativo visual não estiver disponível.

  }

  doc.setTextColor(...COLORS.title);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(11);

  doc.text("ANÁLISE DE PARTICIPAÇÃO DE MARKETING", pageW / 2, y + 12, {

    align: "center",

  });

  doc.setFontSize(7);

  doc.setFont("helvetica", "normal");

  doc.setTextColor(...COLORS.muted);

  if (identificacao) {

    doc.setFont("helvetica", "bold");

    doc.setTextColor(...COLORS.title);

    doc.text(

      `PROPOSTA ${identificacao.atual} DE ${identificacao.total}`,

      pageW - margin,

      y + 7,

      { align: "right" }

    );

    doc.setFont("helvetica", "normal");

    doc.setTextColor(...COLORS.muted);

  }

  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, y + (identificacao ? 17 : 11), {

    align: "right",

  });

  y += 34;

  const dias = Array.isArray(r.DIAS) && r.DIAS.length

    ? r.DIAS.map((d) => `${dataBR(d.DT_DIA)} ${texto(d.HR_INICIO)}–${texto(d.HR_FIM)}`).join(" | ")

    : "Não informado";

  y = tabela(doc, y, "IDENTIFICAÇÃO DA SOLICITAÇÃO", [

    [campo("Data da solicitação", dataBR(r.DT_SOLICITACAO)), campo("Status", r.NM_ANDAMENTO)],

    [campo("Nome fantasia", r.NM_SOLICITANTE), campo("CPF/CNPJ", documento(r.NR_CPF_CNPJ))],

    [campo("Cidade", r.NM_CIDADE), campo("Solicitante interno", r.NM_FUNCIONARIO)],

    [campo("Dia(s) e horário(s)", dias, 2)],

  ], contentW, margin, fontSize, 2);

  y = tabela(doc, y, "RECURSOS E ESTRUTURA", [

    [campo("Precisa de dinheiro?", simNao(r.VL_MONETARIO)), campo("Valor solicitado", moeda(r.VL_PATROCINIO)), campo("É insumo?", simNao(r.QTD_INSUMO)), campo("Valor estimado", moeda(r.VL_ESTIMATIVA))],

    [campo("Auditório Sede", simNao(r.CD_AUDITORIO_SEDE)), campo("Auditório Centro", simNao(r.CD_AUDITORIO_CENTRO)), campo("Motorista", simNao(r.CD_MOTORISTA)), campo("Funcionários", simNao(r.CD_FUNCIONARIOS))],

    [campo("Ofício", r.DIR_OFICIO ? "Enviado" : "Não enviado"), campo("Utilidade pública", r.DIR_DOC_SEM_FINS_LUCRATIVO ? "Enviada" : "Não enviada"), campo("Conta na cooperativa", simNao(r.CD_CONTA_COOPERATIVA)), campo("Saldo médio C/C", moeda(r.VL_SALDO_MEDCIOCC))],

    [campo("Rentabilidade maquininha", moeda(r.VL_RENTABILIDADE_MAQUININHA)), campo("Responsável pelo evento", p.responsavelEvento || r.NM_GERENTE_EVENTO, 3)],

  ], contentW, margin, fontSize, 4);

  y = tabela(doc, y, "INFORMAÇÕES DO EVENTO", [

    [campo("Solicitação", r.DESC_SOLICITACAO)],

    [campo("Vínculo", r.DESC_VINCULO)],

    [campo("Produtos/Serviços", r.DESC_SERVICOS)],

    [campo("Retorno do último evento", r.DESC_RETORNO_ULTIMO_EVENTO)],

    [campo("Resumo do evento", r.DESC_RESUMO_EVENTO)],

    [campo("Sugestões de participantes", p.sugestoesParticipantes || r.NM_SUGESTAO_PARTICIPANTES)],

  ], contentW, margin, fontSize, 1);

  tabela(doc, y, "PARECERES E APROVAÇÕES", [

    [campo("Gerência", p.gerencia || r.NM_GERENCIA)],

    [campo("Parecer da gerência", p.parecerGerencia || r.DESC_PARECER_GERENCIA)],

    [campo("Marketing", p.marketing || r.NM_MARKETING)],

    [campo("Parecer do marketing", p.parecerMarketing || r.DESC_PARECER_MARKETING)],

    [campo("Diretoria", p.diretoria || r.NM_DIRETORIA)],

    [campo("Parecer da diretoria", p.parecerDiretoria || r.DESC_PARECER_ESCRITO_DIRETORIA)],

    [campo("Conselho", p.conselho || r.NM_CONSELHO)],

    [campo("Parecer do conselho", p.parecerConselho || r.DESC_PARECER_ESCRITO_CONSELHO)],

    [campo("Decisão final", p.parecerConselhoFinal || r.NM_PARECER_CONSELHO)],

  ], contentW, margin, fontSize, 1);

  const paginaFinal = doc.getNumberOfPages();

  for (let pagina = paginaInicial; pagina <= paginaFinal; pagina += 1) {

    doc.setPage(pagina);

    doc.setDrawColor(...COLORS.primary);

    doc.setLineWidth(0.7);

    doc.line(margin, doc.internal.pageSize.getHeight() - 17, pageW - margin, doc.internal.pageSize.getHeight() - 17);

    doc.setFont("helvetica", "normal");

    doc.setFontSize(5.5);

    doc.setTextColor(...COLORS.muted);

    doc.text("Sicoob Cressem · Documento gerado pela Intranet", margin, doc.internal.pageSize.getHeight() - 8);

  }

}

type Campo = { label: string; value: string; colSpan?: number };

function campo(label: string, value: unknown, colSpan = 1): Campo {

  return { label, value: texto(value), colSpan };

}

function tabela(

  doc: jsPDF,

  startY: number,

  titulo: string,

  rows: Campo[][],

  width: number,

  margin: number,

  fontSize: number,

  columnCount: number

) {

  const columnStyles = Object.fromEntries(

    Array.from({ length: columnCount }, (_, index) => [

      index,

      { cellWidth: width / columnCount },

    ])

  );

  autoTable(doc, {

    startY,

    margin: { left: margin, right: margin, bottom: 22 },

    tableWidth: width,

    theme: "grid",

    head: [[{ content: titulo, colSpan: columnCount }]],

    body: rows.map((row) => row.map((item) => ({

      content: item.value,

      colSpan: item.colSpan,

      label: item.label.toUpperCase(),

    }))),

    columnStyles,

    styles: {

      font: "helvetica",

      fontSize,

      textColor: COLORS.text,

      lineColor: COLORS.border,

      lineWidth: 0.35,

      cellPadding: {

        top: fontSize + 3.2,

        right: 2.5,

        bottom: Math.max(1.6, fontSize * 0.28),

        left: 2.5,

      },

      valign: "middle",

      overflow: "linebreak",

    },

    headStyles: {

      fillColor: COLORS.section,

      textColor: COLORS.title,

      fontStyle: "bold",

      fontSize: fontSize + 0.6,

      lineColor: COLORS.secondary,

      lineWidth: 0.55,

      cellPadding: { top: 2, right: 4, bottom: 2, left: 4 },

    },

    didDrawCell(data) {

      if (data.section !== "body") return;

      const raw = data.cell.raw as { label?: string } | undefined;

      if (!raw?.label) return;

      doc.setFont("helvetica", "bold");

      doc.setFontSize(Math.max(4.8, fontSize - 1.3));

      doc.setTextColor(...COLORS.muted);

      doc.text(raw.label, data.cell.x + 2.5, data.cell.y + Math.max(5.5, fontSize * 0.85));

    },

    pageBreak: "auto",

    rowPageBreak: "avoid",

    showHead: "firstPage",

  });

  return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || startY) + 5;

}

function texto(value: unknown) {

  const result = String(value ?? "").trim();

  return result || "Não informado";

}

function simNao(value: unknown) {

  return Number(value || 0) > 0 ? "Sim" : "Não";

}

function moeda(value: unknown) {

  return Number(value || 0).toLocaleString("pt-BR", {

    style: "currency",

    currency: "BRL",

  });

}

function dataBR(value: unknown) {

  const raw = String(value || "").slice(0, 10);

  const [ano, mes, dia] = raw.split("-");

  return ano && mes && dia ? `${dia}/${mes}/${ano}` : texto(value);

}

function documento(value: unknown) {

  const raw = String(value || "").replace(/\D/g, "");

  if (raw.length === 11) return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

  if (raw.length === 14) return raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

  return texto(value);

}

function slug(value: string) {

  return value

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "_")

    .replace(/^_|_$/g, "");

}

async function carregarImagem(src: string) {

  const response = await fetch(src);

  if (!response.ok) throw new Error("Imagem não encontrada");

  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {

    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));

    reader.onerror = reject;

    reader.readAsDataURL(blob);

  });

  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {

    const image = new Image();

    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });

    image.onerror = reject;

    image.src = dataUrl;

  });

  return {

    dataUrl,

    width: size.width,

    height: size.height,

    type: blob.type.includes("jpeg") ? "JPEG" : "PNG",

  };

}