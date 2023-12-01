import type { Metadata } from "next";
import "./globals.css";
import WagmiProvider from "@/providers/wagmi";
import { SharedResourcesProvider } from "@/providers/ezkl";

export const metadata: Metadata = {
  title: "MNIST Clan",
  description: "Submit a ZKML proof of your classified handrawn digit to join the clan.",
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
