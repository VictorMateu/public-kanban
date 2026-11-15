import { IMAGE_LIMITS, stagedImageFileSchema } from "./image-input.ts";
import type { RichTextDocument, RichTextBlock } from "./rich-text.ts";

type StagedImage = { file: File; url: string; uploadedId?: string };

// One store belongs to a creation form, including both rich-text fields.
export class ProjectImageStaging {
  private entries = new Map<string, StagedImage>();
  private bytes = 0;

  stage(file: File) {
    if (!stagedImageFileSchema.safeParse(file).success) return { success: false, error: "invalidImage" } as const;
    if (file.size > IMAGE_LIMITS.sourceBytes) return { success: false, error: "imageTooLarge" } as const;
    if (this.bytes + file.size > IMAGE_LIMITS.stagedBytes) return { success: false, error: "stagingTooLarge" } as const;
    const id = crypto.randomUUID();
    this.entries.set(id, { file, url: URL.createObjectURL(file) });
    this.bytes += file.size;
    return { success: true, id } as const;
  }

  previewUrl = (id: string): string | undefined => this.entries.get(id)?.url;
  get(id: string) { return this.entries.get(id); }
  discard(id: string) {
    const image = this.entries.get(id);
    if (!image) return;
    URL.revokeObjectURL(image.url);
    this.bytes -= image.file.size;
    this.entries.delete(id);
  }
  uploaded(id: string, assetId: string) {
    const image = this.entries.get(id);
    if (image) image.uploadedId = assetId;
  }
  dispose() { for (const id of this.entries.keys()) this.discard(id); }

  resolve(document: RichTextDocument): RichTextDocument {
    const content = document.content.flatMap<RichTextBlock>((node) => {
      if (node.type !== "image") return [node];
      const staged = this.entries.get(node.attrs.assetId);
      if (!staged) return [node];
      return staged.uploadedId ? [{ ...node, attrs: { ...node.attrs, assetId: staged.uploadedId } }] : [];
    });
    return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
  }
}
