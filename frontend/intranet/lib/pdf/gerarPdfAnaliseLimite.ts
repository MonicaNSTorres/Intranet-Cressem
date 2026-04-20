/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";

type Opts = {
  tipoFormulario: "PF" | "PJ";
  cpf: string;
  nome: string;
  celular: string;
  empresa?: string;

  contaCorrente: string;
  salarioBruto: number;
  salarioLiquido: number;
  portabilidade?: string;
  efetivo?: string;
  cessaoCredito: string;
  dataPagamento?: string;
  carteira: string;
  iap: string;

  ocorrenciaCRM: string;
  obsCRM?: string;

  risco: string;
  pd: string;
  crl: number;
  capital: number;
  divida: number;
  restricoes: string;
  quaisRestricoes?: string;

  sugestaoLimite: number;
  cartao: string;
  cartaoAtual: number;
  cartaoAprovado: number;
  especial: string;
  especialAtual: number;
  especialAprovado: number;

  dataEnvio: string;
};

const PAGE = {
  marginX: 32,
  marginTop: 50,
  marginBottom: 40,
};

export async function gerarPdfAnaliseLimite(o: Opts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const contentX = PAGE.marginX;
  const contentW = pageW - PAGE.marginX * 2;

  const frameY = PAGE.marginTop + 10;
  const frameH = pageH - frameY - PAGE.marginBottom;

  let y = PAGE.marginTop;

  try {
    const logo = await toDataURL("/sicoob-cressem-logo.png");
    const w = 110;
    const h = (w * 300) / 500;
    doc.addImage(logo, "PNG", contentX + 8, y - 18, w, h);
  } catch {}

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.8);
  doc.rect(contentX, frameY, contentW, frameH);

  const titleY = frameY + 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ANÁLISE CONCESSÃO DE NOVOS LIMITES", pageW / 2, titleY, {
    align: "center",
  });

  doc.line(contentX, frameY + 48, contentX + contentW, frameY + 48);

  y = frameY + 76;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Data da análise: ${formatDateBR(o.dataEnvio)}`, contentX + contentW - 6, y, {
    align: "right",
  });

  y += 18;

  y = drawSection(doc, {
    y,
    x: contentX + 10,
    w: contentW - 20,
    title: "DADOS DO ASSOCIADO",
    rows: [
      [{ label: "CPF/CNPJ", value: o.cpf, full: true }],
      [{ label: "Nome", value: o.nome, full: true }],
      [{ label: "Celular", value: o.celular, full: true }],
      ...(o.tipoFormulario === "PF"
        ? [[{ label: "Empresa", value: o.empresa || "", full: true }]]
        : []),
    ],
  });

  y = drawSection(doc, {
    y,
    x: contentX + 10,
    w: contentW - 20,
    title: "INFORMAÇÕES BANCÁRIAS E SALARIAIS",
    rows: [
      [
        { label: "Conta Corrente", value: o.contaCorrente },
        {
          label: o.tipoFormulario === "PJ" ? "Faturamento Mensal" : "Salário Bruto",
          value: fmtBRL(o.salarioBruto),
        },
      ],
      [
        {
          label: o.tipoFormulario === "PJ" ? "Faturamento Anual" : "Salário Líquido",
          value: fmtBRL(o.salarioLiquido),
        },
        ...(o.tipoFormulario === "PF"
          ? [{ label: "Portabilidade", value: yesNoText(o.portabilidade) }]
          : [{ label: "", value: "" }]),
      ],
      ...(o.tipoFormulario === "PF"
        ? [
            [
              { label: "Funcionário Efetivo", value: yesNoText(o.efetivo) },
              { label: "Cessão de Crédito", value: yesNoText(o.cessaoCredito) },
            ],
          ]
        : [
            [
              { label: "Cessão de Crédito", value: yesNoText(o.cessaoCredito) },
              { label: "Nível Carteira", value: o.carteira },
            ],
          ]),
      [
        ...(o.cessaoCredito === "1"
          ? [{ label: "Data Pagamento", value: formatDateBR(o.dataPagamento || "") }]
          : [{ label: "", value: "" }]),
        { label: "Nível Carteira", value: o.tipoFormulario === "PF" ? o.carteira : "" },
      ],
      [{ label: "Números IAP", value: o.iap, full: true }],
    ],
  });

  y = drawSection(doc, {
    y,
    x: contentX + 10,
    w: contentW - 20,
    title: "STATUS CRM E OBSERVAÇÕES",
    rows: [
      [{ label: "Ocorrência CRM", value: yesNoText(o.ocorrenciaCRM), full: true }],
      [{ label: "Observação", value: o.obsCRM || "", full: true }],
    ],
  });

  y = drawSection(doc, {
    y,
    x: contentX + 10,
    w: contentW - 20,
    title: "INDICADORES DE RISCO / FINANCEIROS",
    rows: [
      [
        { label: "Risco", value: o.risco },
        { label: "PD", value: o.pd },
      ],
      [
        { label: "CRL", value: fmtBRL(o.crl) },
        { label: "Capital", value: fmtBRL(o.capital) },
      ],
      [
        { label: "Dívida", value: fmtBRL(o.divida) },
        { label: "Restrições", value: yesNoText(o.restricoes) },
      ],
      [{ label: "Quais", value: o.quaisRestricoes || "", full: true }],
    ],
  });

  y = drawSection(doc, {
    y,
    x: contentX + 10,
    w: contentW - 20,
    title: "SUGESTÃO DE LIMITE E APROVAÇÕES",
    rows: [
      [
        { label: "Sugestão de Limite", value: fmtBRL(o.sugestaoLimite) },
        { label: "Cartão", value: yesNoText(o.cartao) },
      ],
      [
        { label: "Limite Cartão Atual", value: fmtBRL(o.cartaoAtual) },
        { label: "Limite Cartão Aprovado", value: fmtBRL(o.cartaoAprovado) },
      ],
      [
        { label: "Cheque Especial", value: yesNoText(o.especial) },
        { label: "Limite Especial Atual", value: fmtBRL(o.especialAtual) },
      ],
      [{ label: "Limite Especial Aprovado", value: fmtBRL(o.especialAprovado), full: true }],
    ],
  });

  const sigY = pageH - 70;
  drawSignatures(doc, contentX + 10, sigY, contentW - 20);

  doc.save(`analise_limite_${sanitize(o.nome || "associado")}.pdf`);
}

type Cell = {
  label: string;
  value: string;
  full?: boolean;
};

function drawSection(
  doc: jsPDF,
  opts: {
    y: number;
    x: number;
    w: number;
    title: string;
    rows: Cell[][];
  }
) {
  let y = opts.y;

  doc.setFillColor(0, 128, 68);
  doc.rect(opts.x, y, opts.w, 20, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(opts.title, opts.x + 8, y + 13);
  doc.setTextColor(0, 0, 0);

  y += 12;

  for (const row of opts.rows) {
    y += 14;

    if (row.length === 1 || row[0].full) {
      const h = drawFieldBox(doc, {
        x: opts.x,
        y,
        w: opts.w,
        label: row[0].label,
        value: row[0].value,
      });
      y += h + 6;
      continue;
    }

    const gap = 12;
    const colW = (opts.w - gap) / 2;

    const leftH = measureFieldBox(doc, colW, row[0].label, row[0].value);
    const rightH = measureFieldBox(doc, colW, row[1].label, row[1].value);
    const rowH = Math.max(leftH, rightH, 24);

    drawFieldBox(doc, {
      x: opts.x,
      y,
      w: colW,
      h: rowH,
      label: row[0].label,
      value: row[0].value,
    });

    drawFieldBox(doc, {
      x: opts.x + colW + gap,
      y,
      w: colW,
      h: rowH,
      label: row[1].label,
      value: row[1].value,
    });

    y += rowH + 6;
  }

  return y + 4;
}

function measureFieldBox(doc: jsPDF, w: number, label: string, value: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const labelText = label ? `${label}: ` : "";
  const labelWidth = doc.getTextWidth(labelText);

  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value || "", Math.max(w - labelWidth - 18, 60));
  const linesCount = Math.max(lines.length, 1);

  return Math.max(22, 10 + linesCount * 12);
}

function drawFieldBox(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    w: number;
    label: string;
    value: string;
    h?: number;
  }
) {
  const h = opts.h ?? measureFieldBox(doc, opts.w, opts.label, opts.value);

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.5);
  doc.rect(opts.x, opts.y, opts.w, h);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  const labelText = opts.label ? `${opts.label}: ` : "";
  const labelWidth = doc.getTextWidth(labelText);

  if (labelText) {
    doc.text(labelText, opts.x + 6, opts.y + 14);
  }

  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(
    opts.value || "",
    Math.max(opts.w - labelWidth - 18, 60)
  );

  doc.text(lines, opts.x + 6 + labelWidth, opts.y + 14);

  return h;
}

function drawSignatures(doc: jsPDF, x: number, y: number, w: number) {
  const colGap = 24;
  const colW = (w - colGap * 2) / 3;

  drawSignature(doc, x, y, colW, "Assinatura Colaborador");
  drawSignature(doc, x + colW + colGap, y, colW, "Assinatura Gerência");
  drawSignature(doc, x + (colW + colGap) * 2, y, colW, "Assinatura Diretoria");
}

function drawSignature(doc: jsPDF, x: number, y: number, w: number, label: string) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(x, y, x + w, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(label, x + w / 2, y + 12, { align: "center" });
}

function fmtBRL(value?: number | null) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function yesNoText(value?: string | null) {
  if (value === "1") return "Sim";
  if (value === "0") return "Não";
  return "";
}

function formatDateBR(dateISO?: string | null) {
  if (!dateISO) return "";
  const [y, m, d] = String(dateISO).slice(0, 10).split("-");
  if (!y || !m || !d) return String(dateISO);
  return `${d}/${m}/${y}`;
}

function sanitize(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
}

async function toDataURL(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Logo não encontrado: " + url);
  const b = await r.blob();
  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onloadend = () => resolve(fr.result as string);
    fr.readAsDataURL(b);
  });
}