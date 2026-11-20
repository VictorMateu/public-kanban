import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import sharp from "sharp";
import { z } from "zod";
import type { Database } from "../lib/supabase/database.types.ts";
import { readRichText, richTextAssetIds, richTextToPlainText } from "../lib/projects/rich-text.ts";
import { environment, origin, supabaseUrl, population, localAdministratorToken, removeLocalProjectFixture } from "./support/local-project.ts";
import { launchBrowser, waitFor } from "./support/image-browser.ts";

const messages: unknown = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"));
const sourceMessages = z.object({ Editor: z.object({ invalidAlt: z.string(), invalidImage: z.string(), imageStaged: z.string(), imageUploaded: z.string() }), ProjectForm: z.object({ pendingImages: z.string() }) }).parse(messages);
const editorMessages = sourceMessages.Editor;

test("browser image persistence across creation, reload, editing and visibility", { timeout: 180_000 }, async (context) => {
  const before = population();
  const slugs = ["images-browser-" + randomUUID(), "images-retry-" + randomUUID(), "images-keyboard-" + randomUUID()];
  const [slug, retrySlug] = slugs; assert.ok(slug && retrySlug);
  const token = localAdministratorToken();
  const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admin = createClient<Database>(supabaseUrl.origin, key, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } },
  });
  const cookies: { name: string; value: string }[] = [];
  const auth = createServerClient<Database>(supabaseUrl.origin, key, { cookies: {
    getAll: () => cookies, setAll: (values) => { cookies.splice(0, cookies.length, ...values); },
  } });
  assert.equal((await auth.auth.setSession({ access_token: token, refresh_token: randomUUID() })).error, null);
  const directory = mkdtempSync(path.join(tmpdir(), "project-garden-image-fixture-"));
  const file = path.join(directory, "diagram.png");
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  try {
    writeFileSync(file, await sharp({ create: { width: 64, height: 32, channels: 3, background: "#cba56b" } }).png().toBuffer());
    browser = await launchBrowser();
    const { send, evaluate, click, nextUpload, uploads } = browser;
    const truth = async (expression: string) => z.boolean().parse(await evaluate(expression));
    const setAdministrator = () => send("Network.setCookies", { cookies: cookies.map(({ name, value }) => ({ name, value, url: origin.origin, sameSite: "Lax" })) });
    const navigate = async (pathname: string) => { await send("Page.navigate", { url: origin.origin + pathname }); };
    const fill = async (selector: string, text: string) => {
      await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});input.focus();input.select();})()`);
      await send("Input.insertText", { text });
    };
    const openInformation = async () => {
      await waitFor(async () => {
        if (!await truth('Boolean(document.querySelector("main button[aria-haspopup=dialog]"))')) return false;
        await click('main button[aria-haspopup=dialog]');
        return truth('Boolean(document.querySelector("dialog:modal"))');
      }, "open project information");
    };
    const openCreate = async () => {
      await navigate("/projects");
      await openInformation();
      await waitFor(() => truth('document.querySelectorAll("dialog:modal [contenteditable=true]").length===2 && Boolean(document.querySelector("dialog:modal button[type=submit]:not(:disabled)"))'), "creation editors ready");
    };
    const edit = async () => {
      await click('dialog:modal button.project-primary-action');
      await waitFor(() => truth('document.querySelectorAll("dialog:modal [contenteditable=true]").length===2 && Boolean(document.querySelector("dialog:modal button[type=submit]:not(:disabled)"))'), "editing form ready");
    };
    const submit = async () => {
      await waitFor(() => truth('Boolean(document.querySelector("dialog:modal button[type=submit]:not(:disabled)"))'), "save enabled");
      await click('dialog:modal button[type=submit]');
    };
    const getProject = async (projectSlug = slug) => {
      const result = await admin.from("projects").select("*").eq("slug", projectSlug).single();
      assert.equal(result.error, null); assert.ok(result.data); return result.data;
    };
    const assetsFor = async (id: string) => {
      const result = await admin.from("project_assets").select("*").eq("project_id", id);
      assert.equal(result.error, null); assert.ok(result.data); return result.data;
    };
    const chooseFile = async (index: number, selectedFile = file) => {
      const document = z.object({ root: z.object({ nodeId: z.number() }) }).parse(await send("DOM.getDocument"));
      const inputs = z.object({ nodeIds: z.array(z.number()) }).parse(await send("DOM.querySelectorAll", { nodeId: document.root.nodeId, selector: 'dialog:modal input[type=file]' }));
      const nodeId = inputs.nodeIds[index]; assert.ok(nodeId);
      await send("DOM.setFileInputFiles", { nodeId, files: [selectedFile] });
    };
    const insertImage = async (index: number, alt: string) => {
      await chooseFile(index);
      const group = `document.querySelectorAll("dialog:modal input[type=file]")[${index}].parentElement`;
      await evaluate(`(()=>{const input=${group}.querySelector("input:not([type=file])");input.focus();input.select();})()`);
      await send("Input.insertText", { text: alt });
      const fileId = z.string().parse(await evaluate(`${group}.querySelector("input[type=file]").id`));
      await click(`div[role=group]:has([id=${JSON.stringify(fileId)}]) button`);
      await waitFor(() => truth(`[...document.querySelectorAll("dialog:modal .rich-text img")].some(img=>img.alt===${JSON.stringify(alt)}&&img.complete&&img.naturalWidth===64)`), "inserted image preview decodes");
      return z.string().parse(await evaluate(`[...document.querySelectorAll("dialog:modal .rich-text img")].find(img=>img.alt===${JSON.stringify(alt)}).getAttribute("src")`));
    };
    const decodedImages = async (expectedAlts: string[], preview: boolean) => {
      await waitFor(() => truth(`document.querySelectorAll("dialog:modal .rich-text img").length===${expectedAlts.length}`), "all saved image elements present");
      for (let index = 0; index < expectedAlts.length; index++) {
        await evaluate(`document.querySelectorAll("dialog:modal .rich-text img")[${index}].scrollIntoView({block:"center"})`);
        await waitFor(() => truth(`(()=>{const img=document.querySelectorAll("dialog:modal .rich-text img")[${index}];return img.complete&&img.naturalWidth===64&&img.naturalHeight===32})()`), "saved image decodes after reload");
      }
      const images = z.array(z.object({ src: z.string(), alt: z.string() })).parse(await evaluate('[...document.querySelectorAll("dialog:modal .rich-text img")].map(img=>({src:img.getAttribute("src"),alt:img.alt}))'));
      assert.deepEqual(images.map((image) => image.alt), expectedAlts);
      for (const image of images) assert.match(image.src, preview ? /^\/project-images\/[\da-f-]{36}\?preview=1$/u : /^\/project-images\/[\da-f-]{36}$/u);
    };
    const saved = async (projectSlug: string, expectedImageCount: number) => {
      await waitFor(() => truth(`location.pathname===${JSON.stringify("/projects/" + projectSlug)}&&!document.querySelector("dialog:modal")`), "save redirects without reopening modal");
      const project = await getProject(projectSlug);
      const assets = await assetsFor(project.id);
      assert.equal(assets.length, expectedImageCount); assert.ok(assets.every((asset) => asset.status === "ready"));
      const ids = [...richTextAssetIds(readRichText(project.description_content)), ...richTextAssetIds(readRichText(project.objectives_content))];
      assert.deepEqual([...ids].sort(), assets.map((asset) => asset.id).sort());
      assert.ok(!JSON.stringify(project).includes("blob:"));
      return project;
    };
    await setAdministrator();
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

    await context.test("file picker cancellation preserves staged images; explicit dismissal discards them", async () => {
      await openCreate();
      await chooseFile(0);
      assert.equal(await truth('Boolean(document.querySelector("dialog:modal .rich-text img"))'), false);
      assert.equal(population(), before);
      await evaluate('document.querySelector("dialog:modal input[type=file]").value=""');
      const preview = await insertImage(0, "Cancelled diagram"); assert.ok(preview.startsWith("blob:"));
      await chooseFile(0);
      // Selecting the unchanged file fires the browser's native, bubbling input cancel event.
      await evaluate('document.addEventListener("cancel",event=>{document.body.dataset.fileCancel=String(event.target.tagName=== "INPUT"&&event.isTrusted)},{once:true})');
      await chooseFile(0);
      assert.equal(await evaluate('document.body.dataset.fileCancel'), "true", "Native file input cancellation was exercised");
      assert.equal(await truth('Boolean(document.querySelector("dialog:modal"))'), true, "File chooser cancellation must not dismiss the project form");
      assert.equal(await evaluate('document.querySelector("dialog:modal .rich-text img").getAttribute("src")'), preview, "File chooser cancellation retains staged content");
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await waitFor(() => truth('!document.querySelector("dialog:modal")'), "creation dismissed");
      assert.equal(await truth(`fetch(${JSON.stringify(preview)}).then(()=>false,()=>true)`), true, "Closing revokes local preview URLs");
      assert.equal(population(), before);
      assert.equal(uploads.length, 0, "Staging and cancellation do not send an upload");
    });
    await context.test("creation saves both fields and publishes only after uploads finish", async () => {
      await openCreate(); await fill("#project-name", "Image persistence fixture"); await fill("#project-slug", slug);
      await insertImage(0, "Description diagram"); await insertImage(1, "Objectives diagram");
      for (const [width, height] of [[1440, 1000], [390, 844], [320, 640]] as const) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
        assert.equal(await truth('(()=>{const d=document.querySelector("dialog:modal");const r=d.getBoundingClientRect();return r.left>=15&&r.right<=innerWidth-15&&d.scrollWidth<=d.clientWidth})()'), true, "Modal fits viewport");
        await evaluate('document.querySelector("dialog:modal button[type=submit]").focus()');
        await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        assert.equal(await truth('document.activeElement===document.querySelector("dialog:modal button")'), true, "Focus stays in modal");
      }
      await click('dialog:modal button[role=switch]');
      await send("Fetch.enable", { patterns: [{ urlPattern: origin.origin + "/project-images", requestStage: "Request" }] });
      try {
        await submit();
        for (let index = 0; index < 2; index++) {
          const upload = await nextUpload();
          const project = await getProject(); assert.equal(project.is_published, false);
          assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 404);
          assert.equal(await truth('document.querySelector("dialog:modal button").disabled'), true);
          for (const asset of await assetsFor(project.id)) assert.equal((await fetch(origin.origin + "/project-images/" + asset.id)).status, 404);
          await send("Fetch.continueRequest", { requestId: upload.requestId });
        }
        const project = await saved(slug, 2); assert.equal(project.is_published, true);
        assert.deepEqual(uploads.map((upload) => upload.status), [201, 201], "Creation must upload both actual image files successfully");
      } finally { await send("Fetch.disable"); }
    });
    await context.test("reload and edit retain saved images and persist an additional upload", async () => {
      await navigate("/projects/" + slug); await openInformation();
      await decodedImages(["Description diagram", "Objectives diagram"], true);
      const beforeEdit = await getProject();
      await edit(); await decodedImages(["Description diagram", "Objectives diagram"], true);
      await insertImage(0, "Diagram added while editing");
      await evaluate('document.querySelector("dialog:modal [contenteditable=true]").focus()');
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Home", code: "Home", windowsVirtualKeyCode: 36, modifiers: 2 });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Home", code: "Home", windowsVirtualKeyCode: 36, modifiers: 2 });
      await send("Input.insertText", { text: "Text added after the image upload. " });
      await submit();
      const project = await saved(slug, 3);
      assert.notEqual(project.updated_at, beforeEdit.updated_at);
      assert.match(richTextToPlainText(readRichText(project.description_content)), /Text added after the image upload/u);
      assert.equal(richTextAssetIds(readRichText(project.description_content))[0], richTextAssetIds(readRichText(beforeEdit.description_content))[0]);
      await navigate("/projects/" + slug); await openInformation();
      await decodedImages(["Description diagram", "Diagram added while editing", "Objectives diagram"], true);
    });
    await context.test("editing validates before upload, surfaces a real server rejection and permits correction", async () => {
      await edit();
      const project = await getProject();
      const initialAssets = await assetsFor(project.id);
      const uploadCount = uploads.length;
      const invalidFile = path.join(directory, "corrupt.png"); writeFileSync(invalidFile, "This is not an image.");
      await chooseFile(0, invalidFile);
      await submit();
      await waitFor(() => truth(`document.querySelector("dialog:modal [role=alert]")?.textContent === ${JSON.stringify(sourceMessages.ProjectForm.pendingImages)}`), "editing does not silently discard a selected file");
      assert.equal(uploads.length, uploadCount, "Saving a pending selection cannot start an upload");
      assert.equal((await getProject()).updated_at, project.updated_at, "Saving a pending selection cannot change project content");
      const fileId = z.string().parse(await evaluate('document.querySelector("dialog:modal input[type=file]").id'));
      const group = `div[role=group]:has([id=${JSON.stringify(fileId)}])`;
      await click(group + " button");
      await waitFor(() => truth(`document.querySelector("dialog:modal [role=alert]")?.textContent === ${JSON.stringify(editorMessages.invalidAlt)}`), "alternative text validation");
      assert.equal(uploads.length, uploadCount, "Invalid alternative text must not send a POST");
      const altId = z.string().parse(await evaluate(`document.querySelector(${JSON.stringify(group)}).querySelector("input:not([type=file])").id`));
      await fill(`[id=${JSON.stringify(altId)}]`, "Corrected diagram");
      await evaluate('document.addEventListener("click",event=>{if(event.target.closest("button"))document.body.dataset.uploadClickTrusted=String(event.isTrusted)},{once:true})');
      await click(group + " button");
      await waitFor(() => truth(`document.querySelector("dialog:modal [role=alert]")?.textContent === ${JSON.stringify(editorMessages.invalidImage)} && !document.querySelector("dialog:modal input[type=file]").disabled`), "server image rejection is recoverable");
      assert.equal(await evaluate('document.body.dataset.uploadClickTrusted'), "true", "Upload uses a real browser pointer click");
      assert.equal(uploads.length, uploadCount + 1); assert.equal(uploads.at(-1)?.status, 400);
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(`[id=${JSON.stringify(altId)}]`)}).value`), "Corrected diagram");
      assert.equal(await truth('document.querySelector("dialog:modal input[type=file]").files.length===1'), true, "Rejection retains the selected file");
      assert.deepEqual((await assetsFor(project.id)).map((asset) => asset.id).sort(), initialAssets.map((asset) => asset.id).sort(), "Rejected bytes cannot create an asset");
      const rejectedContent: unknown = JSON.parse(z.string().parse(await evaluate('document.querySelector("input[name=description_content]").value')));
      assert.deepEqual(readRichText(rejectedContent), readRichText(project.description_content), "Rejected bytes cannot insert a rich-text image");
      await chooseFile(0);
      await fill(`[id=${JSON.stringify(altId)}]`, "Corrected diagram");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await waitFor(() => truth('[...document.querySelectorAll("dialog:modal .rich-text img")].some(img=>img.alt==="Corrected diagram"&&img.complete&&img.naturalWidth===64)'), "Enter uploads and inserts the corrected file without saving the project");
      assert.equal((await getProject()).updated_at, project.updated_at, "Enter in the image field must not save project changes");
      assert.equal(uploads.length, uploadCount + 2); assert.equal(uploads.at(-1)?.status, 201);
      assert.equal(await truth(`[...document.querySelectorAll("dialog:modal [role=status]")].some(el=>el.textContent===${JSON.stringify(editorMessages.imageUploaded)})`), true, "A successful upload is explicitly reported");
      await submit(); await saved(slug, 4);
      await navigate("/projects/" + slug); await openInformation();
      await decodedImages(["Description diagram", "Diagram added while editing", "Corrected diagram", "Objectives diagram"], true);
    });
    await context.test("visitors see decoded published images; saving private removes public access", async () => {
      await send("Network.clearBrowserCookies");
      await navigate("/projects/" + slug); await openInformation();
      await decodedImages(["Description diagram", "Diagram added while editing", "Corrected diagram", "Objectives diagram"], false);
      assert.equal(await truth('Boolean(document.querySelector("dialog:modal button.project-primary-action"))'), false);
      const project = await getProject();
      for (const asset of await assetsFor(project.id)) {
        const response = await fetch(origin.origin + "/project-images/" + asset.id);
        assert.equal(response.status, 200); assert.equal(response.headers.get("content-type"), "image/webp");
        const image = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
        assert.deepEqual([image.width, image.height], [64, 32]);
      }
      await setAdministrator(); await navigate("/projects/" + slug); await openInformation(); await edit();
      await click('dialog:modal button[role=switch]'); await submit();
      assert.equal((await saved(slug, 4)).is_published, false);
      assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 404);
      for (const asset of await assetsFor(project.id)) assert.equal((await fetch(origin.origin + "/project-images/" + asset.id)).status, 404);
      await navigate("/projects/" + slug); await openInformation();
      await decodedImages(["Description diagram", "Diagram added while editing", "Corrected diagram", "Objectives diagram"], true);
    });
    await context.test("a failed second upload retains private progress and retries without duplication", async () => {
      await setAdministrator();
      await openCreate(); await fill("#project-name", "Image retry fixture"); await fill("#project-slug", retrySlug);
      await insertImage(0, "Retained description diagram"); await insertImage(1, "Retried objectives diagram");
      await click('dialog:modal button[role=switch]');
      await send("Fetch.enable", { patterns: [{ urlPattern: origin.origin + "/project-images", requestStage: "Request" }] });
      const retryUploadStart = uploads.length;
      try {
        await submit(); const first = await nextUpload(); await send("Fetch.continueRequest", { requestId: first.requestId });
        const second = await nextUpload();
        await send("Fetch.fulfillRequest", { requestId: second.requestId, responseCode: 503, responseHeaders: [{ name: "Content-Type", value: "application/json" }],
          body: Buffer.from(JSON.stringify({ success: false, error: "uploadUnavailable" })).toString("base64") });
        await waitFor(() => truth('Boolean(document.querySelector("dialog:modal [role=alert]")) && Boolean(document.querySelector("dialog:modal button[type=submit]:not(:disabled)"))'), "failed upload offers retry");
        const draft = await getProject(retrySlug); assert.equal(draft.is_published, false);
        const retained = await assetsFor(draft.id); assert.equal(retained.length, 1);
        assert.equal(richTextAssetIds(readRichText(draft.description_content)).length, 1);
        assert.equal(await evaluate('document.querySelector("#project-name").value'), "Image retry fixture");
        assert.equal(await evaluate('document.querySelector("#project-slug").value'), retrySlug);
        assert.equal((await fetch(origin.origin + "/projects/" + retrySlug)).status, 404);
        await submit(); const retry = await nextUpload(); await send("Fetch.continueRequest", { requestId: retry.requestId });
        const project = await saved(retrySlug, 2); assert.equal(project.id, draft.id);
        assert.deepEqual(uploads.slice(retryUploadStart).map((upload) => upload.status), [201, 503, 201], "The failed second upload is retried exactly once");
        assert.ok((await assetsFor(project.id)).some((asset) => asset.id === retained[0]?.id));
      } finally { await send("Fetch.disable"); }
      await navigate("/projects/" + retrySlug); await openInformation();
      await decodedImages(["Retained description diagram", "Retried objectives diagram"], true);
    });
    await context.test("Enter inserts a selected image instead of saving the enclosing project", async () => {
      const keyboardSlug = slugs[2]; assert.ok(keyboardSlug);
      await setAdministrator(); await openCreate();
      await fill("#project-name", "Keyboard image fixture"); await fill("#project-slug", keyboardSlug);
      await chooseFile(0);
      const altId = z.string().parse(await evaluate('document.querySelector("dialog:modal input[type=file]").parentElement.querySelector("input:not([type=file])").id'));
      await fill(`[id=${JSON.stringify(altId)}]`, "   ");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await waitFor(() => truth(`document.querySelector("dialog:modal [role=alert]")?.textContent === ${JSON.stringify(editorMessages.invalidAlt)}`), "Enter validates alternative text without submitting");
      assert.equal(await truth(`document.activeElement.id===${JSON.stringify(altId)} && document.activeElement.getAttribute("aria-invalid")==="true"`), true, "Invalid alternative text retains focus and is marked invalid");
      await fill(`[id=${JSON.stringify(altId)}]`, "Keyboard inserted diagram");
      const initialUploads = uploads.length;
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await waitFor(() => truth('[...document.querySelectorAll("dialog:modal .rich-text img")].some(img=>img.alt==="Keyboard inserted diagram"&&img.complete&&img.naturalWidth===64)'), "Enter inserts into the editor without submitting the project");
      assert.equal(uploads.length, initialUploads, "Creation preview stays local until explicit save");
      assert.equal(await truth(`[...document.querySelectorAll("dialog:modal [role=status]")].some(el=>el.textContent===${JSON.stringify(editorMessages.imageStaged)})`), true, "Local staging is distinct from a completed upload");
      await chooseFile(1);
      await submit();
      await waitFor(() => truth(`document.querySelector("dialog:modal [role=alert]")?.textContent === ${JSON.stringify(sourceMessages.ProjectForm.pendingImages)}`), "creation does not silently discard a second selected file");
      assert.equal(await truth('document.activeElement===document.querySelectorAll("dialog:modal input[type=file]")[1]'), true, "The pending file receives focus");
      assert.equal(uploads.length, initialUploads);
      const pendingFileId = z.string().parse(await evaluate('document.querySelectorAll("dialog:modal input[type=file]")[1].id'));
      await click(`div[role=group]:has([id=${JSON.stringify(pendingFileId)}]) button:last-of-type`);
      assert.equal(await truth('Boolean(document.querySelector("dialog:modal [role=alert]"))'), false, "Discarding the selection clears the pending error");
      const unsaved = await admin.from("projects").select("id").eq("slug", keyboardSlug); assert.equal(unsaved.error, null); assert.deepEqual(unsaved.data, []);
      await submit(); await saved(keyboardSlug, 1);
      await navigate("/projects/" + keyboardSlug); await openInformation();
      await decodedImages(["Keyboard inserted diagram"], true);
    });
    await context.test("lifecycle, cancellation and hidden cards work in the shared form and visitor view", async () => {
      await navigate("/projects/" + slug); await openInformation(); await edit();
      const beforeCancel = await getProject(); assert.equal(beforeCancel.status, "development");
      const selectStatus = async (status: string) => {
        await evaluate('(()=>{const select=document.querySelector("#project-status");select.value=' + JSON.stringify(status) + ';select.dispatchEvent(new Event("change",{bubbles:true}));})()');
      };
      await selectStatus("cancelled");
      await waitFor(() => truth('Boolean(document.querySelector("textarea[name=cancellation_reason]"))'), "cancellation reason appears");
      await submit();
      assert.equal(await truth('Boolean(document.querySelector("dialog:modal textarea:invalid"))'), true);
      assert.equal((await getProject()).updated_at, beforeCancel.updated_at, "Missing reason never saves the project");
      const reason = "Cancelled because priorities changed.";
      await fill("#cancellation-reason", reason);
      if (!await truth('document.querySelector("#project-published").getAttribute("aria-checked")==="true"')) await click("#project-published");
      await click("#project-hidden");
      await submit(); const cancelled = await saved(slug, 4);
      assert.equal(cancelled.status, "cancelled"); assert.equal(cancelled.is_hidden, true); assert.equal(cancelled.is_published, true);
      assert.equal(cancelled.cancellation_reason, reason);
      await openInformation();
      assert.equal(await truth('document.querySelector("dialog:modal").textContent.includes(' + JSON.stringify(reason) + ')'), true);
      await edit(); await selectStatus("development");
      assert.equal(await truth('document.querySelector("input[type=hidden][name=cancellation_reason]").value===' + JSON.stringify(reason)), true);
      await submit(); const reopened = await saved(slug, 4);
      assert.equal(reopened.status, "development"); assert.equal(reopened.cancellation_reason, reason);
      await openInformation();
      assert.equal(await truth('document.querySelector("dialog:modal").textContent.includes(' + JSON.stringify(reason) + ')'), false);
      await send("Network.clearBrowserCookies");
      for (const width of [390, 1440]) {
        await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
        await navigate("/projects");
        const heading = "#project-" + reopened.id;
        await waitFor(() => truth('Boolean(document.querySelector(' + JSON.stringify(heading) + '))'), "hidden card listed");
        assert.equal(await truth('document.querySelector(' + JSON.stringify(heading) + ').closest("article").querySelector("a,button,[tabindex]")===null'), true, "Hidden card has no visitor navigation control");
        assert.equal(await truth('document.documentElement.scrollWidth<=innerWidth'), true, "Project list has no horizontal overflow");
      }
      assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 404);
      await setAdministrator(); await navigate("/projects");
      await waitFor(() => truth('Boolean(document.querySelector("#project-' + reopened.id + '"))'), "owner card rendered");
      assert.equal(await truth('Boolean(document.querySelector("#project-' + reopened.id + '").closest("a"))'), true, "Owner retains an editable link");
      await navigate("/projects/" + slug); await openInformation(); await edit();
      await click("#project-hidden"); await submit();
      assert.equal((await saved(slug, 4)).is_hidden, false);
      assert.equal((await fetch(origin.origin + "/projects/" + slug)).status, 200);
    });
  } finally {
    try { await browser?.close(); }
    finally {
      try {
        const fixtures = await admin.from("projects").select("id,slug").in("slug", slugs);
        assert.equal(fixtures.error, null); assert.ok(fixtures.data);
        for (const project of fixtures.data) {
          const assets = await admin.from("project_assets").select("id,object_path").eq("project_id", project.id);
          assert.equal(assets.error, null); assert.ok(assets.data);
          if (assets.data.length) assert.equal((await admin.storage.from("project-images").remove(assets.data.map((asset) => asset.object_path))).error, null);
          assert.equal((await admin.from("project_assets").delete().eq("project_id", project.id)).error, null);
          removeLocalProjectFixture(project.id, [project.slug]);
        }
        assert.equal(population(), before, "Existing projects, assets, tasks, columns and users preserved");
      } finally {
        const resolved = path.resolve(directory);
        assert.equal(path.dirname(resolved), path.resolve(tmpdir())); assert.ok(path.basename(resolved).startsWith("project-garden-image-fixture-"));
        rmSync(resolved, { recursive: true, force: true });
      }
    }
  }
});
