import assert from "node:assert/strict";
import { test } from "node:test";
import { uploadProjectImage } from "../lib/projects/image-upload.ts";
import { PROJECT_IMAGE_ACCEPT, parseImageUploadForm, stagedImageFileSchema } from "../lib/projects/image-input.ts";
import { projectImageUrl, savedProjectUrl } from "../lib/projects/urls.ts";

const projectId = "5139a508-e45c-49dd-942b-86f18954606b";
const assetId = "b264f1b8-1101-4822-87da-1aee3ce8c02a";
const file = new File([new Uint8Array([137, 80, 78, 71])], "fixture.png", { type: "image/png" });

test("multipart parser preserves the upload wire contract without accepting ambiguous fields", () => {
  const multipart = () => {
    const form = new FormData();
    form.set("project_id", projectId);
    form.set("file", file);
    return form;
  };
  assert.deepEqual(parseImageUploadForm(multipart()), { projectId, taskId: undefined, file });
  const withTask = multipart();
  withTask.set("task_id", assetId);
  assert.deepEqual(parseImageUploadForm(withTask), { projectId, taskId: assetId, file });
  const commentId = "9c030518-c28f-411f-b67f-b7be1b0cdf27";
  withTask.set("comment_id", commentId);
  assert.deepEqual(parseImageUploadForm(withTask), { projectId, taskId: assetId, commentId, file });
  const withoutTask = multipart();
  withoutTask.set("comment_id", commentId);
  assert.equal(parseImageUploadForm(withoutTask), null);
  for (const [key, value] of [["project_id", projectId], ["task_id", assetId], ["comment_id", commentId], ["file", file]] as const) {
    const duplicate = multipart();
    duplicate.set(key, value);
    duplicate.append(key, value);
    assert.equal(parseImageUploadForm(duplicate), null, key);
  }
  for (const [key, value] of [["extra", "x"], ["project_id", "invalid"], ["task_id", ""], ["file", "text"], ["file", new File([], "empty.png")]] as const) {
    const malformed = multipart();
    malformed.set(key, value);
    assert.equal(parseImageUploadForm(malformed), null, key);
  }
  const missingFile = multipart();
  missingFile.delete("file");
  assert.equal(parseImageUploadForm(missingFile), null);
});

test("the file picker and staged-image validation allow the three supported input MIME types", () => {
  assert.equal(PROJECT_IMAGE_ACCEPT, "image/jpeg,image/png,image/webp");
  for (const type of PROJECT_IMAGE_ACCEPT.split(",")) {
    assert.equal(stagedImageFileSchema.safeParse(new File(["bytes"], "image", { type })).success, true, type);
  }
  assert.equal(stagedImageFileSchema.safeParse(new File(["bytes"], "image.gif", { type: "image/gif" })).success, false);
});

test("project URLs preserve the existing query flags and encode path segments", () => {
  assert.equal(projectImageUrl("asset/id"), "/project-images/asset%2Fid");
  assert.equal(projectImageUrl("asset/id", true), "/project-images/asset%2Fid?preview=1");
  assert.equal(savedProjectUrl("project/slug"), "/projects/project%2Fslug?saved=1");
});

test("image upload sends the original File and project identity as browser-generated multipart", async (context) => {
  let received: { input: Parameters<typeof fetch>[0]; init: RequestInit | undefined } | undefined;
  context.mock.method(globalThis, "fetch", async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    received = { input, init };
    return Response.json({ success: true, assetId }, { status: 201 });
  });
  assert.deepEqual(await uploadProjectImage(projectId, file), { success: true, assetId });
  assert.ok(received);
  assert.equal(received.input, "/project-images"); assert.equal(received.init?.method, "POST");
  assert.equal(new Headers(received.init.headers).has("Content-Type"), false, "The browser must set its own boundary");
  const body = received.init.body; assert.ok(body instanceof FormData);
  assert.deepEqual([...body.keys()].sort(), ["file", "project_id"]);
  assert.equal(body.get("project_id"), projectId);
  const uploaded = body.get("file"); assert.ok(uploaded instanceof File);
  assert.equal(uploaded.name, file.name); assert.equal(uploaded.type, file.type);
  assert.deepEqual(await uploaded.arrayBuffer(), await file.arrayBuffer());

  assert.deepEqual(await uploadProjectImage(projectId, file, assetId), { success: true, assetId });
  const taskBody = received.init?.body;
  assert.ok(taskBody instanceof FormData);
  assert.equal(taskBody.get("task_id"), assetId);
});

test("image upload preserves server rejection codes for actionable interface errors", async (context) => {
  let response: Response = Response.json({ success: false, error: "unauthorized" }, { status: 401 });
  context.mock.method(globalThis, "fetch", async () => response);
  for (const [status, error] of [[401, "unauthorized"], [400, "invalidImage"], [413, "imageTooLarge"], [503, "uploadUnavailable"]] as const) {
    response = Response.json({ success: false, error }, { status });
    assert.deepEqual(await uploadProjectImage(projectId, file), { success: false, error });
  }
});

test("image upload rejects network failures, non-JSON responses and invalid result shapes", async (context) => {
  let response: Response | null = null;
  context.mock.method(globalThis, "fetch", async () => {
    if (!response) throw new TypeError("Offline test fixture");
    return response;
  });
  assert.deepEqual(await uploadProjectImage(projectId, file), { success: false, error: "uploadUnavailable" });
  for (const body of ["<html>Unavailable</html>", JSON.stringify({ success: true, assetId: "invalid" }), JSON.stringify({ success: true }), JSON.stringify({ success: false, error: "unknownError" })]) {
    response = new Response(body);
    assert.deepEqual(await uploadProjectImage(projectId, file), { success: false, error: "uploadUnavailable" });
  }
});
