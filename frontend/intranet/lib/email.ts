import nodemailer from "nodemailer";

export async function sendNewCompaniesEmail(params: {
  to: string;
  from: string;
  totalGov: number;
  totalBase: number;
  newOnes: { cnpj: string; nome?: string }[];
}) {
  const { to, from, totalGov, totalBase, newOnes } = params;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  const rows =
    newOnes.length === 0
      ? "<p><strong>Nenhuma empresa nova</strong> encontrada.</p>"
      : `
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
  <thead><tr><th align="left">CNPJ</th><th align="left">Razão Social</th></tr></thead>
  <tbody>
    ${newOnes
      .map(
        (n) =>
          `<tr><td>${n.cnpj}</td><td>${n.nome ?? ""}</td></tr>`
      )
      .join("")}
  </tbody>
</table>`;

  const html = `
  <div>
    <p><strong>Resumo da varredura</strong></p>
    <ul>
      <li>Total (GOV): ${totalGov}</li>
      <li>Total (Sua planilha): ${totalBase}</li>
      <li>Novas empresas encontradas: ${newOnes.length}</li>
    </ul>
    ${rows}
  </div>`;

  await transporter.sendMail({
    from,
    to,
    subject: `Novas empresas encontradas (comparação GOV x Empresas.csv)`,
    html,
  });
}
