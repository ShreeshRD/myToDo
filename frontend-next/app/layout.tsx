import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.scss";
import StyledComponentsRegistry from "@/lib/registry";
import { Providers } from "./providers";
import StopwatchPanel from "@/components/StopwatchPanel";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "myToDo",
  description: "Personal task manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={inter.variable} suppressHydrationWarning>
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
