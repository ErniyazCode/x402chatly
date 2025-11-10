"use client";

import { type ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

type ProvidersProps = {
  children: ReactNode;
};

const DEFAULT_NETWORK = process.env.NEXT_PUBLIC_NETWORK === "solana" ? "solana" : "solana-devnet";

function resolveRpcUrl(network: "solana" | "solana-devnet"): string {
  const explicit = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (explicit) return explicit;

  if (network === "solana") {
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ?? clusterApiUrl("mainnet-beta")
    );
  }

  return process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ?? clusterApiUrl("devnet");
}

export function SolanaWalletProvider({ children }: ProvidersProps) {
  const endpoint = useMemo(() => resolveRpcUrl(DEFAULT_NETWORK), []);
  const baseAdapters = useMemo(() => [new PhantomWalletAdapter()], []);
  const standardAdapters = useStandardWalletAdapters(baseAdapters);
  const wallets = useMemo(
    () =>
      standardAdapters.filter((adapter) => {
        const name = adapter.name;
        return name === "Phantom" || name === "MetaMask";
      }),
    [standardAdapters],
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default SolanaWalletProvider;

