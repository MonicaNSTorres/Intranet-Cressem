import jsPDF from "jspdf";

type RendimentosOpts = {
  destinatario?: string;
  valorMensal?: string | number;
  atividade?: string;
  cidade?: string;
  dia?: string;
  mes?: string;
  ano?: string;
  nome?: string;
  cpf?: string;
};

export async function gerarPdfDeclaracaoRendimentos(opts: RendimentosOpts) {
  const {
    destinatario = "______________________",
    valorMensal = "____________",
    atividade = "______________________________",
    cidade = "______________________",
    dia = "___",
    mes = "___",
    ano = "____",
    nome = "_____________________________",
    cpf = "______________________________",
  } = opts;

  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const left = 60;
  const maxW = pageW - left * 2;
  let y = 70;

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const logo = await toDataURL(logoUrl);
    const w = 150;
    const h = 100;
    doc.addImage(logo.dataUrl, logo.type, left - 20, y - 70, w, h, undefined, "FAST");
  } catch { }

  y += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DECLARAÇÃO DE RENDIMENTOS", pageW / 2, 150, { align: "center" });
  y += 40;

  y = 190;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  doc.text(
    `Declaro à ${destinatario} para fins de confecção de cadastro e análise de`,
    left, y, { maxWidth: maxW }
  ); y += 22;

  const valorBRL = formatBRL(valorMensal);
  doc.text(
    `crédito, que obtenho mensalmente rendimentos no valor de ${valorBRL}`,
    left, y, { maxWidth: maxW }
  ); y += 22;

  doc.text(
    `provenientes de minha atividade ${atividade}`,
    left, y, { maxWidth: maxW }
  ); y += 28;

  doc.text(
    "Assumo o compromisso de informar a essa cooperativa, imediatamente, eventual",
    left, y, { maxWidth: maxW }
  ); y += 18;
  doc.text(
    "desenquadramento à presente situação e estou ciente de que a falsidade na prestação",
    left, y, { maxWidth: maxW }
  ); y += 18;
  doc.text(
    "destas informações me sujeitará às penalidades previstas na legislação criminal, relativa",
    left, y, { maxWidth: maxW }
  ); y += 18;
  doc.text(
    "à falsidade ideológica (art. 299 do Código Penal).",
    left, y, { maxWidth: maxW }
  ); y += 32;

  doc.text(
    `${cidade},  ${pad(dia)}/${pad(mes)}/${ano}`,
    left, y
  ); y += 70;

  const sigW = 300;
  doc.line((pageW - sigW) / 2, y, (pageW + sigW) / 2, y);
  doc.text("(assinatura)", pageW / 2, y + 16, { align: "center" });
  y += 44;

  doc.text(`Nome: ${nome}`, left, y); y += 22;
  doc.text(`CPF: ${maskCpf(cpf)}`, left, y);

  doc.save(
    `declaracao_de_rendimentos_${(String(nome) || "associado").replace(/\s+/g, "_")}.pdf`
  );
}

function formatBRL(v: number | string) {
  if (v === undefined || v === null || v === "") return "R$ ____________";
  if (typeof v === "string") {
    const clean = v.replace(/\./g, "").replace(",", ".");
    const n = Number(clean);
    return isFinite(n)
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : `R$ ${v}`;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pad(s?: string) { return (s ?? "").toString().padStart(2, "0"); }
function maskCpf(v?: string) {
  const s = (v || "").replace(/\D/g, "");
  if (s.length !== 11) return v || "______________________________";
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}
async function toDataURL(url: string): Promise<{
  dataUrl: string;
  type: "JPEG" | "PNG";
}> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Logo não encontrada");

  const blob = await res.blob();

  const originalDataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = originalDataUrl;
  });

  const maxWidth = 420;
  const maxHeight = 420;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return {
      dataUrl: originalDataUrl,
      type: "PNG",
    };
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.72),
    type: "JPEG",
  };
}
