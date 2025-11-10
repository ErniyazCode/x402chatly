"use client";

import { type ReactNode } from "react";
import { SolanaWalletProvider } from "./solana-wallet-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}

export default AppProviders;

