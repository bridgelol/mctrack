import type { Platform, BedrockDevice } from '../constants/platform.js';

export interface Payment {
  networkId: string;
  paymentUuid: string;
  merchantPaymentId: string;
  playerName: string;
  playerUuid: string | null;
  platform: Platform;
  bedrockDevice: BedrockDevice | null;
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

export interface NormalizedPayment {
  merchantPaymentId: string;
  playerName: string;
  playerUuid: string | null;
  amount: number;
  currency: string;
  timestamp: Date;
  products: PaymentProduct[];
}
