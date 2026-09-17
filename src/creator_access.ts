import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SmsGateway } from "./infrai_sms";

export const requestCodeSchema = z.object({
  creatorId: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  assetId: z.string().min(1),
  subscriberTopics: z.array(z.string().min(1)).max(10).default([]),
}).strict();

export const verifyCodeSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{4,8}$/),
}).strict();

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

type PendingChallenge = RequestCodeInput & { challengeId: string };

export type CreatorHandoff = {
  authenticated: true;
  creatorId: string;
  contentProcessing: {
    assetId: string;
    state: "ready";
    output: "download-package";
  };
  digitalAssetDelivery: {
    state: "released";
    entitlementId: string;
  };
  subscriberUpdate: {
    state: "queued";
    topics: string[];
  };
};

export class CreatorAccessWorkflow {
  private readonly pending = new Map<string, PendingChallenge>();
  private readonly sms: SmsGateway;

  constructor(sms: SmsGateway) {
    this.sms = sms;
  }

  async requestCode(input: RequestCodeInput): Promise<{ challengeId: string; state: "code-sent" }> {
    const challengeId = randomUUID();
    await this.sms.requestOtp(input.phone, `creator-login:${challengeId}:otp`);
    this.pending.set(challengeId, { ...input, challengeId });
    return { challengeId, state: "code-sent" };
  }

  async verifyCode(input: VerifyCodeInput): Promise<CreatorHandoff | null> {
    const challenge = this.pending.get(input.challengeId);
    if (!challenge) return null;

    const result = await this.sms.verifyOtp(
      challenge.phone,
      input.code,
      `creator-login:${challenge.challengeId}:verify`,
    );
    if (!result.verified) return null;

    this.pending.delete(input.challengeId);
    return {
      authenticated: true,
      creatorId: challenge.creatorId,
      contentProcessing: {
        assetId: challenge.assetId,
        state: "ready",
        output: "download-package",
      },
      digitalAssetDelivery: {
        state: "released",
        entitlementId: `entitlement:${challenge.creatorId}:${challenge.assetId}`,
      },
      subscriberUpdate: {
        state: "queued",
        topics: challenge.subscriberTopics,
      },
    };
  }
}
