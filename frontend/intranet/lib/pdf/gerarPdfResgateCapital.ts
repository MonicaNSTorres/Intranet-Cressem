export type EmprestimoPrint = {
  tipo: string;
  contrato: string;
  saldoDevedor: number;
  saldoAmortizado: number;
};

export type ParcelaPrint = {
  dataParcela: string;
  valor: number;
};

export type GerarPdfResgateCapitalData = {
  nome: string;
  cpfCnpj: string;
  matricula?: string;
  empresa?: string;
  cidade?: string;
  atendente: string;
  dataResgate: string;
  motivo?: string;
  autorizado?: string;
  capitalAtual: number;
  totalAmortizacao: number;
  saldoRestante: number;
  contaCorrente?: {
    numero?: string;
    saldoDevedor: number;
    amortizado: number;
  };
  cartao?: {
    numero?: string;
    saldoDevedor: number;
    amortizado: number;
  };
  emprestimos: EmprestimoPrint[];
  deposito?: {
    banco?: string;
    agencia?: string;
    contaCorrente?: string;
    parcelas: ParcelaPrint[];
  };
};

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safe(v?: string) {
  return (v || "").trim();
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function isCnpj(v: string) {
  return onlyDigits(v).length === 14;
}

function fmtBRL(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatDateToBr(iso: string) {
  if (!iso || iso.length < 10) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function renderEmprestimosRows(emprestimos: EmprestimoPrint[]) {
  const rows = emprestimos
    .filter((e) => safe(e.tipo) || safe(e.contrato) || e.saldoDevedor > 0 || e.saldoAmortizado > 0)
    .map(
      (e) => `
        <tr>
          <td>${escapeHtml(safe(e.tipo))}</td>
          <td>${escapeHtml(safe(e.contrato))}</td>
          <td class="money">${escapeHtml(fmtBRL(e.saldoDevedor))}</td>
          <td class="money">${escapeHtml(fmtBRL(e.saldoAmortizado))}</td>
        </tr>
      `
    )
    .join("");

  if (rows) return rows;
  return '<tr><td colspan="4" class="empty">-</td></tr>';
}

function renderDebitosRows(data: GerarPdfResgateCapitalData) {
  const rows: string[] = [];

  if (data.contaCorrente && (safe(data.contaCorrente.numero) || data.contaCorrente.saldoDevedor > 0 || data.contaCorrente.amortizado > 0)) {
    rows.push(`
      <tr>
        <td><strong>Conta Corrente:</strong> ${escapeHtml(safe(data.contaCorrente.numero) || "-")}</td>
        <td class="money">${escapeHtml(fmtBRL(data.contaCorrente.saldoDevedor))}</td>
        <td class="money">${escapeHtml(fmtBRL(data.contaCorrente.amortizado))}</td>
      </tr>
    `);
  }

  if (data.cartao && (safe(data.cartao.numero) || data.cartao.saldoDevedor > 0 || data.cartao.amortizado > 0)) {
    rows.push(`
      <tr>
        <td><strong>Cartao:</strong> ${escapeHtml(safe(data.cartao.numero) || "-")}</td>
        <td class="money">${escapeHtml(fmtBRL(data.cartao.saldoDevedor))}</td>
        <td class="money">${escapeHtml(fmtBRL(data.cartao.amortizado))}</td>
      </tr>
    `);
  }

  if (!rows.length) {
    rows.push('<tr><td colspan="3" class="empty">-</td></tr>');
  }

  return rows.join("");
}

function renderParcelasRows(parcelas: ParcelaPrint[]) {
  const rows = parcelas
    .filter((p) => p.dataParcela || p.valor > 0)
    .map(
      (p, i) => `
        <tr>
          <td>Parcela ${i + 1}</td>
          <td>${escapeHtml(formatDateToBr(p.dataParcela))}</td>
          <td class="money">${escapeHtml(fmtBRL(p.valor))}</td>
        </tr>
      `
    )
    .join("");

  if (rows) return rows;
  return '<tr><td colspan="3" class="empty">-</td></tr>';
}

export function gerarPdfResgateCapital(data: GerarPdfResgateCapitalData) {
  const parcelas = data.deposito?.parcelas || [];
  const primeiraParcela = parcelas[0];
  const totalDebitoSaldo = (data.contaCorrente?.saldoDevedor || 0) + (data.cartao?.saldoDevedor || 0);
  const totalDebitoAmort = (data.contaCorrente?.amortizado || 0) + (data.cartao?.amortizado || 0);
  const totalEmprestimoSaldo = data.emprestimos.reduce((acc, e) => acc + (e.saldoDevedor || 0), 0);
  const totalEmprestimoAmort = data.emprestimos.reduce((acc, e) => acc + (e.saldoAmortizado || 0), 0);
  const totalParcelado = parcelas.reduce((acc, p) => acc + (p.valor || 0), 0);
  const hasEmprestimos = data.emprestimos.some(
    (e) => safe(e.tipo) || safe(e.contrato) || e.saldoDevedor > 0 || e.saldoAmortizado > 0
  );
  const hasConta =
    !!data.contaCorrente &&
    (safe(data.contaCorrente.numero) || data.contaCorrente.saldoDevedor > 0 || data.contaCorrente.amortizado > 0);
  const hasCartao =
    !!data.cartao &&
    (safe(data.cartao.numero) || data.cartao.saldoDevedor > 0 || data.cartao.amortizado > 0);
  const hasDebitos = hasConta || hasCartao;
  const hasParcelas = parcelas.some((p) => p.dataParcela || p.valor > 0);
  const hasDeposito =
    !!data.deposito &&
    (safe(data.deposito.banco) || safe(data.deposito.agencia) || safe(data.deposito.contaCorrente) || hasParcelas || totalParcelado > 0);
  const nomeUpper = safe(data.nome).toUpperCase();
  const atendenteUpper = safe(data.atendente).toUpperCase();
  const hideMatriculaEmpresa = isCnpj(data.cpfCnpj);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resgate parcial de capital</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      font-size: 11pt;
      line-height: 1.25;
      margin: 0;
      padding: 0;
    }

    #recibo {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
    }

    .table-kv {
      table-layout: fixed;
    }

    .table-kv td {
      width: 50%;
    }

    .dados-recibo .table-print {
      table-layout: fixed;
    }

    .dados-recibo .table-print td {
      width: 50%;
    }

    .section {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 0.8rem;
    }

    .table-print {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0.5rem;
    }

    .table-print th,
    .table-print td {
      border: 1px solid #a5d6a7;
      padding: 0.3rem 0.5rem;
      font-size: 11pt;
      vertical-align: top;
      word-wrap: break-word;
    }

    h1 {
      text-align: center;
      font-size: 22pt;
      margin: 0.3rem 0;
    }

    h2 {
      text-align: center;
      font-size: 15pt;
      margin: 0.3rem 0;
      font-weight: 600;
    }

    .header-recibo {
      display: block;
      margin: 0 auto 0.5rem;
    }

    .logo-wrap {
      text-align: center;
      margin: 0 0 0.5rem 0;
      padding: 0;
      line-height: 1;
    }

    .logo-print {
      display: inline-block;
      height: 68px;
      max-height: 68px;
      width: auto;
      max-width: 300px;
      object-fit: contain;
      vertical-align: middle;
    }

    .assinaturas-table td {
      border: none;
      padding-top: 2rem;
      text-align: center;
      font-size: 11pt;
      width: 50%;
    }

    .totals {
      font-weight: bold;
    }

    .totals-right {
      text-align: right;
    }

    .totals-center {
      text-align: center !important;
    }

    .tr-total-center td {
      text-align: center !important;
    }

    .money {
      text-align: right;
    }

    .empty {
      text-align: center;
      color: #6b7280;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div id="recibo">
    <div class="section logo-wrap">
      <img src="${window.location.origin}/sicoob-cressem-logo.png" alt="Sicoob" class="logo-print" />
    </div>

    <div class="section header-recibo">
      <h1>Resgate parcial de capital</h1>
    </div>

    <div class="section dados-recibo">
      <table class="table-print">
        <tr>
          <td><strong>Nome:</strong> ${escapeHtml(safe(data.nome))}</td>
          <td><strong>CPF/CNPJ:</strong> ${escapeHtml(safe(data.cpfCnpj))}</td>
        </tr>
        ${
          hideMatriculaEmpresa
            ? ""
            : `<tr>
                <td><strong>Matricula:</strong> ${escapeHtml(safe(data.matricula) || "-")}</td>
                <td><strong>Empresa:</strong> ${escapeHtml(safe(data.empresa) || "-")}</td>
              </tr>`
        }
        <tr>
          <td><strong>Saldo capital atual:</strong> ${escapeHtml(fmtBRL(data.capitalAtual))}</td>
          <td><strong>Motivo:</strong> ${escapeHtml(safe(data.motivo) || "-")}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>Autorizado por:</strong> ${escapeHtml(safe(data.autorizado) || "-")}</td>
        </tr>
      </table>
    </div>

    ${hasEmprestimos ? `<div class="section parcelas">
      <h2>Emprestimos</h2>
      <table class="table-print">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Contrato</th>
            <th>Saldo Devedor</th>
            <th>Amortizacao</th>
          </tr>
        </thead>
        <tbody>
          ${renderEmprestimosRows(data.emprestimos)}
        </tbody>
        <tfoot>
          <tr class="tr-total-center">
            <td colspan="2" class="totals totals-right">TOTAL:</td>
            <td class="totals totals-center">${escapeHtml(fmtBRL(totalEmprestimoSaldo))}</td>
            <td class="totals totals-center">${escapeHtml(fmtBRL(totalEmprestimoAmort))}</td>
          </tr>
        </tfoot>
      </table>
    </div>` : ""}

    ${hasDebitos ? `<div class="section parcelas">
      <h2>Amortizacao de debitos em conta</h2>
      <table class="table-print">
        <thead>
          <tr>
            <th>Numero</th>
            <th>Saldo Devedor</th>
            <th>Amortizacao</th>
          </tr>
        </thead>
        <tbody>
          ${renderDebitosRows(data)}
        </tbody>
        <tfoot>
          <tr class="tr-total-center">
            <td class="totals totals-right">TOTAL:</td>
            <td class="totals totals-center">${escapeHtml(fmtBRL(totalDebitoSaldo))}</td>
            <td class="totals totals-center">${escapeHtml(fmtBRL(totalDebitoAmort))}</td>
          </tr>
        </tfoot>
      </table>
    </div>` : ""}

    ${hasDeposito ? `<div class="section pagamentos">
      <h2>Dados bancarios</h2>
      <table class="table-print table-kv">
        <tr>
          <td><strong>Nr Banco:</strong> ${escapeHtml(safe(data.deposito?.banco) || "-")}</td>
          <td><strong>Agencia:</strong> ${escapeHtml(safe(data.deposito?.agencia) || "-")}</td>
        </tr>
        <tr>
          <td><strong>C/C:</strong> ${escapeHtml(safe(data.deposito?.contaCorrente) || "-")}</td>
          <td><strong>Digito:</strong> -</td>
        </tr>
        <tr>
          <td><strong>Saldo a ser creditado:</strong> ${escapeHtml(fmtBRL(totalParcelado))}</td>
          <td><strong>Total do resgate:</strong> ${escapeHtml(fmtBRL(data.totalAmortizacao))}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>Saldo de Capital Restante:</strong> ${escapeHtml(fmtBRL(data.saldoRestante))}</td>
        </tr>
      </table>
    </div>` : ""}

    ${hasParcelas ? `<div class="section pagamentos">
      <h2>Devolucao parcelada</h2>
      <table class="table-print">
        <tr>
          <td><strong>Valor da 1 parcela:</strong> ${escapeHtml(fmtBRL(primeiraParcela?.valor || 0))}</td>
          <td><strong>Data da 1 parcela:</strong> ${escapeHtml(formatDateToBr(primeiraParcela?.dataParcela || ""))}</td>
        </tr>
      </table>
    </div>` : ""}

    ${hasParcelas ? `<div class="section parcelas">
      <h2>Parcelas e Valores</h2>
      <table class="table-print">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Data</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${renderParcelasRows(parcelas)}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="totals totals-right">Total da devolucao parcelada:</td>
            <td class="totals totals-center">${escapeHtml(fmtBRL(totalParcelado))}</td>
          </tr>
        </tfoot>
      </table>
    </div>` : ""}

    <div class="section pagamentos">
      <h2>Dados do atendimento</h2>
      <table class="table-print">
        <tbody>
          <tr>
            <td><strong>Cidade:</strong> ${escapeHtml(safe(data.cidade).toUpperCase() || "-")}</td>
            <td><strong>Data:</strong> ${escapeHtml(formatDateToBr(data.dataResgate))}</td>
            <td><strong>Atendente:</strong> ${escapeHtml(safe(data.atendente))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section assinaturas">
      <table class="table-print assinaturas-table">
        <tr>
          <td>_________________________________<br />${escapeHtml(nomeUpper || "ASSOCIADO(A)")}</td>
          <td>_________________________________<br />${escapeHtml(atendenteUpper || "ATENDENTE")}</td>
        </tr>
        <tr id="trValidacao">
          <td>_________________________________<br />Validacao</td>
          <td></td>
        </tr>
      </table>
    </div>
  </div>

</body>
</html>
  `;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 300);
  };

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    const printWin = iframe.contentWindow;
    if (!printWin) {
      cleanup();
      throw new Error("Nao foi possivel iniciar a impressao.");
    }
    printWin.onafterprint = cleanup;
    printWin.focus();
    printWin.print();
    setTimeout(cleanup, 2000);
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    throw new Error("Nao foi possivel montar o documento para impressao.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    setTimeout(doPrint, 120);
  };

  setTimeout(() => {
    if (iframe.contentDocument?.readyState === "complete") {
      doPrint();
    }
  }, 200);
}