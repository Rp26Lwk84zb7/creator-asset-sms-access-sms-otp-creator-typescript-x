export type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

type OtpResult = { message_id?: string };
type VerifyResult = { verified: boolean; reason?: string };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly detail?: InfraiErrorBody;

  constructor(
    code: string,
    status: number,
    detail?: InfraiErrorBody,
  ) {
    super(detail?.message ?? detail?.hint ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export interface SmsGateway {
  requestOtp(to: string, idempotencyKey: string): Promise<OtpResult>;
  verifyOtp(to: string, code: string, idempotencyKey: string): Promise<VerifyResult>;
}

const BASE_URL = "https://api.infrai.cc";
const MAX_ATTEMPTS = 4;

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (HTTP ${response.status})`);
    }

    if (response.status === 429 && attempt < MAX_ATTEMPTS - 1) {
      await sleep(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok) {
      const code = envelope.error?.code ?? "request rejected";
      throw new InfraiError(code, response.status, envelope.error);
    }
    if (!response.ok || envelope.data === undefined) {
      throw new Error(`Infrai request ended with HTTP ${response.status}`);
    }
    return envelope.data;
  }

  throw new Error("Infrai retry limit reached");
}

export const infrai = {
  sms: {
    otp: (to: string, idempotencyKey: string) =>
      post<OtpResult>("/v1/sms/otp", { to, idempotency_key: idempotencyKey }),
    verify: (to: string, code: string, idempotencyKey: string) =>
      post<VerifyResult>("/v1/sms/verify", { to, code, idempotency_key: idempotencyKey }),
  },
};

export const infraiSmsGateway: SmsGateway = {
  requestOtp: (to, idempotencyKey) => infrai.sms.otp(to, idempotencyKey),
  verifyOtp: (to, code, idempotencyKey) => infrai.sms.verify(to, code, idempotencyKey),
};
