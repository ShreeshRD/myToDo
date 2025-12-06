import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.scss";
import StyledComponentsRegistry from "@/lib/registry";
import { Providers } from "./providers";
import StopwatchPanel from "@/components/StopwatchPanel";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MyTodoist",
  description: "A simple todo app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <StyledComponentsRegistry>
          <Providers>
            {children}
            <StopwatchPanel />
          </Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
