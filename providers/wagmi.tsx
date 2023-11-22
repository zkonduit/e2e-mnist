"use client";

import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { polygonMumbai } from 'viem/chains'
import { publicProvider } from 'wagmi/providers/public'

const { publicClient } = configureChains(
  [polygonMumbai],
  [publicProvider()]
);

const config = createConfig({
  publicClient
});

export default function WagmiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WagmiConfig config={config}>{children}</WagmiConfig>;
}
