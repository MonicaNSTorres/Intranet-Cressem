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
      // evita quebrar o fluxo por falha ao encerrar sessão
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

  async listConsumables(searchText?: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get("/Consumable", {
        headers: {
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
        params: {
          range: "0-100",
        },
      });

      const items = Array.isArray(response.data) ? response.data : [];

      if (!searchText) return items;

      const term = searchText.toLowerCase();
      return items.filter((item: any) =>
        String(item?.name || "").toLowerCase().includes(term)
      );
    });
  }

  async getConsumableById(id: string) {
    return this.withSession(async (sessionToken) => {
      const response = await this.client.get(`/Consumable/${id}`, {
        headers: {
          "App-Token": this.appToken,
          "Session-Token": sessionToken,
        },
      });

      return response.data;
    });
  }
}