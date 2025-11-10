/**
 * X402 Protocol Utilities for Solana USDC Micropayments
 * Handles payment requirements, verification, and settlement
 */

// Type definitions for X402 protocol
interface PaymentRequirements {
  scheme: 'exact';
  network: 'solana' | 'solana-devnet';
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: {
    feePayer?: string;
  };
}

export interface PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: 'solana' | 'solana-devnet';
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

export interface VerificationResult {
  isValid: boolean;
  error?: string;
  invalidReason?: string | null;
  payer?: string;
}

export interface SettlementResult {
  success: boolean;
  transaction?: string;
  amount?: string;
  error?: string;
  networkId?: string;
}

interface FacilitatorVerifyResponse {
  isValid?: boolean;
  error?: string;
  invalidReason?: string | null;
  payer?: string;
}

interface FacilitatorSettleResponse {
  success?: boolean;
  error?: string;
  transaction?: string;
  amount?: string;
  networkId?: string;
}

// USDC Mint Addresses for Solana
export const USDC_MINT_ADDRESSES = {
  'solana-devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  'solana': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
} as const;

export type SolanaNetwork = keyof typeof USDC_MINT_ADDRESSES;

// AI Model Pricing Configuration
const FALLBACK_PRICING = {
  gpt5: { base: '100000', vision: '150000' },      // $0.10 base, $0.15 with vision
  claude: { base: '200000', vision: '250000' },     // $0.20 base, $0.25 with vision
  deepseek: { base: '30000', vision: '30000' },     // $0.03 base and vision
} as const;

const getPrice = (envKey: string, fallback: string): string => {
  const value = process.env[envKey];
  return value && /^\d+$/.test(value) ? value : fallback;
};

export const AI_MODEL_PRICING = {
  'gpt-5': {
    name: 'GPT-5',
    provider: 'OpenAI',
    pricePerMessage: getPrice('PRICE_GPT', FALLBACK_PRICING.gpt5.base),
    visionPrice: getPrice('PRICE_VISION_ADDON', FALLBACK_PRICING.gpt5.vision),
  },
  'claude-sonnet-4-5': {
    name: 'Claude 4.5 Sonnet',
    provider: 'Anthropic',
    pricePerMessage: getPrice('PRICE_CLAUDE', FALLBACK_PRICING.claude.base),
    visionPrice: getPrice('PRICE_VISION_ADDON', FALLBACK_PRICING.claude.vision),
  },
  'deepseek': {
    name: 'Deepseek Chat',
    provider: 'Deepseek',
    pricePerMessage: getPrice('PRICE_DEEPSEEK', FALLBACK_PRICING.deepseek.base),
    visionPrice: getPrice('PRICE_DEEPSEEK_VISION', FALLBACK_PRICING.deepseek.vision),
  },
} as const;

export type AIModel = keyof typeof AI_MODEL_PRICING;

function decodeBase64(value: string): string {
  if (typeof atob === 'function') {
    return atob(value);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  throw new Error('Base64 decoding is not supported in the current runtime.');
}

export function parsePaymentHeader(paymentHeader: string): PaymentPayload {
  const decoded = decodeBase64(paymentHeader);
  return JSON.parse(decoded) as PaymentPayload;
}

// Environment Configuration
export function getX402Config() {
  const networkEnv =
    process.env.NEXT_PUBLIC_NETWORK ||
    process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
    '';
  const network: SolanaNetwork =
    networkEnv === 'solana' || networkEnv === 'solana-devnet'
      ? (networkEnv as SolanaNetwork)
      : 'solana-devnet';
  const treasuryWallet = process.env.TREASURY_WALLET_ADDRESS;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const facilitatorUrl =
    process.env.X402_FACILITATOR_URL ||
    process.env.FACILITATOR_URL ||
    'https://facilitator.payai.network';
  const facilitatorFeePayer =
    process.env.X402_FACILITATOR_FEE_PAYER ||
    process.env.NEXT_PUBLIC_X402_FEE_PAYER ||
    process.env.FACILITATOR_FEE_PAYER ||
    null;
  const isProduction = process.env.NODE_ENV === 'production';
  const resolvedTreasury = treasuryWallet || '11111111111111111111111111111111';

  if (!treasuryWallet) {
    const message = 'TREASURY_WALLET_ADDRESS environment variable is required';
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`${message}. Using placeholder address for development.`);
  }

  if (!facilitatorFeePayer) {
    const feePayerMessage =
      'X402_FACILITATOR_FEE_PAYER environment variable is not set. Falling back to the treasury wallet address.';
    if (isProduction) {
      console.warn(feePayerMessage);
    } else {
      console.info(feePayerMessage);
    }
  }

  return {
    network,
    treasuryWallet: resolvedTreasury,
    baseUrl,
    facilitatorUrl,
    facilitatorFeePayer: facilitatorFeePayer || resolvedTreasury,
    usdcMint: USDC_MINT_ADDRESSES[network],
  };
}

