import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { AuthProvider } from "@/context/AuthContext";
import { BusinessProvider } from "@/context/BusinessContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Launchpad — Your AI Business Partner",
  description: "AI-powered legal, financial, and compliance guidance for first-time entrepreneurs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} style={{ colorScheme: "dark" }}>
      <body suppressHydrationWarning>
        <Auth0Provider>
          <AuthProvider>
            <BusinessProvider>{children}</BusinessProvider>
          </AuthProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
