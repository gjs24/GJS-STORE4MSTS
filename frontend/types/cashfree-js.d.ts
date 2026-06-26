declare module "@cashfreepayments/cashfree-js" {
  type CashfreeMode = "sandbox" | "production";

  type CashfreeCheckoutResult = {
    error?: {
      message?: string;
    };
    paymentDetails?: unknown;
  };

  type CashfreeClient = {
    checkout: (options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_modal";
    }) => Promise<CashfreeCheckoutResult>;
  };

  export function load(options: { mode: CashfreeMode }): Promise<CashfreeClient>;
}
