import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";

export async function waitFor(check: () => boolean | Promise<boolean>, label: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(75);
  }
  throw new Error("Timed out: " + label);
}

const messageSchema = z.object({
  id: z.number().optional(), result: z.unknown().optional(),
  error: z.object({ message: z.string() }).optional(),
  method: z.string().optional(), params: z.unknown().optional(),
});
const evaluationSchema = z.object({ result: z.object({ value: z.unknown().optional() }), exceptionDetails: z.unknown().optional() });

// An isolated Chromium profile exercises real file inputs/multipart without a test dependency.
export async function launchBrowser() {
  const executable = process.env.KANBAN_TEST_BROWSER ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  assert.ok(path.isAbsolute(executable) && existsSync(executable), "Set KANBAN_TEST_BROWSER to an installed Chromium/Edge executable");
  const profile = mkdtempSync(path.join(tmpdir(), "project-garden-image-test-"));
  const child = spawn(executable, ["--headless=new", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + profile,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], { windowsHide: true, stdio: "ignore" });
  let launchError: Error | undefined;
  child.on("error", (error) => { launchError = error; });
  let socket: WebSocket | undefined;
  let sequence = 0;
  let session: string | undefined;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const events: unknown[] = [];
  const uploads: { id: string; status?: number }[] = [];
  async function close() {
    socket?.close();
    for (const operation of pending.values()) { clearTimeout(operation.timer); operation.reject(new Error("Test browser closed")); }
    pending.clear();
    if (child.pid && child.exitCode === null) {
      if (process.platform === "win32") {
        try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { /* Browser may already have exited. */ }
      } else child.kill();
    }
    const resolved = path.resolve(profile);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith("project-garden-image-test-"));
    rmSync(resolved, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
  function send(method: string, params: Record<string, unknown> = {}, page = true): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) { reject(new Error("Test browser is unavailable")); return; }
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("Browser command timed out: " + method)); }, 15_000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(page && session ? { sessionId: session } : {}) }));
    });
  }
  async function evaluate(expression: string): Promise<unknown> {
    const result = evaluationSchema.parse(await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }));
    assert.equal(result.exceptionDetails, undefined, "Browser assertion script must execute successfully");
    return result.result.value;
  }
  async function click(selector: string) {
    const point = z.object({ x: z.number(), y: z.number(), reachable: z.literal(true) }).parse(await evaluate(`(()=>{
      const element=document.querySelector(${JSON.stringify(selector)});
      element.scrollIntoView({block:"center",inline:"center",behavior:"instant"});
      const rect=element.getBoundingClientRect();const x=rect.left+rect.width/2;const y=rect.top+rect.height/2;
      const hit=document.elementFromPoint(x,y);return {x,y,reachable:hit===element||element.contains(hit)};
    })()`));
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
  }
  async function nextUpload() {
    await waitFor(() => events.length > 0, "image upload request");
    return z.object({ requestId: z.string(), request: z.object({ method: z.literal("POST"), url: z.string() }) }).parse(events.shift());
  }
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    await waitFor(() => { if (launchError) throw launchError; return existsSync(portFile); }, "browser startup");
    const [port, endpoint] = readFileSync(portFile, "utf8").trim().split(/\r?\n/u);
    assert.match(port ?? "", /^\d+$/u); assert.ok(endpoint?.startsWith("/devtools/browser/"));
    socket = new WebSocket("ws://127.0.0.1:" + port + endpoint);
    await new Promise<void>((resolve, reject) => {
      socket?.addEventListener("open", () => resolve(), { once: true });
      socket?.addEventListener("error", () => reject(new Error("Test browser connection failed")), { once: true });
    });
    socket.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "string") return;
      const raw: unknown = JSON.parse(event.data);
      const parsed = messageSchema.safeParse(raw);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.id) {
        const operation = pending.get(message.id);
        if (!operation) return;
        pending.delete(message.id); clearTimeout(operation.timer);
        if (message.error) operation.reject(new Error(message.error.message)); else operation.resolve(message.result);
      } else if (message.method === "Fetch.requestPaused") events.push(message.params);
      else if (message.method === "Network.requestWillBeSent") {
        const request = z.object({ requestId: z.string(), request: z.object({ url: z.url(), method: z.string() }) }).safeParse(message.params);
        if (request.success && request.data.request.method === "POST" && new URL(request.data.request.url).pathname === "/project-images") {
          uploads.push({ id: request.data.requestId });
        }
      } else if (message.method === "Network.responseReceived") {
        const response = z.object({ requestId: z.string(), response: z.object({ status: z.number() }) }).safeParse(message.params);
        if (response.success) {
          const upload = uploads.find((entry) => entry.id === response.data.requestId);
          if (upload) upload.status = response.data.response.status;
        }
      }
    });
    const context = z.object({ browserContextId: z.string() }).parse(await send("Target.createBrowserContext", { disposeOnDetach: true }, false));
    const target = z.object({ targetId: z.string() }).parse(await send("Target.createTarget", { url: "about:blank", browserContextId: context.browserContextId }, false));
    session = z.object({ sessionId: z.string() }).parse(await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false)).sessionId;
    await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
    return { send, evaluate, click, nextUpload, uploads, close };
  } catch (error) { await close(); throw error; }
}