// Utility Functions
export function usdToMicroUsdc(usd: number): string {
  return (usd * 1_000_000).toString();
}

export function microUsdcToUsd(microUsdc: string | number): number {
  return Number(microUsdc) / 1_000_000;
}

export function getModelPrice(model: AIModel, hasVision: boolean = false): string {
  const modelConfig = AI_MODEL_PRICING[model];
  if (!modelConfig) {
    console.error(`Unknown model: ${model}. Available models:`, Object.keys(AI_MODEL_PRICING));
    throw new Error(`Unknown AI model: ${model}`);
  }
  return hasVision ? modelConfig.visionPrice : modelConfig.pricePerMessage;
}

// Create Payment Requirements for AI Chat
export function createChatPaymentRequirements(
  model: AIModel,
  hasVision: boolean = false,
  endpoint: string = '/api/chat'
): PaymentRequirements {
  const config = getX402Config();
  const price = getModelPrice(model, hasVision);
  const modelConfig = AI_MODEL_PRICING[model];

  const requirements: PaymentRequirements = {
    scheme: 'exact',
    network: config.network,
    maxAmountRequired: price,
    resource: `${config.baseUrl}${endpoint}`,
    description: `AI Chat - ${modelConfig.name} ${hasVision ? '(Vision)' : ''}`,
    mimeType: 'application/json',
    payTo: config.treasuryWallet,
    maxTimeoutSeconds: 300,
    asset: config.usdcMint,
  };

  requirements.extra = {
    feePayer: config.facilitatorFeePayer,
  };

  return requirements;
}

// Facilitator API calls
async function callFacilitator<TRequest, TResponse>(
  endpoint: string,
  payload: TRequest,
  facilitatorUrl: string
): Promise<TResponse> {
  try {
    const response = await fetch(`${facilitatorUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Facilitator API error: ${response.status}`);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    console.error('Facilitator API call failed:', error);
    throw error instanceof Error ? error : new Error('Unknown facilitator error');
  }
}

// X402 Payment Handler Class
export class X402PaymentHandler {
  private config: ReturnType<typeof getX402Config>;

  constructor() {
    this.config = getX402Config();
  }

  // Extract payment header from request
  extractPaymentHeader(headers: Headers | Record<string, string>): string | null {
    if (headers instanceof Headers) {
      return headers.get('X-PAYMENT');
    }
    return headers['X-PAYMENT'] || headers['x-payment'] || null;
  }

