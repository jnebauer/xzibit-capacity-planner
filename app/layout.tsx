import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./local.css";
import { QueryProvider } from "../components/QueryProvider";
import { ThemeRegistry } from "../components/ThemeRegistry";
import { AppShell } from "../components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Capacity Planner",
  description: "Capacity planning and resource management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry fontFamily={inter.style.fontFamily}>
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
