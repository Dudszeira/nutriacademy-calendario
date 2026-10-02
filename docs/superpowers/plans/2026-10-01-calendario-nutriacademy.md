# Calendário NutriAcademy — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plataforma em que a equipe da NutriAcademy cadastra aulas num painel `/admin` e o calendário público (`calendario.escolanutriacademy.com.br`) se atualiza sozinho, mantendo o histórico mensal navegável.

**Architecture:** Um único app Next.js 16 (App Router) na Vercel. As páginas públicas são Server Components com ISR (`revalidate = 300`) e são revalidadas por `revalidatePath` a cada alteração feita no admin. O Supabase guarda os dados (Postgres), as contas (Auth) e as fotos (Storage). A segurança de escrita fica na RLS do Postgres, restrita a membros da tabela `equipe`. A lógica de datas, agenda e validação fica em módulos puros de `lib/`, testados com Vitest. Os fluxos completos são testados com Playwright.

**Tech Stack:** Next.js 16.3, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase (`@supabase/supabase-js` 2.117, `@supabase/ssr` 0.12), Zod 4, date-fns 4 + `@date-fns/tz` 1.5, sonner, Vitest 4, Playwright 1.63, tsx (scripts), sharp (seed).

**Spec:** `docs/superpowers/specs/2026-10-01-calendario-nutriacademy-design.md`

## Global Constraints

- Fuso de exibição: sempre `America/Sao_Paulo`. No banco, sempre `timestamptz` (UTC).
- URL de mês: `/AAAA/MM`, com mês de dois dígitos (`/2026/09`). Qualquer outra forma retorna 404.
- Formato de data e hora nos cards: `15/09 · 19h` (minutos só quando ≠ 0: `19h30`).
- Duração padrão da aula: 60 min. Hora padrão no formulário: 19:00. Faixa permitida: 15–600 min.
- "Realizada" é derivada: `inicio + duracao_min ≤ agora`. Nunca fica gravada.
- Professor ou categoria com aulas não pode ser excluído (FK `on delete restrict`). A mensagem informa N aulas.
- Foto do professor: JPG, PNG ou WebP de até 5 MB na entrada. É convertida no navegador para WebP quadrado de no máximo 400×400 e enviada ao bucket público `fotos`.
- Escrita (insert/update/delete e upload) só para usuários na tabela `equipe`. A leitura é pública.
- Nenhum segredo no código. Variáveis vêm da integração Supabase ↔ Vercel (`vercel env pull`).
- Toda a interface em português do Brasil. `<html lang="pt-BR">`.
- Não inferir gênero a partir de nomes: o campo `titulo` do professor ("Prof.", "Profª.", "Dr.") só é preenchido com valor confirmado pelo usuário.
- Identidade visual: dourado `#D8BB68` / `#AF9951`, verde `#046C1D`, cinza `#6A6758`, fontes Montserrat (títulos) e Roboto (texto). Valores extraídos de `escolanutriacademy.com.br` (Elementor kit `post-5.css`).
- Fora do escopo: busca e filtros, link ao vivo, gravação, descrição da aula, níveis de permissão, notificações, embed no WP e área do aluno.

## Review Focus

1. **Aula às 23h30 do último dia do mês** (em UTC já é o dia seguinte) precisa aparecer no mês certo, em São Paulo. O teste está na Task 2 (`limitesDoMes` e `anoMesDe`).
2. **URL de mês malformada** (`/2026/13`, `/2026/9`, `/abc/09`, `/1999/01`) deve dar 404, nunca erro 500 nem mês errado. Testado na Task 2 (`parseAnoMes`) e na Task 8 (e2e).
3. **Sessão expirada ou bloqueio da RLS ao salvar no admin.** O Supabase devolve 0 linhas sem erro quando a RLS bloqueia um update. O admin deve mostrar "sessão expirada / registro não encontrado", nunca um "salvo" falso. Coberto na Task 4 (`mensagemDoErroDb` com `PGRST116`), na Task 5 (`verificar-rls`) e no uso obrigatório de `.select().single()` nas actions (Tasks 11–13).
4. **Foto HEIC do iPhone, arquivo grande ou PDF** enviado como foto deve ser recusado com mensagem clara antes do upload. Testado na Task 4 (`validarArquivoFoto`).
5. **Excluir professor ou categoria que ainda têm aulas** deve mostrar "tem N aulas", nunca um erro genérico, e nada pode ser apagado. Testado na Task 4 (`mensagemDoErroDb` com `23503`) e na Task 13 (e2e).

---

## Estrutura de arquivos

```
app/
  layout.tsx                      fontes, Toaster, metadata base
  globals.css                     Tailwind v4 + tokens da marca
  not-found.tsx                   404 amigável
  (public)/
    page.tsx                      mês corrente
    [ano]/[mes]/page.tsx          mês específico
    professores/[slug]/page.tsx   aulas do professor
    aulas/[id]/ics/route.ts       download .ics
  admin/
    login/page.tsx                login (client form)
    login/actions.ts              entrar()
    (painel)/layout.tsx           navegação do admin + sair
    (painel)/actions.ts           sair()
    (painel)/page.tsx             aulas do mês (lista)
    (painel)/aulas/actions.ts     salvarAula, excluirAula
    (painel)/aulas/nova/page.tsx  nova / duplicar
    (painel)/aulas/[id]/page.tsx  editar
    (painel)/professores/…        page, novo/page, [id]/page, actions.ts
    (painel)/categorias/…         page, nova/page, [id]/page, actions.ts
components/
  ui/                             shadcn (gerado)
  publico/                        cabecalho, nav-mes, card-aula, adicionar-agenda, avatar-professor, pagina-do-mes
  admin/                          use-formulario, form-aula, form-professor, form-categoria, foto-upload, confirmar-exclusao, seletor-professor
lib/
  datas.ts (+test)                limites de mês, formatação, parse de URL
  agenda.ts (+test)               .ics e URL do Google Agenda
  schemas.ts (+test)              Zod + slugify
  erros.ts (+test)                Resultado, mensagens de erro do banco
  fotos.ts (+test)                validação e redimensionamento de foto, URL pública
  agrupar.ts (+test)              agrupar por mês, separar próximas/realizadas
  env.ts                          variáveis públicas obrigatórias
  supabase/publico.ts             cliente anônimo (cacheável)
  supabase/servidor.ts            cliente com cookies (admin)
  supabase/navegador.ts           cliente do browser (upload)
  db/tipos.ts                     tipos de domínio
  db/consultas.ts                 consultas tipadas
proxy.ts                          protege /admin/*
supabase/migrations/0001_inicial.sql
scripts/
  migrar.ts                       aplica migrations via POSTGRES_URL_NON_POOLING
  verificar-rls.ts                assertivas de segurança contra o banco real
  criar-usuario.ts                cria conta da equipe
  seed.ts + dados-setembro.json   carga inicial
e2e/
  publico.spec.ts, admin.spec.ts, ajudantes.ts, fixtures/foto.jpg
docs/guia-equipe.md
```

---

### Task 1: Scaffold do projeto, ferramentas de teste e Git

**Files:**
- Create: projeto Next.js na raiz, `vitest.config.ts`, `playwright.config.ts`, `lib/sanidade.test.ts` (removido no fim da task), `.gitignore` (gerado)

**Interfaces:**
- Produces: scripts npm `dev`, `build`, `start`, `test`, `test:e2e`, `db:migrar`, `db:rls`, `db:seed`, `usuario:criar`; alias `@/*` → raiz.

- [ ] **Step 1: Gerar o app numa pasta temporária e mover para a raiz** (a raiz já contém `docs/`, o que faz o `create-next-app` recusar)

```bash
SCR=/tmp/claude-1001/-home-ubuntu-Projetos-Clientes-NutriAcademy/92de7069-ea30-42fb-9fde-a582a01b9e39/scratchpad
cd $SCR && rm -rf app-tmp && npx create-next-app@16 app-tmp --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --turbopack --yes
rsync -a $SCR/app-tmp/ /home/ubuntu/Projetos/Clientes/NutriAcademy/ --exclude node_modules --exclude .git
cd /home/ubuntu/Projetos/Clientes/NutriAcademy && npm install
```

- [ ] **Step 2: Instalar as dependências**

```bash
npm i @supabase/supabase-js@^2.117 @supabase/ssr@^0.12 zod@^4 date-fns@^4 @date-fns/tz@^1.5
npm i -D vitest@^4 @playwright/test@^1.63 tsx postgres sharp
npx playwright install chromium
```

- [ ] **Step 3: Inicializar o shadcn e adicionar os componentes**

```bash
npx shadcn@latest init --yes --defaults
npx shadcn@latest add button input label select badge card table dialog alert-dialog dropdown-menu popover command sonner avatar separator skeleton
```
Se o `init` perguntar, escolha base library **Radix** e cor **Neutral**.

- [ ] **Step 4: Configurar o Vitest** — criar `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 5: Configurar o Playwright** — criar `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /publico\.spec\.ts/ },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100/2026/09",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 6: Adicionar scripts ao `package.json`** (mesclar no bloco `scripts`)

```json
"test": "vitest run",
"test:e2e": "playwright test",
"db:migrar": "tsx --env-file=.env.local scripts/migrar.ts",
"db:rls": "tsx --env-file=.env.local scripts/verificar-rls.ts",
"db:seed": "tsx --env-file=.env.local scripts/seed.ts",
"usuario:criar": "tsx --env-file=.env.local scripts/criar-usuario.ts"
```

- [ ] **Step 7: Teste de sanidade** — criar `lib/sanidade.test.ts`

```ts
import { expect, test } from "vitest";
test("vitest roda", () => expect(1 + 1).toBe(2));
```
Run: `npm test` → Expected: 1 passed. Depois apague o arquivo: `rm lib/sanidade.test.ts`.

- [ ] **Step 8: Garantir que `.gitignore` cobre `.env*`, `.vercel`, `test-results`, `playwright-report`** — acrescentar ao final do `.gitignore`:

```
.env*
!.env.example
.vercel
test-results
playwright-report
```

- [ ] **Step 9: Build e commit**

Run: `npm run build` → Expected: build concluído sem erros.

```bash
git init -b main && git add -A && git commit -m "chore: scaffold Next.js 16 + shadcn + vitest + playwright"
```

---

### Task 2: `lib/datas.ts` — datas no fuso de São Paulo

**Files:**
- Create: `lib/datas.ts`
- Test: `lib/datas.test.ts`

**Interfaces:**
- Produces:
  - `FUSO = "America/Sao_Paulo"`; `type AnoMes = { ano: number; mes: number }` (mês 1–12)
  - `limitesDoMes(am: AnoMes): { inicio: Date; fim: Date }` (fim exclusivo)
  - `anoMesDe(d: Date): AnoMes`, `mesAtual(agora?: Date): AnoMes`
  - `proximoMes(am): AnoMes`, `mesAnterior(am): AnoMes`
  - `parseAnoMes(ano: string, mes: string): AnoMes | null`
  - `caminhoDoMes(am): string` → `"/2026/09"`
  - `nomeDoMes(mes: number): string` → `"Setembro"`
  - `formatarDataHora(d: Date): string` → `"15/09 · 19h"`
  - `partesDoCard(d: Date): { dia: string; mesCurto: string; semana: string; hora: string }` → `{ dia: "15", mesCurto: "SET", semana: "ter", hora: "19h" }`
  - `jaRealizada(inicio: Date, duracaoMin: number, agora?: Date): boolean`
  - `paraInstante(data: "AAAA-MM-DD", hora: "HH:MM"): Date` (horário de São Paulo → instante)
  - `partesLocais(d: Date): { data: string; hora: string }`
  - `somarDias(data: "AAAA-MM-DD", dias: number): string`

- [ ] **Step 1: Escrever os testes que falham** — `lib/datas.test.ts`

```ts
import { describe, expect, test } from "vitest";
import {
  anoMesDe, caminhoDoMes, formatarDataHora, jaRealizada, limitesDoMes, mesAnterior,
  mesAtual, nomeDoMes, paraInstante, parseAnoMes, partesDoCard, partesLocais, proximoMes, somarDias,
} from "./datas";

describe("limitesDoMes", () => {
  test("setembro/2026 começa 00:00 em SP (03:00Z) e termina no início de outubro", () => {
    const { inicio, fim } = limitesDoMes({ ano: 2026, mes: 9 });
    expect(inicio.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
  test("dezembro vira o ano", () => {
    expect(limitesDoMes({ ano: 2026, mes: 12 }).fim.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("anoMesDe", () => {
  test("23h30 do dia 30/09 em SP (02:30Z de 01/10) pertence a setembro", () => {
    expect(anoMesDe(new Date("2026-10-01T02:30:00Z"))).toEqual({ ano: 2026, mes: 9 });
  });
  test("31/12 às 23h em SP pertence a dezembro do mesmo ano", () => {
    expect(anoMesDe(new Date("2027-01-01T02:00:00Z"))).toEqual({ ano: 2026, mes: 12 });
  });
  test("mesAtual usa o relógio de SP", () => {
    expect(mesAtual(new Date("2026-10-01T02:59:00Z"))).toEqual({ ano: 2026, mes: 9 });
    expect(mesAtual(new Date("2026-10-01T03:00:00Z"))).toEqual({ ano: 2026, mes: 10 });
  });
});

describe("navegação de mês", () => {
  test("próximo e anterior atravessam o ano", () => {
    expect(proximoMes({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 });
    expect(mesAnterior({ ano: 2026, mes: 1 })).toEqual({ ano: 2025, mes: 12 });
  });
  test("caminhoDoMes usa dois dígitos", () => {
    expect(caminhoDoMes({ ano: 2026, mes: 9 })).toBe("/2026/09");
  });
  test("nomeDoMes", () => {
    expect(nomeDoMes(9)).toBe("Setembro");
    expect(nomeDoMes(3)).toBe("Março");
  });
});

describe("parseAnoMes", () => {
  test("aceita AAAA/MM válidos", () => {
    expect(parseAnoMes("2026", "09")).toEqual({ ano: 2026, mes: 9 });
    expect(parseAnoMes("2026", "12")).toEqual({ ano: 2026, mes: 12 });
  });
  test.each([["2026", "13"], ["2026", "00"], ["2026", "9"], ["abc", "09"], ["1999", "01"], ["2101", "01"], ["2026", "09x"]])(
    "rejeita %s/%s", (a, m) => expect(parseAnoMes(a, m)).toBeNull(),
  );
});

describe("formatação", () => {
  test("hora cheia sem minutos, convertida para SP", () => {
    expect(formatarDataHora(new Date("2026-09-15T22:00:00Z"))).toBe("15/09 · 19h");
  });
  test("hora com minutos", () => {
    expect(formatarDataHora(new Date("2026-09-15T22:30:00Z"))).toBe("15/09 · 19h30");
  });
  test("partesDoCard", () => {
    expect(partesDoCard(new Date("2026-09-15T22:00:00Z"))).toEqual({ dia: "15", mesCurto: "SET", semana: "ter", hora: "19h" });
  });
});

describe("jaRealizada", () => {
  const inicio = new Date("2026-09-15T22:00:00Z");
  test("durante a aula ainda não foi realizada", () => {
    expect(jaRealizada(inicio, 60, new Date("2026-09-15T22:59:00Z"))).toBe(false);
  });
  test("ao terminar foi realizada", () => {
    expect(jaRealizada(inicio, 60, new Date("2026-09-15T23:00:00Z"))).toBe(true);
  });
});

describe("conversões do formulário", () => {
  test("paraInstante interpreta como horário de SP", () => {
    expect(paraInstante("2026-09-15", "19:00").toISOString()).toBe("2026-09-15T22:00:00.000Z");
  });
  test("partesLocais é o inverso", () => {
    expect(partesLocais(new Date("2026-10-01T02:30:00Z"))).toEqual({ data: "2026-09-30", hora: "23:30" });
  });
  test("somarDias atravessa mês e ano", () => {
    expect(somarDias("2026-09-28", 7)).toBe("2026-10-05");
    expect(somarDias("2026-12-29", 7)).toBe("2027-01-05");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/datas.test.ts` → Expected: FAIL (`Cannot find module './datas'`).

