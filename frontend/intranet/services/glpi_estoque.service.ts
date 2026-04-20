import axios from "axios";

export async function listarConsumiveisGlpi(busca = "") {
  const { data } = await axios.get(
    `${process.env.NEXT_PUBLIC_API_URL}/v1/glpi/consumables`,
    {
      params: { busca },
      withCredentials: true,
    }
  );

  return data;
}