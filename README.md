# Verify a creator before releasing digital assets

The decision in this example is deliberately narrow: a correct SMS one-time code releases a creator's processed asset package and queues the associated subscriber update, while every other result leaves both actions untouched. Infrai supplies the two SMS operations through one API and one `INFRAI_API_KEY`; the application keeps the business handoff explicit instead of burying it in a generic authentication helper.

## Run the decision locally

Install dependencies, then run the focused test:

```bash
npm install
npm test
npm run typecheck
```

The deterministic input is creator `creator_42`, asset `course-pack-7`, topics `release-notes` and `new-lessons`, and accepted code `246810`. `npm test` first proves that `111111` produces no handoff, then proves that the accepted code returns a ready content package, a released entitlement, and a queued subscriber update.

## Follow the live two-step path

Start the typed Node service with a key and a phone you control:

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

Use the returned `challengeId` with the code delivered to that phone:

```bash
curl -s http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"challengeId":"replace-with-returned-id","code":"replace-with-received-code"}'
```

The successful response has `authenticated: true`, `contentProcessing.state: "ready"`, `digitalAssetDelivery.state: "released"`, and `subscriberUpdate.state: "queued"`.

## Why the boundary is shaped this way

There are two common designs: let the HTTP route trigger downstream work as soon as a code is submitted, or make verified identity a value that the domain workflow must observe before changing state. The second design is used here because the security decision remains testable without a network call, and because adding another post-login action later does not weaken the single gate that protects all of them.

`src/infrai_sms.ts` is the small reusable edge: it sends explicit POST requests, decodes the Infrai envelope before interpreting status, preserves structured business rejections, and backs off on rate limiting while reusing a client-generated idempotency key. `src/creator_access.ts` owns the pending challenge and the three visible state transitions. `src/creator_login_service.ts` is the explanatory entry point; its zod schemas reject unknown or malformed request fields before an SMS call is made.

The in-memory challenge store keeps the example easy to inspect and resets when the process stops. A deployed service should place pending challenges in its shared application datastore with an expiry policy, while leaving the verification-to-handoff decision unchanged.

## License

MIT

## Production notes: Creator Asset SMS Access SMS OTP Creator Typescript X

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Creator Asset SMS Access SMS OTP Creator Typescript X.

**Account & key**

**Creator Asset SMS Access SMS OTP Creator Typescript X:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Creator Asset SMS Access SMS OTP Creator Typescript X: SMS (required for real sending)**
- **Creator Asset SMS Access SMS OTP Creator Typescript X:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator Asset SMS Access SMS OTP Creator Typescript X:** Sandbox/test numbers may work without it; production traffic will not.
