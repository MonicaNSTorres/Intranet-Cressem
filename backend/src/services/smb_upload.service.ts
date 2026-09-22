import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type UploadedFileLike = {
  name: string;
  data: Buffer;
};

function sanitizeFolderName(value: string) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ");
}

async function ensureRemoteDirs(
  smbPath: string,
  user: string,
  password: string,
  folders: string[]
) {
  for (const folder of folders) {
    try {
      await execFileAsync("smbclient", [
        smbPath,
        "-U",
        `${user}%${password}`,
        "-c",
        `mkdir "${folder}"`,
      ]);
    } catch {
      // ignora erro se pasta já existir
    }
  }
}

export async function salvarArquivoNoServidorSMB(
  arquivo: UploadedFileLike,
  funcionario: string
) {
  const server = process.env.SMB_SERVER || "10.10.107.251";
  const share = process.env.SMB_SHARE || "dados$";
  const user = process.env.SMB_USER || "";
  const password = process.env.SMB_PASSWORD || "";

  if (!user || !password) {
    throw new Error("Credenciais SMB não configuradas.");
  }

  const smbPath = `//${server}/${share}`;
  const funcionarioSafe = sanitizeFolderName(funcionario);
  const diretorioDestino = `CRM/FUNCIONARIOS/${funcionarioSafe}`;

  const niveis = [
    "CRM",
    "CRM/FUNCIONARIOS",
    `CRM/FUNCIONARIOS/${funcionarioSafe}`,
  ];

  await ensureRemoteDirs(smbPath, user, password, niveis);

  const tempFilePath = path.join(os.tmpdir(), arquivo.name);
  fs.writeFileSync(tempFilePath, arquivo.data);

  try {
    await execFileAsync("smbclient", [
      smbPath,
      "-U",
      `${user}%${password}`,
      "-c",
      `cd "${diretorioDestino}"; put "${tempFilePath}" "${arquivo.name}"`,
    ]);

    return `${smbPath}/${diretorioDestino}/${arquivo.name}`;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}