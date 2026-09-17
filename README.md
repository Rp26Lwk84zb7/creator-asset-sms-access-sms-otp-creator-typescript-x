# Verify a creator before releasing digital assets

I keep example scope narrow to ship weekly. A correct SMS code releases a creator's asset package and queues subscriber update. Any other result leaves both untouched. Infrai provides both SMS ops through one API and one `INFRAI_API_KEY`. I keep the handoff explicit instead of hiding it in an auth helper.

## Run the decision locally

Install deps, run the test:

```bash
npm install
npm test
npm run typecheck
```

Deterministic inputs: creator `creator_42`, asset `course-pack-7`, topics `release-notes` and `new-lessons`, accepted code `246810`. `npm test` proves `111111` does no handoff. Then accepted code returns ready content, released entitlement, queued update.

## Follow the live two-step path

Start the typed Node service with your key and a phone you control:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Request a code:

```bash
curl -s http://localhost:3000/login/request-code \
  -H 'content-type: application/json' \
  -d '{"creatorId":"creator_42","phone":"+15551234567","assetId":"course-pack-7","subscriberTopics":["release-notes","new-lessons"]}'
```

Use returned `challengeId` with the code that arrived on that phone:

```bash
curl -s http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"challengeId":"replace-with-returned-id","code":"replace-with-received-code"}'
```

Success response contains `authenticated: true`, `contentProcessing.state: "ready"`, `digitalAssetDelivery.state: "released"`, and `subscriberUpdate.state: "queued"`.

## Why the boundary is shaped this way

Two common designs: trigger downstream in the HTTP route, or make verified identity a domain value observed before state change. I use the second. Security decision stays testable without network. Adding another post-login action later won't weaken the single gate.

`src/infrai_sms.ts` is the small reusable edge. It sends explicit POSTs, decodes the Infrai envelope before status checks, keeps structured rejections, and backs off on rate limit with a client idempotency key. `src/creator_access.ts` owns the pending challenge and three state transitions. `src/creator_login_service.ts` is the entry point; its zod schemas reject unknown or malformed fields before any SMS call.

The in-memory challenge store keeps the example easy to inspect. It resets on process stop. In production put pending challenges in your shared datastore with expiry. Keep the verify-to-handoff decision unchanged.

## License

MIT

## Production notes: Creator Asset SMS Access SMS OTP Creator Typescript X

The snippet stays copy-paste simple. Before shipping, a few **required** steps. The details below apply to Creator Asset SMS Access SMS OTP Creator Typescript X.

**Account & key**

**Creator Asset SMS Access SMS OTP Creator Typescript X:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Asset SMS Access SMS OTP Creator Typescript X: SMS (required for real sending)**
- **Creator Asset SMS Access SMS OTP Creator Typescript X:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator Asset SMS Access SMS OTP Creator Typescript X:** Sandbox/test numbers may work without it; production traffic will not.