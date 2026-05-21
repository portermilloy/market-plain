import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MarketStatus from "./components/MarketStatus";
import NavLinks from "./components/NavLinks";
import { ProProvider } from "./context/ProContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Market Plain",
  description: "The stock market, explained in plain English.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-x-hidden">
        <header className="border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between gap-4">
              <span className="text-lg font-semibold tracking-tight text-white shrink-0">
                Market Plain
              </span>
              <NavLinks />
              <MarketStatus />
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <ProProvider>{children}</ProProvider>
        </main>
      </body>
    </html>
  );
}
