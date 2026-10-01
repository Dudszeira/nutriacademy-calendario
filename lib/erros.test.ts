import { describe, expect, test } from "vitest";
import { z } from "zod";
import { SESSAO_EXPIRADA, errosDeCampo, mensagemDoErroDb } from "./erros";

describe("mensagemDoErroDb", () => {
  test("FK em uso", () => expect(mensagemDoErroDb({ code: "23503" })).toMatch(/ainda existem aulas/));
  test("duplicado", () => expect(mensagemDoErroDb({ code: "23505" })).toMatch(/Já existe/));
  test("RLS bloqueou ou 0 linhas", () => {
    expect(mensagemDoErroDb({ code: "42501" })).toBe(SESSAO_EXPIRADA);
    expect(mensagemDoErroDb({ code: "PGRST116" })).toMatch(/não encontrado/);
  });
  test("genérico", () => expect(mensagemDoErroDb({ code: "XX000" })).toBe("Não foi possível salvar. Tente novamente."));
});

test("errosDeCampo pega a primeira mensagem de cada campo", () => {
  const r = z.object({ a: z.string().min(3, "curto"), b: z.string() }).safeParse({ a: "x", b: 1 });
  if (r.success) throw new Error("devia falhar");
  expect(errosDeCampo(r.error).a).toBe("curto");
  expect(errosDeCampo(r.error).b).toBeTypeOf("string");
});
