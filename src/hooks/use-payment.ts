import { useCallback, useMemo, useState } from "react";

export type EquipmentPaymentPayload = {
  fullName: string;
  branch: string;
  department: string;
  equipmentName: string;
  onlineStoreLink: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  dateNeeded: string;     // yyyy-mm-dd
  details?: string;
  price: number | null;   // angka murni (Rp)
};

type UsePaymentOptions = {
  endpoint?: string;     // default: "payments"
  baseURL?: string;      // override base url
  token?: string;        // override token
};

type UsePaymentReturn<TResponse = unknown, TPayload = EquipmentPaymentPayload> = {
  isPosting: boolean;
  error: string | null;
  data: TResponse | null;
  createPayment: (payload: TPayload) => Promise<TResponse>;
  reset: () => void;
};

export function usePayment<TResponse = unknown, TPayload = EquipmentPaymentPayload>(options?: UsePaymentOptions): UsePaymentReturn<TResponse, TPayload> {
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TResponse | null>(null);

  const BASE = options?.baseURL ?? process.env.NEXT_PUBLIC_PAYMENT_API_URL ?? "";
  const TOKEN = options?.token ?? process.env.NEXT_PUBLIC_PAYMENT_BARRIER_TOKEN ?? "";

  const url = useMemo(() => {
    const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
    const ep = (options?.endpoint ?? "request-payment").replace(/^\/+/, "");
    return `${base}/${ep}`;
  }, [BASE, options?.endpoint]);

  const createPayment = useCallback(async (payload: TPayload) => {
    if (!BASE || !TOKEN) {
      const msg = "Missing PAYMENT API configuration.";
      setError(msg);
      throw new Error(msg);
    }

    setIsPosting(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");
      if (!res.ok) {
        let message = `Failed to create payment request (${res.status})`;
        if (text) {
          try {
            const j = JSON.parse(text);
            message = j.message || j.error || message;
          } catch {
            message = `${message}: ${text}`;
          }
        }
        setError(message);
        throw new Error(message);
      }

      const json = text ? (JSON.parse(text) as TResponse) : ({} as TResponse);
      setData(json);
      return json;
    } finally {
      setIsPosting(false);
    }
  }, [url, BASE, TOKEN]);

  const reset = useCallback(() => {
    setIsPosting(false);
    setError(null);
    setData(null);
  }, []);

  return { isPosting, error, data, createPayment, reset };
}
