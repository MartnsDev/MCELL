import sharp from "sharp";
import { StoreError } from "./server";
export async function safeImage(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError("Imagem ausente.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 5 * 1024 * 1024) {
      await reader.cancel();
      throw new StoreError("Cada imagem deve ter até 5 MB.", 413);
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp)
    throw new StoreError("Use uma imagem JPEG, PNG ou WebP válida.");
  try {
    const clean = await sharp(bytes, { limitInputPixels: 20000000 })
      .rotate()
      .resize({
        width: 2200,
        height: 2200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    return { bytes: clean, extension: "webp", mime: "image/webp" };
  } catch {
    throw new StoreError(
      "A imagem não pôde ser lida. Use JPEG, PNG ou WebP válido.",
    );
  }
}
