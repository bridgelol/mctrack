import { PaymentProviderAdapter, ProviderCredentials, TransactionPage, NormalizedPayment, PaymentProduct } from '../types/provider.js';
import { logger } from '../lib/logger.js';

interface TebexPayment {
  txn_id: string;
  date: string;
  player: {
    id: string;
    name: string;
    uuid: string;
  };
  price: number;
  currency: string;
  status: number;
  packages: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface TebexResponse {
  data: TebexPayment[];
  links?: {
    next?: string;
  };
}

export class TebexAdapter implements PaymentProviderAdapter {
  name = 'tebex';
  private secretKey: string = '';
  private baseUrl = 'https://plugin.tebex.io';

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    if (!credentials.secretKey) {
      throw new Error('Tebex secret key is required');
    }
    this.secretKey = credentials.secretKey;

    // Verify the key works
    const response = await fetch(`${this.baseUrl}/information`, {
      headers: { 'X-Tebex-Secret': this.secretKey },
    });

    if (!response.ok) {
      throw new Error('Invalid Tebex secret key');
    }
  }

  async fetchTransactions(since?: Date, cursor?: string): Promise<TransactionPage> {
    let url = cursor || `${this.baseUrl}/payments?paged=1`;

    if (!cursor && since) {
      // Tebex uses page-based pagination, we'll filter by date client-side
      url = `${this.baseUrl}/payments?paged=1`;
    }

    const response = await fetch(url, {
      headers: { 'X-Tebex-Secret': this.secretKey },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'Tebex API error');
      throw new Error(`Tebex API error: ${response.status}`);
    }

    const data = await response.json() as TebexResponse;

    const transactions: NormalizedPayment[] = data.data
      .filter((payment) => payment.status === 1) // Only completed payments
      .filter((payment) => !since || new Date(payment.date) > since)
      .map((payment) => this.normalizePayment(payment));

    // Check if we've hit payments older than our since date
    const oldestPayment = data.data[data.data.length - 1];
    const hasReachedSince = since && oldestPayment && new Date(oldestPayment.date) < since;

    return {
      transactions,
      nextCursor: data.links?.next && !hasReachedSince ? data.links.next : undefined,
      hasMore: !!data.links?.next && !hasReachedSince,
    };
  }

  private normalizePayment(payment: TebexPayment): NormalizedPayment {
    // Detect platform from UUID format (Bedrock UUIDs start with 00000000-0000-0000)
    const isBedrock = payment.player.uuid?.startsWith('00000000-0000-0000');

    const products: PaymentProduct[] = payment.packages.map((pkg) => ({
      id: pkg.id.toString(),
      name: pkg.name,
      quantity: pkg.quantity,
      price: pkg.price,
    }));

    return {
      merchantPaymentId: payment.txn_id,
      playerName: payment.player.name,
      playerUuid: payment.player.uuid || null,
      platform: isBedrock ? 'bedrock' : 'java',
      bedrockDevice: null, // Tebex doesn't provide device info
      country: 'XX', // Tebex doesn't provide country in basic API
      amount: payment.price,
      currency: payment.currency,
      timestamp: new Date(payment.date),
      products,
    };
  }
}
