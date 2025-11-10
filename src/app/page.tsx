"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Zap, Check, Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import HolographicCard from "@/components/ui/holographic-card";
import { LiquidButton } from "@/components/ui/liquid-button-wrapper";
import AuroraCanvas from "@/components/ui/ambient-aurora";
import { ParticleText } from "@/components/ui/animated-text";

interface PricingTier {
  name: string;
  price: string;
  cryptoPrice: string;
  description: string;
  features: string[];
  popular?: boolean;
  color: string;
  logo: string;
  logoAlt: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Deepseek Chat",
    price: "$0.03",
    cryptoPrice: "30,000 USDC μ-units",
    description: "per message",
    features: [
      "Fast 32K context replies",
      "Great reasoning for code and product",
      "Markdown-safe responses",
      "Instant x402 settlement"
    ],
    popular: true,
    color: "from-violet-500 to-blue-600",
    logo: "/deepseek.png",
    logoAlt: "Deepseek logo",
  },
  {
    name: "GPT-5",
    price: "$0.10",
    cryptoPrice: "100,000 USDC μ-units",
    description: "per message",
    features: [
      "Latest GPT-5 model",
      "Excellent for complex tasks",
      "Vision + text in one reply",
      "Fast and reliable responses"
    ],
    color: "from-blue-500 to-cyan-600",
    logo: "/gpt.png",
    logoAlt: "OpenAI GPT logo",
  },
  {
    name: "Claude 4.5 Sonnet",
    price: "$0.20",
    cryptoPrice: "200,000 USDC μ-units",
    description: "per message",
    features: [
      "Anthropic safety guardrails",
      "Great writing and research skills",
      "Structured JSON replies",
      "Extended context window"
    ],
    color: "from-amber-500 to-orange-600",
    logo: "/claude.png",
    logoAlt: "Claude logo",
  }
];

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-y-auto bg-background text-foreground">
      {/* Ambient Aurora Background */}
      <div className="fixed inset-0 z-0">
        <AuroraCanvas />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
                <Image
                  src="/logox402chatly.png"
                  alt="X402Chatly logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-contain"
                  priority
                />
              <span className="text-2xl font-bold bg-linear-to-r from-violet-500 to-blue-600 bg-clip-text text-transparent font-orbitron tracking-wider">
                X402Chatly
              </span>
            </div>

            <nav className="hidden md:flex flex-none items-center justify-center gap-8">
              <a href="#features" className="group relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span className="relative z-10">Features</span>
                <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-linear-to-r from-violet-500 to-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
              <a href="#pricing" className="group relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span className="relative z-10">Pricing</span>
                <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-linear-to-r from-blue-500 to-cyan-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
              <Link href="/docs" className="group relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <span className="relative z-10">Docs</span>
                <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-linear-to-r from-pink-500 to-rose-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
            </nav>

            <div className="hidden md:flex flex-1 items-center justify-end gap-3">
              <ThemeToggle />
              <Link
                href="/connect"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-white/10 bg-linear-to-r from-violet-600/90 via-blue-600/80 to-slate-900/80 px-3 py-1 text-xs font-semibold text-white shadow-[0_12px_28px_-20px_rgba(88,86,214,0.8)] transition-all hover:from-violet-500 hover:to-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <Wallet className="w-3.5 h-3.5" />
                </span>
                <span className="tracking-[0.16em] uppercase text-[10px]">Connect Wallet</span>
              </Link>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl"
            >
              <div className="container mx-auto px-6 py-4 space-y-4">
                <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
                <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </a>
                <Link href="/docs" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Docs
                </Link>
                <div className="flex flex-col gap-4">
                  <ThemeToggle />
                  <Button asChild className="w-full gap-2 bg-linear-to-r from-violet-500 to-blue-600 rounded-full text-white">
                    <Link href="/connect">
                      <Wallet className="w-4 h-4" />
                      Connect Wallet
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <motion.section 
          className="relative px-6 py-24 text-foreground md:py-32"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center space-y-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Badge variant="outline" className="border-violet-500/20 bg-background/70 px-4 py-2 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-violet-500" />
                <span className="text-sm">Pay-per-message with crypto</span>
              </Badge>
            </motion.div>

            <h1 className="text-5xl font-bold tracking-tight md:text-7xl space-y-2">
              <div>
                <ParticleText 
                  text="AI Chat Platform" 
                  className="bg-linear-to-r from-violet-500 via-blue-500 to-pink-500 bg-clip-text text-transparent"
                />
              </div>
              <motion.div 
                className="text-foreground/90"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                with X402 Micropayments
              </motion.div>
            </h1>

            <motion.p 
              className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              Access multiple AI models with Solana USDC micropayments. Pay only for what you use, no subscriptions required.
            </motion.p>

            <motion.div 
              className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <LiquidButton href="/connect" />
              <Link href="/docs" className="group relative inline-block overflow-hidden rounded-full px-8 py-4 text-lg font-semibold backdrop-blur-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all shadow-lg">
                <span className="relative z-10 text-foreground">View Demo</span>
              </Link>
            </motion.div>

            <motion.div 
              className="flex flex-col items-center justify-center gap-6 pt-8 text-sm text-muted-foreground sm:flex-row"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">$0.03</div>
                <div>Minimum per-reply spend</div>
              </div>
              <div className="hidden h-12 w-px bg-border sm:block" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">x402 Payments</div>
                <div>Instant Solana USDC settlement</div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Pricing Section */}
        <section id="pricing" className="container mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-violet-500 to-blue-600 bg-clip-text text-transparent">
                AI Model Pricing
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from the best AI models. Pay only for messages you send.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingTiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <HolographicCard className="relative overflow-hidden rounded-3xl">
                      <div className="relative flex h-full flex-col gap-6 rounded-3xl bg-background/70 p-6 backdrop-blur-2xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100/70 p-2 shadow-inner dark:bg-neutral-900/70">
                            <Image
                              src={tier.name === "GPT-5" ? (isDarkMode ? "/gpt-white.png" : "/gpt.png") : tier.logo}
                              alt={tier.logoAlt}
                              width={56}
                              height={56}
                              className="h-10 w-10 object-contain"
                              key={isDarkMode ? 'gpt-white' : 'gpt-default'}
                              priority={tier.popular}
                            />
                          </div>
                          <div className="text-left">
                            <h3 className="text-2xl font-semibold text-foreground">{tier.name}</h3>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-baseline gap-3">
                          <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                          <span className="text-lg font-semibold text-foreground/80">per message</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{tier.cryptoPrice}</div>
                      </div>
                      <ul className="space-y-3 text-sm">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        asChild
                        className={`w-full ${
                          tier.popular
                            ? "bg-linear-to-r from-violet-500 to-blue-600 hover:from-violet-600 hover:to-blue-700 text-white"
                            : "bg-foreground/90 text-background hover:bg-foreground"
                        }`}
                      >
                        <Link href="/connect">Start Using</Link>
                      </Button>
                    </div>
                  </HolographicCard>
                </motion.div>
              ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-4 mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-blue-500 to-pink-500 bg-clip-text text-transparent">
                Why X402Chatly?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The future of AI chat with blockchain-powered micropayments
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <Wallet className="w-6 h-6" />,
                title: "Crypto Micropayments",
                description: "Pay per message with USDC on Solana. No subscriptions, no commitments.",
                color: "from-violet-500 to-purple-600"
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Multiple AI Models",
                description: "Deepseek available today, GPT-5 and Claude support landing soon.",
                color: "from-blue-500 to-cyan-600"
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Instant Transactions",
                description: "Lightning-fast payments with 400ms finality on Solana blockchain.",
                color: "from-pink-500 to-rose-600"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="border-border/40 hover:border-border/60 transition-colors h-full">
                  <CardHeader>
                    <div className={`h-12 w-12 rounded-xl bg-linear-to-br ${feature.color} flex items-center justify-center mb-4 text-white`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
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

