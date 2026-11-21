import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { IMAGE_LIMITS } from "../lib/projects/image-input.ts";
import { ImageInputError, normalizeProjectImage, readImageForm } from "../lib/projects/image-processing.ts";

const fails = (code: string) => (error: unknown) => error instanceof ImageInputError && error.code === code;

test("image normalization decodes, resizes, orients and removes source metadata", async () => {
  const input = await sharp({ create: { width: 5000, height: 2, channels: 3, background: "red" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const output = await normalizeProjectImage(input, "image/jpeg");
  const metadata = await sharp(output.bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(output.height, IMAGE_LIMITS.dimension);
  assert.ok(output.width >= 1 && output.width < output.height);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.ok(output.bytes.length < IMAGE_LIMITS.outputBytes);
});

test("PNG and WebP normalization preserves small image dimensions without enlargement", async () => {
  for (const format of ["png", "webp"] as const) {
    const input = await sharp({ create: { width: 3, height: 2, channels: 4, background: "transparent" } }).toFormat(format).toBuffer();
    const output = await normalizeProjectImage(input, "image/" + format);
    assert.deepEqual([output.width, output.height], [3, 2]);
    assert.equal((await sharp(output.bytes).metadata()).hasAlpha, true);
  }
});

test("normalization rejects spoofed types, SVG, empty and corrupt input", async () => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } }).png().toBuffer();
  for (const [bytes, mime] of [[png, "image/jpeg"], [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/svg+xml"], [Buffer.alloc(0), "image/png"], [png.subarray(0, 25), "image/png"]] as const) {
    await assert.rejects(normalizeProjectImage(bytes, mime), fails("invalidImage"));
  }
  await assert.rejects(normalizeProjectImage(Buffer.alloc(IMAGE_LIMITS.sourceBytes + 1), "image/png"), fails("imageTooLarge"));
});

test("input pixel limits reject oversized raster headers before full decode", async () => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } }).png().toBuffer();
  png.writeUInt32BE(100000, 16); png.writeUInt32BE(100000, 20);
  await assert.rejects(normalizeProjectImage(png, "image/png"), fails("invalidImage"));
});

test("multipart parsing bounds actual streamed bytes as well as declared length", async () => {
  const form = new FormData(); form.set("project_id", "fixture");
  const valid = new Request("http://localhost/project-images", { method: "POST", body: form });
  assert.equal((await readImageForm(valid)).get("project_id"), "fixture");
  await assert.rejects(readImageForm(new Request("http://localhost/project-images", { method: "POST", headers: { "content-length": String(IMAGE_LIMITS.requestBytes + 1) }, body: "x" })), fails("imageTooLarge"));
  const oversized = new Request("http://localhost/project-images", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=fixture" }, body: new Uint8Array(IMAGE_LIMITS.requestBytes + 1) });
  await assert.rejects(readImageForm(oversized), fails("imageTooLarge"));
});

test("animated WebP is rejected instead of silently dropping frames", async () => {
  const bytes = await sharp(Buffer.from([255, 0, 0, 0, 0, 255]), { raw: { width: 1, height: 2, channels: 3, pageHeight: 1 } })
    .webp({ loop: 0, delay: [100, 100] }).toBuffer();
  assert.equal((await sharp(bytes).metadata()).pages, 2);
  await assert.rejects(normalizeProjectImage(bytes, "image/webp"), fails("invalidImage"));
});

test("multipart parsing preserves case-sensitive browser boundaries and image bytes", async () => {
  const boundary = "----WebKitFormBoundaryMixedCASE123";
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="project_id"\r\n\r\nfixture\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="diagram.png"\r\nContent-Type: image/png\r\n\r\n`),
    bytes, Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const request = new Request("http://localhost/project-images", { method: "POST", headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` }, body });
  const form = await readImageForm(request);
  assert.equal(form.get("project_id"), "fixture");
  const image = form.get("file"); assert.ok(image instanceof File);
  assert.equal(image.type, "image/png");
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
});
