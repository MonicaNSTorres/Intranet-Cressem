type ReembolsoConvenioMedicoPdfParams = {
  dataHoje: string;
  nome: string;
  matricula: string;
  setor: string;
  empresaConvenio: string;
  mensalidade: string;
  valorReembolso: string;
  nomeDiretor: string;
  cargoDiretor: string;
  nomeRh: string;
  cargoRh: string;
};

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function gerarReembolsoConvenioMedicoPdf({
  dataHoje,
  nome,
  matricula,
  setor,
  empresaConvenio,
  mensalidade,
  valorReembolso,
  nomeDiretor,
  cargoDiretor,
  nomeRh,
  cargoRh,
}: ReembolsoConvenioMedicoPdfParams) {
  const printWindow = window.open("", "_blank", "width=900,height=1200");

  if (!printWindow) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Solicitação de Reembolso de Convênio Médico</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
            font-size: 11pt;
            line-height: 1.28;
            margin: 0;
            padding: 0;
          }

          .page {
            width: 100%;
          }

          .header {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 10pt;
          }

          .logo {
            height: 30px;
            width: auto;
            object-fit: contain;
            margin-bottom: 10px;
          }

          .title {
            flex: 1;
            text-align: center;
            margin: 0;
            font-size: 14pt;
            letter-spacing: .2px;
            font-weight: 700;
          }

          p {
            margin: 0 0 6pt;
          }

          .paragrafo {
            padding-bottom: 18pt;
          }

          .assinaturas-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: separate;
            border-spacing: 10mm 0;
            margin-top: 8mm;
          }

          .assinaturas-table td {
            border: 0;
            text-align: center;
            vertical-align: bottom;
            padding-top: 16mm;
          }

          .assinatura-line {
            border-top: 1px solid #000;
            width: 98%;
            margin: 0 auto 4mm;
          }

          .assinatura span {
            display: block;
            line-height: 1.25;
          }

          .cargo {
            min-height: 1.25em;
            font-size: 9.5pt;
          }

          .vazio {
            border: 0;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <img src="${window.location.origin}/sicoob-cressem-logo.png" alt="Sicoob" class="logo" />
            <h3 class="title">Solicitação de Reembolso de Convênio Médico</h3>
          </div>

          <div class="paragrafo">
            <p>Data: <strong>${escapeHtml(dataHoje)}</strong></p>
            <p>Nome do funcionário: <strong>${escapeHtml(nome)}</strong></p>
            <p>
              <span>Matrícula: <strong>${escapeHtml(matricula)}</strong></span>
              |
              <span>Setor: <strong>${escapeHtml(setor)}</strong></span>
            </p>

            <p>
              Solicito o cadastramento para futuros reembolsos das mensalidades do meu convênio médico, descrito abaixo:
            </p>

            <p>Empresa: <strong>${escapeHtml(empresaConvenio)}</strong></p>
            <p>
              Mensalidade: <strong>${escapeHtml(mensalidade)}</strong>
              |
              Valor a reembolsar: <strong>${escapeHtml(valorReembolso)}</strong>
            </p>

            <p>Abaixo, assino a presente, dando autorização para crédito em meu holerite:</p>
            <p><strong>ASSISTÊNCIA MÉDICA HOSPITALAR E ODONTOLÓGICA</strong></p>

            <p>
              A cooperativa de crédito poderá fornecer um plano de saúde e de assistência odontológica padrão aos empregados,
              com cobertura médica e hospitalar, arcando com 80% (oitenta por cento) do valor da "mensalidade".<br><br>

              <strong>- Primeiro.</strong> Caso o empregado tenha, na composição do valor pago de convênio médico,
              co-participação, taxas, juros de mora e fator moderador, estes não serão reembolsados, sendo os custos por conta do próprio empregado.<br><br>

              <strong>- Segundo.</strong> O reembolso de que trata esta cláusula, está limitado ao valor máximo de R$ 600,00 (Seiscentos Reais).<br><br>

              <strong>- Terceiro.</strong> Para os dependentes, considerados de acordo com o artigo 16 da Lei 8.213/91,
              a cooperativa poderá intermediar uma negociação coletiva para que o custo individual seja menor que o ofertado no mercado comercial,
              sendo que o custo será inteiramente de responsabilidade do empregado.<br><br>

              <strong>- Quarto.</strong> Se o empregado optar por fazer um plano de saúde similar ao que a Cooperativa oferece e mantém convênio,
              o mesmo poderá se cadastrar particularmente em outro convênio que o atenda e solicitar o reembolso de 80 % (oitenta por cento),
              sobre a mensalidade paga do titular.<br><br>

              <strong>- Quinto.</strong> Tratando-se de Cooperativa de Crédito que conceda assistência médica hospitalar e odontológica,
              ao empregado dispensado sem justa causa fica assegurado o direito de continuar usufruindo dessa assistência,
              por um período de 30 (trinta) dias, contados do último dia de trabalho efetivo.<br><br>

              <strong>- Sexto.</strong> Se o empregado tiver 15 (quinze) ou mais anos de serviço prestado à mesma empresa,
              o período nesta cláusula fica ampliado para 90 (noventa) dias.<br><br>

              <strong>- Sétimo.</strong> Todos os meses, antes do dia 15 de cada mês, o funcionário deverá apresentar:
              formulário preenchido e assinado e autorizado pela diretoria no primeiro mês e nos demais meses: contrato, boleto,
              comprovante de pagamento e outros. O principal é o documento onde consta o valor exato da "mensalidade"
              do funcionário titular do convênio médico.<br><br>

              <strong>- Oitavo.</strong> Caso o funcionário esqueça ou se atrase na entrega destes documentos acima descritos,
              o mesmo ficará sem receber o reembolso. Cabe, somente a Diretoria Executiva, determinar o pagamento da mensalidade fora do prazo
              e não reembolsadas, mediante explanação e justificativas por escrito do funcionário, sempre no próximo holerite.
            </p>
          </div>

          <table class="assinaturas-table">
            <tr>
              <td class="assinatura">
                <div class="assinatura-line"></div>
                <span>${escapeHtml(nome)}</span>
                <span class="cargo">&nbsp;</span>
              </td>
              <td class="assinatura">
                <div class="assinatura-line"></div>
                <span>${escapeHtml(nomeDiretor)}</span>
                <span class="cargo">${escapeHtml(cargoDiretor)}</span>
              </td>
            </tr>
            <tr>
              <td class="assinatura">
                <div class="assinatura-line"></div>
                <span>${escapeHtml(nomeRh)}</span>
                <span class="cargo">${escapeHtml(cargoRh)}</span>
              </td>
              <td class="vazio"></td>
            </tr>
          </table>
        </div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
            window.onafterprint = function () {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}