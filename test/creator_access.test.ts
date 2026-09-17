import assert from "node:assert/strict";
import test from "node:test";
import { CreatorAccessWorkflow } from "../src/creator_access";
import type { SmsGateway } from "../src/infrai_sms";

class DeterministicSms implements SmsGateway {
  private readonly acceptedCode: string;

  constructor(acceptedCode: string) {
    this.acceptedCode = acceptedCode;
  }

  async requestOtp(): Promise<{ message_id: string }> {
    return { message_id: "msg_test" };
  }

  async verifyOtp(_to: string, code: string): Promise<{ verified: boolean }> {
    return { verified: code === this.acceptedCode };
  }
}

test("asset and subscriber handoff occurs only after a verified creator code", async () => {
  const workflow = new CreatorAccessWorkflow(new DeterministicSms("246810"));
  const challenge = await workflow.requestCode({
    creatorId: "creator_42",
    phone: "+15551234567",
    assetId: "course-pack-7",
    subscriberTopics: ["release-notes", "new-lessons"],
  });

  const rejected = await workflow.verifyCode({
    challengeId: challenge.challengeId,
    code: "111111",
  });
  assert.equal(rejected, null);

  const accepted = await workflow.verifyCode({
    challengeId: challenge.challengeId,
    code: "246810",
  });
  assert.deepEqual(accepted, {
    authenticated: true,
    creatorId: "creator_42",
    contentProcessing: {
      assetId: "course-pack-7",
      state: "ready",
      output: "download-package",
    },
    digitalAssetDelivery: {
      state: "released",
      entitlementId: "entitlement:creator_42:course-pack-7",
    },
    subscriberUpdate: {
      state: "queued",
      topics: ["release-notes", "new-lessons"],
    },
  });
});
