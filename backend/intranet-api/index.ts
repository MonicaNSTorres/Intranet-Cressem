import "dotenv/config";
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
import { initOraclePool, closeOraclePool } from "./src/config/oracle.pool";
import { estoqueConsumiveisService } from "./src/services/estoque_consumiveis.service";

const app = express();

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

app.use(
  fileUpload({
    limits: { fileSize: 20 * 1024 * 1024 },
    abortOnLimit: true,
    useTempFiles: false,
    createParentPath: true,
  })
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.use(routes);

const port = process.env.PORT || 3001;

async function bootstrap() {
  await initOraclePool();

  const server = app.listen(port, () => {
    console.log(`API running at port ${port}`);
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

  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  const portSocket = process.env.PORT_SOCKET || 3002;
  httpServer.listen(portSocket, () => {
    console.log(`Socket running at port ${portSocket}`);
  });

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
    server.close(async () => {
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