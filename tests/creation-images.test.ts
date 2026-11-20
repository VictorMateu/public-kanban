import assert from "node:assert/strict";
import { test } from "node:test";
import { ProjectImageStaging } from "../lib/projects/image-staging.ts";
import { prepareCreationImages, type CreationImageSession } from "../lib/projects/create-project-with-images.ts";
import { IMAGE_LIMITS } from "../lib/projects/image-input.ts";
import { plainTextDocument, parseRichTextJson, richTextAssetIds, richTextToPlainText, type RichTextDocument } from "../lib/projects/rich-text.ts";

const file = () => new File([new Uint8Array([1, 2, 3])], "diagram.png", { type: "image/png" });
function stage(images: ProjectImageStaging, source = file()) {
  const result = images.stage(source);
  assert.equal(result.success, true);
  if (!result.success) throw new Error("Fixture must stage");
  return result.id;
}
function form(ids: string[]) {
  const body = new FormData();
  const document: RichTextDocument = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Project explanation", marks: [{ type: "bold" }] }] },
    ...ids.map((id) => ({ type: "image" as const, attrs: { assetId: id, alt: "A project diagram" } })),
  ] };
  for (const [key, value] of Object.entries({ id: "", updated_at: "", name: "Image fixture", slug: "image-fixture", description_content: JSON.stringify(document), objectives_content: JSON.stringify(plainTextDocument(null)), repository_url: "", is_published: "true", status: "development", is_hidden: "false", cancellation_reason: "" })) body.set(key, value);
  return body;
}
function documentFrom(body: FormData) {
  const parsed = parseRichTextJson(body.get("description_content"));
  assert.equal(parsed.success, true);
  if (!parsed.success) throw new Error("Expected a valid document");
  return parsed.data;
}

test("one creation-image store enforces the file budget and releases preview resources", async () => {
  const images = new ProjectImageStaging();
  const large = new File([new Uint8Array(IMAGE_LIMITS.sourceBytes)], "large.png", { type: "image/png" });
  try {
    assert.deepEqual(images.stage(new File([], "empty.png", { type: "image/png" })), { success: false, error: "invalidImage" });
    assert.deepEqual(images.stage(new File(["<svg/>"], "image.svg", { type: "image/svg+xml" })), { success: false, error: "invalidImage" });
    assert.deepEqual(images.stage(new File([large, "x"], "oversize.png", { type: "image/png" })), { success: false, error: "imageTooLarge" });
    const ids = Array.from({ length: 4 }, () => stage(images, large));
    assert.deepEqual(images.stage(file()), { success: false, error: "stagingTooLarge" });
    const first = ids[0]; assert.ok(first);
    const preview = images.previewUrl(first); assert.ok(preview);
    assert.equal((await fetch(preview)).status, 200);
    images.discard(first);
    await assert.rejects(fetch(preview));
    const final = stage(images);
    const finalPreview = images.previewUrl(final); assert.ok(finalPreview);
    images.dispose();
    await assert.rejects(fetch(finalPreview));
  } finally { images.dispose(); }
});

test("resolving local images preserves authored content and never serializes preview URLs", () => {
  const images = new ProjectImageStaging();
  try {
    const first = stage(images); const second = stage(images);
    const document = documentFrom(form([first, second]));
    const uploaded = crypto.randomUUID(); images.uploaded(first, uploaded);
    const resolved = images.resolve(document);
    assert.deepEqual(richTextAssetIds(resolved), [uploaded]);
    assert.equal(richTextToPlainText(resolved).trim(), "Project explanation");
    assert.ok(!JSON.stringify(resolved).includes("blob:"));
    assert.deepEqual(images.resolve({ type: "doc", content: [{ type: "image", attrs: { assetId: second, alt: "Pending" } }] }), plainTextDocument(null));
  } finally { images.dispose(); }
});

test("creation saves private progress, uploads sequentially and retries without duplicating successful files", async () => {
  const images = new ProjectImageStaging();
  const session: CreationImageSession = {};
  const saved: FormData[] = [];
  const uploadedIds: string[] = [];
  let failSecond = true;
  let uploads = 0;
  let active = 0;
  const operations = {
    saveDraft: async (body: FormData) => {
      saved.push(body);
      assert.equal(body.get("is_published"), "false");
      assert.ok(richTextAssetIds(documentFrom(body)).every((id) => uploadedIds.includes(id)));
      return { success: true, project: { id: body.get("id"), slug: "image-fixture", updated_at: `2026-11-15T12:00:${String(saved.length).padStart(2, "0")}Z` } };
    },
    upload: async (projectId: string) => {
      assert.equal(projectId, session.project?.id);
      assert.equal(++active, 1, "Uploads must not overlap");
      await Promise.resolve(); active--; uploads++;
      if (uploads === 2 && failSecond) return { success: false, error: "uploadUnavailable" } as const;
      const assetId = crypto.randomUUID(); uploadedIds.push(assetId);
      return { success: true, assetId } as const;
    },
    onDraftSaved: () => {},
  };
  try {
    const body = form([stage(images), stage(images)]);
    const first = await prepareCreationImages(body, images, session, operations);
    assert.equal(first.success, false);
    if (!first.success) assert.equal(first.state.error, "imageUploadFailed");
    assert.ok(session.project);
    const projectId = session.project.id;
    assert.equal(uploads, 2); assert.equal(saved.length, 2);
    assert.deepEqual(richTextAssetIds(documentFrom(saved[1] ?? new FormData())), [uploadedIds[0]]);
    failSecond = false;
    const retry = await prepareCreationImages(body, images, session, operations);
    assert.equal(retry.success, true);
    if (retry.success) {
      assert.equal(retry.form.get("id"), projectId);
      assert.equal(retry.form.get("is_published"), "true");
      assert.deepEqual(richTextAssetIds(documentFrom(retry.form)), uploadedIds);
    }
    assert.equal(uploads, 3, "The first successful file must not upload again");
    assert.ok(saved.every((value) => value.get("id") === projectId));
  } finally { images.dispose(); }
});

test("a lost initial draft response retries with the same attempt identity", async () => {
  const images = new ProjectImageStaging(); const session: CreationImageSession = {};
  const attempts: unknown[] = []; let lost = true;
  try {
    const body = form([stage(images)]);
    const operations = {
      saveDraft: async (draft: FormData) => {
        attempts.push(draft.get("id"));
        if (lost) { lost = false; throw new Error("Lost response"); }
        return { success: true, project: { id: draft.get("id"), slug: "image-fixture", updated_at: "2026-11-15T12:00:00Z" } };
      },
      upload: async () => ({ success: true as const, assetId: crypto.randomUUID() }),
      onDraftSaved: () => {},
    };
    assert.equal((await prepareCreationImages(body, images, session, operations)).success, false);
    assert.equal((await prepareCreationImages(body, images, session, operations)).success, true);
    assert.equal(new Set(attempts).size, 1);
  } finally { images.dispose(); }
});

test("invalid forms never prepare a draft and image-free creation keeps its original save path", async () => {
  const images = new ProjectImageStaging();
  let calls = 0;
  const operations = {
    saveDraft: async () => { calls++; return undefined; },
    upload: async () => { calls++; return { success: false as const, error: "unauthorized" as const }; },
    onDraftSaved: () => {},
  };
  const body = form([]);
  assert.equal((await prepareCreationImages(body, images, {}, operations)).success, true);
  body.set("slug", "bad slug");
  assert.equal((await prepareCreationImages(body, images, {}, operations)).success, false);
  assert.equal(calls, 0);
});
