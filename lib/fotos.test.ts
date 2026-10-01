import { expect, test } from "vitest";
import { validarArquivoFoto } from "./fotos";

test("aceita jpg/png/webp até 5 MB", () => {
  expect(validarArquivoFoto({ type: "image/jpeg", size: 2_000_000 })).toBeNull();
  expect(validarArquivoFoto({ type: "image/webp", size: 5 * 1024 * 1024 })).toBeNull();
});
test("recusa HEIC com orientação", () => {
  expect(validarArquivoFoto({ type: "image/heic", size: 1000 })).toMatch(/JPG, PNG ou WebP/);
});
test("recusa PDF e arquivos grandes", () => {
  expect(validarArquivoFoto({ type: "application/pdf", size: 1000 })).toMatch(/JPG, PNG ou WebP/);
  expect(validarArquivoFoto({ type: "image/png", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
});
