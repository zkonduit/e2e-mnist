import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.scss";
import WagmiProvider from "@/providers/wagmi";
import { SharedResourcesProvider } from "@/providers/ezkl";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Secret ID",
  description: "Keep your IDs safe and secure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SharedResourcesProvider>
          <WagmiProvider>{children}</WagmiProvider>
        </SharedResourcesProvider>
      </body>
    </html>
  );
}
