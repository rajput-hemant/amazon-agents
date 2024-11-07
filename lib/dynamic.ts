import { cookies } from "next/headers";

import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import { env } from "~/lib/env";

import { getLogger } from "./logger";
import { EmailSchema } from "./validatiions/common";

const logger = getLogger();

export const isLoggedIn = async () => {
  const { authenticated } = await getUserInfo();
  return authenticated;
};

export async function getUserInfo() {
  const encodedJwt = (await cookies()).get("DYNAMIC_JWT_TOKEN")?.value;

  if (!encodedJwt) {
    return {
      authenticated: false as const,
      token: null,
      email: null,
    };
  }

  return getUserInfoFromAuthToken(encodedJwt);
}

export async function getUserInfoFromAuthToken(token: string) {
  if (!token) {
    return {
      authenticated: false as const,
      token: null,
      email: null,
    };
  }

  const jwksUrl = `https://app.dynamic.xyz/api/v0/sdk/${env.DYNAMIC_ENV_ID}/.well-known/jwks`;

  const client = new JwksClient({
    jwksUri: jwksUrl,
    rateLimit: true,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000,
  });

  const signingKey = await client.getSigningKey();
  const publicKey = signingKey.getPublicKey();

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, publicKey, {
      ignoreExpiration: false,
    });
  } catch (error) {
    logger.error({ error }, "User verification failed");

    return {
      authenticated: false as const,
      token: null,
      email: null,
    };
  }

  logger.info({ decodedToken }, "User is logged in");

  return {
    authenticated: true as const,
    token: decodedToken,
    email: EmailSchema.safeParse(decodedToken).data?.email ?? null,
  };
}
