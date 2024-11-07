"use client";

import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery } from "@tanstack/react-query";
import { Github } from "lucide-react";

import { api } from "~/lib/trpc/rq-client";

import { Button } from "../ui/button";

export const NavAction: React.FC = () => {
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

  return isAuthedQuery.data ?
      <DynamicWidget />
    : <Button size="icon" variant="flat">
        <Github className="size-5" />
      </Button>;
};
