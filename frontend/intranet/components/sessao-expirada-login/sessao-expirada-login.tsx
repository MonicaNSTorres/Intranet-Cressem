"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, logoutAdUser } from "@/services/auth.service";

const publicRoutes = ["/login", "/forget_password"];

export function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isPublicRoute) return;

    const interval = setInterval(async () => {
      try {
        await api.get("/v1/me");
      } catch (error: any) {
        if (error?.response?.status === 401) {
          try {
            await logoutAdUser();
          } catch {}

          router.replace("/login");
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [router, pathname]);

  return null;
}