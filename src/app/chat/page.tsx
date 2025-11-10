"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  createX402Client,
  type WalletAdapter as X402WalletAdapter,
  type X402Client,
} from "x402-solana/client";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Plus,
  Menu,
  X,
  Trash2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Pencil,
  Paperclip,
  FileText,
  Eye,
} from "lucide-react";
import Image from "next/image";
import { getModelPrice, microUsdcToUsd, type AIModel, USDC_MINT_ADDRESSES } from "@/lib/x402";
import { ModelSelector } from "@/components/ui/model-selector";
import { 
  type AIModel as AppAIModel, 
  AI_MODEL_PRICING, 
  AI_MODEL_NAMES 
} from "@/lib/ai-providers";

type SolanaNetwork = "solana" | "solana-devnet";

const DEFAULT_AI_MODEL: AppAIModel = "deepseek";
const MODEL_ID: AIModel = "deepseek";
const SOLANA_NETWORK: SolanaNetwork =
  process.env.NEXT_PUBLIC_NETWORK === "solana" ? "solana" : "solana-devnet";
const DEFAULT_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  (SOLANA_NETWORK === "solana"
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ?? clusterApiUrl("mainnet-beta")
    : process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ?? clusterApiUrl("devnet"));
const USDC_MINT_ADDRESS = USDC_MINT_ADDRESSES[SOLANA_NETWORK];

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;

interface ChatSummary {
  id: string;
  title: string;
  aiModel: string;
  totalMessages: number;
  totalCostUsdc: number;
  lastMessageAt: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  costUsdc?: number | null;
  aiModel?: string | null;
  files?: ChatAttachment[];
}

interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  mimeType: string | null;
}

interface PendingAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface ChatResponsePayload {
  message: string;
  model: AIModel;
  chatId: string;
  tokenUsage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  timestamp: string;
}

function truncate(address: string) {
  return address.length > 8
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : address;
}

function formatRelativeTime(iso: string | null) {
  if (!iso) return "Never";
  const deltaMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(deltaMs / 1_000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatUsdcFromMicro(microAmount: bigint): string {
  const asNumber = Number(microAmount) / 1_000_000;
  return asNumber.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MessageAttachmentPreview({
  file,
  isOwn,
}: {
  file: ChatAttachment;
  isOwn: boolean;
}) {
  const isImage = (file.mimeType ?? file.type ?? "").startsWith("image/");

  if (isImage) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border/40",
          isOwn ? "bg-white/10" : "bg-background/90"
        )}
      >
        <img
          src={file.url}
          alt={file.name}
          className="h-32 w-32 object-cover"
        />
      </div>
    );
  }

  return (
    <a
      href={file.url}
      download={file.name}
  className="flex min-w-48 items-center gap-2 rounded-xl border border-border/40 bg-background/80 px-3 py-2 text-xs text-foreground transition hover:bg-background"
    >
      <FileText className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col truncate">
        <span className="truncate font-medium">{file.name}</span>
        <span className="text-[0.65rem] text-muted-foreground">{formatBytes(file.size)}</span>
      </div>
    </a>
  );
}

