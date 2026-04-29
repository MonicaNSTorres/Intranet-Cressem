import axios from "axios";

export const whatsappService = {
  async enviarMensagem(texto: string) {
    if (process.env.WHATSAPP_ENABLED !== "true") {
      console.log("WhatsApp desativado. Mensagem:", texto);
      return { success: false, skipped: true };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const to = process.env.WHATSAPP_ALERT_TO;

    if (!phoneNumberId || !token || !to) {
      throw new Error("Configurações do WhatsApp não estão completas no .env.");
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const { data } = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: texto,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return data;
  },
};