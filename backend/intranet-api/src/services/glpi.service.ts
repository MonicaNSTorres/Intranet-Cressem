import axios, { AxiosInstance } from "axios";

type GlpiSessionResponse = {
  session_token: string;
};

export class GlpiService {
  private client: AxiosInstance;

  constructor() {
    if (!process.env.GLPI_BASE_URL) {
      throw new Error("GLPI_BASE_URL não configurado");
    }

    this.client = axios.create({
      baseURL: process.env.GLPI_BASE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private get appToken() {
    return process.env.GLPI_APP_TOKEN || "";
  }

  private get userToken() {
    return process.env.GLPI_USER_TOKEN || "";
  }

  private async initSession(): Promise<string> {
    const response = await this.client.get<GlpiSessionResponse>("/initSession", {
      headers: {
        "App-Token": this.appToken,
        Authorization: `user_token ${this.userToken}`,
      },
      params: {
        get_full_session: false,
      },
    });

    return response.data.session_token;
  }

  private async killSession(sessionToken: string): Promise<void> {
    try {
      await this.client.get("/killSession", {
        headers: {
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
      });
    } catch {
      // não quebra o fluxo caso falhe ao encerrar a sessão
    }
  }

  private async withSession<T>(fn: (sessionToken: string) => Promise<T>): Promise<T> {
    const sessionToken = await this.initSession();

    try {
      return await fn(sessionToken);
    } finally {
      await this.killSession(sessionToken);
    }
  }

  async health() {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get("/getActiveProfile", {
        headers: {
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
      });

      return response.data;
    });
  }

  async listComputers(searchText?: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get("/Computer/", {
        headers: {
          "Content-Type": "application/json",
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
        params: {
          range: "0-100",
        },
      });

      const items = Array.isArray(response.data) ? response.data : [];

      if (!searchText?.trim()) {
        return items;
      }

      const term = searchText.toLowerCase();

      return items.filter((item: any) => {
        return (
          String(item?.name || "").toLowerCase().includes(term) ||
          String(item?.serial || "").toLowerCase().includes(term) ||
          String(item?.contact || "").toLowerCase().includes(term) ||
          String(item?.id || "").toLowerCase().includes(term) ||
          String(item?.comment || "").toLowerCase().includes(term)
        );
      });
    });
  }

  async getComputerById(id: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get(`/Computer/${id}`, {
        headers: {
          "Content-Type": "application/json",
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
      });

      return response.data;
    });
  }

  async testItemtype(itemtype: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get(`/${itemtype}/`, {
        headers: {
          "Content-Type": "application/json",
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
        params: {
          range: "0-20",
        },
      });

      return response.data;
    });
  }

  async listTicketsEstoque() {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get("/Ticket/", {
        headers: {
          "Content-Type": "application/json",
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
        params: {
          range: "0-500",
          sort: "id",
          order: "DESC",
          expand_dropdowns: true,
        },
      });

      const items = Array.isArray(response.data) ? response.data : [];

      return items.filter((item: any) => {
        const nome = String(item?.name || "").toUpperCase();
        const categoria = String(item?.itilcategories_id || "").toUpperCase();
        const conteudo = String(item?.content || "").toUpperCase();

        return (
          nome.includes("INSUMOS") ||
          categoria.includes("ALMOXARIFADO") ||
          conteudo.includes("SELECIONE O INSUMO")
        );
      });
    });
  }

  async getTicketById(id: number | string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get(`/Ticket/${id}`, {
        headers: {
          "Content-Type": "application/json",
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
        params: {
          expand_dropdowns: true,
        },
      });

      return response.data;
    });
  }

  async listSearchOptions(itemtype: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get(`/listSearchOptions/${itemtype}`, {
        headers: {
          "Content-Type": "application/json",
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
      });

      return response.data;
    });
  }

  async addTicketFollowup(ticketId: number | string, content: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.post(
        "/ITILFollowup/",
        {
          input: {
            itemtype: "Ticket",
            items_id: Number(ticketId),
            content,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "App-Token": this.appToken,
            "Session-Token": sessionToken,
          },
        }
      );

      return response.data;
    });
  }

  async solveTicket(ticketId: number | string, solutionContent: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.post(
        "/ITILSolution/",
        {
          input: {
            itemtype: "Ticket",
            items_id: Number(ticketId),
            content: solutionContent,
            solutiontypes_id: 0,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "App-Token": this.appToken,
            "Session-Token": sessionToken,
          },
        }
      );

      return response.data;
    });
  }

  async updateTicketStatus(ticketId: number | string, status: number) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.put(
        `/Ticket/${ticketId}`,
        {
          input: {
            id: Number(ticketId),
            status: Number(status),
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "App-Token": this.appToken,
            "Session-Token": sessionToken,
          },
        }
      );

      return response.data;
    });
  }

  async createTicketEstoqueManual(data: {
    nomeSolicitante: string;
    setor?: string;
    item: string;
    quantidade: number;
    observacao?: string;
    usuarioAtendimento: string;
  }) {
    return this.withSession(async (sessionToken) => {
      const categoriaEstoque = Number(process.env.GLPI_ESTOQUE_CATEGORY_ID || 27);

      const titulo = `Solicitação | Insumos | ${data.item}`;

      const content = `
Dados do formulário

Seçãor
1) Selecione o Insumo : ${data.item}
2) Quantidade : ${data.quantidade}

Solicitação registrada manualmente pela Intranet.

Solicitante: ${data.nomeSolicitante}
Setor: ${data.setor || "-"}
Responsável pelo atendimento: ${data.usuarioAtendimento}
Observação: ${data.observacao || "-"}
    `.trim();

      const response = await this.client.post(
        "/Ticket/",
        {
          input: {
            name: titulo,
            content,
            itilcategories_id: categoriaEstoque,
            status: 1,
            type: 1,
            urgency: 3,
            impact: 3,
            priority: 3,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "App-Token": this.appToken,
            "Session-Token": sessionToken,
          },
        }
      );

      return response.data;
    });
  }
}