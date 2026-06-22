import { adminSupabase } from "./auth.js";

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export async function verifyStoredCourierDocument({
  storagePath,
  mimeType,
  claimedSize,
}: {
  storagePath: string;
  mimeType: string;
  claimedSize: number;
}) {
  const { data, error } = await adminSupabase.storage
    .from("courier-documents")
    .download(storagePath);
  if (error || !data) return false;

  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.byteLength !== claimedSize || bytes.byteLength <= 0 || bytes.byteLength > 8 * 1024 * 1024) {
    return false;
  }
  if (mimeType === "image/jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "application/pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  return false;
}
