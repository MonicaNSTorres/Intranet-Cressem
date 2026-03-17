type NewCompany = { cnpj: string; nome?: string; cidade?: string; cidade_base?: string };

function buildHtml(totalGov: number, totalBase: number, newOnes: NewCompany[], noNewText?: string) {
  const noneText = noNewText || "Nenhuma empresa nova encontrada.";
  const rows =
    newOnes.length === 0
      ? `<p><strong>${noneText}</strong></p>`
      : `
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
  <thead>
    <tr>
      <th align="left">CNPJ</th>
      <th align="left">Razão Social</th>
      <th align="left">Cidade</th>
    </tr>
  </thead>
  <tbody>
    ${newOnes
        .map((n) => {
          const cidade = (n.cidade_base ?? n.cidade ?? "");
          return `<tr><td>${n.cnpj}</td><td>${n.nome ?? ""}</td><td>${cidade}</td></tr>`;
        })
        .join("")}
  </tbody>
</table>`;

  return `
  <div>
    <p><strong>Resumo da varredura - empresas em comum com a nossa base e do DataPrev</strong></p>
    <ul>
      <li>Total (GOV): ${totalGov}</li>
      <li>Total (Empresas.CSV): ${totalBase}</li>
      <li>Novas empresas encontradas: ${newOnes.length}</li>
    </ul>
    ${rows}
  </div>`;
}

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.TENANTID!;
  const clientId = process.env.CLIENTID!;
  const clientSecret = process.env.CLIENTSECRET!;
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Falha ao obter token do Azure AD: ${res.status} ${t}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function graphSendMail(params: {
  accessToken: string;
  mailbox: string;
  to: string[];
  subject: string;
  html: string;
  saveToSentItems?: boolean;
}) {
  const { accessToken, mailbox, to, subject, html, saveToSentItems = true } = params;

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
    mailbox
  )}/sendMail`;

  const payload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html },
      toRecipients: to.map((addr) => ({ emailAddress: { address: addr.trim() } })),
    },
    saveToSentItems: saveToSentItems ? "true" : "false",
  };

  const res = await fetch(graphUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status !== 202) {
    const t = await res.text();
    throw new Error(`Graph sendMail falhou: ${res.status} ${t}`);
  }
}

export async function sendNewCompaniesEmailGraph(params: {
  to: string | string[];
  totalGov: number;
  totalBase: number;
  newOnes: NewCompany[];
  subject?: string;
  noNewText?: string;
}) {
  const toList = Array.isArray(params.to)
    ? params.to
    : params.to.split(",").map((s) => s.trim()).filter(Boolean);

  if (toList.length === 0) throw new Error("Nenhum destinatário informado.");

  const mailbox = process.env.DEPARTAMENTBOX!;
  const subject =
    params.subject ?? "Novas empresas encontradas (comparação GOV x Empresas.csv)";
  const html = buildHtml(params.totalGov, params.totalBase, params.newOnes, params.noNewText);

  const token = await getAccessToken();

  await graphSendMail({
    accessToken: token,
    mailbox,
    to: toList,
    subject,
    html,
  });
}
