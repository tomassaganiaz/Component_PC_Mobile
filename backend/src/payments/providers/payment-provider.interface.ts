export interface PaymentResult {
  externalId: string;
  clientSecret: string;
  status: string;
}

/**
 * Contrato de un proveedor de pagos. La implementación por defecto es "mock";
 * integrar Stripe/MercadoPago implica crear otro provider y cambiar el binding
 * de PAYMENT_PROVIDER (ver payments.module.ts).
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(
    amount: number,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentResult>;
  refund(externalId: string): Promise<void>;
}

export const PAYMENT_PROVIDER = "PAYMENT_PROVIDER";
