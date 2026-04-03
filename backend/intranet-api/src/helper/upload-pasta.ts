import path from "path";
import { smb2Client } from "../services/smb2.service";

function sanitizeFolderName(value: string) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ");
}

async function ensureDirRecursive(remotePath: string) {
  const parts = remotePath.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;

    try {
      await smb2Client.exists(current);
    } catch {
      // ignora
    }

    try {
      const exists = await smb2Client.exists(current);
      if (!exists) {
        await smb2Client.mkdir(current);
      }
    } catch {
      // algumas shares retornam erro diferente no exists/mkdir
      try {
        await smb2Client.mkdir(current);
      } catch {
        // se já existir, segue
      }
    }
  }
}

export async function salvarArquivoNoServidorSMB2(
  arquivo: { name: string; data: Buffer },
  funcionario: string
) {
  const funcionarioSafe = sanitizeFolderName(funcionario);
  const pasta = `CRM/FUNCIONARIOS/${funcionarioSafe}`;
  const caminhoRemoto = `${pasta}/${arquivo.name}`;

  await ensureDirRecursive("CRM");
  await ensureDirRecursive("CRM/FUNCIONARIOS");
  await ensureDirRecursive(pasta);

  await smb2Client.writeFile(caminhoRemoto, arquivo.data);

  return `\\\\${process.env.SMB_SERVER}\\${process.env.SMB_SHARE}\\${caminhoRemoto.replace(/\//g, "\\")}`;
}