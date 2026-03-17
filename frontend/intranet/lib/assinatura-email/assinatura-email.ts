export type CertificacaoOption = {
  value: string;
  label: string;
};

type BuildAssinaturaEmailParams = {
  nome: string;
  funcao: string;
  telefone: string;
  site: string;
  endereco: string;
  cert1?: string;
  cert2?: string;
};

function getCertImage(cert?: string) {
  const value = (cert || "").toUpperCase();

  if (value === "CPA10") return "/assinatura-email/cpa10.png";
  if (value === "CPA20") return "/assinatura-email/cpa20.png";
  if (value === "CEA") return "/assinatura-email/cea.png";

  return "";
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildAssinaturaEmailHtml({
  nome,
  funcao,
  telefone,
  site,
  endereco,
  cert1,
  cert2,
}: BuildAssinaturaEmailParams) {
  const certImg1 = getCertImage(cert1);
  const certImg2 = getCertImage(cert2);

  const certsHtml = [certImg1, certImg2]
    .filter(Boolean)
    .map(
      (src) => `
        <img
          src="${src}"
          alt="Certificação"
          style="display:block; width:56px; height:auto; border:0;"
        />
      `
    )
    .join("");

  return `
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:780px; font-family:Arial, Helvetica, sans-serif; border-collapse:collapse;">
    <tr>
      <td style="background:#ffffff; padding:0; border-radius:16px; overflow:hidden; border:1px solid #d9d9d9;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:14px 16px 10px 16px; vertical-align:top;">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="font-size:28px; line-height:32px; font-weight:700; color:#0A4051; margin:0;">
                      ${escapeHtml(nome)}
                    </div>
                    <div style="font-size:18px; line-height:22px; color:#B3C51B; font-weight:500; margin-top:2px;">
                      ${escapeHtml(funcao)}
                    </div>
                  </td>

                  <td style="width:170px; text-align:right; vertical-align:top;">
                    <img
                      src="/assinatura-email/logo-sicoob-cressem.png"
                      alt="Sicoob Cressem"
                      style="display:inline-block; width:150px; height:auto; border:0;"
                    />
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" border="0" style="width:100%; margin-top:12px; border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:top;">
                    <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:0 0 6px 0; vertical-align:middle;">
                          <img src="/assinatura-email/icon-phone.png" alt="Telefone" style="display:inline-block; width:18px; height:18px; vertical-align:middle; margin-right:8px;" />
                          <span style="font-size:16px; color:#0A4051; font-weight:700;">${escapeHtml(telefone)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px 0; vertical-align:middle;">
                          <img src="/assinatura-email/icon-web.png" alt="Site" style="display:inline-block; width:18px; height:18px; vertical-align:middle; margin-right:8px;" />
                          <span style="font-size:16px; color:#0A4051; font-weight:700;">${escapeHtml(site)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0; vertical-align:middle;">
                          <img src="/assinatura-email/icon-location.png" alt="Endereço" style="display:inline-block; width:18px; height:18px; vertical-align:top; margin-right:8px;" />
                          <span style="font-size:16px; color:#0A4051; font-weight:700;">${escapeHtml(endereco)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <td style="width:250px; text-align:right; vertical-align:bottom;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-left:auto; border-collapse:collapse;">
                      <tr>
                        <td style="padding-right:8px; vertical-align:bottom;">
                          <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                            <tr>
                              ${certsHtml
                                ? `<td style="padding-right:8px;">${certsHtml}</td>`
                                : ""}
                            </tr>
                          </table>
                        </td>

                        <td style="vertical-align:bottom;">
                          <img
                            src="/assinatura-email/gptw.png"
                            alt="Great Place To Work"
                            style="display:block; width:72px; height:auto; border:0;"
                          />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `.trim();
}