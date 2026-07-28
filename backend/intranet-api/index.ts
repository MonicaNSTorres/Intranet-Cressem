import "dotenv/config";
import "./src/cron/ferias.cron";
import "./src/cron/contratos.cron";
import "./src/cron/boas-vindas-funcionarios.cron";
//import "./src/cron/reserva-sala-lembrete.cron";
import { iniciarCronLembreteReservaSala } from "./src/cron/reserva-sala-lembrete.cron";
import { iniciarCronLeiloes } from "./src/cron/leiloes.cron";
import express from "express";
import { routes } from "./src/routes/routes";
import bodyParser from "body-parser";
import path from "path";
import { Server } from "socket.io";
import type { Socket as IOSocket } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import os from "os";
import { initOraclePool, closeOraclePool } from "./src/config/oracle.pool";
import { estoqueConsumiveisService } from "./src/services/estoque_consumiveis.service";
import { registrarAcesso } from "./src/middleware/registrar-acesso.middleware";

const app = express();
const MAX_PDF_UPLOAD_MB = Number(process.env.MAX_PDF_UPLOAD_MB || 50);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.0.107.232:3000",
  "https://intranet2",
  "http://intranet2",
  "http://intranet",
  "https://intranet",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.options(
  /.*/,
  cors({
    origin: allowedOrigins,
    credentials: true,
  }) as any
);

app.use(cookieParser());

app.use("/bucket", express.static(path.join(__dirname, "src/bucket")));

export let ioGlobal: Server | null = null;

const fileUploadMiddleware = fileUpload({
  limits: { fileSize: MAX_PDF_UPLOAD_MB * 1024 * 1024 },
  abortOnLimit: false,
  useTempFiles: true,
  tempFileDir: path.join(os.tmpdir(), "intranet-upload"),
  createParentPath: true,
});

const multerManagedPaths = new Set([
  "/v1/marca_dagua",
  "/v1/converter-arquivos",
  "/v1/estoque-consumiveis/importar-excel",
  "/v1/ferias_funcionarios/importar-excel",
  "/v1/cnab240/gerar",
  "/v1/cnab240/importar-retorno",
  "/v1/banco-imagens",
]);

app.use((req, res, next) => {
  const normalizedPath = req.path.replace(/\/+$/, "") || "/";

  const isBancoImagensUpload =
    req.method === "POST" &&
    normalizedPath === "/v1/banco-imagens";

  const isBancoImagensUpdate =
    req.method === "PUT" &&
    /^\/v1\/banco-imagens\/\d+$/.test(normalizedPath);

  if (
    multerManagedPaths.has(normalizedPath) ||
    isBancoImagensUpload ||
    isBancoImagensUpdate
  ) {
    return next();
  }

  return fileUploadMiddleware(req as any, res as any, next as any);
});

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(registrarAcesso);

app.use(routes);

const port = process.env.PORT || 3001;

async function bootstrap() {
  await initOraclePool();

  iniciarCronLembreteReservaSala();
  iniciarCronLeiloes();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  ioGlobal = io;

  httpServer.listen(port, () => {
    console.log(`API + Socket running at port ${port}`);
  });

  setTimeout(async () => {
    try {
      console.log("Verificando estoque crítico para teste...");

      const result = await estoqueConsumiveisService.enviarAlertaEmailEstoqueCritico();

      console.log("Resultado do alerta de estoque:", result);
    } catch (error) {
      console.error("Erro ao enviar alerta de estoque:", error);
    }
  }, 10000);

  io.on("connection", (socket: IOSocket) => {
    socket.on("auth", (userId: string | number) => {
      (socket as any).userId = userId;
    });

    socket.on("leilao:entrar", (idLeilao: string | number) => {
      socket.join(`leilao:${idLeilao}`);
    });

    socket.on("leilao:sair", (idLeilao: string | number) => {
      socket.leave(`leilao:${idLeilao}`);
    });
  });

  setInterval(async () => {
    try {
      console.log("Verificando estoque crítico automaticamente...");

      const result = await estoqueConsumiveisService.enviarAlertaEmailEstoqueCritico();

      console.log("Resultado verificação estoque crítico:", result);
    } catch (error) {
      console.error("Erro na verificação automática de estoque crítico:", error);
    }
  }, 1000 * 60 * 60);

  const shutdown = async () => {
    console.log("Encerrando...");
    httpServer.close(async () => {
      await closeOraclePool();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Erro no bootstrap:", err);
  process.exit(1);
});

export { };