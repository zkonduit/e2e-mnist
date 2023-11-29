"use client";

import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { optimism } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [optimism],
  [
    alchemyProvider({
      apiKey: process.env.NEXT_PUBLIC_ALCHEMY_KEY!,
    }),
  ]
);

const config = createConfig({
  autoConnect: true,
  publicClient,
  webSocketPublicClient
})

export default function WagmiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}
