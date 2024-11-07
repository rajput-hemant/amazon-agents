import { z } from "zod";

import { getUserInfoFromAuthToken } from "~/lib/dynamic";

import { createTRPCRouter, publicProcedure } from "..";

export const authRouter = createTRPCRouter({
  isAuthenticated: publicProcedure
    .input(z.object({ authToken: z.string() }))
    .query(async ({ input: { authToken } }) => {
      const { authenticated } = await getUserInfoFromAuthToken(authToken);
      return { authenticated };
    }),
});
