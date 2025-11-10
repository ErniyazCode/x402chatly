"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Wallet, ShieldCheck, Zap, ArrowRightCircle, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const onboardingSteps = [
  {
    title: "Connect your Solana wallet",
    description: "Phantom and Metamask are supported out of the box.",
    icon: Wallet,
  },
  {
    title: "Authorize the x402 session",
    description: "Approve an automatic USDC spending cap so chat payments can clear instantly.",
    icon: ShieldCheck,
  },
  {
    title: "Start your AI chat",
    description: "Every prompt and reply settles in real-time with Solana USDC micropayments.",
    icon: Zap,
  },
];

export default function ConnectPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (connected) {
      router.replace("/chat");
    }
  }, [connected, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-y-auto bg-background text-foreground">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
  <div className="absolute bottom-0 right-1/5 h-112 w-md rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold font-orbitron tracking-wider">
            <Image
              src="/logox402chatly.png"
              alt="X402Chatly logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-contain"
              priority
            />
            X402Chatly
          </Link>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="hidden sm:flex items-center gap-2 border-green-500/30 bg-green-500/10 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Solana x402 ready
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-16">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Badge variant="outline" className="mx-auto mb-6 flex items-center gap-2 border-violet-500/30 bg-violet-500/10 text-xs uppercase tracking-[0.2em] text-violet-300">
            <ArrowRightCircle className="h-3.5 w-3.5" />
            Step 1 · Wallet session
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Connect once. Chat forever.
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Secure a non-custodial x402 session so every Deepseek exchange settles instantly in Solana USDC.
            You stay in control—no surprise debits, no modal spam.
          </p>

          <div className="mt-10 flex flex-col items-center gap-6">
            {isMounted ? (
              <div className="wallet-liquid-wrapper">
                <WalletMultiButton />
              </div>
            ) : (
              <Button
                disabled
                className="rounded-full bg-linear-to-r from-violet-500 to-blue-600 px-8 py-4 text-lg font-semibold text-white opacity-70"
              >
                Loading wallet options…
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Need a wallet? <Link href="https://phantom.app/download" className="underline" target="_blank" rel="noreferrer">Install Phantom</Link> or use any supported option.
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-16 grid w-full gap-6 md:grid-cols-3"
        >
          {onboardingSteps.map((step) => (
            <Card key={step.title} className="border-border/40 bg-background/70 backdrop-blur">
              <div className="space-y-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-600 text-white">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="space-y-2 text-left">
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-20 w-full"
        >
          <Card className="flex flex-col gap-6 border-violet-500/20 bg-linear-to-r from-violet-500/10 via-blue-500/10 to-violet-500/5 p-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="text-2xl font-semibold">What happens after connecting?</h2>
              <p className="text-sm text-muted-foreground">
                We record your wallet in Supabase, spin up an empty AI conversation, and prepare automatic micropayments.
                When you head to the chat workspace, every message is real—no mock data.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-violet-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="leading-tight text-muted-foreground">
                x402 facilitator by PayAI
                <br />USDC on {process.env.NEXT_PUBLIC_NETWORK === "solana" ? "Solana mainnet" : "Solana devnet"}
              </div>
            </div>
          </Card>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logox402chatly.png"
              alt="X402Chatly logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-contain"
              priority
            />
            <div className="space-y-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground font-orbitron tracking-wider">X402Chatly</span>
              <p>Real USDC micropayments. Real AI. Powered by Solana x402.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} X402Chatly</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
