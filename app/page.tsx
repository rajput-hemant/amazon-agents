"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { DynamicWidget, useDynamicContext } from "~/components/dynamic";
import { siteConfig } from "~/config/site";
import { api } from "~/lib/trpc/rq-client";

const Homepage: React.FC = () => {
  const { authToken } = useDynamicContext();
  const apiUtils = api.useUtils();

  const isAuthedQuery = useQuery({
    queryKey: ["auth", authToken],
    queryFn: async () => {
      if (authToken === undefined) {
        return false;
      }
      const { authenticated } = await apiUtils.auth.isAuthenticated.fetch({
        authToken,
      });
      return authenticated;
    },
  });

  return (
    isAuthedQuery.isPending ?
      <Shell>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Please wait while we log you in!
          </p>
          <Loader2 className="size-6 animate-spin" />
        </div>
      </Shell>
    : isAuthedQuery.data ?
      <div className="grid size-full place-items-center text-3xl font-semibold">
        Authenticated
      </div>
    : <Shell>
        <DynamicWidget />
      </Shell>
  );
};

export default Homepage;

const Shell: React.FCC = ({ children }) => (
  <div className="mb-[33.33vh] mt-[16.67vh] flex flex-col items-center justify-center gap-4 md:gap-6">
    <div className="space-y-2 text-center">
      <h1 className="text-4xl font-bold">Welcome to {siteConfig.name}</h1>
      <h2 className="text-lg font-medium text-muted-foreground">
        Connect your wallet to get started
      </h2>
    </div>

    {children}
  </div>
);
