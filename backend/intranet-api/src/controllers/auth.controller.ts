import { Request, Response } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { Client } from "ldapts";

const LDAP_URL = process.env.LDAP_URL || "ldap://10.0.107.251";
const LDAP_BASE_DN =
  process.env.LDAP_BASE_DN || "ou=CRESSEM,dc=CRESSEM,dc=INTRA";
const LDAP_DOMAIN = process.env.LDAP_DOMAIN || "@CRESSEM.INTRA";

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "4d38b779b34fd8ed1153eb6a1ad00f6b";

const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
  (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "180m";

function getCookieMaxAge() {
  const raw = String(process.env.JWT_COOKIE_MAX_AGE_MS || "").trim();

  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1000 * 60 * 180;
}

async function authenticateOnAd(username: string, password: string) {
  const client = new Client({
    url: LDAP_URL,
  });

  const login = String(username).trim();
  const usernameWithDomain = `${login}${LDAP_DOMAIN}`;

  try {
    await client.bind(usernameWithDomain, password);

    const { searchEntries } = await client.search(LDAP_BASE_DN, {
      scope: "sub",
      filter: `(&(objectClass=user)(sAMAccountName=${login}))`,
      attributes: [
        "*",
        "displayName",
        "name",
        "memberOf",
        "sAMAccountName",
        "department",
        "physicalDeliveryOfficeName",
      ],
    });

    if (!searchEntries.length) {
      return false;
    }

    const userEntry: any = searchEntries[0];

    const nomeCompleto = Array.isArray(userEntry.displayName)
      ? String(userEntry.displayName[0] || "")
      : String(userEntry.displayName || userEntry.name || login);

    const department = Array.isArray(userEntry.department)
      ? String(userEntry.department[0] || "")
      : String(userEntry.department || "");

    const physicalDeliveryOfficeName = Array.isArray(
      userEntry.physicalDeliveryOfficeName
    )
      ? String(userEntry.physicalDeliveryOfficeName[0] || "")
      : String(userEntry.physicalDeliveryOfficeName || "");

    let grupos: string[] = [];

    if (userEntry.memberOf) {
      const memberOfList = Array.isArray(userEntry.memberOf)
        ? userEntry.memberOf
        : [userEntry.memberOf];

      grupos = memberOfList.map((dn: string) => {
        const firstPart = String(dn).split(",")[0];
        return firstPart.replace(/^CN=/i, "");
      });
    }

    return {
      username: login,
      nome_completo: nomeCompleto,
      department,
      physicalDeliveryOfficeName,
      grupos,
    };
  } catch (error) {
    console.error("Erro no login AD:", error);
    return false;
  } finally {
    await client.unbind().catch(() => null);
  }
}

export const authController = {
  async loginSemAutomatico(req: Request, res: Response) {
    try {
      const username = String(
        req.query.username || req.body.username || ""
      ).trim();
      const password = String(
        req.query.password || req.body.password || ""
      ).trim();

      if (!username || !password) {
        return res.status(400).json({
          detail: "Usuário e senha são obrigatórios.",
        });
      }

      const resultado = await authenticateOnAd(username, password);

      if (!resultado) {
        return res.status(401).json({
          detail: "Usuário ou senha inválidos.",
        });
      }

      const token = jwt.sign(
        {
          sub: resultado.username,
          nome_completo: resultado.nome_completo,
          department: resultado.department,
          physicalDeliveryOfficeName: resultado.physicalDeliveryOfficeName,
          grupos: resultado.grupos,
        },
        JWT_SECRET,
        {
          expiresIn: JWT_EXPIRES_IN,
        }
      );

      res.cookie("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: getCookieMaxAge(),
      });

      return res.json({
        access_token: token,
        username: resultado.username,
        nome_completo: resultado.nome_completo,
        department: resultado.department,
        physicalDeliveryOfficeName: resultado.physicalDeliveryOfficeName,
        grupos: resultado.grupos,
      });
    } catch (error) {
      console.error("Erro no login AD:", error);
      return res.status(500).json({
        detail: "Erro interno ao realizar login.",
      });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const authReq = req as any;

      return res.json({
        username: authReq.user?.sub || "",
        nome_completo: authReq.user?.nome_completo || "",
        department: authReq.user?.department || "",
        physicalDeliveryOfficeName:
          authReq.user?.physicalDeliveryOfficeName || "",
        grupos: authReq.user?.grupos || [],
      });
    } catch (error) {
      return res.status(401).json({ detail: "Token inválido ou expirado." });
    }
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie("access_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return res.json({ message: "Logout realizado com sucesso." });
  },
};