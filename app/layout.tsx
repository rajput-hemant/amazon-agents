import "./globals.css";

import React from "react";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

import { DynamicContextProvider } from "~/components/dynamic";
import { Footer } from "~/components/site-footer/footer";
import { Navbar } from "~/components/site-header/navbar";
import { TailwindIndicator } from "~/components/tailwind-indicator";
import { ThemeProvider } from "~/components/theme-provider";
import { env } from "~/lib/env";
import * as fonts from "~/lib/fonts";
import { TRPCReactProvider } from "~/lib/trpc/rq-client";
import { cn } from "~/lib/utils";

export const metadata = {
  title: "Next.js + TypeScript Starter",
  description: "A starter template for Next.js and TypeScript",
};

const RootLayout: React.FCC = ({ children }) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(Object.values(fonts).map((font) => font.variable))}
    >
      <body className="scroll-smooth font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <DynamicContextProvider
              settings={{
                environmentId: env.DYNAMIC_ENV_ID,
                // @ts-expect-error type mismatch
                walletConnectors: [EthereumWalletConnectors],
                overrides: { evmNetworks },
              }}
            >
              <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
                <Navbar />
                <main>{children}</main>
                <Footer />
              </div>
            </DynamicContextProvider>
          </TRPCReactProvider>
        </ThemeProvider>

        <TailwindIndicator />
      </body>
    </html>
  );
};

export default RootLayout;

const evmNetworks = [
  {
    blockExplorerUrls: ["https://testnet.explorer.sapphire.oasis.dev"],
    chainId: 23295, // 23295 in decimal, 0x5B4F in hex
    chainName: "Oasis Sapphire Testnet",
    iconUrls: ["../images/oasis_logo.png"],
    name: "Oasis Sapphire Testnet",
    nativeCurrency: {
      decimals: 18,
      name: "ROSE",
      symbol: "TEST",
    },
    networkId: 23295,
    rpcUrls: ["https://testnet.sapphire.oasis.dev"],
    vanityName: "Oasis Sapphire Testnet",
  },
];
