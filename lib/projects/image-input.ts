import { z } from "zod";

export const IMAGE_LIMITS = { sourceBytes: 8 * 1024 * 1024, stagedBytes: 32 * 1024 * 1024, requestBytes: 8 * 1024 * 1024 + 65536, pixels: 25_000_000, outputBytes: 2 * 1024 * 1024, dimension: 4096 } as const;
export const imageAltSchema = z.string().trim().min(1).max(300).refine((text) => !text.includes("\0"));
export const imageUploadResultSchema = z.discriminatedUnion("success", [
  z.strictObject({ success: z.literal(true), assetId: z.uuid() }),
  z.strictObject({ success: z.literal(false), error: z.enum(["unauthorized", "invalidImage", "imageTooLarge", "uploadUnavailable"]) }),
]);
export type ImageUploadResult = z.infer<typeof imageUploadResultSchema>;

export const stagedImageFileSchema = z.instanceof(File).refine((file) => file.size > 0 && ["image/jpeg", "image/png", "image/webp"].includes(file.type));
