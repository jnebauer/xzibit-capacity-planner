import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const isAdmin = headersList.get("x-is-admin") === "true";

  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry fontFamily={inter.style.fontFamily}>
          <QueryProvider>
            <AppShell isAdmin={isAdmin}>{children}</AppShell>
          </QueryProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
