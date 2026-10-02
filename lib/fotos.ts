const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const LADO = 900;

export function validarArquivoFoto(f: { type: string; size: number }): string | null {
  if (!TIPOS.includes(f.type)) return "Formato não suportado. Envie JPG, PNG ou WebP (fotos HEIC do iPhone: exporte como JPG).";
  if (f.size > MAX_BYTES) return "A foto passa de 5 MB. Escolha uma imagem menor.";
  return null;
}

/** Recorta no centro em quadrado e reduz para no máx. 400×400 WebP. Só roda no navegador. */
export async function redimensionarParaWebp(f: File): Promise<Blob> {
  const img = await createImageBitmap(f);
  const lado = Math.min(img.width, img.height);
  const destino = Math.min(LADO, lado);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = destino;
  canvas.getContext("2d")!.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, destino, destino);
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Falha ao converter a imagem"))), "image/webp", 0.85),
  );
}

export function urlDaFoto(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/${path}`;
}
