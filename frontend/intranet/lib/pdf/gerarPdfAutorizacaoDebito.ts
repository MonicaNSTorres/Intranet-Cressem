import jsPDF from "jspdf";

type ItemDebito = {
  descricao: string;
  valor: string;
};

type GerarPdfAutorizacaoDebitoParams = {
  cidade: string;
  dia: string;
  mes: string;
  ano: string;
  nome: string;
  cpf: string;
  conta: string;
  itens: ItemDebito[];
  total: string;
  valorSistema: string;
  acrescimo: string;
  reduzir: string;
  cancelar: string;
};

function textoOuPlaceholder(valor: string, placeholder = "—") {
  return String(valor || "").trim() || placeholder;
}

function sanitizeFileName(value: string) {
  return String(value || "autorizacao_debito")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 7
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export async function gerarPdfAutorizacaoDebito({
  cidade,
  dia,
  mes,
  ano,
  nome,
  cpf,
  conta,
  itens,
  total,
  valorSistema,
  acrescimo,
  reduzir,
  cancelar,
}: GerarPdfAutorizacaoDebitoParams) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Autorização de Débito", pageWidth / 2, 20, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  doc.text(
    `${textoOuPlaceholder(cidade, "CIDADE")}, ${textoOuPlaceholder(
      dia,
      "DD"
    )} de ${textoOuPlaceholder(mes, "MÊS")} de ${textoOuPlaceholder(ano, "AAAA")}.`,
    20,
    35
  );

  const paragrafo = `Eu, ${textoOuPlaceholder(
    nome,
    "NOME"
  )}, do CPF ${textoOuPlaceholder(
    cpf,
    "CPF"
  )}, da conta ${textoOuPlaceholder(
    conta,
    "CONTA"
  )}, autorizo o Banco da CRESSEM a debitar o valor em aberto na minha conta corrente e/ou cartão de crédito, com o empréstimo creditado na mesma.`;

  let currentY = addWrappedText(doc, paragrafo, 20, 48, 170, 6.5) + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Parcelas e Valores", 20, currentY);
  currentY += 6;

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);

  const tableX = 20;
  const tableW = 170;
  const col1W = 115;
  const col2W = 55;
  const rowH = 8;

  doc.rect(tableX, currentY, tableW, rowH);
  doc.line(tableX + col1W, currentY, tableX + col1W, currentY + rowH);
  doc.text("Descrição", tableX + 3, currentY + 5.5);
  doc.text("Valor", tableX + col1W + col2W / 2, currentY + 5.5, {
    align: "center",
  });

  currentY += rowH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  itens.forEach((item) => {
    doc.rect(tableX, currentY, tableW, rowH);
    doc.line(tableX + col1W, currentY, tableX + col1W, currentY + rowH);
    doc.text(textoOuPlaceholder(item.descricao), tableX + 3, currentY + 5.5);
    doc.text(textoOuPlaceholder(item.valor, "R$ 0,00"), tableX + tableW - 4, currentY + 5.5, {
      align: "right",
    });
    currentY += rowH;
  });

  doc.setFont("helvetica", "bold");
  doc.rect(tableX, currentY, tableW, rowH);
  doc.line(tableX + col1W, currentY, tableX + col1W, currentY + rowH);
  doc.text("TOTAL:", tableX + 3, currentY + 5.5);
  doc.text(textoOuPlaceholder(total, "R$ 0,00"), tableX + tableW - 4, currentY + 5.5, {
    align: "right",
  });

  currentY += 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detalhamento no Sistema", 20, currentY);
  currentY += 6;

  const detColW = 85;
  doc.rect(20, currentY, 170, rowH);
  doc.line(20 + detColW, currentY, 20 + detColW, currentY + rowH);
  doc.text("Valor do Sistema", 20 + detColW / 2, currentY + 5.5, { align: "center" });
  doc.text("Acréscimo Agência", 20 + detColW + detColW / 2, currentY + 5.5, {
    align: "center",
  });

  currentY += rowH;
  doc.setFont("helvetica", "normal");
  doc.rect(20, currentY, 170, rowH);
  doc.line(20 + detColW, currentY, 20 + detColW, currentY + rowH);
  doc.text(textoOuPlaceholder(valorSistema, "R$ 0,00"), 20 + detColW / 2, currentY + 5.5, {
    align: "center",
  });
  doc.text(textoOuPlaceholder(acrescimo, "R$ 0,00"), 20 + detColW + detColW / 2, currentY + 5.5, {
    align: "center",
  });

  currentY += 16;

  if (String(reduzir || "").trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Reduzir", 20, currentY);
    currentY += 6;

    doc.rect(20, currentY, 170, rowH);
    doc.text(textoOuPlaceholder(reduzir), 23, currentY + 5.5);
    currentY += 14;
  }

  if (String(cancelar || "").trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Cancelar", 20, currentY);
    currentY += 6;

    doc.rect(20, currentY, 170, rowH);
    doc.text(textoOuPlaceholder(cancelar), 23, currentY + 5.5);
    currentY += 14;
  }

  currentY += 30;
  doc.line(45, currentY, 165, currentY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(textoOuPlaceholder(nome, "NOME DO ASSOCIADO"), pageWidth / 2, currentY + 7, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.text(textoOuPlaceholder(cpf, "CPF"), pageWidth / 2, currentY + 13, {
    align: "center",
  });

  doc.save(`autorizacao_debito_${sanitizeFileName(nome)}.pdf`);
}