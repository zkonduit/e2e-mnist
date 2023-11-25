import type { Metadata } from "next";
import "./globals.css";
import WagmiProvider from "@/providers/wagmi";
import { SharedResourcesProvider } from "@/providers/ezkl";

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
      <body>
        <SharedResourcesProvider>
          <WagmiProvider>{children}</WagmiProvider>
        </SharedResourcesProvider>
      </body>
    </html>
  );
}
