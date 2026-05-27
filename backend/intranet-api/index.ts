import "dotenv/config";
import "./src/cron/ferias.cron";
import "./src/cron/contratos.cron";
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
]);

app.use((req, res, next) => {
  if (multerManagedPaths.has(req.path)) {
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

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

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
