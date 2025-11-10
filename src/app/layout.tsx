import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import AppProviders from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const themeInitScript = `(() => {
  try {
    const storageKey = 'x402chatly-theme';
    const stored = window.localStorage.getItem(storageKey);
    const theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  } catch (error) {
    console.warn('Theme hydration warning', error);
  }
})();`;

export const metadata: Metadata = {
  title: "X402Chatly • Solana Micropayment AI Chat",
  description: "Chat with top AI models and settle every message with instant Solana USDC micropayments via the X402 protocol.",
  icons: {
    icon: "/logox402chatly.png",
    shortcut: "/logox402chatly.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full overflow-hidden" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full overflow-hidden antialiased`}
      >
        <AppProviders>
          <div className="flex h-full min-h-screen flex-col">
            <div role="main" className="flex flex-1 min-h-0 flex-col">{children}</div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
