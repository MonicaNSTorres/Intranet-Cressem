export const associadoPaths = {
  "/v1/associados/buscar-por-cpf": {
    get: {
      tags: ["Associados"],

      summary: "Buscar associado por CPF/CNPJ",

      description:
        "Consulta os dados de um associado utilizando CPF ou CNPJ.",

      parameters: [
        {
          name: "cpf",
          in: "query",
          required: true,

          description: "CPF ou CNPJ do associado.",

          schema: {
            type: "string",
          },

          example: "12345678901",
        },
      ],

      responses: {
        "200": {
          description: "Consulta realizada com sucesso.",

          content: {
            "application/json": {
              schema: {
                type: "object",

                properties: {
                  found: {
                    type: "boolean",
                    example: true,
                  },

                  nome: {
                    type: "string",
                  },

                  matricula: {
                    type: "string",
                  },

                  nascimento: {
                    type: "string",
                  },

                  empresa: {
                    type: "string",
                  },

                  cargo: {
                    type: "string",
                  },

                  cpf: {
                    type: "string",
                  },

                  bairro: {
                    type: "string",
                  },

                  cidade: {
                    type: "string",
                  },

                  rua: {
                    type: "string",
                  },

                  uf: {
                    type: "string",
                  },

                  cep: {
                    type: "string",
                  },

                  email: {
                    type: "string",
                  },

                  telefone: {
                    type: "string",
                  },

                  conta_corrente: {
                    type: "string",
                  },

                  saldo_capital: {
                    type: "string",
                  },
                },
              },
            },
          },
        },

        "400": {
          description: "CPF/CNPJ inválido.",
        },

        "500": {
          description: "Erro interno ao consultar o associado.",
        },
      },
    },
  },
};