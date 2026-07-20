import axios from "axios";
import os from "os";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string) {
  return String(process.env[name] || "").trim();
}

function isTruthyEnv(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "sim"
  );
}

function getEmailTimeoutMs() {
  const raw = String(process.env.EMAIL_TIMEOUT_MS || "").trim();
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 20000;
}

function getAllowedEmailIps() {
  return String(process.env.EMAIL_ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function getLocalIpv4s() {
  const nets = os.networkInterfaces();
  const ips = new Set<string>();

  Object.values(nets).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry) return;
      if (entry.family !== "IPv4") return;
      if (entry.internal) return;
      if (!entry.address) return;
      ips.add(entry.address);
    });
  });

  return Array.from(ips);
}

export function validarHostAutorizadoParaEmail() {
  const ipsPermitidos = getAllowedEmailIps();
  const ipsLocais = getLocalIpv4s();

  if (!ipsPermitidos.length) {
    throw new Error("EMAIL_ALLOWED_IPS não configurado. Envio de e-mail bloqueado por segurança.");
  }

  const autorizado = ipsLocais.some((ip) => ipsPermitidos.includes(ip));

  if (!autorizado) {
    throw new Error(
      `Host sem IP autorizado para envio de e-mail. Locais=[${ipsLocais.join(", ")}] Permitidos=[${ipsPermitidos.join(", ")}]`
    );
  }
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
    timeout: getEmailTimeoutMs(),
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

export type EmailAttachment = {
  name: string;
  contentBytes: string;
  contentType?: string;
};

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  attachments: EmailAttachment[] = []
) {
  const accessToken = await getAccessToken();
  const departmentalMailbox = getEnv("DEPARTAMENTBOX");
  const emailModoTeste = isTruthyEnv(getOptionalEnv("EMAIL_MODO_TESTE"));
  const emailDestinoTeste =
    getOptionalEnv("EMAIL_DESTINO_TESTE") || "marcelo.bueno@sicoob.com.br";

  const recipients = emailModoTeste
    ? normalizeRecipients(emailDestinoTeste)
    : normalizeRecipients(to);

  if (!recipients.length) {
    throw new Error("Nenhum destinatário informado para envio do e-mail.");
  }

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${departmentalMailbox}/sendMail`;

  const message: any = {
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
  };

  const validAttachments = attachments.filter(
    (attachment) => attachment?.name && attachment?.contentBytes
  );

  if (validAttachments.length) {
    message.attachments = validAttachments.map((attachment) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: attachment.name,
      contentType: attachment.contentType || "application/octet-stream",
      contentBytes: attachment.contentBytes,
    }));
  }

  const payload = {
    message: {
      ...message,
    },
    saveToSentItems: true,
  };

  await axios.post(graphUrl, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: getEmailTimeoutMs(),
  });
}