- [ ] **Step 3: Implementar** — `lib/datas.ts`

```ts
import { TZDate } from "@date-fns/tz";

export const FUSO = "America/Sao_Paulo";
export type AnoMes = { ano: number; mes: number };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEMANA_CURTA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const dois = (n: number) => String(n).padStart(2, "0");
const emSP = (d: Date) => new TZDate(d.getTime(), FUSO);

function inicioDe({ ano, mes }: AnoMes): Date {
  return new Date(new TZDate(ano, mes - 1, 1, 0, 0, 0, FUSO).getTime());
}

export function proximoMes({ ano, mes }: AnoMes): AnoMes {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export function mesAnterior({ ano, mes }: AnoMes): AnoMes {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

export function limitesDoMes(am: AnoMes): { inicio: Date; fim: Date } {
  return { inicio: inicioDe(am), fim: inicioDe(proximoMes(am)) };
}

export function anoMesDe(d: Date): AnoMes {
  const z = emSP(d);
  return { ano: z.getFullYear(), mes: z.getMonth() + 1 };
}

export function mesAtual(agora: Date = new Date()): AnoMes {
  return anoMesDe(agora);
}

export function parseAnoMes(ano: string, mes: string): AnoMes | null {
  if (!/^\d{4}$/.test(ano) || !/^(0[1-9]|1[0-2])$/.test(mes)) return null;
  const a = Number(ano);
  if (a < 2000 || a > 2100) return null;
  return { ano: a, mes: Number(mes) };
}

export function caminhoDoMes({ ano, mes }: AnoMes): string {
  return `/${ano}/${dois(mes)}`;
}

export function nomeDoMes(mes: number): string {
  return MESES[mes - 1];
}

function hora(z: TZDate): string {
  const min = z.getMinutes();
  return `${z.getHours()}h${min ? dois(min) : ""}`;
}

export function formatarDataHora(d: Date): string {
  const z = emSP(d);
  return `${dois(z.getDate())}/${dois(z.getMonth() + 1)} · ${hora(z)}`;
}

export function partesDoCard(d: Date) {
  const z = emSP(d);
  return { dia: dois(z.getDate()), mesCurto: MESES_CURTOS[z.getMonth()], semana: SEMANA_CURTA[z.getDay()], hora: hora(z) };
}

export function jaRealizada(inicio: Date, duracaoMin: number, agora: Date = new Date()): boolean {
  return inicio.getTime() + duracaoMin * 60_000 <= agora.getTime();
}

export function paraInstante(data: string, horaMin: string): Date {
  const [a, m, d] = data.split("-").map(Number);
  const [h, mi] = horaMin.split(":").map(Number);
  return new Date(new TZDate(a, m - 1, d, h, mi, 0, FUSO).getTime());
}

export function partesLocais(d: Date): { data: string; hora: string } {
  const z = emSP(d);
  return {
    data: `${z.getFullYear()}-${dois(z.getMonth() + 1)}-${dois(z.getDate())}`,
    hora: `${dois(z.getHours())}:${dois(z.getMinutes())}`,
  };
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/datas.test.ts` → Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/datas.ts lib/datas.test.ts && git commit -m "feat: utilitários de data no fuso de São Paulo"
```

---

### Task 3: `lib/agenda.ts` — arquivo .ics e link do Google Agenda

**Files:**
- Create: `lib/agenda.ts`
- Test: `lib/agenda.test.ts`

**Interfaces:**
- Consumes: `FUSO` de `lib/datas.ts`
- Produces:
  - `type EventoAgenda = { id: string; titulo: string; inicio: Date; duracaoMin: number; descricao: string }`
  - `gerarIcs(ev: EventoAgenda, agora?: Date): string`
  - `urlGoogleAgenda(ev: EventoAgenda): string`

- [ ] **Step 1: Escrever os testes que falham** — `lib/agenda.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { gerarIcs, urlGoogleAgenda, type EventoAgenda } from "./agenda";

const ev: EventoAgenda = {
  id: "11111111-1111-4111-8111-111111111111",
  titulo: "Nutrição, Futebol; e Alto Rendimento",
  inicio: new Date("2026-09-24T22:00:00Z"),
  duracaoMin: 90,
  descricao: "Com Guilherme Oliveira\nNutriAcademy",
};

describe("gerarIcs", () => {
  const ics = gerarIcs(ev, new Date("2026-09-01T12:00:00Z"));
  test("usa CRLF e envelopa VCALENDAR/VEVENT", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nBEGIN:VEVENT\r\n");
  });
  test("horários em UTC e fim = início + duração", () => {
    expect(ics).toContain("DTSTART:20260924T220000Z");
    expect(ics).toContain("DTEND:20260924T233000Z");
    expect(ics).toContain("DTSTAMP:20260901T120000Z");
  });
  test("UID estável e texto escapado", () => {
    expect(ics).toContain(`UID:${ev.id}@calendario.escolanutriacademy.com.br`);
    expect(ics).toContain("SUMMARY:Nutrição\\, Futebol\\; e Alto Rendimento");
    expect(ics).toContain("DESCRIPTION:Com Guilherme Oliveira\\nNutriAcademy");
  });
  test("dobra linhas longas em até 75 caracteres", () => {
    const longo = gerarIcs({ ...ev, titulo: "A".repeat(200) });
    for (const linha of longo.split("\r\n")) expect(linha.length).toBeLessThanOrEqual(75);
    expect(longo).toContain("\r\n A");
  });
});

