import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ParcelaDemissao = {
  numero: number;
  data: string;
  valor: string;
};

export type GerarPdfDemissaoData = {
  tipoFormulario: "CREDOR" | "DEVEDOR";
  cpf: string;
  nome: string;
  matricula: string;
  empresa: string;
  telefone: string;

  saldoCapital: string;
  debitoConta: string;
  debitoEmprestimo: string;
  debitoCartao: string;
  totalDebitos: string;
  saldoFinal: string;

  banco: string;
  agencia: string;
  conta: string;
  digito: string;

  primeiraParcelaValor: string;
  primeiraParcelaData: string;
  totalDevolucaoParcelada: string;
  parcelas: ParcelaDemissao[];

  motivoDemissao: string;
  dataRetorno: string;

  reciboTransferencia: string;
  reciboPix: string;
  reciboDebitoConta: string;
  reciboTotal: string;

  cidadeAtendimento: string;
  dataAtendimento: string;
  atendente: string;
};

function linha(doc: jsPDF, y: number) {
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
}

export function gerarPdfDemissao(data: GerarPdfDemissaoData) {
  const doc = new jsPDF("p", "mm", "a4");
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(
    `Demissão espontânea ${
      data.tipoFormulario === "CREDOR" ? "credora" : "devedora"
    }`,
    105,
    y,
    { align: "center" }
  );

  y += 10;
  linha(doc, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do associado", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`CPF: ${data.cpf}`, 14, y);
  doc.text(`Nome: ${data.nome}`, 70, y);
  y += 6;

  doc.text(`Matrícula: ${data.matricula || "-"}`, 14, y);
  doc.text(`Empresa: ${data.empresa || "-"}`, 70, y);
  y += 6;

  doc.text(`Telefone: ${data.telefone || "-"}`, 14, y);
  y += 8;

  linha(doc, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Valores", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: [
      ["Saldo conta capital", data.saldoCapital],
      ["Débito conta corrente", data.debitoConta],
      ["Débito empréstimo", data.debitoEmprestimo],
      ["Débito cartão", data.debitoCartao],
      ["Total dos débitos", data.totalDebitos],
      [
        data.tipoFormulario === "CREDOR" ? "Total a devolver" : "Total a pagar",
        data.saldoFinal,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [1, 54, 65] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.text("Outras informações", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text(`Motivo da demissão: ${data.motivoDemissao || "-"}`, 14, y);
  y += 6;
  doc.text(`Data de retorno: ${data.dataRetorno || "-"}`, 14, y);
  y += 8;

  if (data.tipoFormulario === "CREDOR") {
    doc.setFont("helvetica", "bold");
    doc.text("Dados bancários", 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`Banco: ${data.banco || "-"}`, 14, y);
    doc.text(`Agência: ${data.agencia || "-"}`, 60, y);
    doc.text(`Conta: ${data.conta || "-"}`, 110, y);
    doc.text(`Dígito: ${data.digito || "-"}`, 160, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Devolução parcelada", 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text(`Valor da 1ª parcela: ${data.primeiraParcelaValor || "-"}`, 14, y);
    doc.text(`Data da 1ª parcela: ${data.primeiraParcelaData || "-"}`, 110, y);
    y += 6;
    doc.text(
      `Total da devolução parcelada: ${data.totalDevolucaoParcelada || "-"}`,
      14,
      y
    );
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Parcela", "Data", "Valor"]],
      body:
        data.parcelas.length > 0
          ? data.parcelas.map((parcela) => [
              String(parcela.numero),
              parcela.data,
              parcela.valor,
            ])
          : [["-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [1, 54, 65] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (data.tipoFormulario === "DEVEDOR") {
    doc.setFont("helvetica", "bold");
    doc.text("Recibo", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Forma", "Valor"]],
      body: [
        ["Transferência", data.reciboTransferencia],
        ["Pix", data.reciboPix],
        ["Débito em C/C", data.reciboDebitoConta],
        ["Total a pagar", data.reciboTotal],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [1, 54, 65] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  linha(doc, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.text(`Cidade do atendimento: ${data.cidadeAtendimento || "-"}`, 14, y);
  doc.text(`Data: ${data.dataAtendimento || "-"}`, 140, y);
  y += 10;

  doc.text("__________________________________", 20, y);
  doc.text("__________________________________", 120, y);
  y += 6;
  doc.text(data.nome || "Associado(a)", 45, y, { align: "center" });
  doc.text(data.atendente || "Atendente", 145, y, { align: "center" });

  doc.save(`demissao_${(data.nome || "associado").replace(/\s+/g, "_")}.pdf`);
}