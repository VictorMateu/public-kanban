import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";
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
  const child = spawn(executable, ["--headless=new", "--remote-debugging-pipe", "--user-data-dir=" + profile,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
  const browserInput = child.stdio[3];
  const browserOutput = child.stdio[4];
  assert.ok(browserInput instanceof Writable && browserOutput instanceof Readable, "Browser debugging pipes must be available");
  const input: Writable = browserInput;
  const output: Readable = browserOutput;
  let launchError: Error | undefined;
  child.on("error", (error) => {
    launchError = error;
    for (const operation of pending.values()) { clearTimeout(operation.timer); operation.reject(error); }
    pending.clear();
  });
  let sequence = 0;
  let session: string | undefined;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const events: unknown[] = [];
  const uploads: { id: string; status?: number }[] = [];
  async function close() {
    input.destroy();
    output.destroy();
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
      if (launchError || input.destroyed) { reject(new Error("Test browser is unavailable")); return; }
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("Browser command timed out: " + method)); }, 15_000);
      pending.set(id, { resolve, reject, timer });
      input.write(JSON.stringify({ id, method, params, ...(page && session ? { sessionId: session } : {}) }) + "\0");
    });
  }
  // Test data travels in CDP arguments, separately from the static function source.
  async function evaluate(expression: string, values?: readonly unknown[]): Promise<unknown> {
    let objectId: string | undefined;
    try {
      if (values) {
        const global = z.object({ result: z.object({ objectId: z.string() }) }).parse(
          await send("Runtime.evaluate", { expression: "globalThis" }),
        );
        objectId = global.result.objectId;
      }
      const result = evaluationSchema.parse(await (values
        ? send("Runtime.callFunctionOn", { objectId, functionDeclaration: expression, arguments: values.map((value) => ({ value })), returnByValue: true, awaitPromise: true })
        : send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })));
      assert.equal(result.exceptionDetails, undefined, "Browser assertion script must execute successfully");
      return result.result.value;
    } finally {
      if (objectId) await send("Runtime.releaseObject", { objectId });
    }
  }
  async function click(selector: string) {
    const point = z.object({ x: z.number(), y: z.number(), reachable: z.literal(true) }).parse(await evaluate(`async function(selector) {
      const element=document.querySelector(selector);
      element.scrollIntoView({block:"center",inline:"center",behavior:"instant"});
      const deadline=performance.now()+5000;
      let previous=element.getBoundingClientRect();
      let stableFrames=0;
      while(performance.now()<deadline) {
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const rect=element.getBoundingClientRect();
        stableFrames=rect.left===previous.left&&rect.top===previous.top&&rect.width===previous.width&&rect.height===previous.height ? stableFrames+1 : 0;
        previous=rect;
        if(stableFrames<2||element.matches(":disabled")||!element.isConnected||!rect.width||!rect.height) continue;
        const x=rect.left+rect.width/2;const y=rect.top+rect.height/2;
        const hit=document.elementFromPoint(x,y);
        if(hit===element||element.contains(hit)) return {x,y,reachable:true};
      }
      throw new Error("Click target did not become enabled, stable and reachable");
    }`, [selector]));
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
  }
  async function nextUpload() {
    await waitFor(() => events.length > 0, "image upload request");
    return z.object({ requestId: z.string(), request: z.object({ method: z.literal("POST"), url: z.string() }) }).parse(events.shift());
  }
  try {
    // CDP uses inherited pipes, never a TCP listener or a file-derived WebSocket URL.
    let received = "";
    output.setEncoding("utf8");
    output.on("data", (chunk: unknown) => {
      assert.ok(typeof chunk === "string");
      received += chunk;
      let separator: number;
      while ((separator = received.indexOf("\0")) !== -1) {
        const message = received.slice(0, separator);
        received = received.slice(separator + 1);
        handleMessage(message);
      }
    });
    function handleMessage(payload: string) {
      const raw: unknown = JSON.parse(payload);
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
    }
    const context = z.object({ browserContextId: z.string() }).parse(await send("Target.createBrowserContext", { disposeOnDetach: true }, false));
    const target = z.object({ targetId: z.string() }).parse(await send("Target.createTarget", { url: "about:blank", browserContextId: context.browserContextId }, false));
    session = z.object({ sessionId: z.string() }).parse(await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false)).sessionId;
    await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
    return { send, evaluate, click, nextUpload, uploads, close };
  } catch (error) { await close(); throw error; }
}