export default function ChatInterface() {
  const router = useRouter();
  const { publicKey, connected, connecting, wallet } = useWallet();
  const walletAdapter = wallet?.adapter as X402WalletAdapter | undefined;
  const walletAddress = useMemo(
    () => publicKey?.toBase58() ?? null,
    [publicKey]
  );
  const [isMounted, setIsMounted] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceErrorMessage, setBalanceErrorMessage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AppAIModel>(DEFAULT_AI_MODEL);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const x402ClientRef = useRef<X402Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const networkLabel = SOLANA_NETWORK === "solana" ? "Solana mainnet" : "Solana devnet";

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  // Calculate pricing based on selected model
  const MODEL_PRICE_USD = useMemo(() => AI_MODEL_PRICING[selectedModel], [selectedModel]);
  const MODEL_PRICE_MICRO = useMemo(() => String(MODEL_PRICE_USD * 1_000_000), [MODEL_PRICE_USD]);
  const MODEL_PRICE_MICRO_BIGINT = useMemo(() => BigInt(MODEL_PRICE_MICRO), [MODEL_PRICE_MICRO]);

  useEffect(() => {
    if (!connecting && !connected) {
      router.replace("/connect");
    }
  }, [connected, connecting, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (walletAdapter && connected) {
      try {
        x402ClientRef.current = createX402Client({
          wallet: walletAdapter,
          network: SOLANA_NETWORK,
          rpcUrl: DEFAULT_RPC_URL,
          maxPaymentAmount: MODEL_PRICE_MICRO_BIGINT,
        });
      } catch (clientError) {
        console.error("Failed to init x402 client", clientError);
        setError("Unable to prepare payment client. Reconnect your wallet.");
        x402ClientRef.current = null;
      }
    } else {
      x402ClientRef.current = null;
    }
  }, [walletAdapter, connected, MODEL_PRICE_MICRO_BIGINT]);

  const fetchChats = useCallback(
    async (addr: string) => {
      setLoadingChats(true);
      try {
        const res = await fetch(
          `/api/chats?walletAddress=${encodeURIComponent(addr)}`,
          { cache: "no-store" }
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error ?? "Failed to load chats");
        }
        const chatList = (payload?.chats ?? []) as ChatSummary[];
        setChats(chatList);
        setActiveChatId((current) => {
          if (current && chatList.some((chat) => chat.id === current)) {
            return current;
          }
          return chatList[0]?.id ?? null;
        });
        if (!chatList.length) {
          setMessages([]);
        }
        return chatList;
      } catch (fetchError) {
        console.error("Chat list fetch failed", fetchError);
        setChats([]);
        setActiveChatId(null);
        setMessages([]);
        setError(
          fetchError instanceof Error ? fetchError.message : "Unable to load chats"
        );
        return [];
      } finally {
        setLoadingChats(false);
      }
    },
    []
  );

  const fetchMessages = useCallback(
    async (chatId: string, addr: string) => {
      setLoadingMessages(true);
      try {
        const res = await fetch(
          `/api/chats/${chatId}/messages?walletAddress=${encodeURIComponent(addr)}`,
          { cache: "no-store" }
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error ?? "Failed to load messages");
        }
        const messageList = (payload?.messages ?? []).map((item: ChatMessage) => ({
          ...item,
          files: Array.isArray(item?.files) ? item.files : [],
        })) as ChatMessage[];
        setMessages(messageList);
        return messageList;
      } catch (fetchError) {
        console.error("Message fetch failed", fetchError);
        setMessages([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load messages"
        );
        return [];
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    if (walletAddress && connected) {
      fetchChats(walletAddress);
    }
  }, [walletAddress, connected, fetchChats]);

  useEffect(() => {
    if (walletAddress && activeChatId) {
      fetchMessages(activeChatId, walletAddress);
    } else {
      setMessages([]);
    }
  }, [walletAddress, activeChatId, fetchMessages]);

  // Removed auto-scroll on every message change - only scroll when user sends message

  useEffect(() => {
    setEditingSaving(false);
    if (editingChatId === null) {
      setEditingDraft("");
    }
  }, [editingChatId]);

  useEffect(() => {
    if (!editingChatId) return;
    const exists = chats.some((chat) => chat.id === editingChatId);
    if (!exists) {
      setEditingChatId(null);
      setEditingDraft("");
    }
  }, [editingChatId, chats]);

  const handleCreateChat = async () => {
    if (!walletAddress) {
      router.push("/connect");
      return;
    }
    setError(null);
    setCreatingChat(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "Unable to create chat");
      }
      const newChatId = payload?.chat?.id ?? payload?.chatId ?? null;
      const list = await fetchChats(walletAddress);
      const targetId = newChatId ?? list[0]?.id ?? null;
      if (targetId) {
        setActiveChatId(targetId);
        await fetchMessages(targetId, walletAddress);
      }
    } catch (createError) {
      console.error("Create chat failed", createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create chat"
      );
    } finally {
      setCreatingChat(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!walletAddress) {
      router.push("/connect");
      return;
    }
    setError(null);
    setDeletingChatId(chatId);
    try {
      const res = await fetch(
        `/api/chats/${chatId}?walletAddress=${encodeURIComponent(walletAddress)}`,
        { method: "DELETE" }
      );
      let payload: unknown = null;
      if (res.status !== 204) {
        payload = await res.json().catch(() => ({}));
      }
      if (!res.ok && res.status !== 204) {
        throw new Error((payload as { error?: string })?.error ?? "Unable to delete chat");
      }
      await fetchChats(walletAddress);
    } catch (deleteError) {
      console.error("Delete chat failed", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete chat"
      );
    } finally {
      setDeletingChatId(null);
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result ?? "") as string);
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });

  const processIncomingFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const filesArray = Array.from(fileList ?? []);
      if (!filesArray.length) return;

      const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
      if (availableSlots <= 0) {
        setError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
        return;
      }

      const selectedFiles = filesArray.slice(0, availableSlots);
      if (filesArray.length > availableSlots) {
        setError(`Only the first ${availableSlots} files were attached. Limit is ${MAX_ATTACHMENTS}.`);
      }

      const newAttachments: PendingAttachment[] = [];

      for (const file of selectedFiles) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setError(`"${file.name}" exceeds the ${(MAX_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(0)}MB limit.`);
          continue;
        }

        try {
          const dataUrl = await readFileAsDataUrl(file);
          newAttachments.push({
            id:
              typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            dataUrl,
          });
        } catch (readError) {
          console.error("Attachment read failed", readError);
          setError(`Unable to read file ${file.name}`);
        }
      }

      if (newAttachments.length) {
        setAttachments((prev) => {
          const remainingSlots = Math.max(0, MAX_ATTACHMENTS - prev.length);
          if (!remainingSlots) {
            return prev;
          }
          const nextBatch = newAttachments.slice(0, remainingSlots);
          return [...prev, ...nextBatch];
        });
      }
    },
    [attachments.length]
  );

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      await processIncomingFiles(event.target.files);
      event.target.value = "";
    },
    [processIncomingFiles]
  );

  const handleAttachmentRemove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const handleAttachmentDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement | HTMLTextAreaElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer?.files?.length) {
        await processIncomingFiles(event.dataTransfer.files);
      }
    },
    [processIncomingFiles]
  );

  const handleAttachmentDragOver = useCallback((event: React.DragEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!event.clipboardData?.files?.length) return;
      await processIncomingFiles(event.clipboardData.files);
    },
    [processIncomingFiles]
  );

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const refreshUsdcBalance = useCallback(
    async (address: string) => {
      setCheckingBalance(true);
      setBalanceErrorMessage(null);
      try {
        const connection = new Connection(DEFAULT_RPC_URL, "confirmed");
        const owner = new PublicKey(address);
        const mint = new PublicKey(USDC_MINT_ADDRESS);
        const parsedAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
          mint,
        });
        const rawAmount =
          parsedAccounts.value?.[0]?.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0";
        setUsdcBalance(BigInt(rawAmount));
      } catch (balanceError) {
        console.error("USDC balance lookup failed", balanceError);
        setBalanceErrorMessage("Unable to verify USDC balance.");
        setUsdcBalance(null);
      } finally {
        setCheckingBalance(false);
      }
    },
    [DEFAULT_RPC_URL, USDC_MINT_ADDRESS]
  );

  const handleRenameSubmit = useCallback(async () => {
    if (!walletAddress) {
      router.push("/connect");
      return;
    }
    if (!editingChatId) {
      return;
    }

    const trimmed = editingDraft.trim();
    if (!trimmed) {
      setError("Chat title cannot be empty.");
      return;
    }

    const currentChat = chats.find((chat) => chat.id === editingChatId);
    if (currentChat && trimmed === currentChat.title) {
      setEditingChatId(null);
      return;
    }

    setEditingSaving(true);
    try {
      const response = await fetch(`/api/chats/${editingChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, title: trimmed }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as { error?: string })?.error ?? "Unable to rename chat");
      }

      setChats((prev) =>
        prev.map((chat) => (chat.id === editingChatId ? { ...chat, title: trimmed } : chat))
      );
      setEditingDraft(trimmed);
      setEditingChatId(null);
    } catch (renameError) {
      console.error("Rename chat failed", renameError);
      setError(
        renameError instanceof Error
          ? renameError.message
          : "Unable to rename chat"
      );
    } finally {
      setEditingSaving(false);
    }
  }, [walletAddress, editingChatId, editingDraft, chats, router]);

  const handleRenameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleRenameSubmit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingChatId(null);
        setEditingDraft("");
      }
    },
    [handleRenameSubmit]
  );

  const handleRenameStart = useCallback((chat: ChatSummary) => {
    setError(null);
    setEditingSaving(false);
    setEditingChatId(chat.id);
    setEditingDraft(chat.title);
  }, []);

  const handleRenameCancel = useCallback(() => {
    setEditingChatId(null);
    setEditingDraft("");
  }, []);

  useEffect(() => {
    if (walletAddress && connected) {
      void refreshUsdcBalance(walletAddress);
    } else {
      setUsdcBalance(null);
      setBalanceErrorMessage(null);
    }
  }, [walletAddress, connected, refreshUsdcBalance]);

  const handleSendMessage = async () => {
    if (!walletAddress) {
      router.push("/connect");
      return;
    }
    const trimmed = inputMessage.trim();
    if ((trimmed.length === 0 && attachments.length === 0) || sending) return;
    if (!x402ClientRef.current) {
      setError("Payment client is not ready. Reconnect your wallet and try again.");
      return;
    }

    setError(null);
    const optimisticId = `temp-${Date.now()}`;
    const attachmentPayload = attachments.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: file.dataUrl,
      mimeType: file.type,
    }));
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
      files: attachmentPayload.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: file.url,
        mimeType: file.mimeType ?? null,
      })),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputMessage("");
    setSending(true);
    
    // Scroll to user's message after sending
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    }, 100);

    try {
      const response = await x402ClientRef.current.fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          walletAddress,
          chatId: activeChatId ?? undefined,
          model: selectedModel,
          files: attachmentPayload.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: file.url,
          })),
        }),
      });

      const isJson = response.headers
        .get("content-type")
        ?.includes("application/json");
      const payload = isJson ? await response.json() : null;
      
      if (!response.ok) {
        if (response.status === 402) {
          await refreshUsdcBalance(walletAddress);
          const friendlyError = `Insufficient USDC balance. Each message with ${AI_MODEL_NAMES[selectedModel]} costs $${MODEL_PRICE_USD.toFixed(
            2
          )} USDC.`;
          throw new Error(friendlyError);
        }
        // Handle message limit error
        if (response.status === 400 && payload?.error?.includes('лимита в 80')) {
          setError(payload.error);
          throw new Error(payload.error);
        }
        throw new Error(
          (payload as { error?: string })?.error ?? "Chat request failed"
        );
      }

      const data = payload as ChatResponsePayload | null;
      const resolvedChatId = data?.chatId ?? activeChatId;

      // Remove optimistic message before fetching real messages from DB
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));

      if (resolvedChatId) {
        setActiveChatId(resolvedChatId);
        await fetchChats(walletAddress);
        await fetchMessages(resolvedChatId, walletAddress);
      } else {
        await fetchChats(walletAddress);
      }
      await refreshUsdcBalance(walletAddress);
      setAttachments([]);
      
      // Set sending to false AFTER all async operations complete
      setSending(false);
    } catch (sendError) {
      console.error("[handleSendMessage] Error:", sendError);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Unable to complete chat request"
      );
      setSending(false);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setError(null);
  };

  const hasSufficientUsdc = usdcBalance === null || usdcBalance >= MODEL_PRICE_MICRO_BIGINT;
  const insufficientUsdc =
    !checkingBalance && usdcBalance !== null && usdcBalance < MODEL_PRICE_MICRO_BIGINT;
  const formattedUsdcBalance =
    usdcBalance !== null ? formatUsdcFromMicro(usdcBalance) : null;

  const canSend = Boolean(
    walletAddress &&
      !sending &&
      (inputMessage.trim().length > 0 || attachments.length > 0) &&
      (hasSufficientUsdc || checkingBalance)
  );

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden bg-background text-foreground">
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex w-80 flex-col border-r border-border/50 bg-background/95 backdrop-blur-xl"
          >
            <div className="border-b border-border/40 p-6">
              <div className="mb-6 flex items-center justify-between">
                <a href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                  <Image
                    src="/logox402chatly.png"
                    alt="X402Chatly logo"
                    width={32}
                    height={32}
                    className="h-8 w-8"
                    priority
                  />
                  <span className="text-lg font-bold bg-linear-to-r from-violet-500 to-blue-600 bg-clip-text text-transparent font-orbitron tracking-wider">
                    X402Chatly
                  </span>
                </a>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleCreateChat}
                disabled={creatingChat}
                className="w-full bg-linear-to-r from-violet-500 to-blue-600 text-white hover:from-violet-600 hover:to-blue-700"
              >
                {creatingChat ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                New Chat
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2 p-4">
                {loadingChats && (
                  <Card className="border-border/40 bg-background/60 p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading chats…
                    </div>
                  </Card>
                )}
                {!loadingChats && !chats.length && (
                  <Card className="border-dashed border-border/50 bg-background/60 p-6 text-center text-sm text-muted-foreground">
                    Create your first conversation to start chatting with AI using x402 micropayments.
                  </Card>
                )}
                {chats.map((chat) => {
                  const isActive = chat.id === activeChatId;
                  const isEditing = editingChatId === chat.id;
                  const isDeleting = deletingChatId === chat.id;
                  return (
                    <motion.div key={chat.id} whileHover={{ scale: 1.01 }}>
                      <Card
                        className={cn(
                          "group relative cursor-pointer border-border/40 bg-background/70 p-4 transition-colors",
                          isActive && "border-violet-500/40 bg-violet-500/5"
                        )}
                        onClick={() => {
                          if (!isEditing) {
                            handleSelectChat(chat.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            {isEditing ? (
                              <>
                                <input
                                  value={editingDraft}
                                  onChange={(event) => setEditingDraft(event.target.value)}
                                  onKeyDown={handleRenameKeyDown}
                                  disabled={editingSaving}
                                  autoFocus
                                  onClick={(event) => event.stopPropagation()}
                                  className="w-full rounded-md border border-border/50 bg-background/80 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                                  placeholder="Rename chat"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-linear-to-r from-violet-500 to-blue-600 text-white hover:from-violet-600 hover:to-blue-700"
                                    disabled={editingSaving}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleRenameSubmit();
                                    }}
                                  >
                                    {editingSaving ? (
                                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                    ) : null}
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={editingSaving}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRenameCancel();
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <h3 className="line-clamp-1 text-sm font-semibold">
                                  {chat.title}
                                </h3>
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {formatRelativeTime(chat.lastMessageAt)} · {chat.totalMessages} messages
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRenameStart(chat);
                              }}
                              disabled={editingSaving && isEditing}
                              title="Rename chat"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-mono text-green-500">
                            ${chat.totalCostUsdc.toFixed(2)}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border/40 p-4">
              <Card className="border-border/40 bg-background/70 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-600 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1 text-sm">
                    <p className="font-semibold text-foreground truncate">
                      {walletAddress ? truncate(walletAddress) : "No wallet"}
                    </p>
                    <p className="text-xs text-muted-foreground">{networkLabel}</p>
                    <p className="text-xs font-medium text-violet-400">
                      USDC: {balanceErrorMessage
                        ? "Unavailable"
                        : checkingBalance
                        ? "Checking…"
                        : formattedUsdcBalance ?? "0.00"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

  <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="border-b border-border/40 bg-background/95 backdrop-blur-xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {editingChatId && editingChatId === activeChatId ? (
                    <>
                      <input
                        value={editingDraft}
                        onChange={(event) => setEditingDraft(event.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        disabled={editingSaving}
                        autoFocus
                        onClick={(event) => event.stopPropagation()}
                        className="w-64 max-w-xs rounded-md border border-border/50 bg-background/80 px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                        placeholder="Rename chat"
                      />
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRenameSubmit();
                        }}
                        disabled={editingSaving}
                        className="bg-linear-to-r from-violet-500 to-blue-600 text-white hover:from-violet-600 hover:to-blue-700"
                      >
                        {editingSaving ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRenameCancel();
                        }}
                        disabled={editingSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <h1 className="text-lg font-semibold">
                        {activeChat?.title ?? "AI Chat"}
                      </h1>
                      {activeChat ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRenameStart(activeChat);
                          }}
                          title="Rename chat"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Settlement via x402 · {networkLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isMounted ? (
                <div className="wallet-header-glass">
                  <WalletMultiButton />
                </div>
              ) : (
                <Button
                  disabled
                  className="rounded-full border border-violet-500/30 bg-linear-to-r from-violet-500/10 to-blue-500/10 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-xl opacity-70"
                >
                  Connect Wallet
                </Button>
              )}
              <div className="scale-90">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-destructive/40 bg-destructive/10 px-6 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          {!activeChatId && !loadingChats ? (
            <Card className="mx-auto flex max-w-2xl flex-col items-center gap-4 border-border/40 bg-background/80 p-10 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 text-violet-400" />
              <p className="text-sm">
                Create a new conversation to begin. Choose your AI model and every reply is fetched in real-time, paid with Solana USDC.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {loadingMessages && (
                <Card className="border-border/40 bg-background/80 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing latest messages…
                  </div>
                </Card>
              )}
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-600 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className="max-w-2xl space-y-2">
                    <Card
                      className={cn(
                        "border border-border/40 p-4",
                        message.role === "user"
                          ? "bg-linear-to-r from-violet-500 to-blue-600 text-white"
                          : "bg-accent/30"
                      )}
                    >
                      {message.content ? (
                        <p
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: message.content
                              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                              .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                          }}
                        />
                      ) : null}
                      {message.files?.length ? (
                        <div className={cn("mt-3 flex flex-wrap gap-3", !message.content && "mt-0") }>
                          {message.files.map((file) => (
                            <MessageAttachmentPreview
                              key={file.id}
                              file={file}
                              isOwn={message.role === "user"}
                            />
                          ))}
                        </div>
                      ) : null}
                    </Card>
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2 text-xs text-muted-foreground",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {message.costUsdc ? (
                        <span>· ${message.costUsdc.toFixed(2)} USDC</span>
                      ) : null}
                      {message.aiModel ? (
                        <Badge variant="outline" className="border-transparent bg-violet-500/10 text-violet-200">
                          {message.aiModel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-600 text-white">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </motion.div>
              ))}
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 justify-start"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-blue-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <Card className="border border-border/40 bg-accent/30 p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                      <span>Answer is generating...</span>
                    </div>
                  </Card>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl p-4">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
            <div className="flex items-center gap-3">
              {/* Compact Model Selector - круглая кнопка с логотипом */}
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                disabled={sending}
                compact
              />
              
              <div
                className="relative flex-1"
                onDrop={handleAttachmentDrop}
                onDragOver={handleAttachmentDragOver}
              >
                <textarea
                  value={inputMessage}
                  onChange={(event) => setInputMessage(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onPaste={handlePaste}
                  onDrop={handleAttachmentDrop}
                  onDragOver={handleAttachmentDragOver}
                  disabled={!walletAddress || sending}
                  rows={2}
                  placeholder="Send a message or drop files…"
                  className="min-h-14 w-full resize-none rounded-2xl border border-border/50 bg-background/80 px-4 py-3 pr-12 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={triggerFilePicker}
                  className="absolute bottom-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!canSend}
                size="icon"
                className="h-14 w-14 shrink-0 rounded-full bg-linear-to-r from-violet-500 to-blue-600 text-white hover:from-violet-600 hover:to-blue-700"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            {attachments.length ? (
              <div className="flex flex-wrap gap-3">
                {attachments.map((file) => {
                  const isImage = file.type.startsWith("image/") && file.dataUrl.startsWith("data:image");
                  return (
                    <div
                      key={file.id}
                      className="relative flex w-40 flex-col gap-2 overflow-hidden rounded-xl border border-border/50 bg-background/80 p-3 text-xs shadow-sm"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-6 w-6 rounded-full bg-background/90"
                        onClick={() => handleAttachmentRemove(file.id)}
                        title="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted/30">
                        {isImage ? (
                          <img
                            src={file.dataUrl}
                            alt={file.name}
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <FileText className="h-6 w-6" />
                            <span className="text-[0.7rem]">{file.type || "File"}</span>
                          </div>
                        )}
                      </div>
                      <div className="truncate text-xs font-medium text-foreground" title={file.name}>
                        {file.name}
                      </div>
                      <span className="text-[0.7rem] text-muted-foreground">{formatBytes(file.size)}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {/* Vision support warning for Deepseek */}
            {attachments.some(f => f.type.startsWith('image/')) && selectedModel === 'deepseek' && (
              <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200 flex items-start gap-2">
                <Eye className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Deepseek doesn't support image analysis. Images will be stored but not analyzed. 
                  Switch to <strong>GPT-5</strong> or <strong>Claude 4.5 Sonnet</strong> for vision capabilities.
                </span>
              </div>
            )}
            {balanceErrorMessage ? (
              <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-200">
                {balanceErrorMessage}
              </div>
            ) : null}
            {insufficientUsdc ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                Not enough USDC to send a message with {AI_MODEL_NAMES[selectedModel]}. Each reply costs ${MODEL_PRICE_USD.toFixed(2)} USDC. Current balance: {formattedUsdcBalance ?? "0.00"} USDC.
              </div>
            ) : null}
            {checkingBalance && !balanceErrorMessage && !insufficientUsdc ? (
              <div className="text-xs text-muted-foreground">Checking USDC balance…</div>
            ) : null}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Paste, drag, or choose up to {MAX_ATTACHMENTS} files (≤ {formatBytes(MAX_ATTACHMENT_BYTES)} each)</span>
              <span>x402 micropayments</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
