export const PROJECT_IMAGE_UPLOAD_PATH = "/project-images";
export const PROJECT_IMAGE_PREVIEW_PARAM = "preview";
export const PROJECT_SAVED_PARAM = "saved";
export const PROJECT_NOT_FOUND_HEADER = "x-project-garden-not-found";
export const ENABLED_QUERY_FLAG = "1";

export function projectImageUrl(assetId: string, preview = false): string {
  const path = PROJECT_IMAGE_UPLOAD_PATH + "/" + encodeURIComponent(assetId);
  return preview ? path + "?" + new URLSearchParams({ [PROJECT_IMAGE_PREVIEW_PARAM]: ENABLED_QUERY_FLAG }) : path;
}

export function savedProjectUrl(slug: string): string {
  return "/projects/" + encodeURIComponent(slug) + "?" + new URLSearchParams({ [PROJECT_SAVED_PARAM]: ENABLED_QUERY_FLAG });
}
