type SolicitacaoBolsaPdfParams = {
  nome: string;
  admissao: string;
  curso: string;
  semestre: string;
  periodo: string;
  universidade: string;
  cidade: string;
  nomeGestor: string;
  dataHoje: {
    dia: string;
    mes: string;
    ano: string;
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

function formatarDataAdmissaoTexto(data: string) {
  if (!data) return "";

  const date = new Date(`${data}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function gerarSolicitacaoBolsaPdf({
  nome,
  admissao,
  curso,
  semestre,
  periodo,
  universidade,
  cidade,
  nomeGestor,
  dataHoje,
}: SolicitacaoBolsaPdfParams) {
  const printWindow = window.open("", "_blank", "width=900,height=1200");

  if (!printWindow) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Solicitação de Bolsa de Estudos</title>
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
            line-height: 1.35;
            margin: 0;
            padding: 0;
          }

          .page {
            width: 100%;
            padding: 0;
          }

          .header {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-bottom: 20px;
          }

          .logo {
            height: 42px;
            width: auto;
            object-fit: contain;
          }

          .title {
            flex: 1;
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            margin: 0;
          }

          .data {
            text-align: right;
            margin-bottom: 28px;
          }

          .destinatario {
            margin-bottom: 28px;
          }

          p {
            margin: 0 0 8px 0;
          }

          .assinaturas-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 24px 0;
            margin-top: 40px;
            margin-bottom: 28px;
          }

          .assinaturas-table td {
            width: 50%;
            text-align: center;
            vertical-align: bottom;
            padding-top: 40px;
          }

          .assinatura-line {
            border-top: 1px solid #000;
            width: 100%;
            margin: 0 auto 14px auto;
          }

          .assinatura-texto {
            display: block;
            line-height: 1.3;
          }

          .parecer {
            margin-top: 8px;
            margin-bottom: 20px;
          }

          .linha-radio {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 32px;
            flex-wrap: nowrap;
          }

          .radio {
            width: 13px;
            height: 13px;
            border: 1px solid #000;
            border-radius: 999px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <img src="${window.location.origin}/sicoob-cressem-logo.png" alt="Sicoob" class="logo" />
            <h1 class="title">Bolsa de Estudos para Funcionários</h1>
          </div>

          <div class="data">
            <p>${escapeHtml(cidade || "________________")}, ${escapeHtml(dataHoje.dia)} de ${escapeHtml(dataHoje.mes)} de ${escapeHtml(dataHoje.ano)}.</p>
          </div>

          <div class="destinatario">
            <p>Ilmos. Srs.</p>
            <p>Diretoria Executiva</p>
            <p>SICOOB Cressem</p>
          </div>

          <div>
            <p>Prezados Senhores,</p>

            <p>
              Venho através desta, solicitar um subsídio da
              <strong>Bolsa Parcial de Estudos</strong>. Sou funcionário(a) desde
              <strong>${escapeHtml(formatarDataAdmissaoTexto(admissao))}</strong>.
              Matriculado(a) no curso: <strong>${escapeHtml(curso)}</strong>, no
              <strong>${escapeHtml(semestre)}</strong>, na Faculdade/Universidade:
              <strong>${escapeHtml(universidade)}</strong>, no período:
              <strong>${escapeHtml(periodo)}</strong>. Outrossim, informo que este curso
              enquadra-se também nos interesses da Empresa, possibilitando-me uma
              ascensão interna pelo qual submeto-me à apreciação desta Diretoria.
            </p>

            <p>Desde já agradeço a oportunidade.</p>
            <p>Atenciosamente,</p>
          </div>

          <table class="assinaturas-table">
            <tr>
              <td>
                <div class="assinatura-line"></div>
                <span class="assinatura-texto">Assinatura do Funcionário</span>
                <span class="assinatura-texto">${escapeHtml(nome)}</span>
              </td>
              <td>
                <div class="assinatura-line"></div>
                <span class="assinatura-texto">Assinatura do Gestor</span>
                <span class="assinatura-texto">${escapeHtml(nomeGestor)}</span>
              </td>
            </tr>
          </table>

          <div class="parecer">
            <p>Parecer:_____________________________________________________________________________</p>
          </div>

          <div class="linha-radio">
            <span>Conceder:</span>
            <span class="radio"></span>
            <span>Sim</span>
            <span class="radio"></span>
            <span>Não</span>
            <span>___________ % a conceder.</span>
          </div>

          <table class="assinaturas-table">
            <tr>
              <td>
                <div class="assinatura-line"></div>
                <span class="assinatura-texto">Assinatura Diretoria Executiva</span>
                <span class="assinatura-texto">&nbsp;</span>
              </td>
              <td>
                <div class="assinatura-line"></div>
                <span class="assinatura-texto">Assinatura Gestor RH</span>
                <span class="assinatura-texto">&nbsp;</span>
              </td>
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