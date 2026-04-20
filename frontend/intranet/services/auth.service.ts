import axios from "axios";

export type LoginResponse = {
  access_token: string;
  username?: string;
  nome_completo?: string;
  department?: string;
  physicalDeliveryOfficeName?: string;
  grupos?: string[];
};

export type MeResponse = {
  username?: string;
  nome_completo?: string;
  department?: string;
  physicalDeliveryOfficeName?: string;
  grupos?: string[];
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

export async function loginAdUser(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await api.post("/v1/login_sem_automatico", null, {
    params: {
      username,
      password,
    },
  });

  return response.data;
}

export async function getMeAdUser(): Promise<MeResponse> {
  const response = await api.get("/v1/me");
  return response.data;
}

export async function logoutAdUser() {
  const response = await api.post("/v1/logout");
  return response.data;
}

export function userHasGroup(
  userGroups: string[] | undefined,
  allowedGroups: string[]
): boolean {
  if (!Array.isArray(userGroups) || userGroups.length === 0) return false;
  return allowedGroups.some((group) => userGroups.includes(group));
}

export function userHasAnyGroup(
  me: MeResponse | undefined,
  allowedGroups: string[]
): boolean {
  return userHasGroup(me?.grupos, allowedGroups);
}