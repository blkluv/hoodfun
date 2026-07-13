/**
 * Browser-side image compress for logo upload.
 * Max edge 512px, JPEG quality ~0.82.
 */

export async function compressImageFile(
  file: File,
  maxEdge = 512,
  quality = 0.82
): Promise<{ dataUrl: string; base64: string; contentType: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image must be under 8MB before compress");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const contentType = "image/jpeg";
  const dataUrl = canvas.toDataURL(contentType, quality);
  const base64 = dataUrl.split(",")[1] || "";
  if (!base64) throw new Error("Compress failed");

  return { dataUrl, base64, contentType };
}
