import jsPDF from "jspdf";

type PdfOpts = {
  nome: string;
  cpf: string;
  matricula: string;
  empresa?: string;
  atendente?: string;
  dataPrimeiroDesconto?: string;
  valorAnterior?: number | string;
  valorNovo?: number | string;
};

export async function gerarPdfAssociado(opts: PdfOpts) {
  const {
    nome,
    cpf,
    matricula,
    empresa,
    atendente = "—",
    dataPrimeiroDesconto = "—/—/———",
    valorAnterior = "",
    valorNovo = "",
  } = opts;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Tenta carregar o logo central (opcional)
  const logoUrl = "/sicoob-cressem-logo.png";
  const logo = await tryFetchAsDataURL(logoUrl);

  // função que desenha UMA via, começando em um Y base
  const renderVia = (labelVia: string, baseY: number) => {
    let y = baseY;

    // Logo centralizado (se existir)
    if (logo) {
      const logoW = 120;
      const logoH = (logoW * 768) / 1086; // proporção do PNG 1086x768
      const x = (pageW - logoW) / 2;
      doc.addImage(logo, "PNG", x, y, logoW, logoH);
      y += logoH + 18;
    } else {
      y += 18; // compensar margem caso não tenha logo
    }

    // Título central
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("Comprovante - Alteração de Integralização", pageW / 2, y, { align: "center" });
    y += 26;

    // Tag da via (no canto direito)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(`[${labelVia}]`, pageW - 60, y, { align: "right" });
    y += 26;

    // Atendente
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Atendente:", 60, y);
    doc.setFont("helvetica", "normal");
    doc.text(atendente, 130, y);
    y += 22;

    // Data 1º Desconto
    doc.setFont("helvetica", "bold");
    doc.text("Data 1º Desconto:", 60, y);
    doc.setFont("helvetica", "normal");
    doc.text(formatDateBR(dataPrimeiroDesconto), 160, y);
    y += 28;

    // Parágrafo principal (quebra automática de linha)
    const texto = [
      "Eu, ",
      toUpperNoAccent(nome),
      " inscrito no CPF: ",
      maskCpf(cpf),
      " e matrícula: ",
      matricula || "—",
      ", empresa: ",
      empresa || "—",
      " , associado no SICOOB CRESSEM autorizo a alteração da minha integralização mensal de cotas partes de ",
      formatBRL(valorAnterior),
      " para ",
      formatBRL(valorNovo),
      ".",
    ].join("");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    y = wrapText(doc, texto, 60, y, pageW - 120, 16); // retorna o novo y após escrever
    y += 32;

    // Linha de assinatura (central)
    const lineW = 360;
    const lineX = (pageW - lineW) / 2;
    doc.setLineWidth(0.8);
    doc.line(lineX, y, lineX + lineW, y);
    y += 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(toUpperNoAccent(nome), pageW / 2, y, { align: "center" });

    return y;
  };

  // VIA DO ASSOCIADO (topo)
  const afterFirst = renderVia("VIA DO ASSOCIADO", 36);
  // espaço entre vias
  const spacer = 42;

  // VIA DA COOPERATIVA (abaixo)
  renderVia("VIA DA COOPERATIVA", afterFirst + spacer);

  doc.save(
    `comprovante_integralizacao_${(nome || "associado").replace(/\s+/g, "_")}.pdf`
  );
}

/* ---------------- helpers ---------------- */

function toUpperNoAccent(s: string) {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}


function formatDateBR(dateStr?: string) {
  if (!dateStr) return "—/—/———";
  // já está no formato yyyy-mm-dd (input type="date")
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr; // fallback se já vier formatado
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

function formatBRL(v: number | string) {
  if (v === "" || v === undefined || v === null) return "R$ —";
  if (typeof v === "string") {
    // aceita "27,32" ou "27.32"
    const clean = v.replace(/\./g, "").replace(",", ".");
    const n = Number(clean);
    if (!isFinite(n)) return `R$ ${v}`;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function maskCpf(v: string) {
  const s = (v || "").replace(/\D/g, "");
  if (s.length !== 11) return v || "";
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

function wrapText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (doc.getTextWidth(test) > maxWidth) {
      doc.text(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) doc.text(line, x, yy);
  return yy;
}

async function tryFetchAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
