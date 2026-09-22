"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMeAdUser } from "@/services/auth.service";

export function useAuthorization(allowedGroups: string[]) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const me = await getMeAdUser();
        const grupos = Array.isArray(me?.grupos) ? me.grupos : [];

        const ok =
          allowedGroups.length === 0 ||
          allowedGroups.some((group) => grupos.includes(group));

        setAuthorized(ok);

        if (!ok) {
          router.replace("/auth/home");
        }
      } catch (error) {
        console.error("Erro ao validar autorização:", error);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [allowedGroups, router]);

  return { loading, authorized };
}