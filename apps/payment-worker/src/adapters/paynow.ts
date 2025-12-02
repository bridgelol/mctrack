import { PaymentProviderAdapter, ProviderCredentials, TransactionPage, NormalizedPayment, PaymentProduct } from '../types/provider.js';
import { logger } from '../lib/logger.js';

interface PayNowPayment {
  id: string;
  created_at: string;
  customer: {
    username: string;
    uuid: string;
    country_code: string;
  };
  total: number;
  currency: string;
  status: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

interface PayNowResponse {
  data: PayNowPayment[];
  meta: {
    next_cursor?: string;
    has_more: boolean;
  };
}

export class PayNowAdapter implements PaymentProviderAdapter {
  name = 'paynow';
  private apiKey: string = '';
  private baseUrl = 'https://api.paynow.gg/v1';

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    if (!credentials.apiKey) {
      throw new Error('PayNow API key is required');
    }
    this.apiKey = credentials.apiKey;

    // Verify the key works
    const response = await fetch(`${this.baseUrl}/store`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error('Invalid PayNow API key');
    }
  }

  async fetchTransactions(since?: Date, cursor?: string): Promise<TransactionPage> {
    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    }
    if (since) {
      params.set('since', since.toISOString());
    }
    params.set('limit', '100');
    params.set('status', 'completed');

    const response = await fetch(`${this.baseUrl}/payments?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ status: response.status, error }, 'PayNow API error');
      throw new Error(`PayNow API error: ${response.status}`);
    }

    const data = await response.json() as PayNowResponse;

    const transactions: NormalizedPayment[] = data.data.map((payment) =>
      this.normalizePayment(payment)
    );

    return {
      transactions,
      nextCursor: data.meta.next_cursor,
      hasMore: data.meta.has_more,
    };
  }

  private normalizePayment(payment: PayNowPayment): NormalizedPayment {
    // Detect platform from UUID format
    const isBedrock = payment.customer.uuid?.startsWith('00000000-0000-0000');

    const products: PaymentProduct[] = payment.items.map((item) => ({
      id: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.unit_price,
    }));

    return {
      merchantPaymentId: payment.id,
      playerName: payment.customer.username,
      playerUuid: payment.customer.uuid || null,
      platform: isBedrock ? 'bedrock' : 'java',
      bedrockDevice: null,
      country: payment.customer.country_code || 'XX',
      amount: payment.total,
      currency: payment.currency,
      timestamp: new Date(payment.created_at),
      products,
    };
  }
}