describe("urlGoogleAgenda", () => {
  test("monta link de template com datas UTC", () => {
    const url = new URL(urlGoogleAgenda(ev));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(ev.titulo);
    expect(url.searchParams.get("dates")).toBe("20260924T220000Z/20260924T233000Z");
    expect(url.searchParams.get("ctz")).toBe("America/Sao_Paulo");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/agenda.test.ts` → Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar** — `lib/agenda.ts`

```ts
import { FUSO } from "./datas";

export type EventoAgenda = { id: string; titulo: string; inicio: Date; duracaoMin: number; descricao: string };

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fimDe = (ev: EventoAgenda) => new Date(ev.inicio.getTime() + ev.duracaoMin * 60_000);
const escapar = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function dobrar(linha: string): string {
  if (linha.length <= 75) return linha;
  const partes = [linha.slice(0, 75)];
  for (let i = 75; i < linha.length; i += 74) partes.push(" " + linha.slice(i, i + 74));
  return partes.join("\r\n");
}

export function gerarIcs(ev: EventoAgenda, agora: Date = new Date()): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NutriAcademy//Calendario//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@calendario.escolanutriacademy.com.br`,
    `DTSTAMP:${utc(agora)}`,
    `DTSTART:${utc(ev.inicio)}`,
    `DTEND:${utc(fimDe(ev))}`,
    `SUMMARY:${escapar(ev.titulo)}`,
    `DESCRIPTION:${escapar(ev.descricao)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

export function urlGoogleAgenda(ev: EventoAgenda): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titulo,
    dates: `${utc(ev.inicio)}/${utc(fimDe(ev))}`,
    details: ev.descricao,
    ctz: FUSO,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/agenda.test.ts` → Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/agenda.ts lib/agenda.test.ts && git commit -m "feat: geração de .ics e link do Google Agenda"
```

---

### Task 4: Validação, erros, fotos e agrupamento (módulos puros)

**Files:**
- Create: `lib/schemas.ts`, `lib/erros.ts`, `lib/fotos.ts`, `lib/agrupar.ts`, `lib/env.ts`
- Test: `lib/schemas.test.ts`, `lib/erros.test.ts`, `lib/fotos.test.ts`, `lib/agrupar.test.ts`

**Interfaces:**
- Consumes: `AnoMes`, `anoMesDe`, `jaRealizada` de `lib/datas.ts`
- Produces:
  - `aulaSchema`, `professorSchema`, `categoriaSchema` (Zod) e `slugify(t: string): string`
  - `type Resultado<T = undefined> = { ok: true; dados: T } | { ok: false; erro: string; campos?: Record<string, string> }`
  - `SESSAO_EXPIRADA: string`, `mensagemDoErroDb(e: { code?: string; message?: string }): string`, `errosDeCampo(e: z.ZodError): Record<string, string>`
  - `validarArquivoFoto(f: { type: string; size: number }): string | null`, `redimensionarParaWebp(f: File): Promise<Blob>` (só browser), `urlDaFoto(path: string | null): string | null`
  - `agruparPorMes<T extends { inicio: Date }>(itens: T[]): { anoMes: AnoMes; itens: T[] }[]`
  - `separarPorStatus<T extends { inicio: Date; duracaoMin: number }>(itens: T[], agora?: Date): { proximas: T[]; realizadas: T[] }`
  - `env.supabaseUrl`, `env.supabaseChave`

- [ ] **Step 1: Testes de schemas** — `lib/schemas.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { aulaSchema, categoriaSchema, professorSchema, slugify } from "./schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const aulaOk = { titulo: "Nutrição no Futebol", data: "2026-09-24", hora: "19:00", duracaoMin: "60", professorId: UUID, categoriaId: UUID };

describe("aulaSchema", () => {
  test("aceita aula válida e converte duração", () => {
    const r = aulaSchema.parse(aulaOk);
    expect(r.duracaoMin).toBe(60);
  });
  test.each([
    ["titulo", "ab"], ["data", "2026-02-31"], ["data", "24/09/2026"], ["hora", "24:00"],
    ["duracaoMin", "10"], ["duracaoMin", "601"], ["professorId", ""], ["categoriaId", "x"],
  ])("rejeita %s = %s", (campo, valor) => {
    expect(aulaSchema.safeParse({ ...aulaOk, [campo]: valor }).success).toBe(false);
  });
});

describe("professorSchema", () => {
  test("título vazio vira null", () => {
    expect(professorSchema.parse({ nome: "Samira Lima", titulo: "", slug: "samira-lima", fotoPath: "" }))
      .toEqual({ nome: "Samira Lima", titulo: null, slug: "samira-lima", fotoPath: null });
  });
  test("slug inválido", () => {
    expect(professorSchema.safeParse({ nome: "Samira", slug: "Samira Lima" }).success).toBe(false);
  });
});

describe("categoriaSchema", () => {
  test("cor precisa ser hex de 6 dígitos", () => {
    expect(categoriaSchema.safeParse({ nome: "Módulo", cor: "#6A6758" }).success).toBe(true);
    expect(categoriaSchema.safeParse({ nome: "Módulo", cor: "red" }).success).toBe(false);
  });
});

describe("slugify", () => {
  test("remove acentos, caixa e pontuação", () => {
    expect(slugify("  Profª. Ana Conceição! ")).toBe("prof-ana-conceicao");
    expect(slugify("fred estevam")).toBe("fred-estevam");
  });
});
```

- [ ] **Step 2: Testes de erros, fotos e agrupamento**

`lib/erros.test.ts`:
```ts
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
```

`lib/fotos.test.ts`:
```ts
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
```

`lib/agrupar.test.ts`:
```ts
import { expect, test } from "vitest";
import { agruparPorMes, separarPorStatus } from "./agrupar";

const a = (iso: string, duracaoMin = 60) => ({ inicio: new Date(iso), duracaoMin });

test("agrupa preservando a ordem recebida, no fuso de SP", () => {
  const g = agruparPorMes([a("2026-10-01T02:30:00Z"), a("2026-09-10T22:00:00Z"), a("2026-08-05T22:00:00Z")]);
  expect(g.map((x) => x.anoMes)).toEqual([{ ano: 2026, mes: 9 }, { ano: 2026, mes: 8 }]);
  expect(g[0].itens).toHaveLength(2);
});

test("separa próximas (asc) de realizadas (desc)", () => {
  const agora = new Date("2026-09-20T12:00:00Z");
  const { proximas, realizadas } = separarPorStatus(
    [a("2026-09-24T22:00:00Z"), a("2026-09-08T22:00:00Z"), a("2026-09-30T22:00:00Z"), a("2026-09-15T22:00:00Z")], agora,
  );
  expect(proximas.map((x) => x.inicio.getUTCDate())).toEqual([24, 30]);
  expect(realizadas.map((x) => x.inicio.getUTCDate())).toEqual([15, 8]);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL nos 4 arquivos novos (módulos inexistentes).

- [ ] **Step 4: Implementar `lib/schemas.ts`**

```ts
import { z } from "zod";

function dataExiste(s: string) {
  const [a, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const aulaSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título (mín. 3 letras)").max(160, "Título muito longo"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").refine(dataExiste, "Data inválida"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  duracaoMin: z.coerce.number().int("Use minutos inteiros").min(15, "Mínimo 15 minutos").max(600, "Máximo 10 horas"),
  professorId: z.uuid("Escolha o professor"),
  categoriaId: z.uuid("Escolha a categoria"),
});

export const professorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  titulo: z.string().trim().max(20, "Máx. 20 caracteres").optional().transform((v) => v || null),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  fotoPath: z.string().optional().transform((v) => v || null),
});

export const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(40),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)"),
});

export function slugify(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```
Nota: `ª` (U+00AA) não se decompõe em NFD; ele é removido pelo filtro `[^a-z0-9]`, então `"Profª."` vira `"prof"`.

- [ ] **Step 5: Implementar `lib/erros.ts`**

```ts
import { z } from "zod";

export type Resultado<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: Record<string, string> };

export const SESSAO_EXPIRADA = "Sua sessão expirou ou você não tem permissão. Entre novamente.";

export function mensagemDoErroDb(e: { code?: string; message?: string }): string {
  switch (e.code) {
    case "23503": return "Não é possível excluir: ainda existem aulas ligadas a este registro.";
    case "23505": return "Já existe um registro com esse nome ou endereço (slug).";
    case "42501": return SESSAO_EXPIRADA;
    case "PGRST116": return "Registro não encontrado ou sessão expirada. Recarregue a página.";
    default: return "Não foi possível salvar. Tente novamente.";
  }
}

export function errosDeCampo(e: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of e.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !campos[k]) campos[k] = issue.message;
  }
  return campos;
}
```

- [ ] **Step 6: Implementar `lib/env.ts` e `lib/fotos.ts`**

`lib/env.ts`:
```ts
function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export const env = {
  supabaseUrl: obrigatoria("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseChave: obrigatoria(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};
```

`lib/fotos.ts` (o import de `env` é preguiçoso para o teste rodar sem variáveis):
```ts
const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const LADO = 400;

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
```

- [ ] **Step 7: Implementar `lib/agrupar.ts`**

```ts
import { anoMesDe, jaRealizada, type AnoMes } from "./datas";

export function agruparPorMes<T extends { inicio: Date }>(itens: T[]): { anoMes: AnoMes; itens: T[] }[] {
  const grupos: { anoMes: AnoMes; itens: T[] }[] = [];
  for (const item of itens) {
    const am = anoMesDe(item.inicio);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.anoMes.ano === am.ano && ultimo.anoMes.mes === am.mes) ultimo.itens.push(item);
    else grupos.push({ anoMes: am, itens: [item] });
  }
  return grupos;
}

export function separarPorStatus<T extends { inicio: Date; duracaoMin: number }>(itens: T[], agora: Date = new Date()) {
  const porData = (x: T, y: T) => x.inicio.getTime() - y.inicio.getTime();
  const proximas = itens.filter((i) => !jaRealizada(i.inicio, i.duracaoMin, agora)).sort(porData);
  const realizadas = itens.filter((i) => jaRealizada(i.inicio, i.duracaoMin, agora)).sort((x, y) => porData(y, x));
  return { proximas, realizadas };
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test` → Expected: todos PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/ && git commit -m "feat: schemas Zod, mensagens de erro, validação de foto e agrupamento"
```

---

### Task 5: Provisionar o Supabase, migration, RLS e contas da equipe

**Files:**
- Create: `supabase/migrations/0001_inicial.sql`, `scripts/migrar.ts`, `scripts/verificar-rls.ts`, `scripts/criar-usuario.ts`, `.env.example`

**Interfaces:**
- Produces: tabelas `categorias`, `professores`, `aulas`, `equipe`; função `public.eh_equipe()`; bucket público `fotos`; variáveis em `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `_ANON_KEY`), `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`), `POSTGRES_URL_NON_POOLING`.

- [ ] **Step 1: (USUÁRIO) Login na Vercel** — pedir ao usuário para rodar no prompt: `! npx vercel login`. Aguardar a confirmação.

- [ ] **Step 2: Criar o projeto Vercel e provisionar o Supabase** — carregar a skill `vercel:marketplace` e seguir as instruções dela para instalar a integração **Supabase** no projeto. Antes:

```bash
npx vercel link --yes --project calendario-nutriacademy
```
Depois de provisionado:
```bash
npx vercel env pull .env.local --yes
grep -oE '^[A-Z_]+' .env.local | sort
```
Expected: lista com `NEXT_PUBLIC_SUPABASE_URL`, uma chave pública (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`), uma chave secreta (`SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`) e `POSTGRES_URL_NON_POOLING`. Se os nomes forem outros, ajuste `lib/env.ts` e os scripts desta task para os nomes reais. Não imprima os valores.

- [ ] **Step 3: Criar `.env.example`** (só nomes, sem valores)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
POSTGRES_URL_NON_POOLING=
E2E_EMAIL=
E2E_SENHA=
```

- [ ] **Step 4: Escrever a migration** — `supabase/migrations/0001_inicial.sql`

```sql
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cor text not null check (cor ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.professores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  titulo text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  foto_path text
);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  inicio timestamptz not null,
  duracao_min int not null default 60 check (duracao_min between 15 and 600),
  professor_id uuid not null references public.professores(id) on delete restrict,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index aulas_inicio_idx on public.aulas (inicio);
create index aulas_professor_idx on public.aulas (professor_id);

create table public.equipe (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function public.tocar_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger aulas_updated_at before update on public.aulas
  for each row execute function public.tocar_updated_at();

create function public.eh_equipe() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.equipe where user_id = auth.uid())
$$;

alter table public.categorias enable row level security;
alter table public.professores enable row level security;
alter table public.aulas enable row level security;
alter table public.equipe enable row level security; -- sem políticas: só service role

create policy "leitura publica" on public.categorias for select to anon, authenticated using (true);
create policy "equipe escreve" on public.categorias for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "leitura publica" on public.professores for select to anon, authenticated using (true);
create policy "equipe escreve" on public.professores for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "leitura publica" on public.aulas for select to anon, authenticated using (true);
create policy "equipe escreve" on public.aulas for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "equipe envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.eh_equipe());
create policy "equipe altera fotos" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.eh_equipe());
create policy "equipe remove fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.eh_equipe());
```

- [ ] **Step 5: Escrever o runner** — `scripts/migrar.ts`

```ts
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error("POSTGRES_URL_NON_POOLING ausente");
const sql = postgres(url, { ssl: "require", max: 1 });

await sql`create table if not exists public._migracoes (nome text primary key, aplicada_em timestamptz default now())`;
const dir = path.join(process.cwd(), "supabase/migrations");
for (const nome of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const [ja] = await sql`select 1 from public._migracoes where nome = ${nome}`;
  if (ja) { console.log(`= ${nome}`); continue; }
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(path.join(dir, nome), "utf8"));
    await tx`insert into public._migracoes (nome) values (${nome})`;
  });
  console.log(`+ ${nome}`);
}
await sql.end();
```
Acrescente ao final da migration `0001`: `alter table public._migracoes enable row level security;` (a tabela é criada antes pelo runner, então ela existe nesse momento).

- [ ] **Step 6: Aplicar**

Run: `npm run db:migrar` → Expected: `+ 0001_inicial.sql`. Rodar de novo → Expected: `= 0001_inicial.sql` (idempotente).

- [ ] **Step 7: (USUÁRIO) Desativar o cadastro público** — pedir ao usuário: no dashboard do Supabase, em *Authentication → Sign In / Providers*, desligar **"Allow new users to sign up"**. Isso é defesa em profundidade: mesmo com o signup ligado, a RLS só libera escrita para quem está em `equipe`.

- [ ] **Step 8: Script de contas** — `scripts/criar-usuario.ts`

```ts
import { createClient } from "@supabase/supabase-js";

const [email, senha] = process.argv.slice(2);
if (!email || !senha || senha.length < 12) {
  console.error("Uso: npm run usuario:criar -- <email> <senha com 12+ caracteres>");
  process.exit(1);
}
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
  { auth: { persistSession: false } },
);
const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) throw error;
const { error: e2 } = await admin.from("equipe").insert({ user_id: data.user.id });
if (e2) throw e2;
console.log(`Conta criada e adicionada à equipe: ${email}`);
```

- [ ] **Step 9: Criar a conta de teste E2E** — gerar uma senha aleatória e salvá-la em `.env.local` sem exibi-la:

```bash
SENHA=$(openssl rand -base64 18) && printf '\nE2E_EMAIL=e2e@nutriacademy.test\nE2E_SENHA=%s\n' "$SENHA" >> .env.local
npm run usuario:criar -- e2e@nutriacademy.test "$SENHA"
```
Expected: `Conta criada e adicionada à equipe: e2e@nutriacademy.test`. As contas reais da equipe serão criadas na Task 14.

- [ ] **Step 10: Verificação de segurança contra o banco real** — `scripts/verificar-rls.ts`

```ts
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const chavePublica = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
const anon = createClient(url, chavePublica, { auth: { persistSession: false } });

const leitura = await anon.from("aulas").select("id").limit(1);
assert.equal(leitura.error, null, "anon deve conseguir ler aulas");

const ins = await anon.from("categorias").insert({ nome: "rls-teste", cor: "#000000" });
assert.ok(ins.error, "anon NÃO pode inserir");

const upd = await anon.from("categorias").update({ cor: "#111111" }).neq("id", "00000000-0000-0000-0000-000000000000").select();
assert.equal(upd.data?.length ?? 0, 0, "anon NÃO pode alterar (0 linhas)");

const eq = await anon.from("equipe").select("user_id");
assert.equal(eq.data?.length ?? 0, 0, "anon NÃO pode listar a equipe");

const up = await anon.storage.from("fotos").upload(`rls-${Date.now()}.webp`, new Blob(["x"], { type: "image/webp" }));
assert.ok(up.error, "anon NÃO pode enviar fotos");

const logado = createClient(url, chavePublica, { auth: { persistSession: false } });
const { error: eLogin } = await logado.auth.signInWithPassword({ email: process.env.E2E_EMAIL!, password: process.env.E2E_SENHA! });
assert.equal(eLogin, null, "conta da equipe deve logar");
const ok = await logado.from("categorias").insert({ nome: `rls-${Date.now()}`, cor: "#000000" }).select("id").single();
assert.equal(ok.error, null, "equipe pode inserir");
await logado.from("categorias").delete().eq("id", ok.data!.id);

console.log("RLS OK");
```

Run: `npm run db:rls` → Expected: `RLS OK`.

- [ ] **Step 11: Commit**

```bash
git add supabase scripts .env.example package.json && git commit -m "feat: schema Supabase com RLS por equipe, bucket de fotos e scripts"
```

---

### Task 6: Clientes Supabase, tipos e consultas

**Files:**
- Create: `lib/supabase/publico.ts`, `lib/supabase/servidor.ts`, `lib/supabase/navegador.ts`, `lib/db/tipos.ts`, `lib/db/consultas.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: `env` (Task 4), `limitesDoMes`, `anoMesDe`, `AnoMes` (Task 2)
- Produces:
  - `clientePublico(): SupabaseClient` (sem cookies, cacheável), `clienteServidor(): Promise<SupabaseClient>` (cookies), `clienteAutenticado(): Promise<SupabaseClient | null>`, `clienteNavegador(): SupabaseClient`
  - Tipos: `Categoria { id; nome; cor }`, `Professor { id; nome; titulo: string | null; slug; fotoPath: string | null }`, `Aula { id; titulo; inicio: Date; duracaoMin: number; professor: Professor; categoria: Categoria }`
  - Consultas (todas recebem `sb: SupabaseClient` como 1º argumento): `aulasDoMes(sb, am): Promise<Aula[]>`, `mesVizinhoComAula(sb, am, dir: "anterior" | "proximo"): Promise<AnoMes | null>`, `professorPorSlug(sb, slug): Promise<Professor | null>`, `professorPorId(sb, id)`, `aulasDoProfessor(sb, professorId): Promise<Aula[]>`, `aulaPorId(sb, id): Promise<Aula | null>`, `listarProfessores(sb): Promise<Professor[]>`, `listarCategorias(sb): Promise<Categoria[]>`, `categoriaPorId(sb, id)`, `contarAulas(sb, coluna: "professor_id" | "categoria_id", id): Promise<number>`, `nomeExibicao(p: Professor): string`

- [ ] **Step 1: Clientes**

`lib/supabase/publico.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function clientePublico() {
  return createClient(env.supabaseUrl, env.supabaseChave, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

`lib/supabase/servidor.ts`:
```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function clienteServidor() {
  const loja = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseChave, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try { lista.forEach(({ name, value, options }) => loja.set(name, value, options)); } catch { /* Server Component: o proxy renova */ }
      },
    },
  });
}

/** Cliente com sessão válida, ou null. Use no início de toda Server Action do admin. */
export async function clienteAutenticado() {
  const sb = await clienteServidor();
  const { data } = await sb.auth.getUser();
  return data.user ? sb : null;
}
```
Run: `npm i server-only`.

`lib/supabase/navegador.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function clienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
```

- [ ] **Step 2: Tipos** — `lib/db/tipos.ts`

```ts
export type Categoria = { id: string; nome: string; cor: string };
export type Professor = { id: string; nome: string; titulo: string | null; slug: string; fotoPath: string | null };
export type Aula = { id: string; titulo: string; inicio: Date; duracaoMin: number; professor: Professor; categoria: Categoria };
```

- [ ] **Step 3: Consultas** — `lib/db/consultas.ts`

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { anoMesDe, limitesDoMes, type AnoMes } from "@/lib/datas";
import type { Aula, Categoria, Professor } from "./tipos";

const SELECT_AULA = "id, titulo, inicio, duracao_min, professor:professores!inner(id, nome, titulo, slug, foto_path), categoria:categorias!inner(id, nome, cor)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LinhaProfessor = { id: string; nome: string; titulo: string | null; slug: string; foto_path: string | null };
type LinhaAula = { id: string; titulo: string; inicio: string; duracao_min: number; professor: LinhaProfessor; categoria: Categoria };

const paraProfessor = (p: LinhaProfessor): Professor => ({ id: p.id, nome: p.nome, titulo: p.titulo, slug: p.slug, fotoPath: p.foto_path });
const paraAula = (a: LinhaAula): Aula => ({
  id: a.id, titulo: a.titulo, inicio: new Date(a.inicio), duracaoMin: a.duracao_min,
  professor: paraProfessor(a.professor), categoria: a.categoria,
});

function falhar(error: { message: string } | null): void {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export const nomeExibicao = (p: Professor) => (p.titulo ? `${p.titulo} ${p.nome}` : p.nome);

export async function aulasDoMes(sb: SupabaseClient, am: AnoMes): Promise<Aula[]> {
  const { inicio, fim } = limitesDoMes(am);
  const { data, error } = await sb.from("aulas").select(SELECT_AULA)
    .gte("inicio", inicio.toISOString()).lt("inicio", fim.toISOString()).order("inicio");
  falhar(error);
  return (data as unknown as LinhaAula[]).map(paraAula);
}

export async function mesVizinhoComAula(sb: SupabaseClient, am: AnoMes, dir: "anterior" | "proximo"): Promise<AnoMes | null> {
  const { inicio, fim } = limitesDoMes(am);
  const q = sb.from("aulas").select("inicio").limit(1);
  const { data, error } = dir === "anterior"
    ? await q.lt("inicio", inicio.toISOString()).order("inicio", { ascending: false })
    : await q.gte("inicio", fim.toISOString()).order("inicio", { ascending: true });
  falhar(error);
  return data?.[0] ? anoMesDe(new Date(data[0].inicio)) : null;
}

export async function aulaPorId(sb: SupabaseClient, id: string): Promise<Aula | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("aulas").select(SELECT_AULA).eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraAula(data as unknown as LinhaAula) : null;
}

export async function aulasDoProfessor(sb: SupabaseClient, professorId: string): Promise<Aula[]> {
  const { data, error } = await sb.from("aulas").select(SELECT_AULA).eq("professor_id", professorId).order("inicio");
  falhar(error);
  return (data as unknown as LinhaAula[]).map(paraAula);
}

export async function professorPorSlug(sb: SupabaseClient, slug: string): Promise<Professor | null> {
  const { data, error } = await sb.from("professores").select("*").eq("slug", slug).maybeSingle();
  falhar(error);
  return data ? paraProfessor(data) : null;
}

export async function professorPorId(sb: SupabaseClient, id: string): Promise<Professor | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("professores").select("*").eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraProfessor(data) : null;
}

export async function listarProfessores(sb: SupabaseClient): Promise<Professor[]> {
  const { data, error } = await sb.from("professores").select("*").order("nome");
  falhar(error);
  return (data ?? []).map(paraProfessor);
}

export async function listarCategorias(sb: SupabaseClient): Promise<Categoria[]> {
  const { data, error } = await sb.from("categorias").select("id, nome, cor").order("nome");
  falhar(error);
  return data ?? [];
}

export async function categoriaPorId(sb: SupabaseClient, id: string): Promise<Categoria | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("categorias").select("id, nome, cor").eq("id", id).maybeSingle();
  falhar(error);
  return data;
}

export async function contarAulas(sb: SupabaseClient, coluna: "professor_id" | "categoria_id", id: string): Promise<number> {
  const { count, error } = await sb.from("aulas").select("id", { count: "exact", head: true }).eq(coluna, id);
  falhar(error);
  return count ?? 0;
}
```

- [ ] **Step 4: Permitir imagens do Supabase** — `next.config.ts`

```ts
import type { NextConfig } from "next";

const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://exemplo.supabase.co");

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: supabase.hostname, pathname: "/storage/v1/object/public/**" }] },
};

export default nextConfig;
```

- [ ] **Step 5: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build` → Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib next.config.ts package.json package-lock.json && git commit -m "feat: clientes Supabase e consultas tipadas"
```

---

### Task 7: Carga inicial de setembro (seed)

Esta task vem antes das telas públicas porque os testes E2E dependem dos dados de `/2026/09`.

**Files:**
- Create: `scripts/dados-setembro.json`, `scripts/seed.ts`

**Interfaces:**
- Consumes: `slugify` (Task 4), `paraInstante` (Task 2)
- Produces: 4 categorias e as aulas e professores de setembro/2026 no banco, com fotos no bucket `fotos/professores/<slug>.webp`.

- [ ] **Step 1: Escrever os dados** — `scripts/dados-setembro.json`. Categoria e `titulo` são palpites; confirme no Step 2.

```json
{
  "categorias": [
    { "nome": "NutriOnfire", "cor": "#C2410C" },
    { "nome": "Certificação", "cor": "#046C1D" },
    { "nome": "Curadoria", "cor": "#AF9951" },
    { "nome": "Módulo", "cor": "#6A6758" }
  ],
  "aulas": [
    { "titulo": "Treinamento GAIA: um software para nutricionistas", "data": "2026-09-15", "hora": "19:00", "categoria": "NutriOnfire",
      "professor": { "nome": "Roberta Carbonari", "titulo": null, "foto": "https://escolanutriacademy.com.br/wp-content/uploads/2026/09/Roberta-Carbonari-1.jpg" } },
    { "titulo": "Nutrição no Futebol de Alto Rendimento", "data": "2026-09-24", "hora": "19:00", "categoria": "NutriOnfire",
      "professor": { "nome": "Guilherme Oliveira", "titulo": null, "foto": "https://escolanutriacademy.com.br/wp-content/uploads/2026/09/Guilherme-Oliveira.jpg" } },
    { "titulo": "Indicadores de Performance do seu Negócio", "data": "2026-09-08", "hora": "19:00", "categoria": "NutriOnfire",
      "professor": { "nome": "Fred Estevam", "titulo": null, "foto": "https://escolanutriacademy.com.br/wp-content/uploads/2026/09/Fred-Estevam-1.jpg" } },
    { "titulo": "Hotseat com Samira Lima", "data": "2026-09-21", "hora": "19:00", "categoria": "NutriOnfire",
      "professor": { "nome": "Samira Lima", "titulo": null, "foto": "https://escolanutriacademy.com.br/wp-content/uploads/2026/06/samira.jpg" } }
  ]
}
```

- [ ] **Step 2: (USUÁRIO) Confirmar os dados** — mostrar a tabela ao usuário e perguntar: (a) a categoria correta de cada aula; (b) o título de cada professor ("Prof.", "Profª.", "Dr." ou nenhum), já que o site atual mostra "Profª." para dois nomes e nada para os outros; (c) as cores das categorias. Atualizar o JSON com as respostas. **Não** preencher `titulo` sem confirmação.

- [ ] **Step 3: Escrever o seed** — `scripts/seed.ts` (idempotente: faz upsert por nome/slug e só insere a aula se não existir outra com mesmo título e início)

```ts
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { slugify } from "../lib/schemas";
import { paraInstante } from "../lib/datas";

type Dados = {
  categorias: { nome: string; cor: string }[];
  aulas: { titulo: string; data: string; hora: string; categoria: string; professor: { nome: string; titulo: string | null; foto: string | null } }[];
};

const dados: Dados = JSON.parse(readFileSync(new URL("./dados-setembro.json", import.meta.url), "utf8"));
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
  { auth: { persistSession: false } },
);

