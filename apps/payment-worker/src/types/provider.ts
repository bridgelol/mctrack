export interface NormalizedPayment {
  merchantPaymentId: string;
  playerName: string;
  playerUuid: string | null;
  platform: 'java' | 'bedrock';
  bedrockDevice: string | null;
  country: string;
  amount: number;
  currency: string;
  timestamp: Date;
  products: PaymentProduct[];
}

export interface PaymentProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface TransactionPage {
  transactions: NormalizedPayment[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  secretKey?: string;
}

export interface PaymentProviderAdapter {
  name: string;
  authenticate(credentials: ProviderCredentials): Promise<void>;
  fetchTransactions(since?: Date, cursor?: string): Promise<TransactionPage>;
}
