import jsPDF from "jspdf";

type PdfOpts = {
  dataHoje: string;
  ccb: string;
  nomeAssociado: string;
  cpfAssociado: string;
  empresa: string;
  nomeConjugue: string;
  cpfConjugue: string;
};

export async function gerarPdfAdendoContratual(o: PdfOpts) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 50;
  const colW = pageW - margin * 2;
  let y = 40;

  const bottomLimit = () => doc.internal.pageSize.getHeight() - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  try {
    const logoUrl = "/sicoob-cressem-logo.png?v=2";
    const logo = await loadImageDataURL(logoUrl);
    const maxW = 120;
    const maxH = 44;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    ensureSpace(h + 40);
    doc.addImage(logo.dataUrl, logo.type, 30, y - 8, w, h, undefined, "MEDIUM");
    y = y - 8 + h + 22;
  } catch {
    ensureSpace(36);
    y += 36;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ADENDO CONTRATUAL", pageW / 2, y, { align: "center" });
  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const paragrafo = `No caso de falecimento do “ASSOCIADO”, as obrigações e responsabilidades quanto a esta CCB de número ${o.ccb}, passarão aos herdeiros, até o limite das forças da herança ou far-se-á a quitação do saldo devedor oriundo desta CCB através de descontos mensais em folha de pagamento do(a) pensionista titular, que corrobora este artigo através de sua anuência abaixo.`;

  const lines = doc.splitTextToSize(paragrafo, colW);
  lines.forEach((ln: string) => {
    ensureSpace(14);
    doc.text(ln, margin, y);
    y += 14;
  });

  y += 20;

  doc.setFont("helvetica", "bold");
  doc.text("Dados do Associado", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${o.dataHoje}`, margin, y);
  y += 16;
  doc.text(`Nome: ${o.nomeAssociado}`, margin, y);
  y += 16;
  doc.text(`CPF: ${o.cpfAssociado}`, margin, y);
  y += 16;
  doc.text(`Empresa: ${o.empresa}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.text("Dados do Cônjuge", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${o.nomeConjugue}`, margin, y);
  y += 16;
  doc.text(`CPF: ${o.cpfConjugue}`, margin, y);
  y += 50;

  const assinaturaW = 360;
  const x1 = (pageW - assinaturaW) / 2;
  const x2 = x1 + assinaturaW;

  doc.line(x1, y, x2, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.text(toUpper(o.nomeConjugue || "_______________________________"), pageW / 2, y, {
    align: "center",
  });
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.text(`CPF: ${o.cpfConjugue || ""}`, pageW / 2, y, { align: "center" });
  y += 16;

  doc.text("Assinatura Cônjuge", pageW / 2, y, { align: "center" });

  doc.save(`adendo_contratual_${sanitize(o.nomeAssociado || "associado")}.pdf`);
}

function toUpper(s?: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function toDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado");
  const b = await r.blob();

  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}

async function loadImageDataURL(url: string) {
  const originalDataUrl = await toDataURL(url);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = originalDataUrl;
  });

  const maxWidth = 560;
  const maxHeight = 174;
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.72),
      width: canvas.width,
      height: canvas.height,
      type: "JPEG" as const,
    };
  }

  return {
    dataUrl: originalDataUrl,
    width: img.width,
    height: img.height,
    type: "PNG" as const,
  };
}