async function ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
}

const categorias = await ok(sb.from("categorias").upsert(dados.categorias, { onConflict: "nome" }).select("id, nome"));
const idCategoria = new Map(categorias.map((c) => [c.nome, c.id]));

for (const a of dados.aulas) {
  const slug = slugify(a.professor.nome);
  let foto_path: string | null = null;
  if (a.professor.foto) {
    const original = Buffer.from(await (await fetch(a.professor.foto)).arrayBuffer());
    const webp = await sharp(original).resize(400, 400, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
    foto_path = `professores/${slug}.webp`;
    await ok(sb.storage.from("fotos").upload(foto_path, webp, { contentType: "image/webp", upsert: true }));
  }
  const [prof] = await ok(sb.from("professores")
    .upsert({ nome: a.professor.nome, titulo: a.professor.titulo, slug, foto_path }, { onConflict: "slug" }).select("id"));
  const inicio = paraInstante(a.data, a.hora).toISOString();
  const existentes = await ok(sb.from("aulas").select("id").eq("titulo", a.titulo).eq("inicio", inicio));
  if (existentes.length) { console.log(`= ${a.titulo}`); continue; }
  const categoria_id = idCategoria.get(a.categoria);
  if (!categoria_id) throw new Error(`Categoria desconhecida: ${a.categoria}`);
  await ok(sb.from("aulas").insert({ titulo: a.titulo, inicio, professor_id: prof.id, categoria_id }));
  console.log(`+ ${a.titulo}`);
}
```

- [ ] **Step 4: Rodar duas vezes**

Run: `npm run db:seed` → Expected: 4 linhas `+ …`. Rodar de novo → Expected: 4 linhas `= …`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts scripts/dados-setembro.json && git commit -m "feat: seed com a programação de setembro/2026"
```

---

### Task 8: Identidade visual e página pública do mês

**Files:**
- Create: `public/logo-claro.webp`, `components/publico/cabecalho.tsx`, `components/publico/nav-mes.tsx`, `components/publico/avatar-professor.tsx`, `components/publico/adicionar-agenda.tsx`, `components/publico/card-aula.tsx`, `components/publico/pagina-do-mes.tsx`, `app/(public)/page.tsx`, `app/(public)/[ano]/[mes]/page.tsx`, `app/not-found.tsx`, `e2e/publico.spec.ts`
- Modify: `app/layout.tsx`, `app/globals.css`; delete `app/page.tsx` (do scaffold)

**Interfaces:**
- Consumes: `clientePublico`, `aulasDoMes`, `mesVizinhoComAula`, `nomeExibicao` (Task 6); `partesDoCard`, `jaRealizada`, `caminhoDoMes`, `nomeDoMes`, `mesAtual`, `parseAnoMes` (Task 2); `urlGoogleAgenda` (Task 3); `urlDaFoto` (Task 4)
- Produces: `<PaginaDoMes anoMes={AnoMes} />`, `<CardAula aula={Aula} />`, `<AvatarProfessor professor={Professor} tamanho={number} />`, `<AdicionarAgenda aulaId={string} urlGoogle={string} />`, `<Cabecalho />`. Usados pela Task 9.

- [ ] **Step 1: Escrever o E2E que falha** — `e2e/publico.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("mês de setembro/2026 lista as aulas em ordem", async ({ page }) => {
  await page.goto("/2026/09");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Setembro\s+2026/);
  const titulos = page.getByTestId("card-aula").getByRole("heading");
  await expect(titulos.first()).toHaveText("Indicadores de Performance do seu Negócio");
  await expect(page.getByText("Treinamento GAIA: um software para nutricionistas")).toBeVisible();
  const primeiro = page.getByTestId("card-aula").first();
  await expect(primeiro).toContainText("08");
  await expect(primeiro).toContainText("SET");
  await expect(primeiro).toContainText("ter · 19h");
});

test("aulas passadas aparecem como realizadas e sem botão de agenda", async ({ page }) => {
  await page.goto("/2026/09");
  const card = page.getByTestId("card-aula").first();
  await expect(card.getByText("Realizada")).toBeVisible();
  await expect(card.getByRole("button", { name: /Adicionar à agenda/ })).toHaveCount(0);
});

test.each(["/2026/13", "/2026/9", "/abc/09", "/1999/01"])("URL inválida %s dá 404", async ({ page }, url) => {
  const r = await page.goto(url);
  expect(r?.status()).toBe(404);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
});

test("mês sem aulas mostra estado vazio com navegação", async ({ page }) => {
  await page.goto("/2026/02");
  await expect(page.getByText("Programação ainda não publicada")).toBeVisible();
  await page.getByRole("link", { name: /próximo mês com aulas/i }).click();
  await expect(page).toHaveURL(/\/2026\/09$/);
});

test("a raiz abre o mês corrente", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
```
A navegação de `/2026/02` para `/2026/09` assume que não existem aulas entre março e agosto de 2026, o que vale com o seed da Task 7.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/publico.spec.ts --project=desktop` → Expected: FAIL (rotas inexistentes).

- [ ] **Step 3: Logo** — baixar o logo claro do site atual:

```bash
curl -sL https://escolanutriacademy.com.br/wp-content/uploads/2026/03/Light-logo-1.webp -o public/logo-claro.webp && file public/logo-claro.webp
```
Expected: `RIFF … Web/P image`. Meça com `node -e "require('sharp')('public/logo-claro.webp').metadata().then(m=>console.log(m.width,m.height))"` e use esses valores em `width`/`height` do `<Image>` no cabeçalho e no login.

- [ ] **Step 4: Tokens da marca** — em `app/globals.css`, manter os imports gerados pelo shadcn e **substituir** os valores de `:root` e `.dark` pelos abaixo (deixar as demais variáveis geradas como estão):

```css
:root {
  --background: #faf8f3;
  --foreground: #1c1b17;
  --card: #ffffff;
  --card-foreground: #1c1b17;
  --primary: #1c1b17;
  --primary-foreground: #faf8f3;
  --muted: #f0ece2;
  --muted-foreground: #6a6758;
  --accent: #f3ead2;
  --accent-foreground: #5c4a17;
  --border: #e6e0d0;
  --ring: #af9951;
  --marca-ouro: #d8bb68;
  --marca-ouro-escuro: #8a6f25; /* ouro com contraste AA para texto sobre fundo claro */
  --marca-verde: #046c1d;
  --radius: 0.75rem;
}
```
e, no bloco `@theme inline`, acrescentar:
```css
  --color-marca-ouro: var(--marca-ouro);
  --color-marca-ouro-escuro: var(--marca-ouro-escuro);
  --color-marca-verde: var(--marca-verde);
  --font-display: var(--font-montserrat);
  --font-sans: var(--font-roboto);
```
O site é só claro (o calendário público não terá tema escuro). Remova o bloco `.dark` se ele existir.

Animação discreta de entrada dos cards (spec §5), respeitando `prefers-reduced-motion`. Acrescente ao final de `globals.css`:
```css
@keyframes entrar { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: no-preference) {
  [data-testid="card-aula"] { animation: entrar 0.35s ease-out both; }
  li:nth-child(2) > [data-testid="card-aula"] { animation-delay: 40ms; }
  li:nth-child(3) > [data-testid="card-aula"] { animation-delay: 80ms; }
  li:nth-child(n + 4) > [data-testid="card-aula"] { animation-delay: 120ms; }
}
```

- [ ] **Step 5: Layout raiz** — `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Montserrat, Roboto } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["600", "700"] });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://calendario.escolanutriacademy.com.br"),
  title: { default: "Calendário NutriAcademy", template: "%s · NutriAcademy" },
  description: "Programação de aulas da Escola NutriAcademy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${roboto.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Componentes públicos**

`components/publico/cabecalho.tsx`:
```tsx
import Image from "next/image";
import Link from "next/link";

export function Cabecalho() {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" aria-label="Calendário NutriAcademy — início">
          {/* width/height: substituir pelos valores medidos no Step 3, mantendo altura 36 na renderização */}
          <Image src="/logo-claro.webp" alt="Escola NutriAcademy" width={160} height={36} priority className="h-9 w-auto" />
        </Link>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-marca-ouro">Calendário</span>
      </div>
    </header>
  );
}
```

`components/publico/avatar-professor.tsx`:
```tsx
import Image from "next/image";
import type { Professor } from "@/lib/db/tipos";
import { urlDaFoto } from "@/lib/fotos";

export function AvatarProfessor({ professor, tamanho = 40 }: { professor: Professor; tamanho?: number }) {
  const url = urlDaFoto(professor.fotoPath);
  const iniciais = professor.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return url ? (
    <Image src={url} alt="" width={tamanho} height={tamanho} className="shrink-0 rounded-full object-cover ring-2 ring-marca-ouro/40" style={{ width: tamanho, height: tamanho }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-accent font-display text-xs font-semibold text-accent-foreground" style={{ width: tamanho, height: tamanho }}>
      {iniciais}
    </span>
  );
}
```

`components/publico/adicionar-agenda.tsx`:
```tsx
"use client";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function AdicionarAgenda({ aulaId, urlGoogle }: { aulaId: string; urlGoogle: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarPlus className="size-4" aria-hidden /> Adicionar à agenda
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><a href={urlGoogle} target="_blank" rel="noopener noreferrer">Google Agenda</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={`/aulas/${aulaId}/ics`} download>Apple / Outlook (.ics)</a></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
A URL do Google é calculada no servidor (no card) e passada como string para o componente client, para não serializar `Date`.

`components/publico/card-aula.tsx`:
```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { urlGoogleAgenda } from "@/lib/agenda";
import { jaRealizada, partesDoCard } from "@/lib/datas";
import { nomeExibicao } from "@/lib/db/consultas";
import type { Aula } from "@/lib/db/tipos";
import { AdicionarAgenda } from "./adicionar-agenda";
import { AvatarProfessor } from "./avatar-professor";

