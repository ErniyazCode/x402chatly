"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Zap, 
  Shield, 
  Wallet, 
  MessageSquare, 
  CreditCard,
  Sparkles,
  Lock,
  Globe,
  TrendingUp,
  CheckCircle,
  Image as ImageIcon,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import AuroraCanvas from "@/components/ui/ambient-aurora";

export default function DocsPage() {
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
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
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
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button asChild variant="outline" size="sm">
                <Link href="/" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Welcome Section */}
          <section className="text-center space-y-4 py-8">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold bg-linear-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent mb-4">
                Welcome to X402Chatly
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The future of AI conversations powered by blockchain micropayments
              </p>
            </motion.div>
          </section>

          {/* Introduction */}
          <section className="prose prose-lg dark:prose-invert max-w-none space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-violet-500" />
                <h2 className="text-3xl font-bold m-0">What is X402Chatly?</h2>
              </div>
              <p className="text-lg leading-relaxed text-foreground/90">
                X402Chatly is a revolutionary AI chat platform that combines cutting-edge artificial intelligence with blockchain technology. 
                Unlike traditional subscription-based AI services, we believe in true pay-per-use pricing. You only pay for what you actually use, 
                with instant micropayments processed on the Solana blockchain.
              </p>
              <p className="text-lg leading-relaxed text-foreground/90">
                Our platform gives you access to multiple state-of-the-art AI models including GPT-5, Claude 4.5 Sonnet, and Deepseek Chat. 
                Each conversation is private, secure, and costs only cents per message. No monthly subscriptions, no hidden fees, 
                just transparent, fair pricing powered by Web3 technology.
              </p>
            </div>
          </section>

          {/* Why X402 Technology */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-8 h-8 text-blue-500" />
                <h2 className="text-3xl font-bold m-0">Understanding X402 Technology</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold text-violet-500 mb-3">What Makes X402 Special?</h3>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    X402 is a groundbreaking payment protocol built specifically for the modern internet. The name comes from HTTP status code 402 
                    "Payment Required" - a code that was reserved decades ago but never properly implemented. We're making that vision a reality.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-blue-500 mb-3">How It Works</h3>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    When you send a message to an AI model, the system automatically detects that payment is required. Your Solana wallet 
                    instantly processes a micropayment in USDC (a stable cryptocurrency equal to the US Dollar). This happens in milliseconds, 
                    completely transparent to you. Once payment is confirmed, your AI response is delivered immediately.
                  </p>
                  <p className="text-lg leading-relaxed text-foreground/90 mt-4">
                    Think of it like paying for electricity - you use what you need, and pay only for that. No upfront commitments, 
                    no wasted subscription fees for features you don't use.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold text-cyan-500 mb-3">Why Blockchain?</h3>
                  <p className="text-lg leading-relaxed text-foreground/90">
                    Traditional payment systems (credit cards, PayPal) charge fees that make micropayments impractical. Processing a 3-cent 
                    payment would cost more in fees than the payment itself! Blockchain technology, specifically Solana, allows us to process 
                    payments for fractions of a cent in fees, making true pay-per-use possible.
                  </p>
                  <p className="text-lg leading-relaxed text-foreground/90 mt-4">
                    Additionally, blockchain payments are instant, borderless, and don't require sharing sensitive banking information. 
                    Your wallet, your control.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="w-8 h-8 text-green-500" />
                <h2 className="text-3xl font-bold m-0">Getting Started</h2>
              </div>

              <div className="space-y-6">
                <div className="border-l-4 border-violet-500 pl-6">
                  <h3 className="text-xl font-semibold mb-2">Step 1: Set Up Your Wallet</h3>
                  <p className="text-foreground/90">
                    First, you'll need a Solana wallet. We recommend Phantom Wallet - it's free, easy to use, and available as a browser extension. 
                    Simply install it from the official website, create a new wallet, and securely save your recovery phrase.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="text-xl font-semibold mb-2">Step 2: Add USDC</h3>
                  <p className="text-foreground/90">
                    USDC is a stablecoin - a cryptocurrency that's always equal to $1 USD. You can buy USDC directly in Phantom Wallet using a 
                    credit card, or transfer it from a cryptocurrency exchange. Start with just $5-10 to try the platform - that's enough for 
                    dozens of conversations!
                  </p>
                </div>

                <div className="border-l-4 border-cyan-500 pl-6">
                  <h3 className="text-xl font-semibold mb-2">Step 3: Connect and Chat</h3>
                  <p className="text-foreground/90">
                    Click "Connect Wallet" on X402Chatly, approve the connection in your wallet, and you're ready to go! Select your preferred 
                    AI model, start typing, and watch as payments happen automatically in the background. It's that simple.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-pink-500" />
                <h2 className="text-3xl font-bold m-0">Platform Features</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg">Multiple AI Models</h4>
                      <p className="text-foreground/80">
                        Choose from GPT-5, Claude 4.5 Sonnet, or Deepseek Chat based on your needs and budget.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="w-6 h-6 text-violet-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg">Vision Support</h4>
                      <p className="text-foreground/80">
                        Upload images and ask AI to analyze, describe, or answer questions about them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg">PDF Processing</h4>
                      <p className="text-foreground/80">
                        Upload PDF documents and ask questions about their content - AI reads and understands them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-6 h-6 text-cyan-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg">Chat History</h4>
                      <p className="text-foreground/80">
                        All your conversations are saved and organized. Pick up where you left off anytime.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Lock className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg">Privacy First</h4>
                      <p className="text-foreground/80">
                        Your conversations are tied to your wallet address only. No email, no personal data collection.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-lg">Transparent Pricing</h4>
                      <p className="text-foreground/80">
                        See exactly how much each message costs before sending. No surprises, no hidden fees.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* AI Models Explained */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <h2 className="text-3xl font-bold m-0">Choosing Your AI Model</h2>
              </div>

              <div className="space-y-6">
                <div className="border border-violet-500/30 rounded-xl p-6 bg-violet-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src="/deepseek.png" alt="Deepseek" width={32} height={32} className="rounded" />
                    <h3 className="text-2xl font-bold text-violet-500">Deepseek Chat - $0.03/message</h3>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">
                    <strong>Best for:</strong> Code generation, technical questions, debugging, and everyday conversations.<br/>
                    <strong>Why choose it:</strong> Most affordable option with excellent performance for programming tasks and general queries. 
                    Great reasoning abilities and fast responses make it perfect for developers and students.
                  </p>
                </div>

                <div className="border border-blue-500/30 rounded-xl p-6 bg-blue-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src="/gpt.png" alt="GPT-5" width={32} height={32} className="rounded" />
                    <h3 className="text-2xl font-bold text-blue-500">GPT-5 - $0.10/message</h3>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">
                    <strong>Best for:</strong> Complex reasoning, creative writing, image analysis, and versatile tasks.<br/>
                    <strong>Why choose it:</strong> OpenAI's flagship model with vision capabilities. Upload images and get detailed analysis. 
                    Excels at understanding context, following complex instructions, and creative tasks like writing stories or marketing copy.
                  </p>
                </div>

                <div className="border border-orange-500/30 rounded-xl p-6 bg-orange-500/5">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src="/claude.png" alt="Claude" width={32} height={32} className="rounded" />
                    <h3 className="text-2xl font-bold text-orange-500">Claude 4.5 Sonnet - $0.20/message</h3>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">
                    <strong>Best for:</strong> Research, long-form content, detailed analysis, and safety-critical applications.<br/>
                    <strong>Why choose it:</strong> Anthropic's most advanced model with exceptional writing quality and strong safety guidelines. 
                    Perfect for professional writing, business documents, research papers, and situations requiring careful, nuanced responses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tips and Best Practices */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-green-500" />
                <h2 className="text-3xl font-bold m-0">Tips for Best Experience</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-500 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Start with Clear Questions</h4>
                    <p className="text-foreground/80">
                      The more specific your question, the better the AI response. Instead of "tell me about Python," 
                      try "explain Python list comprehensions with examples."
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-500 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Keep Conversations Organized</h4>
                    <p className="text-foreground/80">
                      Create new chats for different topics. This helps the AI maintain context and gives you better organized history. 
                      Each chat can hold up to 80 messages.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-500 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Monitor Your Balance</h4>
                    <p className="text-foreground/80">
                      Your USDC balance is displayed in the top right. Add more funds before it runs out to avoid interruptions. 
                      $10 typically lasts for dozens of conversations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-500 font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Use the Right Model</h4>
                    <p className="text-foreground/80">
                      Save money by choosing Deepseek for simple tasks, and use GPT-5 or Claude only when you need advanced capabilities. 
                      Think of it like choosing regular vs premium gas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-pink-500 font-bold">5</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Experiment with Vision</h4>
                    <p className="text-foreground/80">
                      Try uploading screenshots, diagrams, or photos to GPT-5 or Claude. They can read text in images, 
                      analyze charts, identify objects, and even help debug visual code errors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security and Privacy */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-8 h-8 text-red-500" />
                <h2 className="text-3xl font-bold m-0">Security & Privacy</h2>
              </div>

              <div className="space-y-4">
                <p className="text-lg leading-relaxed text-foreground/90">
                  <strong className="text-violet-500">Your Wallet, Your Identity:</strong> We don't collect emails, phone numbers, or personal information. 
                  Your wallet address is your identity on the platform. This means true privacy - even we don't know who you are.
                </p>
                
                <p className="text-lg leading-relaxed text-foreground/90">
                  <strong className="text-blue-500">Encrypted Conversations:</strong> All communications between your browser and our servers are encrypted 
                  using industry-standard HTTPS. Your chat history is stored securely and accessible only through your wallet.
                </p>
                
                <p className="text-lg leading-relaxed text-foreground/90">
                  <strong className="text-cyan-500">Blockchain Transparency:</strong> Every payment you make is recorded on the Solana blockchain. 
                  This means you can verify every transaction independently - complete transparency and accountability.
                </p>
                
                <p className="text-lg leading-relaxed text-foreground/90">
                  <strong className="text-green-500">Keep Your Recovery Phrase Safe:</strong> Your wallet's recovery phrase (seed phrase) is the key to 
                  your funds. Never share it with anyone, not even us. Write it down and store it securely offline.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-6">
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-8 h-8 text-purple-500" />
                <h2 className="text-3xl font-bold m-0">Frequently Asked Questions</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-semibold text-violet-500 mb-2">How much does it really cost?</h4>
                  <p className="text-foreground/90">
                    Deepseek costs $0.03 per message, GPT-5 costs $0.10, and Claude costs $0.20. Vision features (analyzing images) 
                    add an extra $0.15. That's it - no subscriptions, no hidden fees, no premium tiers.
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-blue-500 mb-2">What if I run out of USDC?</h4>
                  <p className="text-foreground/90">
                    Simply add more USDC to your wallet! You can buy it directly in Phantom Wallet or transfer from an exchange. 
                    The platform will notify you when your balance is low.
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-cyan-500 mb-2">Can I get a refund?</h4>
                  <p className="text-foreground/90">
                    Blockchain transactions are irreversible by design. However, because each message costs just cents, 
                    the financial risk is minimal. We recommend starting with a small amount to test the platform.
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-green-500 mb-2">Is this legal and safe?</h4>
                  <p className="text-foreground/90">
                    Absolutely! Cryptocurrency payments are legal in most countries. We use USDC, a regulated stablecoin backed by US dollars. 
                    Solana is one of the most reliable and fast blockchains in the world.
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-orange-500 mb-2">Do you store my conversations?</h4>
                  <p className="text-foreground/90">
                    Yes, we store your chat history so you can access it later. However, it's tied only to your wallet address - 
                    no personal information. You can think of it as pseudonymous storage.
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold text-pink-500 mb-2">What makes this better than ChatGPT Plus?</h4>
                  <p className="text-foreground/90">
                    ChatGPT Plus costs $20/month whether you use it or not. With X402Chatly, if you send 50 messages in a month, 
                    you might spend $1.50-$10 depending on which models you use. No commitment, no waste, just pay for what you use.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Conclusion */}
          <section className="space-y-6">
            <div className="bg-linear-to-br from-violet-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-violet-500/30 rounded-2xl p-8 shadow-lg">
              <div className="text-center space-y-6">
                <h2 className="text-4xl font-bold bg-linear-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Ready to Experience the Future?
                </h2>
                <p className="text-xl text-foreground/90 max-w-2xl mx-auto leading-relaxed">
                  X402Chatly represents a new paradigm in AI services - one where you're in control of your spending, 
                  your privacy, and your data. No subscriptions, no commitments, just fair, transparent, per-use pricing 
                  enabled by blockchain technology.
                </p>
                <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
                  Whether you're a developer needing code help, a student researching topics, a writer seeking creative assistance, 
                  or just curious about AI - we've built this platform for you. Start with just a few dollars and see how far 
                  pay-per-use can take you.
                </p>
                <div className="pt-6">
                  <Button asChild size="lg" className="bg-linear-to-r from-violet-500 to-blue-600 hover:from-violet-600 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-full">
                    <Link href="/connect" className="gap-2">
                      <Wallet className="w-5 h-5" />
                      Connect Wallet & Start Chatting
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <section className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Have questions? Join our community or reach out to our support team.
            </p>
            <p className="text-xs text-muted-foreground/70">
              X402Chatly is built on Solana blockchain. Always keep your wallet recovery phrase safe and never share it with anyone.
            </p>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
