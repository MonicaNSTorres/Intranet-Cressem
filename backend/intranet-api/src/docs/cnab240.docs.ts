export const cnab240Paths = {
  "/v1/cnab240/remessas": {
    get: {
      tags: ["CNAB240"],

      summary: "Listar remessas CNAB240",

      description:
        "Lista as remessas CNAB240 registradas no sistema.",

      security: [
        {
          bearerAuth: [],
        },
      ],

      responses: {
        "200": {
          description: "Remessas listadas com sucesso.",

          content: {
            "application/json": {
              schema: {
                type: "array",
                items: {
                  type: "object",
                },
              },
            },
          },
        },

        "401": {
          description:
            "Usuário não autenticado ou token inválido/expirado.",
        },

        "500": {
          description: "Falha ao listar remessas CNAB240.",

          content: {
            "application/json": {
              schema: {
                type: "object",

                properties: {
                  error: {
                    type: "string",
                    example: "Falha ao listar remessas CNAB240.",
                  },

                  details: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};