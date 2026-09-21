import { apiRequest } from "./client";

export type UploadImageResult = {
  url: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function isUploadableImage(file: File) {
  return IMAGE_TYPES.has(file.type.toLowerCase());
}

/** POST /upload (field name `image`). JPEG, PNG, WebP only. */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file, file.name);
  const payload = await apiRequest<UploadImageResult | { url?: string }>(
    "/upload",
    { method: "POST", body },
  );
  const url =
    payload && typeof payload === "object" && "url" in payload
      ? payload.url
      : undefined;
  if (!url) {
    throw new Error("Upload succeeded but no URL was returned");
  }
  return url;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Persist a local file for distributor documents.
 * Images go through POST /upload; other types (e.g. PDF) are stored as data URLs
 * because the upload endpoint only accepts JPEG/PNG/WebP.
 */
export async function persistDocumentFile(file: File): Promise<string> {
  if (isUploadableImage(file)) {
    return uploadImage(file);
  }
  return readFileAsDataUrl(file);
}

function isPersistableHttpOrDataUrl(url: string | undefined): url is string {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  );
}

/**
 * Resolve item photos to permanent URLs for POST/PATCH /items.
 * API expects `photos: string[]` (URLs), not objects.
 */
export async function resolveItemPhotoUrls(
  photos: Array<{ url: string; file?: File }>,
): Promise<string[]> {
  const urls: string[] = [];
  for (const photo of photos) {
    if (photo.file) {
      if (!isUploadableImage(photo.file)) {
        throw new Error(
          "Item photos must be JPEG, PNG, or WebP.",
        );
      }
      urls.push(await uploadImage(photo.file));
      continue;
    }
    if (isPersistableHttpOrDataUrl(photo.url)) {
      urls.push(photo.url);
    }
  }
  return urls;
}
