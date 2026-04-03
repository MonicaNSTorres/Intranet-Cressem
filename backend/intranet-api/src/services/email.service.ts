import axios from "axios";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

async function getAccessToken() {
  const tenantId = getEnv("TENANTID");
  const clientId = getEnv("CLIENTID");
  const clientSecret = getEnv("CLIENTSECRET");

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams();
  body.append("client_id", clientId);
  body.append("client_secret", clientSecret);
  body.append("scope", "https://graph.microsoft.com/.default");
  body.append("grant_type", "client_credentials");

  const response = await axios.post(tokenUrl, body.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const accessToken = response.data?.access_token;

  if (!accessToken) {
    throw new Error("Não foi possível obter access_token do Microsoft Graph.");
  }

  return accessToken as string;
}

function normalizeRecipients(to: string | string[]) {
  if (Array.isArray(to)) {
    return to
      .flatMap((item) => item.split(","))
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return String(to)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
) {
  const accessToken = await getAccessToken();
  const departmentalMailbox = getEnv("DEPARTAMENTBOX");

  const recipients = normalizeRecipients(to);

  if (!recipients.length) {
    throw new Error("Nenhum destinatário informado para envio do email.");
  }

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${departmentalMailbox}/sendMail`;

  const payload = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: html,
      },
      toRecipients: recipients.map((email) => ({
        emailAddress: {
          address: email,
        },
      })),
      from: {
        emailAddress: {
          address: departmentalMailbox,
        },
      },
    },
    saveToSentItems: true,
  };

  await axios.post(graphUrl, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}