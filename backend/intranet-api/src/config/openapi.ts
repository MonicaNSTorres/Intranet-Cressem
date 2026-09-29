import { associadoPaths } from "../docs/associado.docs";
import { cnab240Paths } from "../docs/cnab240.docs";

export const openApiDocument = {
  openapi: "3.1.0",

  info: {
    title: "Intranet API - Sicoob Cressem",
    version: "1.0.0",
    description:
      "Documentação oficial da API da Intranet do Sicoob Cressem.",
  },

  servers: [
    {
      url: "http://localhost:3001",
      description: "Ambiente local",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Informe o token JWT utilizado para autenticação na Intranet.",
      },
    },
  },

  tags: [
    {
      name: "Sistema",
      description: "Endpoints gerais da API",
    },
    {
      name: "Associados",
      description: "Consultas relacionadas aos associados.",
    },
    {
      name: "CNAB240",
      description:
        "Geração, importação e consulta de arquivos CNAB240.",
    },
  ],

  paths: {
    "/": {
      get: {
        tags: ["Sistema"],
        summary: "Verificar API",
        description: "Verifica se a API da Intranet está disponível.",

        responses: {
          "200": {
            description: "API disponível",

            content: {
              "application/json": {
                schema: {
                  type: "object",

                  properties: {
                    message: {
                      type: "string",
                      example: "INTRANET-API",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    ...associadoPaths,
    ...cnab240Paths,
  },
};