export function CardAula({ aula, agora = new Date() }: { aula: Aula; agora?: Date }) {
  const p = partesDoCard(aula.inicio);
  const realizada = jaRealizada(aula.inicio, aula.duracaoMin, agora);
  const nome = nomeExibicao(aula.professor);
  return (
    <article data-testid="card-aula" className={`flex gap-4 rounded-[var(--radius)] border bg-card p-4 shadow-sm transition sm:p-5 ${realizada ? "opacity-60" : "hover:border-marca-ouro"}`}>
      <div className="flex w-14 shrink-0 flex-col items-center border-r pr-4 text-center">
        <span className="font-display text-3xl font-bold leading-none">{p.dia}</span>
        <span className="mt-1 text-[11px] font-semibold tracking-widest text-marca-ouro-escuro">{p.mesCurto}</span>
        <span className="mt-2 text-xs text-muted-foreground">{p.semana} · {p.hora}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge style={{ backgroundColor: aula.categoria.cor }} className="border-0 text-white">{aula.categoria.nome}</Badge>
          {realizada && <Badge variant="secondary">Realizada</Badge>}
        </div>
        <h2 className="font-display text-base font-semibold leading-snug sm:text-lg">{aula.titulo}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/professores/${aula.professor.slug}`} className="flex items-center gap-2 text-sm hover:underline">
            <AvatarProfessor professor={aula.professor} tamanho={36} />
            <span>{nome}</span>
          </Link>
          {!realizada && (
            <AdicionarAgenda
              aulaId={aula.id}
              urlGoogle={urlGoogleAgenda({ id: aula.id, titulo: aula.titulo, inicio: aula.inicio, duracaoMin: aula.duracaoMin, descricao: `Com ${nome} — Escola NutriAcademy` })}
            />
          )}
        </div>
      </div>
    </article>
  );
}
```

`components/publico/nav-mes.tsx`:
```tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { caminhoDoMes, nomeDoMes, type AnoMes } from "@/lib/datas";

export function NavMes({ anterior, proximo }: { anterior: AnoMes | null; proximo: AnoMes | null }) {
  const classe = "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm hover:border-marca-ouro";
  return (
    <nav aria-label="Navegar entre meses" className="flex items-center justify-between gap-2">
      {anterior ? (
        <Link href={caminhoDoMes(anterior)} className={classe} aria-label={`Mês anterior com aulas: ${nomeDoMes(anterior.mes)} ${anterior.ano}`}>
          <ChevronLeft className="size-4" aria-hidden /> {nomeDoMes(anterior.mes)}
        </Link>
      ) : <span />}
      {proximo ? (
        <Link href={caminhoDoMes(proximo)} className={classe} aria-label={`Próximo mês com aulas: ${nomeDoMes(proximo.mes)} ${proximo.ano}`}>
          {nomeDoMes(proximo.mes)} <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : <span />}
    </nav>
  );
}
```

`components/publico/pagina-do-mes.tsx`:
```tsx
import { clientePublico } from "@/lib/supabase/publico";
import { aulasDoMes, mesVizinhoComAula } from "@/lib/db/consultas";
import { nomeDoMes, type AnoMes } from "@/lib/datas";
import { Cabecalho } from "./cabecalho";
import { CardAula } from "./card-aula";
import { NavMes } from "./nav-mes";

export async function PaginaDoMes({ anoMes }: { anoMes: AnoMes }) {
  const sb = clientePublico();
  const [aulas, anterior, proximo] = await Promise.all([
    aulasDoMes(sb, anoMes),
    mesVizinhoComAula(sb, anoMes, "anterior"),
    mesVizinhoComAula(sb, anoMes, "proximo"),
  ]);
  const agora = new Date();
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-marca-ouro-escuro">Programação</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{nomeDoMes(anoMes.mes)} {anoMes.ano}</h1>
        </div>
        <NavMes anterior={anterior} proximo={proximo} />
        {aulas.length ? (
          <ol className="flex flex-col gap-3">
            {aulas.map((a) => <li key={a.id}><CardAula aula={a} agora={agora} /></li>)}
          </ol>
        ) : (
          <p className="rounded-[var(--radius)] border border-dashed bg-card p-10 text-center text-muted-foreground">
            Programação ainda não publicada.
          </p>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 7: Rotas**

`app/(public)/page.tsx`:
```tsx
import { PaginaDoMes } from "@/components/publico/pagina-do-mes";
import { mesAtual } from "@/lib/datas";

export const revalidate = 300;

export default function Inicio() {
  return <PaginaDoMes anoMes={mesAtual()} />;
}
```

`app/(public)/[ano]/[mes]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaginaDoMes } from "@/components/publico/pagina-do-mes";
import { nomeDoMes, parseAnoMes } from "@/lib/datas";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ ano: string; mes: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ano, mes } = await params;
  const am = parseAnoMes(ano, mes);
  if (!am) return {};
  const titulo = `Programação de ${nomeDoMes(am.mes)} ${am.ano}`;
  return { title: titulo, openGraph: { title: `${titulo} — NutriAcademy`, locale: "pt_BR", type: "website" } };
}

export default async function Mes({ params }: Props) {
  const { ano, mes } = await params;
  const am = parseAnoMes(ano, mes);
  if (!am) notFound();
  return <PaginaDoMes anoMes={am} />;
}
```

`app/not-found.tsx`:
```tsx
import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço não existe ou foi digitado errado.</p>
      <Link href="/" className="underline">Ver a programação deste mês</Link>
    </main>
  );
}
```
Apague `app/page.tsx` do scaffold (`git rm app/page.tsx`): ela conflita com `app/(public)/page.tsx`.

- [ ] **Step 8: Rodar o E2E e ver passar**

Run: `npx playwright test e2e/publico.spec.ts` → Expected: todos PASS (desktop e mobile).

- [ ] **Step 9: Conferência visual** — com `npm run dev` rodando, abrir `/2026/09` em 375 px e 1280 px (chrome-devtools MCP: `new_page`, `resize_page`, `take_screenshot`). Conferir: sem rolagem horizontal, card legível, badge com contraste e botão de agenda alcançável. Ajustar o que for preciso.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: página pública do mês com navegação, status e agenda"
```

---

### Task 9: Rota .ics e página do professor

**Files:**
- Create: `app/(public)/aulas/[id]/ics/route.ts`, `app/(public)/professores/[slug]/page.tsx`
- Modify: `e2e/publico.spec.ts` (acrescentar testes)

**Interfaces:**
- Consumes: `aulaPorId`, `professorPorSlug`, `aulasDoProfessor`, `nomeExibicao` (Task 6); `gerarIcs` (Task 3); `separarPorStatus`, `agruparPorMes` (Task 4); `CardAula`, `AvatarProfessor`, `Cabecalho` (Task 8); `nomeDoMes` (Task 2)

- [ ] **Step 1: Acrescentar os E2E que falham** — ao final de `e2e/publico.spec.ts`

```ts
test("página do professor lista as aulas dele", async ({ page }) => {
  await page.goto("/2026/09");
  await page.getByRole("link", { name: /Samira Lima/ }).first().click();
  await expect(page).toHaveURL(/\/professores\/samira-lima$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Samira Lima/);
  await expect(page.getByText("Hotseat com Samira Lima")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Realizadas" })).toBeVisible();
});

test("professor inexistente dá 404", async ({ page }) => {
  expect((await page.goto("/professores/nao-existe"))?.status()).toBe(404);
});

test(".ics com id inválido dá 404", async ({ request }) => {
  expect((await request.get("/aulas/nao-e-uuid/ics")).status()).toBe(404);
  expect((await request.get("/aulas/11111111-1111-4111-8111-111111111111/ics")).status()).toBe(404);
});
```
O `.ics` de uma aula real é testado em `admin.spec.ts` (Task 13), que cria uma aula futura, em 2030, de forma determinística.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/publico.spec.ts --project=desktop` → Expected: os testes novos falham (404 nas rotas novas onde se espera 200 ou heading).

- [ ] **Step 3: Rota .ics** — `app/(public)/aulas/[id]/ics/route.ts`

```ts
import { gerarIcs } from "@/lib/agenda";
import { aulaPorId, nomeExibicao } from "@/lib/db/consultas";
import { slugify } from "@/lib/schemas";
import { clientePublico } from "@/lib/supabase/publico";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aula = await aulaPorId(clientePublico(), id);
  if (!aula) return new Response("Aula não encontrada", { status: 404 });
  const ics = gerarIcs({
    id: aula.id, titulo: aula.titulo, inicio: aula.inicio, duracaoMin: aula.duracaoMin,
    descricao: `Com ${nomeExibicao(aula.professor)} — Escola NutriAcademy`,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(aula.titulo) || "aula"}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
```

- [ ] **Step 4: Página do professor** — `app/(public)/professores/[slug]/page.tsx`

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvatarProfessor } from "@/components/publico/avatar-professor";
import { Cabecalho } from "@/components/publico/cabecalho";
import { CardAula } from "@/components/publico/card-aula";
import { agruparPorMes, separarPorStatus } from "@/lib/agrupar";
import { nomeDoMes } from "@/lib/datas";
import { aulasDoProfessor, nomeExibicao, professorPorSlug } from "@/lib/db/consultas";
import { clientePublico } from "@/lib/supabase/publico";

export const revalidate = 300;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await professorPorSlug(clientePublico(), (await params).slug);
  return p ? { title: `Aulas com ${nomeExibicao(p)}` } : {};
}

export default async function PaginaProfessor({ params }: Props) {
  const sb = clientePublico();
  const professor = await professorPorSlug(sb, (await params).slug);
  if (!professor) notFound();
  const agora = new Date();
  const { proximas, realizadas } = separarPorStatus(await aulasDoProfessor(sb, professor.id), agora);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
        <div className="flex items-center gap-4">
          <AvatarProfessor professor={professor} tamanho={72} />
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{nomeExibicao(professor)}</h1>
        </div>
        {proximas.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">Próximas aulas</h2>
            <ol className="flex flex-col gap-3">{proximas.map((a) => <li key={a.id}><CardAula aula={a} agora={agora} /></li>)}</ol>
          </section>
        )}
        {realizadas.length > 0 && (
          <section className="flex flex-col gap-6">
            <h2 className="font-display text-lg font-semibold">Realizadas</h2>
            {agruparPorMes(realizadas).map((g) => (
              <div key={`${g.anoMes.ano}-${g.anoMes.mes}`} className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-marca-ouro-escuro">{nomeDoMes(g.anoMes.mes)} {g.anoMes.ano}</h3>
                <ol className="flex flex-col gap-3">{g.itens.map((a) => <li key={a.id}><CardAula aula={a} agora={agora} /></li>)}</ol>
              </div>
            ))}
          </section>
        )}
        {!proximas.length && !realizadas.length && <p className="text-muted-foreground">Nenhuma aula cadastrada ainda.</p>}
      </main>
    </>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx playwright test e2e/publico.spec.ts` → Expected: todos PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: página do professor e download .ics"
```

---

### Task 10: Autenticação do admin (proxy, login, sair, layout)

**Files:**
- Create: `proxy.ts`, `app/admin/login/page.tsx`, `app/admin/login/actions.ts`, `app/admin/(painel)/layout.tsx`, `app/admin/(painel)/actions.ts`, `app/admin/(painel)/page.tsx` (placeholder que a Task 13 substitui pela lista de aulas), `e2e/ajudantes.ts`, `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `env`, `clienteServidor` (Task 6)
- Produces: `entrar(prev, fd): Promise<Resultado>`, `sair(): Promise<void>`; ajudante E2E `entrarComoEquipe(page)` e `supabaseServico()`.

- [ ] **Step 1: Ajudantes e E2E que falham**

`e2e/ajudantes.ts`:
```ts
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Playwright não carrega .env.local sozinho
for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
  const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

export const PREFIXO = "[E2E]";

export async function entrarComoEquipe(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha").fill(process.env.E2E_SENHA!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export function supabaseServico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );
}

/** Apaga tudo que os testes criaram (prefixo [E2E]), na ordem das FKs. */
export async function limparDadosE2E() {
  const sb = supabaseServico();
  await sb.from("aulas").delete().like("titulo", `${PREFIXO}%`);
  const { data: profs } = await sb.from("professores").select("id, foto_path").like("nome", `${PREFIXO}%`);
  for (const p of profs ?? []) {
    await sb.from("aulas").delete().eq("professor_id", p.id);
    if (p.foto_path) await sb.storage.from("fotos").remove([p.foto_path]);
  }
  await sb.from("professores").delete().like("nome", `${PREFIXO}%`);
  await sb.from("categorias").delete().like("nome", `${PREFIXO}%`);
}
```

`e2e/admin.spec.ts`:
```ts
import { expect, test } from "@playwright/test";
import { entrarComoEquipe, limparDadosE2E } from "./ajudantes";

test.beforeAll(limparDadosE2E);
test.afterAll(limparDadosE2E);

test("sem sessão, /admin redireciona para o login", async ({ page }) => {
  await page.goto("/admin/professores");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("senha errada mostra erro", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("login e sair", async ({ page }) => {
  await entrarComoEquipe(page);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/admin.spec.ts` → Expected: FAIL (rotas inexistentes).

- [ ] **Step 3: Proxy** — `proxy.ts` (na raiz)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await sb.auth.getUser();
  const naTelaDeLogin = request.nextUrl.pathname === "/admin/login";
  if (!user && !naTelaDeLogin) return NextResponse.redirect(new URL("/admin/login", request.url));
  if (user && naTelaDeLogin) return NextResponse.redirect(new URL("/admin", request.url));
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
```

- [ ] **Step 4: Login**

`app/admin/login/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import type { Resultado } from "@/lib/erros";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function entrar(_: Resultado | null, fd: FormData): Promise<Resultado> {
  const email = String(fd.get("email") ?? "").trim();
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha) return { ok: false, erro: "Informe e-mail e senha." };
  const sb = await clienteServidor();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, erro: "E-mail ou senha incorretos." };
  redirect("/admin");
}
```

`app/admin/login/page.tsx`:
```tsx
"use client";
import Image from "next/image";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar } from "./actions";

