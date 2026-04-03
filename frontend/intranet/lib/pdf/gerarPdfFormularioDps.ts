import jsPDF from "jspdf";

type SimNao = "" | "sim" | "nao";
type TipoDiabetes = "" | "tipo1" | "tipo2" | "gestacional";
type TipoHepatite = "" | "a" | "b" | "c";

type DoencasState = {
  tumor: SimNao;
  doenca_coronaria: SimNao;
  avc: SimNao;
  diabetes: SimNao;
  bronquite: SimNao;
  enfisema: SimNao;
  hepatite: SimNao;
  arritmia: SimNao;
  insuficiencia_cardiaca: SimNao;
  hipercolesterolemia: SimNao;
  hipertrigliceridemia: SimNao;
  sincopes: SimNao;
  hipertensao: SimNao;
  renal: SimNao;
};

type PdfOpts = {
  cpf: string;
  nome: string;
  sexo: string;
  estadoCivil: string;
  nascimento: string;
  documento: string;
  orgaoExpedidor: string;
  telefone: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  email: string;
  doencas: DoencasState;
  tipoDiabetes: TipoDiabetes;
  tipoHepatite: TipoHepatite;
  cidadeAtendimento: string;
  diaAtendimento: string;
  assinaturaAssociado: string;
};

const DOENCAS_LABELS: Array<{ key: keyof DoencasState; label: string }> = [
  { key: "tumor", label: "Tumor ou câncer" },
  { key: "doenca_coronaria", label: "Doença coronária" },
  { key: "avc", label: "Acidente vascular cerebral" },
  { key: "diabetes", label: "Diabetes" },
  { key: "bronquite", label: "Bronquite" },
  { key: "enfisema", label: "Enfisema" },
  { key: "hepatite", label: "Hepatites" },
  { key: "arritmia", label: "Arritmia" },
  { key: "insuficiencia_cardiaca", label: "Insuficiência cardíaca" },
  { key: "hipercolesterolemia", label: "Hipercolesterolemia" },
  { key: "hipertrigliceridemia", label: "Hipertrigliceridemia" },
  { key: "sincopes", label: "Síncope" },
  { key: "hipertensao", label: "Hipertensão" },
  { key: "renal", label: "Doença renal / Hemodiálise" },
];

export async function gerarPdfFormularioDps(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 42;
  const colW = pageW - margin * 2;
  let y = 38;

  const bottomLimit = () => pageH - margin;
  const ensureSpace = (needed = 16) => {
    if (y + needed > bottomLimit()) {
      doc.addPage();
      y = margin;
    }
  };

  try {
    const logoUrl = "/sicoob-cressem-logo.png";
    const dataUrl = await toDataURL(logoUrl);
    const w = 120;
    const h = w * 0.5;
    ensureSpace(h + 20);
    doc.addImage(dataUrl, "PNG", 30, y - 8, w, h);
    y = y - 8 + h + 20;
  } catch {
    y += 28;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMO DE DECLARAÇÃO PESSOAL DE SAÚDE", pageW / 2, y, {
    align: "center",
  });
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const writeField = (label: string, value: string, x = margin) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", x + doc.getTextWidth(`${label}:`) + 6, y);
  };

  ensureSpace(60);
  writeField("CPF", o.cpf);
  writeField("Nome", o.nome, 220);
  y += 16;

  writeField("Sexo", o.sexo);
  writeField("Estado Civil", o.estadoCivil, 160);
  writeField("Nascimento", o.nascimento, 360);
  y += 16;

  writeField("N° Doc. Identificação", o.documento);
  writeField("Órgão Expedidor", o.orgaoExpedidor, 250);
  y += 16;

  writeField("Cel / Tel", o.telefone);
  y += 16;

  writeField("End. Correspondência", o.rua);
  y += 16;

  writeField("Bairro", o.bairro);
  writeField("Cidade", o.cidade, 220);
  writeField("Estado", o.estado, 400);
  y += 16;

  writeField("CEP", o.cep);
  writeField("E-mail", o.email, 180);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.text("DECLARAÇÃO PESSOAL DE SAÚDE E ATIVIDADES", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");

  DOENCAS_LABELS.forEach((item) => {
    ensureSpace(16);

    let valor = o.doencas[item.key] === "sim" ? "SIM" : o.doencas[item.key] === "nao" ? "NÃO" : "-";

    if (item.key === "diabetes" && o.doencas.diabetes === "sim" && o.tipoDiabetes) {
      valor += ` (${o.tipoDiabetes.toUpperCase()})`;
    }

    if (item.key === "hepatite" && o.doencas.hepatite === "sim" && o.tipoHepatite) {
      valor += ` (${o.tipoHepatite.toUpperCase()})`;
    }

    doc.text(`• ${item.label}: ${valor}`, margin, y);
    y += 14;
  });

  y += 12;

  const paragrafos = [
    "Declaro, para os devidos fins e efeitos, estar ciente que, conforme os Artigos 765 e 766 do Código Civil Brasileiro, se estiver omitindo circunstâncias que influam na aceitação da proposta ou na taxa de prêmio, perderei o direito à indenização, além de estar obrigado ao pagamento do prêmio vencido.",
    "Declaro, também, que estou fazendo o seguro prestamista para isentar da apresentação de avalista e que, se o quiser poderei fazê-lo em qualquer momento, cessando o pagamento desse seguro.",
  ];

  paragrafos.forEach((texto) => {
    const lines = doc.splitTextToSize(texto, colW);
    lines.forEach((ln: string) => {
      ensureSpace(14);
      doc.text(ln, margin, y);
      y += 14;
    });
    y += 8;
  });

  y += 6;
  writeField("Cidade do atendimento", o.cidadeAtendimento);
  writeField("Dia do atendimento", o.diaAtendimento, 320);
  y += 50;

  const assinaturaW = 300;
  const x1 = (pageW - assinaturaW) / 2;
  const x2 = x1 + assinaturaW;

  doc.line(x1, y, x2, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text(o.assinaturaAssociado || "Assinatura do Proponente Principal", pageW / 2, y, {
    align: "center",
  });

  y += 36;
  doc.line(x1, y, x2, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text("Validação", pageW / 2, y, {
    align: "center",
  });

  doc.save(`formulario_dps_${sanitize(o.nome || "associado")}.pdf`);
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