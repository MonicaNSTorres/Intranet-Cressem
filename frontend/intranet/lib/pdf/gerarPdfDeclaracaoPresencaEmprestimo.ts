import jsPDF from "jspdf";

type DeclaracaoPresencaEmprestimoOpts = {
  nome: string;
  matricula: string;
  cpf: string;
  dataPresenca: string;
  horaInicio: string;
  horaFim: string;
  funcionarioLogado: string;
};

function toBrFromIso(value: string) {
  if (!value) return "";
  const [ano, mes, dia] = value.split("-");
  if (!ano || !mes || !dia) return "";
  return `${dia}/${mes}/${ano}`;
}

function toUpperNoAccent(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

async function loadLogoDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar logo");

  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  return {
    dataUrl,
    width: image.width,
    height: image.height,
  };
}

export async function gerarPdfDeclaracaoPresencaEmprestimo(
  o: DeclaracaoPresencaEmprestimoOpts
) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 54;
  const maxW = pageW - margin * 2;
  let y = 56;

  try {
    const logo = await loadLogoDataUrl("/sicoob-cressem-logo.png");
    const maxLogoW = 130;
    const maxLogoH = 56;
    const scale = Math.min(maxLogoW / logo.width, maxLogoH / logo.height);
    const logoW = logo.width * scale;
    const logoH = logo.height * scale;

    doc.addImage(
      logo.dataUrl,
      "PNG",
      margin,
      y - 8,
      logoW,
      logoH,
      undefined,
      "MEDIUM"
    );

    y += logoH + 16;
  } catch {
    y += 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DECLARAÇÃO DE PRESENÇA", pageW / 2, y, { align: "center" });
  y += 34;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const texto = `Declaramos, para os devidos fins, que ${o.nome}, matrícula ${o.matricula}, CPF ${o.cpf}, esteve presente no setor de empréstimos da cooperativa no dia ${toBrFromIso(o.dataPresenca)}, das ${o.horaInicio} às ${o.horaFim}.`;

  const linhas = doc.splitTextToSize(texto, maxW);

  linhas.forEach((linha: string) => {
    doc.text(linha, margin, y);
    y += 18;
  });

  y += 24;

  doc.text(
    `São José dos Campos, ${new Date().toLocaleDateString("pt-BR")}.`,
    margin,
    y
  );

  y += 72;

  const assinaturaX1 = margin + 20;
  const assinaturaX2 = assinaturaX1 + 260;

  doc.line(assinaturaX1, y, assinaturaX2, y);

  y += 16;

  doc.setFontSize(10);
  doc.text("Assinatura do funcionário responsável", assinaturaX1, y);

  y += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    toUpperNoAccent(o.funcionarioLogado || "FUNCIONÁRIO"),
    assinaturaX1,
    y
  );

  doc.save(
    `declaracao_presenca_emprestimo_${toUpperNoAccent(o.nome || "associado")
      .replace(/\s+/g, "_")
      .replace(/[^\w]/g, "")}.pdf`
  );
}