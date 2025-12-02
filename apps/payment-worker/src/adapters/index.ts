import { PaymentProviderAdapter } from '../types/provider.js';
import { TebexAdapter } from './tebex.js';
import { PayNowAdapter } from './paynow.js';

export function getAdapter(provider: string): PaymentProviderAdapter {
  switch (provider) {
    case 'tebex':
      return new TebexAdapter();
    case 'paynow':
      return new PayNowAdapter();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}

export { TebexAdapter, PayNowAdapter };
