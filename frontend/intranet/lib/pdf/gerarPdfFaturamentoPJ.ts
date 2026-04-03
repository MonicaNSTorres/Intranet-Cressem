/* eslint-disable @typescript-eslint/no-explicit-any */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type MesItem = { mes: string; valor: string };
type Formas = { vista: string; prazo: string };
type Meios = { dinheiro: string; cheques: string; debito: string; credito: string; duplicatas: string; carne: string; outros: string };

type PdfOpts = {
  razaoSocial: string;
  cnpj: string;
  meses: MesItem[];
  total: number;
  qtdMeses: number;
  media: number;
  formas: Formas;
  meios: Meios;
  municipioUF: string;
  data: string; // dd/mm/aaaa
  contNome: string;
  contCPF: string;
  contCRC: string;
  pjVisitada: "Sim" | "Não" | "";
  obs: string;
};

export async function gerarPdfFaturamentoPJ(o: PdfOpts) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 60;
  let y = 60;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("RELAÇÃO DE FATURAMENTO/RECEITA BRUTA", pageW / 2, y, { align: "center" });
  y += 18;
  doc.setFontSize(12);
  doc.text("PESSOA JURÍDICA", pageW / 2, y, { align: "center" });
  y += 24;

  // Razão + CNPJ
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Razão social completa: ${o.razaoSocial || "____________________________"}`, margin, y); y += 20;
  doc.text(`CNPJ: ${o.cnpj || "________________________"}`, margin, y); y += 20;

  // Tabela 2×6 (Mês/ano x Faturamento)
  const rows: any[] = [];
  const m = [...o.meses];
  while (m.length < 12) m.push({ mes: "", valor: "" }); // garante 12 linhas
  for (let i = 0; i < 6; i++) {
    const a = m[i] || { mes: "", valor: "" };
    const b = m[i + 6] || { mes: "", valor: "" };
    rows.push([a.mes, a.valor || "", b.mes, b.valor || ""]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Mês/ano", "Faturamento (R$)", "Mês/ano", "Faturamento (R$)"]],
    body: rows,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6, lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    tableWidth: pageW - margin * 2,
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Total / Qtd / Média
  doc.text(`Total: ${fmtBRL(o.total)}   —   Qtd meses: ${o.qtdMeses}   —   Média mensal: ${fmtBRL(o.qtdMeses ? o.media : 0)}`, margin, y);
  y += 24;

  // Forma de recebimento
  doc.setFont("helvetica", "bold"); doc.text("Forma de recebimento", margin, y); y += 16; doc.setFont("helvetica", "normal");
  doc.text(`% à vista: ${o.formas.vista || "____"}      % a prazo: ${o.formas.prazo || "____"}`, margin, y); y += 24;

  // Meios de recebimento
  doc.setFont("helvetica", "bold"); doc.text("Meios de recebimento:", margin, y); y += 16; doc.setFont("helvetica", "normal");
  const linhasMeios = [
    `% dinheiro: ${o.meios.dinheiro || "____"}      % cheques: ${o.meios.cheques || "____"}      % cartão de déb.: ${o.meios.debito || "____"}`,
    `% cartão de créd.: ${o.meios.credito || "____"}      % duplicatas: ${o.meios.duplicatas || "____"}      % carnê: ${o.meios.carne || "____"}      % outros: ${o.meios.outros || "____"}`
  ];
  linhasMeios.forEach((ln) => { doc.text(ln, margin, y); y += 18; });
  y += 8;

  // Local/Data
  doc.text(`Município-UF: ${o.municipioUF || "________________"}    Data: ${o.data || "__/__/____"}`, margin, y);
  y += 40;

  // Assinaturas
  // Representante(s) legal(ais)
  // ===== Assinaturas =====
  doc.setFontSize(10);

  // medidas
  const gap = 32; // espaço entre os dois blocos
  const sigW = (pageW - 2 * margin - gap) / 2; // largura de cada bloco
  const leftX = margin;
  const rightX = margin + sigW + gap;
  const ySig = y; // linha das assinaturas

  // linhas
  doc.line(leftX, ySig, leftX + sigW, ySig);       // representante legal
  doc.line(rightX, ySig, rightX + sigW, ySig);     // contador

  // legendas centralizadas dentro de cada bloco
  doc.text(
    "Assinatura do(s) representante(s) legal(ais) da pessoa jurídica",
    leftX + sigW / 2,
    ySig + 12,
    { align: "center", maxWidth: sigW }
  );

  doc.text(
    "Assinatura do contador responsável",
    rightX + sigW / 2,
    ySig + 12,
    { align: "center", maxWidth: sigW }
  );

  // campos do contador (à direita)
  let fy = ySig + 26;
  const step = 9;
  doc.text("Nome: ____________________", rightX, fy); fy += step;
  doc.text("CPF:  ____________________", rightX, fy); fy += step;
  doc.text("CRC:  ____________________", rightX, fy); fy += step;

  // avança y para depois do bloco
  y = fy + 8;


  // Para uso exclusivo do Sicoob
  doc.setFont("helvetica", "bold");
  doc.text("Para uso exclusivo do Sicoob", margin, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.text(`PJ visitada?  ${o.pjVisitada ? o.pjVisitada : "____"}`, margin, y); y += 18;
  doc.text(`Observações: ${o.obs || ""}`, margin, y); y += 32;

  // carimbo gerente
  const carimboW = 320, carimboH = 60;
  doc.rect(margin, y, carimboW, carimboH);
  doc.text("(carimbo e assinatura do gerente)", margin + carimboW / 2, y + carimboH / 2, { align: "center" });

  doc.save(`faturamento_pj_${sanitize(o.razaoSocial || "empresa")}.pdf`);
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function sanitize(s: string) { return s.replace(/\s+/g, "_").replace(/[^\w\-_.]/g, ""); }
