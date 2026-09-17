import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { CreatorAccessWorkflow, requestCodeSchema, verifyCodeSchema } from "./creator_access";
import { InfraiError, infraiSmsGateway } from "./infrai_sms";

const workflow = new CreatorAccessWorkflow(infraiSmsGateway);

async function readJson(request: AsyncIterable<Buffer>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/login/request-code") {
      const input = requestCodeSchema.parse(await readJson(request));
      send(response, 202, await workflow.requestCode(input));
      return;
    }

    if (request.method === "POST" && request.url === "/login/verify") {
      const input = verifyCodeSchema.parse(await readJson(request));
      const handoff = await workflow.verifyCode(input);
      send(response, handoff ? 200 : 401, handoff ?? { authenticated: false });
      return;
    }

    send(response, 404, { error: "route not found" });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "invalid request body" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.code, message: error.message });
      return;
    }
    send(response, 500, { error: "request could not be completed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Creator login service listening on http://localhost:${port}`);
});
