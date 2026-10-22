import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PaymentProvider, PaymentResult } from "./payment-provider.interface";

/**
 * Proveedor de pagos simulado. Genera identificadores locales y no realiza
 * llamadas externas. Sirve como base para el desarrollo y las demos.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(
    amount: number,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentResult> {
    void amount;
    void metadata;
    const id = randomUUID();
    return {
      externalId: `mock_${id}`,
      clientSecret: `mock_secret_${id}`,
      status: "pending",
    };
  }

  async refund(externalId: string): Promise<void> {
    void externalId;
  }
}