  // Create 402 Payment Required Response
  async create402Response(
    model: AIModel,
    hasVision: boolean = false,
    endpoint: string = '/api/chat',
    error?: string
  ): Promise<Response> {
    const requirements = await createChatPaymentRequirements(model, hasVision, endpoint);
    
    const responseBody = {
      x402Version: 1,
      error: error || 'Payment required',
      accepts: [requirements],
    };

    return new Response(JSON.stringify(responseBody), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT',
        'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
      },
    });
  }

  // Verify payment
  async verifyPayment(
    paymentHeader: string,
    model: AIModel,
    hasVision: boolean = false,
    endpoint: string = '/api/chat'
  ): Promise<VerificationResult> {
    try {
      const requirements = createChatPaymentRequirements(model, hasVision, endpoint);
      
      // Parse payment header
  const payment: PaymentPayload = JSON.parse(decodeBase64(paymentHeader));
      
      // Call facilitator to verify payment
      const result = await callFacilitator<
        { paymentPayload: PaymentPayload; paymentRequirements: PaymentRequirements },
        FacilitatorVerifyResponse
      >('/verify', {
        paymentPayload: payment,
        paymentRequirements: requirements,
      }, this.config.facilitatorUrl);

      return {
        isValid: Boolean(result.isValid),
        error: result.error,
        invalidReason: result.invalidReason,
        payer: result.payer,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        isValid: false,
        error: 'Payment verification failed',
      };
    }
  }

  // Settle payment
  async settlePayment(
    paymentHeader: string,
    model: AIModel,
    hasVision: boolean = false,
    endpoint: string = '/api/chat'
  ): Promise<SettlementResult> {
    try {
      const requirements = createChatPaymentRequirements(model, hasVision, endpoint);
      
      // Parse payment header
  const payment: PaymentPayload = JSON.parse(decodeBase64(paymentHeader));
      
      // Call facilitator to settle payment
      const result = await callFacilitator<
        { paymentPayload: PaymentPayload; paymentRequirements: PaymentRequirements },
        FacilitatorSettleResponse
      >('/settle', {
        paymentPayload: payment,
        paymentRequirements: requirements,
      }, this.config.facilitatorUrl);

      return {
        success: Boolean(result.success),
        transaction: result.transaction,
        amount: result.amount,
        error: result.error,
        networkId: result.networkId,
      };
    } catch (error) {
      console.error('Payment settlement error:', error);
      return {
        success: false,
        error: 'Payment settlement failed',
      };
    }
  }

  // Complete payment flow for API routes
  async handlePaymentFlow(
    request: Request,
    model: AIModel,
    hasVision: boolean = false,
    endpoint: string = '/api/chat'
  ): Promise<{ 
    success: boolean; 
    response?: Response; 
    settlementResult?: SettlementResult;
    paymentAmount?: string;
  }> {
    const paymentHeader = this.extractPaymentHeader(request.headers);

    // No payment header - return 402
    if (!paymentHeader) {
      const response = await this.create402Response(model, hasVision, endpoint);
      return { success: false, response };
    }

    // Verify payment
    const verification = await this.verifyPayment(paymentHeader, model, hasVision, endpoint);
    if (!verification.isValid) {
      const response = await this.create402Response(
        model, 
        hasVision, 
        endpoint, 
        `Payment verification failed: ${verification.error}`
      );
      return { success: false, response };
    }

    // Settle payment
    const settlement = await this.settlePayment(paymentHeader, model, hasVision, endpoint);
    if (!settlement.success) {
      const response = await this.create402Response(
        model, 
        hasVision, 
        endpoint, 
        `Payment settlement failed: ${settlement.error}`
      );
      return { success: false, response };
    }

    return { 
      success: true, 
      settlementResult: settlement,
      paymentAmount: getModelPrice(model, hasVision),
    };
  }

  // Add payment response headers to a successful response
  addPaymentResponseHeaders(
    response: Response,
    settlement: SettlementResult
  ): Response {
    if (settlement.success && settlement.transaction) {
      const newHeaders = new Headers(response.headers);
      
      // Add X-PAYMENT-RESPONSE header with settlement details
      const paymentResponse = {
        success: true,
        transaction: settlement.transaction,
        network: this.config.network,
        amount: settlement.amount || '0',
        timestamp: new Date().toISOString(),
      };

      newHeaders.set(
        'X-PAYMENT-RESPONSE',
        btoa(JSON.stringify(paymentResponse))
      );
      newHeaders.set('Access-Control-Expose-Headers', 'X-PAYMENT-RESPONSE');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  }
}

let handlerSingleton: X402PaymentHandler | null = null;

export function getX402Handler(): X402PaymentHandler {
  if (!handlerSingleton) {
    handlerSingleton = new X402PaymentHandler();
  }
  return handlerSingleton;
}

// Middleware function for Next.js API routes
export function withX402Payment(
  handler: (req: Request, context?: Record<string, unknown> | undefined) => Promise<Response>,
  defaultModel: AIModel = 'deepseek',
  hasVision: boolean = false,
  endpoint?: string
) {
  return async (req: Request, context?: unknown): Promise<Response> => {
    try {
      // Handle preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT',
            'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
          },
        });
      }

      // Try to read model from request body
      let model = defaultModel;
      try {
        const clonedReq = req.clone();
        const body = await clonedReq.json();
        if (body.model && typeof body.model === 'string') {
          model = body.model as AIModel;
        }
      } catch {
        // If body parsing fails, use default model
      }

      // Process payment
      const paymentResult = await getX402Handler().handlePaymentFlow(
        req,
        model,
        hasVision,
        endpoint
      );

      // If payment failed, return 402 response
      if (!paymentResult.success) {
        return paymentResult.response!;
      }

      const paymentContext = {
        settlementResult: paymentResult.settlementResult,
        paymentAmount: paymentResult.paymentAmount,
      } satisfies X402PaymentContext;

      const handlerContext =
        context && typeof context === 'object'
          ? { ...(context as Record<string, unknown>), x402Payment: paymentContext }
          : { x402Payment: paymentContext };

      // Payment successful - process the actual request
      const response = await handler(req, handlerContext);

      // Add payment response headers
      if (paymentResult.settlementResult) {
        return getX402Handler().addPaymentResponseHeaders(response, paymentResult.settlementResult);
      }

      return response;
    } catch (error) {
      console.error('X402 middleware error:', error);
      return new Response(
        JSON.stringify({ error: 'Payment processing error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

const X402Utils = {
  X402PaymentHandler,
  getX402Handler,
  withX402Payment,
  createChatPaymentRequirements,
  getX402Config,
  AI_MODEL_PRICING,
  USDC_MINT_ADDRESSES,
  usdToMicroUsdc,
  microUsdcToUsd,
  getModelPrice,
  parsePaymentHeader,
};

export default X402Utils;

export interface X402PaymentContext {
  settlementResult?: SettlementResult;
  paymentAmount?: string;
}