export default function Login() {
  const [estado, acao, pendente] = useActionState(entrar, null);
  return (
    <main className="grid min-h-dvh place-items-center bg-primary px-4">
      <form action={acao} className="flex w-full max-w-sm flex-col gap-4 rounded-[var(--radius)] bg-card p-6 shadow-lg">
        <Image src="/logo-claro.webp" alt="Escola NutriAcademy" width={160} height={36} className="mx-auto h-9 w-auto rounded bg-primary p-1" />
        <h1 className="text-center font-display text-lg font-semibold">Painel do calendário</h1>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        {estado && !estado.ok && <p role="alert" className="text-sm text-destructive">{estado.erro}</p>}
        <Button type="submit" disabled={pendente}>{pendente ? "Entrando…" : "Entrar"}</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Layout do painel e sair**

`app/admin/(painel)/actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function sair() {
  const sb = await clienteServidor();
  await sb.auth.signOut();
  redirect("/admin/login");
}
```

`app/admin/(painel)/layout.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sair } from "./actions";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", rotulo: "Aulas" },
  { href: "/admin/professores", rotulo: "Professores" },
  { href: "/admin/categorias", rotulo: "Categorias" },
];

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <nav className="flex items-center gap-1" aria-label="Seções do painel">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent">{l.rotulo}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="text-sm text-muted-foreground hover:underline">Ver calendário ↗</Link>
            <form action={sair}><Button type="submit" variant="ghost" size="sm">Sair</Button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
```

`app/admin/(painel)/page.tsx` (temporário, substituído na Task 13):
```tsx
export default function Painel() {
  return <h1 className="font-display text-2xl font-bold">Aulas</h1>;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx playwright test e2e/admin.spec.ts` → Expected: 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: autenticação do painel admin com proxy e login"
```

---

### Task 11: Admin — Categorias (CRUD) e infraestrutura de formulários

**Files:**
- Create: `components/admin/use-formulario.ts`, `components/admin/campo.tsx`, `components/admin/confirmar-exclusao.tsx`, `components/admin/form-categoria.tsx`, `app/admin/(painel)/categorias/actions.ts`, `app/admin/(painel)/categorias/page.tsx`, `app/admin/(painel)/categorias/nova/page.tsx`, `app/admin/(painel)/categorias/[id]/page.tsx`
- Modify: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `clienteAutenticado`, `clienteServidor` (Task 6); `categoriaSchema` (Task 4); `Resultado`, `SESSAO_EXPIRADA`, `mensagemDoErroDb`, `errosDeCampo` (Task 4); `listarCategorias`, `categoriaPorId`, `contarAulas` (Task 6)
- Produces (reusados nas Tasks 12–13):
  - `useFormulario(acao: (prev: Resultado<{ destino: string }> | null, fd: FormData) => Promise<Resultado<{ destino: string }>>, mensagemOk: string)` → `{ estado, acao, pendente }`; em caso de sucesso faz `toast.success` + `router.push(destino)` + `router.refresh()`
  - `<Campo id rotulo erro? children />`
  - `<ConfirmarExclusao descricao: string; aoConfirmar: () => Promise<Resultado> />`
  - `salvarCategoria`, `excluirCategoria(id)`

- [ ] **Step 1: E2E que falha** — acrescentar a `e2e/admin.spec.ts` (importar `PREFIXO` de `./ajudantes`)

```ts
test("CRUD de categoria", async ({ page }) => {
  await entrarComoEquipe(page);
  await page.goto("/admin/categorias/nova");
  await page.getByLabel("Nome").fill(`${PREFIXO} Categoria`);
  await page.getByLabel("Cor (hex)").fill("#123456");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/admin\/categorias$/);
  await expect(page.getByText("Categoria salva.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`${PREFIXO} Categoria`) })).toBeVisible();

  await page.getByRole("row", { name: new RegExp(`${PREFIXO} Categoria`) }).getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Cor (hex)").fill("verde");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Cor inválida (use #RRGGBB)")).toBeVisible();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/admin.spec.ts -g "categoria"` → Expected: FAIL.

- [ ] **Step 3: Infraestrutura de formulários**

`components/admin/use-formulario.ts`:
```ts
"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { Resultado } from "@/lib/erros";

type Acao = (prev: Resultado<{ destino: string }> | null, fd: FormData) => Promise<Resultado<{ destino: string }>>;

export function useFormulario(acaoServidor: Acao, mensagemOk: string) {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(acaoServidor, null);
  useEffect(() => {
    if (!estado) return;
    if (estado.ok) {
      toast.success(mensagemOk);
      router.push(estado.dados.destino);
      router.refresh();
    } else {
      toast.error(estado.erro);
    }
  }, [estado, mensagemOk, router]);
  return { estado, acao, pendente, campos: estado && !estado.ok ? estado.campos ?? {} : {} };
}
```

`components/admin/campo.tsx`:
```tsx
import { Label } from "@/components/ui/label";

export function Campo({ id, rotulo, erro, children }: { id: string; rotulo: string; erro?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro && <p id={`${id}-erro`} role="alert" className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
```

`components/admin/confirmar-exclusao.tsx`:
```tsx
"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Resultado } from "@/lib/erros";

export function ConfirmarExclusao({ descricao, aoConfirmar }: { descricao: string; aoConfirmar: () => Promise<Resultado> }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive">Excluir</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir?</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pendente}
            onClick={() => iniciar(async () => {
              const r = await aoConfirmar();
              if (r.ok) { toast.success("Excluído."); router.refresh(); } else toast.error(r.erro);
            })}
          >Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: Actions de categoria** — `app/admin/(painel)/categorias/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { contarAulas } from "@/lib/db/consultas";
import { SESSAO_EXPIRADA, errosDeCampo, mensagemDoErroDb, type Resultado } from "@/lib/erros";
import { categoriaSchema } from "@/lib/schemas";
import { clienteAutenticado } from "@/lib/supabase/servidor";

export async function salvarCategoria(_: Resultado<{ destino: string }> | null, fd: FormData): Promise<Resultado<{ destino: string }>> {
  const sb = await clienteAutenticado();
  if (!sb) return { ok: false, erro: SESSAO_EXPIRADA };
  const p = categoriaSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, erro: "Revise os campos destacados.", campos: errosDeCampo(p.error) };
  const id = String(fd.get("id") ?? "");
  const q = id ? sb.from("categorias").update(p.data).eq("id", id) : sb.from("categorias").insert(p.data);
  const { error } = await q.select("id").single();
  if (error) return { ok: false, erro: mensagemDoErroDb(error) };
  revalidatePath("/", "layout");
  return { ok: true, dados: { destino: "/admin/categorias" } };
}

export async function excluirCategoria(id: string): Promise<Resultado> {
  const sb = await clienteAutenticado();
  if (!sb) return { ok: false, erro: SESSAO_EXPIRADA };
  const n = await contarAulas(sb, "categoria_id", id);
  if (n > 0) return { ok: false, erro: `Esta categoria tem ${n} aula${n > 1 ? "s" : ""}; mude a categoria dela${n > 1 ? "s" : ""} antes de excluir.` };
  const { error } = await sb.from("categorias").delete().eq("id", id).select("id").single();
  if (error) return { ok: false, erro: mensagemDoErroDb(error) };
  revalidatePath("/", "layout");
  return { ok: true, dados: undefined };
}
```

- [ ] **Step 5: Formulário e páginas**

`components/admin/form-categoria.tsx`:
```tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarCategoria } from "@/app/admin/(painel)/categorias/actions";
import type { Categoria } from "@/lib/db/tipos";
import { Campo } from "./campo";
import { useFormulario } from "./use-formulario";

const PALETA = ["#D8BB68", "#AF9951", "#046C1D", "#6A6758", "#C2410C", "#1C1B17"];

export function FormCategoria({ categoria }: { categoria?: Categoria }) {
  const { acao, pendente, campos } = useFormulario(salvarCategoria, "Categoria salva.");
  return (
    <form action={acao} className="flex max-w-md flex-col gap-4 rounded-[var(--radius)] border bg-card p-6">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <Campo id="nome" rotulo="Nome" erro={campos.nome}>
        <Input id="nome" name="nome" defaultValue={categoria?.nome} required aria-invalid={!!campos.nome} />
      </Campo>
      <Campo id="cor" rotulo="Cor (hex)" erro={campos.cor}>
        <Input id="cor" name="cor" defaultValue={categoria?.cor ?? PALETA[0]} placeholder="#D8BB68" aria-invalid={!!campos.cor} />
      </Campo>
      <div className="flex flex-wrap gap-2" aria-label="Cores da marca">
        {PALETA.map((c) => (
          <button key={c} type="button" title={c} aria-label={`Usar ${c}`} className="size-7 rounded-full border"
            style={{ backgroundColor: c }}
            onClick={(e) => { const i = e.currentTarget.form?.elements.namedItem("cor") as HTMLInputElement; i.value = c; }} />
        ))}
      </div>
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</Button>
    </form>
  );
}
```

`app/admin/(painel)/categorias/page.tsx`:
```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmarExclusao } from "@/components/admin/confirmar-exclusao";
import { listarCategorias } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";
import { excluirCategoria } from "./actions";

export default async function Categorias() {
  const categorias = await listarCategorias(await clienteServidor());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Categorias</h1>
        <Button asChild><Link href="/admin/categorias/nova">Nova categoria</Link></Button>
      </div>
      <Table className="rounded-[var(--radius)] border bg-card">
        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-40 text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {categorias.map((c) => (
            <TableRow key={c.id}>
              <TableCell><Badge style={{ backgroundColor: c.cor }} className="border-0 text-white">{c.nome}</Badge></TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm"><Link href={`/admin/categorias/${c.id}`}>Editar</Link></Button>
                <ConfirmarExclusao descricao={`A categoria "${c.nome}" será excluída.`} aoConfirmar={excluirCategoria.bind(null, c.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

`app/admin/(painel)/categorias/nova/page.tsx`:
```tsx
import { FormCategoria } from "@/components/admin/form-categoria";

export default function NovaCategoria() {
  return (<div className="flex flex-col gap-4"><h1 className="font-display text-2xl font-bold">Nova categoria</h1><FormCategoria /></div>);
}
```

`app/admin/(painel)/categorias/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { FormCategoria } from "@/components/admin/form-categoria";
import { categoriaPorId } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";

export default async function EditarCategoria({ params }: { params: Promise<{ id: string }> }) {
  const categoria = await categoriaPorId(await clienteServidor(), (await params).id);
  if (!categoria) notFound();
  return (<div className="flex flex-col gap-4"><h1 className="font-display text-2xl font-bold">Editar categoria</h1><FormCategoria categoria={categoria} /></div>);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx playwright test e2e/admin.spec.ts` → Expected: todos PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: CRUD de categorias e base de formulários do admin"
```

---

### Task 12: Admin — Professores (CRUD + upload de foto)

**Files:**
- Create: `components/admin/foto-upload.tsx`, `components/admin/form-professor.tsx`, `app/admin/(painel)/professores/actions.ts`, `app/admin/(painel)/professores/page.tsx`, `app/admin/(painel)/professores/novo/page.tsx`, `app/admin/(painel)/professores/[id]/page.tsx`, `e2e/fixtures/foto.jpg`
- Modify: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `useFormulario`, `Campo`, `ConfirmarExclusao` (Task 11); `professorSchema`, `slugify` (Task 4); `validarArquivoFoto`, `redimensionarParaWebp`, `urlDaFoto` (Task 4); `clienteNavegador` (Task 6); `listarProfessores`, `professorPorId`, `contarAulas`, `nomeExibicao` (Task 6); `AvatarProfessor` (Task 8)
- Produces: `salvarProfessor`, `excluirProfessor(id)`.

- [ ] **Step 1: Fixture e E2E que falha**

```bash
mkdir -p e2e/fixtures && node -e "require('sharp')({create:{width:800,height:600,channels:3,background:'#d8bb68'}}).jpeg().toFile('e2e/fixtures/foto.jpg')"
```

Acrescentar a `e2e/admin.spec.ts`:
```ts
test("CRUD de professor com foto", async ({ page }) => {
  await entrarComoEquipe(page);
  await page.goto("/admin/professores/novo");
  await page.getByLabel("Nome").fill(`${PREFIXO} Ana Teste`);
  await expect(page.getByLabel("Endereço (slug)")).toHaveValue("e2e-ana-teste");
  await page.getByLabel("Foto").setInputFiles("e2e/fixtures/foto.jpg");
  await expect(page.getByText("Foto pronta.")).toBeVisible();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/admin\/professores$/);
  const linha = page.getByRole("row", { name: /Ana Teste/ });
  await expect(linha.locator("img")).toBeVisible();
});

test("foto em formato não suportado é recusada", async ({ page }) => {
  await entrarComoEquipe(page);
  await page.goto("/admin/professores/novo");
  await page.getByLabel("Foto").setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await expect(page.getByText(/Envie JPG, PNG ou WebP/)).toBeVisible();
});
```
O teste "excluir professor com aulas" fica na Task 13, porque precisa de uma aula.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/admin.spec.ts -g "professor|foto"` → Expected: FAIL.

- [ ] **Step 3: Upload de foto** — `components/admin/foto-upload.tsx`

```tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { redimensionarParaWebp, urlDaFoto, validarArquivoFoto } from "@/lib/fotos";
import { clienteNavegador } from "@/lib/supabase/navegador";

export function FotoUpload({ inicial }: { inicial: string | null }) {
  const [path, setPath] = useState(inicial ?? "");
  const [status, setStatus] = useState<{ tipo: "ok" | "erro" | "enviando"; texto: string } | null>(null);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const erro = validarArquivoFoto(arquivo);
    if (erro) { setStatus({ tipo: "erro", texto: erro }); e.target.value = ""; return; }
    setStatus({ tipo: "enviando", texto: "Enviando foto…" });
    try {
      const blob = await redimensionarParaWebp(arquivo);
      const destino = `professores/${crypto.randomUUID()}.webp`;
      const { error } = await clienteNavegador().storage.from("fotos").upload(destino, blob, { contentType: "image/webp" });
      if (error) throw error;
      setPath(destino);
      setStatus({ tipo: "ok", texto: "Foto pronta." });
    } catch {
      setStatus({ tipo: "erro", texto: "Não foi possível enviar a foto. Verifique a conexão e tente de novo." });
    }
  }

  const url = urlDaFoto(path || null);
  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="size-16 rounded-full object-cover" /> : <span className="size-16 rounded-full bg-muted" />}
      <div className="flex flex-1 flex-col gap-1">
        <Input id="foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={aoEscolher} aria-describedby="foto-status" />
        <input type="hidden" name="fotoPath" value={path} />
        {status && (
          <p id="foto-status" role={status.tipo === "erro" ? "alert" : "status"} className={`text-sm ${status.tipo === "erro" ? "text-destructive" : "text-muted-foreground"}`}>
            {status.texto}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Actions** — `app/admin/(painel)/professores/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { contarAulas } from "@/lib/db/consultas";
import { SESSAO_EXPIRADA, errosDeCampo, mensagemDoErroDb, type Resultado } from "@/lib/erros";
import { professorSchema } from "@/lib/schemas";
import { clienteAutenticado } from "@/lib/supabase/servidor";

export async function salvarProfessor(_: Resultado<{ destino: string }> | null, fd: FormData): Promise<Resultado<{ destino: string }>> {
  const sb = await clienteAutenticado();
  if (!sb) return { ok: false, erro: SESSAO_EXPIRADA };
  const p = professorSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, erro: "Revise os campos destacados.", campos: errosDeCampo(p.error) };
  const linha = { nome: p.data.nome, titulo: p.data.titulo, slug: p.data.slug, foto_path: p.data.fotoPath };
  const id = String(fd.get("id") ?? "");
  const q = id ? sb.from("professores").update(linha).eq("id", id) : sb.from("professores").insert(linha);
  const { error } = await q.select("id").single();
  if (error) return { ok: false, erro: mensagemDoErroDb(error), campos: error.code === "23505" ? { slug: "Este endereço já está em uso." } : undefined };
  revalidatePath("/", "layout");
  return { ok: true, dados: { destino: "/admin/professores" } };
}

export async function excluirProfessor(id: string): Promise<Resultado> {
  const sb = await clienteAutenticado();
  if (!sb) return { ok: false, erro: SESSAO_EXPIRADA };
  const n = await contarAulas(sb, "professor_id", id);
  if (n > 0) return { ok: false, erro: `Este professor tem ${n} aula${n > 1 ? "s" : ""}; reatribua-${n > 1 ? "as" : "a"} antes de excluir.` };
  const { data, error } = await sb.from("professores").delete().eq("id", id).select("foto_path").single();
  if (error) return { ok: false, erro: mensagemDoErroDb(error) };
  if (data.foto_path) await sb.storage.from("fotos").remove([data.foto_path]);
  revalidatePath("/", "layout");
  return { ok: true, dados: undefined };
}
```

- [ ] **Step 5: Formulário** — `components/admin/form-professor.tsx` (o slug acompanha o nome até ser editado manualmente)

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarProfessor } from "@/app/admin/(painel)/professores/actions";
import type { Professor } from "@/lib/db/tipos";
import { slugify } from "@/lib/schemas";
import { Campo } from "./campo";
import { FotoUpload } from "./foto-upload";
import { useFormulario } from "./use-formulario";

export function FormProfessor({ professor }: { professor?: Professor }) {
  const { acao, pendente, campos } = useFormulario(salvarProfessor, "Professor salvo.");
  const [slug, setSlug] = useState(professor?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!professor);
  return (
    <form action={acao} className="flex max-w-lg flex-col gap-4 rounded-[var(--radius)] border bg-card p-6">
      {professor && <input type="hidden" name="id" value={professor.id} />}
      <Campo id="nome" rotulo="Nome" erro={campos.nome}>
        <Input id="nome" name="nome" defaultValue={professor?.nome} required
          onChange={(e) => { if (!slugManual) setSlug(slugify(e.target.value)); }} />
      </Campo>
      <Campo id="titulo" rotulo="Título (opcional)" erro={campos.titulo}>
        <Input id="titulo" name="titulo" defaultValue={professor?.titulo ?? ""} placeholder="Prof., Profª., Dr., Dra.…" />
      </Campo>
      <Campo id="slug" rotulo="Endereço (slug)" erro={campos.slug}>
        <Input id="slug" name="slug" value={slug} required onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }} />
        <p className="text-xs text-muted-foreground">calendario.escolanutriacademy.com.br/professores/{slug || "…"}</p>
      </Campo>
      <Campo id="foto" rotulo="Foto">
        <FotoUpload inicial={professor?.fotoPath ?? null} />
      </Campo>
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</Button>
    </form>
  );
}
```

- [ ] **Step 6: Páginas**

`app/admin/(painel)/professores/page.tsx`:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmarExclusao } from "@/components/admin/confirmar-exclusao";
import { AvatarProfessor } from "@/components/publico/avatar-professor";
import { listarProfessores, nomeExibicao } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";
import { excluirProfessor } from "./actions";

export default async function Professores() {
  const professores = await listarProfessores(await clienteServidor());
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Professores</h1>
        <Button asChild><Link href="/admin/professores/novo">Novo professor</Link></Button>
      </div>
      <Table className="rounded-[var(--radius)] border bg-card">
        <TableHeader><TableRow><TableHead>Professor</TableHead><TableHead className="w-40 text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
          {professores.map((p) => (
            <TableRow key={p.id}>
              <TableCell><span className="flex items-center gap-3"><AvatarProfessor professor={p} tamanho={36} />{nomeExibicao(p)}</span></TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm"><Link href={`/admin/professores/${p.id}`}>Editar</Link></Button>
                <ConfirmarExclusao descricao={`${p.nome} será excluído(a) do calendário.`} aoConfirmar={excluirProfessor.bind(null, p.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

`app/admin/(painel)/professores/novo/page.tsx`:
```tsx
import { FormProfessor } from "@/components/admin/form-professor";

export default function NovoProfessor() {
  return (<div className="flex flex-col gap-4"><h1 className="font-display text-2xl font-bold">Novo professor</h1><FormProfessor /></div>);
}
```

`app/admin/(painel)/professores/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { FormProfessor } from "@/components/admin/form-professor";
import { professorPorId } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";

export default async function EditarProfessor({ params }: { params: Promise<{ id: string }> }) {
  const professor = await professorPorId(await clienteServidor(), (await params).id);
  if (!professor) notFound();
  return (<div className="flex flex-col gap-4"><h1 className="font-display text-2xl font-bold">Editar professor</h1><FormProfessor professor={professor} /></div>);
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx playwright test e2e/admin.spec.ts` → Expected: todos PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: CRUD de professores com upload e redimensionamento de foto"
```

---

### Task 13: Admin — Aulas (lista por mês, criar, editar, duplicar, excluir)

**Files:**
- Create: `components/admin/seletor-professor.tsx`, `components/admin/form-aula.tsx`, `app/admin/(painel)/aulas/actions.ts`, `app/admin/(painel)/aulas/nova/page.tsx`, `app/admin/(painel)/aulas/[id]/page.tsx`
- Modify: `app/admin/(painel)/page.tsx` (substituir o placeholder), `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: Tasks 2, 4, 6, 8, 11, 12. Especialmente `paraInstante`, `partesLocais`, `somarDias`, `anoMesDe`, `mesAtual`, `proximoMes`, `mesAnterior`, `nomeDoMes`, `formatarDataHora`; `aulaSchema`; `aulasDoMes`, `aulaPorId`, `listarProfessores`, `listarCategorias`, `nomeExibicao`
- Produces: `salvarAula`, `excluirAula(id)`; `FormAula` com props `{ professores: Professor[]; categorias: Categoria[]; id?: string; inicial?: ValoresAula }` e o tipo `ValoresAula = { titulo; data; hora; duracaoMin: number; professorId; categoriaId }`

- [ ] **Step 1: E2E que falha** — acrescentar a `e2e/admin.spec.ts`

```ts
test("criar aula aparece no calendário público, duplicar e excluir", async ({ page, request }) => {
  await entrarComoEquipe(page);
  // pré-requisitos via UI
  await page.goto("/admin/categorias/nova");
  await page.getByLabel("Nome").fill(`${PREFIXO} Cat Aula`);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/admin\/categorias$/);
  await page.goto("/admin/professores/novo");
  await page.getByLabel("Nome").fill(`${PREFIXO} Prof Aula`);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/admin\/professores$/);

  await page.goto("/admin/aulas/nova");
  await page.getByLabel("Título").fill(`${PREFIXO} Aula de teste`);
  await page.getByLabel("Data").fill("2030-01-15");
  await expect(page.getByLabel("Hora")).toHaveValue("19:00");
  await page.getByRole("combobox", { name: "Professor" }).click();
  await page.getByRole("option", { name: /Prof Aula/ }).click();
  await page.getByLabel("Categoria").selectOption({ label: `${PREFIXO} Cat Aula` });
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL(/\/admin\?ano=2030&mes=1$/);
  await expect(page.getByRole("row", { name: /Aula de teste/ })).toContainText("15/01 · 19h");

  // público atualizado na hora (revalidatePath)
  await page.goto("/2030/01");
  const card = page.getByTestId("card-aula").filter({ hasText: "Aula de teste" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Adicionar à agenda/ }).click();
  const ics = await page.getByRole("menuitem", { name: /Apple/ }).getAttribute("href");
  const r = await request.get(ics!);
  expect(r.headers()["content-type"]).toContain("text/calendar");
  expect(await r.text()).toContain("DTSTART:20300115T220000Z");

  // duplicar: +7 dias
  await page.goto("/admin?ano=2030&mes=1");
  await page.getByRole("row", { name: /Aula de teste/ }).getByRole("link", { name: "Duplicar" }).click();
  await expect(page.getByLabel("Data")).toHaveValue("2030-01-22");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("row", { name: /Aula de teste/ })).toHaveCount(2);

  // professor com aulas não pode ser excluído
  await page.goto("/admin/professores");
  await page.getByRole("row", { name: /Prof Aula/ }).getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Este professor tem 2 aulas; reatribua-as antes de excluir.")).toBeVisible();

  // excluir aula
  await page.goto("/admin?ano=2030&mes=1");
  await page.getByRole("row", { name: /Aula de teste/ }).first().getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("row", { name: /Aula de teste/ })).toHaveCount(1);
});

test("validação de aula mostra erro no campo", async ({ page }) => {
  await entrarComoEquipe(page);
  await page.goto("/admin/aulas/nova");
  await page.getByLabel("Título").fill("ab");
  await page.getByLabel("Data").fill("2030-01-15");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Informe o título (mín. 3 letras)")).toBeVisible();
  await expect(page.getByText("Escolha o professor")).toBeVisible();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/admin.spec.ts -g "aula"` → Expected: FAIL.

- [ ] **Step 3: Actions** — `app/admin/(painel)/aulas/actions.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { anoMesDe, paraInstante } from "@/lib/datas";
import { SESSAO_EXPIRADA, errosDeCampo, mensagemDoErroDb, type Resultado } from "@/lib/erros";
import { aulaSchema } from "@/lib/schemas";
import { clienteAutenticado } from "@/lib/supabase/servidor";

export async function salvarAula(_: Resultado<{ destino: string }> | null, fd: FormData): Promise<Resultado<{ destino: string }>> {
  const sb = await clienteAutenticado();
  if (!sb) return { ok: false, erro: SESSAO_EXPIRADA };
  const p = aulaSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, erro: "Revise os campos destacados.", campos: errosDeCampo(p.error) };
  const inicio = paraInstante(p.data.data, p.data.hora);
  const linha = {
    titulo: p.data.titulo, inicio: inicio.toISOString(), duracao_min: p.data.duracaoMin,
    professor_id: p.data.professorId, categoria_id: p.data.categoriaId,
  };
  const id = String(fd.get("id") ?? "");
  const q = id ? sb.from("aulas").update(linha).eq("id", id) : sb.from("aulas").insert(linha);
  const { error } = await q.select("id").single();
  if (error) return { ok: false, erro: mensagemDoErroDb(error) };
  revalidatePath("/", "layout");
  const am = anoMesDe(inicio);
  return { ok: true, dados: { destino: `/admin?ano=${am.ano}&mes=${am.mes}` } };
}

export async function excluirAula(id: string): Promise<Resultado> {
  const sb = await clienteAutenticado();
  if (!sb) return { ok: false, erro: SESSAO_EXPIRADA };
  const { error } = await sb.from("aulas").delete().eq("id", id).select("id").single();
  if (error) return { ok: false, erro: mensagemDoErroDb(error) };
  revalidatePath("/", "layout");
  return { ok: true, dados: undefined };
}
```

- [ ] **Step 4: Seletor de professor com busca e foto** — `components/admin/seletor-professor.tsx`

```tsx
"use client";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvatarProfessor } from "@/components/publico/avatar-professor";
import type { Professor } from "@/lib/db/tipos";

export function SeletorProfessor({ professores, inicial, invalido }: { professores: Professor[]; inicial?: string; invalido?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(inicial ?? "");
  const atual = professores.find((p) => p.id === id);
  return (
    <>
      <input type="hidden" name="professorId" value={id} />
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button id="professorId" type="button" variant="outline" role="combobox" aria-expanded={aberto} aria-label="Professor" aria-invalid={invalido} className="justify-between">
            {atual ? <span className="flex items-center gap-2"><AvatarProfessor professor={atual} tamanho={24} />{atual.nome}</span> : "Escolha o professor"}
            <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Buscar professor…" />
            <CommandList>
              <CommandEmpty>Nenhum professor encontrado.</CommandEmpty>
              {professores.map((p) => (
                <CommandItem key={p.id} value={p.nome} onSelect={() => { setId(p.id); setAberto(false); }}>
                  <AvatarProfessor professor={p} tamanho={24} />{p.nome}
                  <Check className={`ml-auto size-4 ${p.id === id ? "opacity-100" : "opacity-0"}`} aria-hidden />
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
```

- [ ] **Step 5: Formulário de aula** — `components/admin/form-aula.tsx` (categoria usa `<select>` nativo: acessível e simples de testar)

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarAula } from "@/app/admin/(painel)/aulas/actions";
import type { Categoria, Professor } from "@/lib/db/tipos";
import { Campo } from "./campo";
import { SeletorProfessor } from "./seletor-professor";
import { useFormulario } from "./use-formulario";

export type ValoresAula = { titulo: string; data: string; hora: string; duracaoMin: number; professorId: string; categoriaId: string };

export function FormAula({ professores, categorias, id, inicial }: { professores: Professor[]; categorias: Categoria[]; id?: string; inicial?: ValoresAula }) {
  const { acao, pendente, campos } = useFormulario(salvarAula, "Aula salva.");
  return (
    <form action={acao} className="flex max-w-lg flex-col gap-4 rounded-[var(--radius)] border bg-card p-6">
      {id && <input type="hidden" name="id" value={id} />}
      <Campo id="titulo" rotulo="Título" erro={campos.titulo}>
        <Input id="titulo" name="titulo" defaultValue={inicial?.titulo} required aria-invalid={!!campos.titulo} />
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo id="data" rotulo="Data" erro={campos.data}>
          <Input id="data" name="data" type="date" defaultValue={inicial?.data} required aria-invalid={!!campos.data} />
        </Campo>
        <Campo id="hora" rotulo="Hora" erro={campos.hora}>
          <Input id="hora" name="hora" type="time" defaultValue={inicial?.hora ?? "19:00"} required aria-invalid={!!campos.hora} />
        </Campo>
      </div>
      <Campo id="duracaoMin" rotulo="Duração (minutos)" erro={campos.duracaoMin}>
        <Input id="duracaoMin" name="duracaoMin" type="number" min={15} max={600} step={5} defaultValue={inicial?.duracaoMin ?? 60} />
      </Campo>
      <Campo id="professorId" rotulo="Professor" erro={campos.professorId}>
        <SeletorProfessor professores={professores} inicial={inicial?.professorId} invalido={!!campos.professorId} />
      </Campo>
      <Campo id="categoriaId" rotulo="Categoria" erro={campos.categoriaId}>
        <select id="categoriaId" name="categoriaId" defaultValue={inicial?.categoriaId ?? ""} aria-invalid={!!campos.categoriaId}
          className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="" disabled>Escolha a categoria</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Button type="submit" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</Button>
    </form>
  );
}
```

- [ ] **Step 6: Páginas de aula**

`app/admin/(painel)/aulas/nova/page.tsx` (suporta `?duplicar=<id>`):
```tsx
import { FormAula, type ValoresAula } from "@/components/admin/form-aula";
import { partesLocais, somarDias } from "@/lib/datas";
import { aulaPorId, listarCategorias, listarProfessores } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";

export default async function NovaAula({ searchParams }: { searchParams: Promise<{ duplicar?: string }> }) {
  const sb = await clienteServidor();
  const { duplicar } = await searchParams;
  const [professores, categorias, origem] = await Promise.all([
    listarProfessores(sb), listarCategorias(sb), duplicar ? aulaPorId(sb, duplicar) : null,
  ]);
  let inicial: ValoresAula | undefined;
  if (origem) {
    const { data, hora } = partesLocais(origem.inicio);
    inicial = { titulo: origem.titulo, data: somarDias(data, 7), hora, duracaoMin: origem.duracaoMin, professorId: origem.professor.id, categoriaId: origem.categoria.id };
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">{origem ? "Duplicar aula" : "Nova aula"}</h1>
      <FormAula professores={professores} categorias={categorias} inicial={inicial} />
    </div>
  );
}
```

`app/admin/(painel)/aulas/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { FormAula } from "@/components/admin/form-aula";
import { partesLocais } from "@/lib/datas";
import { aulaPorId, listarCategorias, listarProfessores } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";

export default async function EditarAula({ params }: { params: Promise<{ id: string }> }) {
  const sb = await clienteServidor();
  const [aula, professores, categorias] = await Promise.all([aulaPorId(sb, (await params).id), listarProfessores(sb), listarCategorias(sb)]);
  if (!aula) notFound();
  const { data, hora } = partesLocais(aula.inicio);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Editar aula</h1>
      <FormAula professores={professores} categorias={categorias} id={aula.id}
        inicial={{ titulo: aula.titulo, data, hora, duracaoMin: aula.duracaoMin, professorId: aula.professor.id, categoriaId: aula.categoria.id }} />
    </div>
  );
}
```

- [ ] **Step 7: Lista de aulas do mês** — substituir `app/admin/(painel)/page.tsx`

```tsx
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmarExclusao } from "@/components/admin/confirmar-exclusao";
import { formatarDataHora, mesAnterior, mesAtual, nomeDoMes, proximoMes, type AnoMes } from "@/lib/datas";
import { aulasDoMes, nomeExibicao } from "@/lib/db/consultas";
import { clienteServidor } from "@/lib/supabase/servidor";
import { excluirAula } from "./aulas/actions";

function lerMes(ano?: string, mes?: string): AnoMes {
  const a = Number(ano), m = Number(mes);
  return Number.isInteger(a) && a >= 2000 && a <= 2100 && Number.isInteger(m) && m >= 1 && m <= 12 ? { ano: a, mes: m } : mesAtual();
}
const link = (am: AnoMes) => `/admin?ano=${am.ano}&mes=${am.mes}`;

export default async function Aulas({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const { ano, mes } = await searchParams;
  const am = lerMes(ano, mes);
  const aulas = await aulasDoMes(await clienteServidor(), am);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon"><Link href={link(mesAnterior(am))} aria-label="Mês anterior"><ChevronLeft className="size-4" /></Link></Button>
          <h1 className="min-w-48 text-center font-display text-2xl font-bold">{nomeDoMes(am.mes)} {am.ano}</h1>
          <Button asChild variant="outline" size="icon"><Link href={link(proximoMes(am))} aria-label="Próximo mês"><ChevronRight className="size-4" /></Link></Button>
        </div>
        <Button asChild><Link href="/admin/aulas/nova">Nova aula</Link></Button>
      </div>
      {aulas.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed bg-card p-10 text-center text-muted-foreground">Nenhuma aula neste mês.</p>
      ) : (
        <Table className="rounded-[var(--radius)] border bg-card">
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Aula</TableHead><TableHead className="hidden sm:table-cell">Categoria</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {aulas.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap">{formatarDataHora(a.inicio)}</TableCell>
                <TableCell><div className="font-medium">{a.titulo}</div><div className="text-xs text-muted-foreground">{nomeExibicao(a.professor)}</div></TableCell>
                <TableCell className="hidden sm:table-cell"><Badge style={{ backgroundColor: a.categoria.cor }} className="border-0 text-white">{a.categoria.nome}</Badge></TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button asChild variant="ghost" size="sm"><Link href={`/admin/aulas/${a.id}`}>Editar</Link></Button>
                  <Button asChild variant="ghost" size="sm"><Link href={`/admin/aulas/nova?duplicar=${a.id}`}>Duplicar</Link></Button>
                  <ConfirmarExclusao descricao={`"${a.titulo}" será removida do calendário.`} aoConfirmar={excluirAula.bind(null, a.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Rodar a suíte completa**

Run: `npm test && npx playwright test` → Expected: tudo PASS.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: CRUD de aulas com duplicar, navegação por mês e revalidação do público"
```

---

### Task 14: Deploy, domínio, contas da equipe, qualidade e guia

**Files:**
- Create: `docs/guia-equipe.md`

- [ ] **Step 1: Deploy de preview e verificação**

```bash
npx vercel deploy --yes
```
Abrir a URL de preview e conferir `/2026/09`, `/professores/samira-lima` e o login do admin. Se o preview estiver protegido, usar a skill `vercel:access-protected-vercel-deployment`.

- [ ] **Step 2: (USUÁRIO confirma) Produção e domínio** — perguntar ao usuário antes. Depois:

```bash
npx vercel deploy --prod --yes
npx vercel domains add calendario.escolanutriacademy.com.br
```
Passar ao usuário o registro DNS que o comando indicar (CNAME `calendario` → `cname.vercel-dns.com.`) para ele criar no provedor de DNS do domínio. Aguardar até o `curl -sI https://calendario.escolanutriacademy.com.br/` devolver `200`.

- [ ] **Step 3: (USUÁRIO confirma) Repositório Git remoto** — perguntar se o usuário quer um repositório privado no GitHub ligado à Vercel (deploy automático a cada push na `main`). Se sim:

```bash
gh repo create calendario-nutriacademy --private --source . --push
npx vercel git connect --yes
```

- [ ] **Step 4: Contas reais da equipe** — pedir ao usuário os e-mails (1–3). Para cada um, gerar a senha e mostrá-la **uma única vez** ao usuário, para repassar à pessoa:

```bash
SENHA=$(openssl rand -base64 15) && echo "$SENHA" && npm run usuario:criar -- pessoa@exemplo.com "$SENHA"
```

- [ ] **Step 5: Qualidade** — Lighthouse mobile em produção (chrome-devtools MCP `lighthouse_audit` em `/2026/09`). Meta: Performance ≥ 90, Acessibilidade ≥ 90. Corrigir o que ficar abaixo, rodar `npx playwright test` de novo e commitar.

- [ ] **Step 6: Segurança** — rodar `/secure-infra audit . --url https://calendario.escolanutriacademy.com.br --level 2`. Tratar os achados P0/P1 (esperados: headers de segurança como CSP e HSTS em `next.config.ts`). Rodar `npm run db:rls` de novo e confirmar `RLS OK`.

- [ ] **Step 7: Guia da equipe** — `docs/guia-equipe.md`

```markdown
# Calendário NutriAcademy — Guia rápido da equipe

**Painel:** https://calendario.escolanutriacademy.com.br/admin
**Calendário público:** https://calendario.escolanutriacademy.com.br

## Cadastrar uma aula
1. Entre no painel com seu e-mail e senha.
2. Clique em **Nova aula**.
3. Preencha título, data, hora (já vem 19:00) e duração (já vem 60 min).
4. Escolha o professor (digite para buscar) e a categoria.
5. **Salvar.** A aula aparece no calendário público na hora.

## Aula que se repete toda semana
Na lista de aulas, clique em **Duplicar**: o formulário abre com tudo preenchido e a data
uma semana depois. Ajuste o que mudar e salve.

## Professor novo
**Professores → Novo professor.** Nome, título (opcional: Prof., Profª., Dr.…) e foto
(JPG, PNG ou WebP; fotos do iPhone precisam ser exportadas como JPG). A foto é ajustada
automaticamente.

## Meses anteriores
Nada a fazer: o calendário mostra o mês atual e guarda todos os anteriores. Os alunos navegam
pelas setas ← →.

## Não consigo excluir um professor ou categoria
Ele ainda tem aulas. Edite essas aulas para outro professor ou categoria, ou exclua as aulas antes.
```

- [ ] **Step 8: Redirecionamento do WordPress (USUÁRIO)** — orientar o usuário a criar no WordPress (plugin *Redirection* ou o redirecionamento do Elementor) um 301 de `/calendario-nutriacademy/` para `https://calendario.escolanutriacademy.com.br/`.

- [ ] **Step 9: Commit final**

```bash
git add -A && git commit -m "docs: guia da equipe e ajustes de qualidade/segurança"
```

---

## Emenda 2026-10-02 — identidade visual, seções, imersões (prevalece sobre as tasks abaixo)

Origem: spec §11, `PRODUCT.md` e os surface briefs em `.impeccable/surfaces/`. A referência visual aprovada é o código da prévia (scratchpad `previa-src.html`, publicada como artifact v4); os tokens e medidas de lá são a fonte. Antes de qualquer edição de UI, carregar `impeccable` e ler `reference/craft-floor.md`.

**Renomeações globais:** `categorias` → `secoes`; `Categoria` → `Secao`; `categoria_id` → `secao_id`; `categoriaSchema` → `secaoSchema`; rotas `/admin/categorias` → `/admin/secoes`. O professor perde o `titulo`; a aula ganha `nomeExibicao`.

### E1 (Task 4 — reabrir com TDD)
- `aulaSchema`: acrescentar `descricao` (opcional, ≤ 600, vazio → null), `nomeExibicao` (opcional, ≤ 80, vazio → null), `secaoId` (uuid), `imersaoId` (uuid opcional, vazio → null), `numeroNaImersao` (inteiro 1–50, obrigatório se `imersaoId`, via `superRefine`), `imagemPath` (opcional, vazio → null). Remover `categoriaId`.
- `professorSchema`: remover `titulo`.
- `secaoSchema`: `{ nome 2–40, estilo: 'destaque'|'compacto', acento: 'ouro'|'teal', ordem: int 0–99, logoPath? }`.
- `imersaoSchema`: `{ nome 3–80, secaoId uuid, exibirNome: boolean (checkbox "on" → true) }`.
- `fotos.ts`: `LADO = 900`.
- Testes novos: imersão sem número rejeita; número sem imersão é ignorado (vira null); descrição vazia vira null; estilo inválido rejeita.

### E2 (Task 5 — migration `0001_inicial.sql` substituída antes de aplicar)
Tabelas conforme spec §11.2: `secoes`, `imersoes`, `professores` (sem `titulo`) e `aulas` (com `descricao`, `nome_exibicao`, `secao_id`, `imersao_id`, `numero_na_imersao`, `imagem_path`). Mais:
- `check ((imersao_id is null) = (numero_na_imersao is null))`;
- `unique (imersao_id, numero_na_imersao)`.

RLS idêntica (leitura pública, escrita só para `eh_equipe()`) em `secoes` e `imersoes`. `verificar-rls.ts` passa a usar `secoes`.

### E3 (Task 6 — reabrir)
- Tipos: `Secao { id; nome; estilo; acento; ordem; logoPath }`, `Imersao { id; nome; exibirNome; secaoId }`, `Professor { id; nome; slug; fotoPath }`, `Aula { …, descricao: string|null, nomeExibicao: string|null, secao: Secao, imersao: Imersao|null, numeroNaImersao: number|null, imagemPath: string|null }`.
- `SELECT_AULA` com joins em `secoes` e `imersoes` (left join na imersão).
- `nomeExibicao(aula)` → `aula.nomeExibicao ?? aula.professor.nome`. O professor sozinho é exibido pelo `nome`.
- Novas consultas: `listarSecoes`, `secaoPorId`, `listarImersoes`, `imersaoPorId`, `ultimoNomeExibicao(sb, professorId)`, `contarAulas(sb, 'professor_id'|'secao_id'|'imersao_id', id)`.
- Nova função pura testada `lib/montar-mes.ts`: `montarMes(aulas, secoes, imersoes) → Bloco[]`, com `Bloco = { secao, avulsas: Aula[], imersoes: { imersao, aulas: Aula[] }[] }`. Seções por `ordem`, avulsas por data, imersões após as avulsas da sua seção, aulas da imersão por número, blocos vazios omitidos. Teste TDD com os dados de outubro.

### E4 (Task 7 — seed)
`dados-setembro.json` → `dados-iniciais.json` com setembro e outubro/2026 exatamente como na página. Seções, com ordem e estilo:

| Seção | Ordem | Estilo | Acento | Logo |
|---|---|---|---|---|
| NutriLabs | 10 | destaque | ouro | — |
| NutriOnfire | 20 | destaque | ouro | — |
| NutriAcademy PRO | 30 | compacto | teal | `logov4.png` |
| Curadoria | 40 | destaque | ouro | — |
| Certificação | 50 | destaque | ouro | — |

A imersão "Imersão Samira Lima — outubro/2026" fica na NutriLabs, com `exibirNome = false`. O `nomeExibicao` é copiado do texto de cada card, inclusive "Profª. Fred Estevam" e "Profª. Guilherme Oliveira", sem correção por inferência; a equipe ajusta no painel. Imagem própria `Samira-Lima2-1.jpg` nas 5 aulas da imersão. Correção "Respitatórios" → "Respiratórios". Fotos em 900×900. Assets globais baixados para `public/marca/`: `logo-claro.webp`, `bg-01.jpg`.

### E5 (Tasks 8–9 — UI pública, reescrita visual)
Seguir o surface brief público e portar a prévia para componentes:
- `components/publico/hero.tsx`: moldura dourada, `public/marca/bg-01.jpg` a 50%, logo, H1 e pílula. A `NavMes` em texto com separador vertical fica dentro do hero.
- `card-destaque.tsx`: rótulo = "Aula 0N" ou nome da seção; descrição; imagem via `next/image` (`imagemPath ?? fotoPath`), sem filtro.
- `card-compacto.tsx`: avatar de 57px, acento teal.
- `moldura-imersao.tsx` e `selo-secao.tsx` (logo da seção compacta).
- `rodape.tsx`: Curadoria · Módulo · Calendário {Mês}.
- `pagina-do-mes.tsx`: usa `montarMes`.
- Tokens no `globals.css`: `--na-ouro: #D8BB68`, `--na-ouro-pilula: #B68F42`, `--na-borda-ouro: #998858`, `--na-marrom: #31291F`, `--na-teal: #9DCCCC`, `--na-teal-forte: #178A8A`, `--na-vidro: rgba(10,10,10,.43)`, `--na-borda: #5E5E5E`. Fonte Poppins via `next/font` (400/500/600/700). O tema shadcn é mapeado para o escuro: `--background: #000`, `--primary: #D8BB68`, `--primary-foreground: #1A160C`, `--border: #3A352A`, `--radius: 15px`. `<html class="dark">`.
- O E2E da Task 8 passa a esperar o H1 "Programação mês de setembro" (case-insensitive), "Realizada" e a nav "‹ …" em texto.

### E6 (Tasks 10–13 — admin com shadcn, via MCP)
Adicionar: `npx shadcn@latest add sidebar field calendar empty spinner toggle-group sheet switch textarea tooltip breadcrumb`.
- Layout `(painel)`: `SidebarProvider` + `Sidebar` colapsável em ícone (Aulas, Imersões, Professores, Seções e "Ver calendário ↗"), seguindo o surface brief do admin.
- Formulário de aula num `Sheet` lateral, com `Field`/`FieldLabel`/`FieldError` e data por `Calendar` em `Popover`. Campos:
  - professor por combobox com avatar;
  - "Como o nome aparece", pré-preenchido via `ultimoNomeExibicao`;
  - seção por `ToggleGroup`;
  - imersão + número;
  - descrição em `Textarea`;
  - imagem opcional, por upload.

  O formulário inclui a **prévia ao vivo** do card público, reaproveitando `CardDestaque`/`CardCompacto`.
- `Empty` para mês sem aulas; `Spinner` nos botões pendentes.
- **Categorias** passam a ser **Seções** (estilo, acento, ordem e logo). Nova tela **Imersões**: lista, formulário e "Adicionar aula" com o número já preenchido.
- **Duplicar** em aula de imersão: número + 1; nas demais, data + 7 dias.
- Os E2E das Tasks 11–13 seguem os mesmos fluxos, com os nomes novos (Seção, Imersão).

### E7 (Task 14 — fechamento Impeccable)
Antes do deploy:
1. Rodar `impeccable detect --json` nas rotas alteradas.
2. Capturar `desktop.png` e `mobile.png` em `.impeccable/review/`.
3. Rodar o `impeccable-finish-reviewer` (com o brief, as capturas e a prévia como referência de crítica), corrigir conforme a disposição e rodar o `impeccable-documenter` → `DESIGN.md` + `.impeccable/design.json`.
4. Rodar `mcp__shadcn__get_audit_checklist` no fim.
