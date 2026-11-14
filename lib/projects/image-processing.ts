import sharp from "sharp";
import { IMAGE_LIMITS } from "./image-input.ts";

export class ImageInputError extends Error {
  readonly code: "invalidImage" | "imageTooLarge";
  constructor(code: "invalidImage" | "imageTooLarge") { super(code); this.code = code; }
}

// Sniff an allowlisted raster signature before invoking any image decoder.
function rasterFormat(bytes: Buffer): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function normalizeProjectImage(bytes: Buffer, mime: string) {
  if (bytes.length > IMAGE_LIMITS.sourceBytes) throw new ImageInputError("imageTooLarge");
  const format = rasterFormat(bytes);
  if (!format || mime !== "image/" + format) throw new ImageInputError("invalidImage");
  try {
    const image = sharp(bytes, { limitInputPixels: IMAGE_LIMITS.pixels, failOn: "warning", sequentialRead: true });
    const metadata = await image.metadata();
    if (metadata.format !== format || (metadata.pages ?? 1) !== 1) throw new ImageInputError("invalidImage");
    const { data, info } = await image.autoOrient().resize({ width: IMAGE_LIMITS.dimension, height: IMAGE_LIMITS.dimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 }).timeout({ seconds: 10 }).toBuffer({ resolveWithObject: true });
    if (data.length > IMAGE_LIMITS.outputBytes) throw new ImageInputError("imageTooLarge");
    return { bytes: data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof ImageInputError) throw error;
    // Decoder details can contain untrusted file metadata; expose only stable codes.
    throw new ImageInputError("invalidImage");
  }
}

export async function readImageForm(request: Request): Promise<FormData> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > IMAGE_LIMITS.requestBytes)) throw new ImageInputError("imageTooLarge");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;") || !request.body) throw new ImageInputError("invalidImage");
  const reader = request.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > IMAGE_LIMITS.requestBytes) { await reader.cancel(); throw new ImageInputError("imageTooLarge"); }
      chunks.push(Uint8Array.from(chunk.value).buffer);
    }
  } finally { reader.releaseLock(); }
  const body = new Blob(chunks, { type: request.headers.get("content-type") ?? "" });
  try { return await new Response(body).formData(); }
  catch { throw new ImageInputError("invalidImage"); }
}
