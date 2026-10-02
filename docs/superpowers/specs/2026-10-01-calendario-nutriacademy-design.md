# Calendário NutriAcademy — Design

**Data:** 2026-10-01
**Status:** revisado em 2026-10-02 (identidade visual da página atual, seções, imersões); ver §11
**Abordagem escolhida:** A — Next.js + painel próprio (shadcn) + Supabase + Vercel

## 1. Contexto e objetivo

Hoje a programação de aulas da Escola NutriAcademy está em uma página WordPress/Elementor
(`escolanutriacademy.com.br/calendario-nutriacademy/`). Ela é editada à mão todo mês, e
o conteúdo do mês anterior se perde quando a página é sobrescrita.

**Objetivo:** criar uma plataforma própria em que a equipe cadastre aulas por um painel
simples. O calendário público se atualiza sozinho e mantém o histórico dos meses anteriores
navegável.

**Critérios de sucesso**
- Cadastrar uma aula leva menos de 1 minuto, sem tocar em código nem no Elementor.
- Quando o mês vira, o calendário passa a abrir no mês novo sem nenhuma ação manual.
- Qualquer mês anterior com aulas pode ser consultado por navegação e por URL própria.
- Um aluno consegue salvar uma aula na própria agenda com um clique.

**Fora do escopo (YAGNI):** busca e filtros, link da aula ao vivo, link de gravação, níveis de
permissão, notificações por e-mail/WhatsApp, embed no WordPress e área logada para alunos.
(A descrição da aula entrou no escopo na revisão de 2026-10-02; ver §11.)

## 2. Usuários

| Quem | O que faz | Acesso |
|---|---|---|
| Aluno / visitante | Consulta a programação, navega entre meses, vê aulas por professor e adiciona à agenda | Público, sem login |
| Equipe (1–3 pessoas) | Cadastra e edita aulas, professores e categorias | `/admin`, login por e-mail e senha, todos no mesmo nível |

## 3. Arquitetura

- **App:** Next.js (App Router, TypeScript), Tailwind CSS v4 e shadcn/ui.
- **Hospedagem:** Vercel, no domínio `calendario.escolanutriacademy.com.br` (CNAME configurado
  no DNS do domínio do cliente).
- **Banco + Auth + Storage:** Supabase (Postgres, Supabase Auth e Storage), provisionado pela
  integração do Vercel Marketplace para que as variáveis de ambiente sejam injetadas
  automaticamente.
- **Fuso horário:** todas as datas são gravadas em UTC (`timestamptz`) e exibidas sempre em
  `America/Sao_Paulo`, independentemente do fuso de quem acessa.
- **Renderização:** as páginas públicas são Server Components com cache. Toda alteração feita
  no admin chama `revalidatePath` nas rotas afetadas, então o público se atualiza na hora,
  sem rebuild.
- **Página antiga no WP:** passa a redirecionar (301) para o novo subdomínio. O próprio
  usuário configura isso no WordPress.

Um único app, com dois grupos de rota:

```
app/
  (public)/
    page.tsx                    → mês corrente (sem redirect; URL limpa)
    [ano]/[mes]/page.tsx        → mês específico, ex.: /2026/09
    professores/[slug]/page.tsx → todas as aulas de um professor
    aulas/[id]/ics/route.ts     → download do arquivo .ics de uma aula
  admin/
    login/page.tsx
    page.tsx                    → lista de aulas (mês corrente primeiro)
    aulas/…  professores/…  categorias/…   (CRUD)
lib/
  datas.ts      → limites de mês em America/Sao_Paulo, formatação "15/09 às 19h"
  agenda.ts     → geração do .ics e da URL do Google Agenda
  db/           → consultas tipadas (aulas por mês, por professor, meses com aula)
```

## 4. Modelo de dados

```sql
categorias (
  id uuid pk,
  nome text not null unique,          -- "NutriOnfire", "Certificação", "Curadoria", "Módulo"
  cor  text not null                  -- hex, usado no badge
)

professores (
  id uuid pk,
  nome   text not null,               -- "Roberta Carbonari"
  titulo text,                        -- opcional, texto livre: "Profª.", "Prof.", "Dr."...
  slug   text not null unique,        -- gerado do nome, editável
  foto_path text                      -- caminho no bucket "fotos" do Supabase Storage
)

aulas (
  id uuid pk,
  titulo        text not null,
  inicio        timestamptz not null,
  duracao_min   int  not null default 60,   -- usado só para "adicionar à agenda"
  professor_id  uuid not null references professores on delete restrict,
  categoria_id  uuid not null references categorias  on delete restrict,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
)
index aulas(inicio), index aulas(professor_id)
```

- **Histórico** é só uma consulta por intervalo de `inicio`. Não existe arquivamento nem
  nenhum estado extra.
- **Status "realizada"** é derivado (`inicio + duracao < agora`). Não fica gravado.
- Não dá para excluir um professor ou uma categoria que ainda têm aulas (`restrict`). O admin
  mostra uma mensagem clara explicando o motivo.

**Segurança (RLS):** `select` é público nas três tabelas. `insert/update/delete` só é
permitido para usuários autenticados. O bucket `fotos` tem leitura pública e escrita só para
autenticados. O cadastro público (signup) fica desativado no Supabase Auth: as 1–3 contas da
equipe são criadas manualmente pelo dashboard do Supabase.

## 5. Experiência pública

**Página de mês (`/` e `/[ano]/[mes]`)**
- Cabeçalho com a marca NutriAcademy e o título "Programação · Setembro 2026", com setas
  ← → para o mês anterior e o próximo. A seta só aparece se existir algum mês com aula naquela
  direção, e ela pula direto para esse mês.
- Lista de aulas em ordem cronológica. Cada card mostra:
  - data e hora ("15/09 · 19h") e dia da semana;
  - título;
  - foto, título e nome do professor, com link para a página dele;
  - badge da categoria na cor cadastrada;
  - botão **Adicionar à agenda**, com duas opções: Google Agenda (link) e Apple/Outlook
    (arquivo `.ics`).
- Aulas que já passaram aparecem atenuadas, com o selo "Realizada", e sem o botão de agenda.
- Mês sem aulas: mensagem "Programação ainda não publicada", com as setas de navegação.
- URL de mês inválida (ex.: `/2026/13`) retorna 404.

**Página do professor (`/professores/[slug]`)**
- Foto, título e nome do professor. Abaixo, as próximas aulas primeiro e depois as
  realizadas, agrupadas por mês, mais recentes no topo.

**Visual:** identidade da NutriAcademy (logo e cores extraídas do site atual). Layout em
mobile-first, porque a maioria dos alunos acessa pelo celular. Animações discretas de entrada.

**SEO e compartilhamento:** `<title>` e Open Graph por mês ("Programação de Setembro 2026 —
NutriAcademy"), para quando o link for compartilhado no WhatsApp.

## 6. Painel admin (`/admin`)

- Toda rota `/admin/*` exige uma sessão válida. Sem sessão, o usuário vai para
  `/admin/login`.
- **Aulas:** tabela agrupada por mês, com navegação entre meses e botões Nova, Editar,
  Duplicar e Excluir (com confirmação).
  - Formulário com título, data, hora (padrão 19:00), duração (padrão 60), professor
    (select com busca e foto) e categoria (select).
  - **Duplicar** abre o formulário já preenchido com a data +7 dias, para agilizar aulas
    recorrentes.
- **Professores:** lista com foto e formulário com nome, título opcional, slug e upload de foto.
  A foto é redimensionada e recortada em quadrado no cliente antes do envio (máx. 400×400,
  WebP).
- **Categorias:** nome e cor (seletor com a paleta da marca e campo hex).
- Validação com Zod, compartilhada entre o formulário e a Server Action. Os erros aparecem no
  próprio campo. Depois de salvar, um toast confirma e a lista se atualiza.

## 7. Tratamento de erros

- Se o banco ficar indisponível na página pública, o usuário vê a página de erro amigável do
  Next. O cache serve a última versão gerada enquanto possível.
- Server Actions do admin devolvem `{ ok: false, erro }`, exibido em toast, e nunca lançam
  exceção sem tratamento.
- Upload de foto acima de 5 MB ou que não seja imagem é recusado no cliente, com mensagem.
- Excluir algo com dependências recebe a mensagem "Este professor tem N aulas; reatribua-as
  antes de excluir".

## 8. Carga inicial

Um script de seed cria as categorias (NutriOnfire, Certificação, Curadoria, Módulo) e
importa as 4 aulas de setembro/2026 publicadas hoje no site, com seus professores e fotos.
Os dados de professor são revisados manualmente antes de importar (ex.: o site atual mostra
"Profª. Guilherme Oliveira" e "fred estevam", que provavelmente precisam de correção).

## 9. Testes

- **Unitários (Vitest):** `lib/datas.ts` (limites do mês em São Paulo, inclusive aula às 23h
  do último dia do mês e virada de ano), `lib/agenda.ts` (conteúdo do `.ics` e URL do
  Google Agenda) e os schemas Zod.
- **E2E (Playwright, smoke):** a página pública renderiza o mês com aulas; a navegação
  ← → funciona; a página do professor lista as aulas; o login no admin funciona; criar uma
  aula faz ela aparecer na página pública.
- **Antes de entregar:** `next build` sem erros, Lighthouse mobile ≥ 90 em performance e
  acessibilidade e checagem de segurança (`/secure-infra audit`, nível 2).

## 10. Entrega e operação

- Repositório Git próprio, ligado ao projeto Vercel: push na `main` faz deploy em produção e
  PRs geram previews.
- Variáveis de ambiente vêm da integração Supabase ↔ Vercel. Nenhum segredo fica no código.
- Backups diários automáticos do Supabase (plano gratuito).
- Um guia rápido em uma página para a equipe do cliente: como entrar e como cadastrar,
  duplicar e editar aulas.


## 11. Revisão 2026-10-02 — identidade visual, seções e imersões

Esta seção **substitui** as partes conflitantes de §4–§6 e §8. Contexto de produto em `PRODUCT.md`;
direção visual em `.impeccable/` (surface brief) e na prévia aprovada
(https://claude.ai/artifact/Pbvo3VrPFiDCHwqaEcRcB7, versão 4).

### 11.1 Identidade visual (vinculante)

A plataforma reproduz a identidade da página atual `escolanutriacademy.com.br/calendario-nutriacademy/`:
- **Fundo e hero:** fundo preto. Hero com gradiente `#9C8860 → #000`, caixa com borda `#998858` e
  raio 15px, `BG-01.jpg` a 50% de opacidade, logo claro, título "PROGRAMAÇÃO MÊS DE {MÊS}"
  (Poppins 400, até 63px, caixa alta) e pílula "ESCOLA NUTRIACADEMY".
- **Card grande (estilo `destaque`):** vidro `rgba(10,10,10,.43)`, borda `#5E5E5E`, raio 15px.
  Rótulo cinza 11px com tracking 2.2px. Data dourada `#D8BB68` 19px 700 ("15/09 ÀS 19HS").
  Título 32px 700 em caixa alta. Descrição opcional. Divisor. Nome do professor dourado 11px.
  Imagem 456×449 com raio 15px à direita (no celular, fica acima).
- **Card compacto (estilo `compacto`, NutriAcademy PRO):** fundo `rgba(157,204,204,.06)`.
  Data e nome em teal `#9DCCCC`. Avatar redondo de 57px. Selo da seção com logo e brilho
  `#178A8A` acima da grade.
- **Rodapé:** "Curadoria NutriAcademy · Módulo Certificação · Calendário {Mês}".
- **Fonte:** Poppins.
- **Fotos:** sempre sem filtro, inclusive nas aulas realizadas. A aula realizada recebe o selo
  "Realizada" e a data levemente apagada.
- **Navegação de meses:** texto dourado, sem borda. Com dois controles, separados por uma
  barra vertical (`‹ SETEMBRO | NOVEMBRO ›`).
- **Painel `/admin`:** a mesma identidade (escuro, dourado, Poppins), em modo operacional,
  construído com shadcn/ui (sidebar, field, calendar + popover, combobox, empty, sonner,
  alert-dialog, toggle-group).

### 11.2 Modelo de dados (substitui §4)

```sql
secoes (
  id uuid pk,
  nome text not null unique,             -- "NutriOnfire", "NutriLabs", "NutriAcademy PRO", "Curadoria", "Certificação"
  estilo text not null check (estilo in ('destaque','compacto')),
  acento text not null default 'ouro' check (acento in ('ouro','teal')),
  ordem int not null default 0,          -- ordem na página
  logo_path text                         -- opcional (ex.: logo PRO acima dos cards compactos)
)

imersoes (                               -- evento estratégico pontual com aulas numeradas
  id uuid pk,
  nome text not null,                    -- interno no painel; exibição pública opcional
  exibir_nome boolean not null default false,
  secao_id uuid not null references secoes on delete restrict,  -- posição na página (logo após a seção)
  created_at timestamptz default now()
)

professores (id, nome, slug unique, foto_path)          -- sem título fixo

aulas (
  id uuid pk,
  titulo text not null,
  descricao text,                        -- opcional
  inicio timestamptz not null,
  duracao_min int not null default 60,
  professor_id uuid not null references professores on delete restrict,
  nome_exibicao text,                    -- como o nome aparece NESTA aula ("Dra. Samira Lima"); vazio = nome do professor
  secao_id uuid not null references secoes on delete restrict,
  imersao_id uuid references imersoes on delete restrict,
  numero_na_imersao int,                 -- obrigatório quando imersao_id existe ("AULA 01")
  imagem_path text,                      -- opcional; vazio = foto do professor
  created_at, updated_at
)
```
- O **título do professor é definido por aula** (`nome_exibicao`). Ao cadastrar, o painel sugere
  o último `nome_exibicao` usado para aquele professor. Nada é inferido.
- A aula de uma imersão herda a seção da imersão (validado na action).
- RLS igual a §4: leitura pública e escrita só para a `equipe`.

### 11.3 Página pública (substitui o layout de §5; comportamentos de §5 continuam)

Ordem de renderização do mês:
1. Para cada seção, por `ordem`: as aulas avulsas da seção, por data.
2. Logo depois, as imersões dessa seção, cada uma numa moldura com borda dourada, com as aulas
   ordenadas por `numero_na_imersao`.
3. Seções `destaque` mostram cards grandes. Seções `compacto` mostram o selo/logo da seção e uma
   grade de cards compactos.

Em aulas de imersão, o rótulo do card é "AULA 0N" no lugar do nome da seção. O card usa
`imagem_path ?? professor.foto_path`. A página do professor mantém a mesma identidade.

### 11.4 Painel (acrescenta a §6)

- CRUD de **Seções** (nome, estilo, acento, ordem, logo) e de **Imersões** (nome, seção, exibir
  nome). No formulário da imersão, o botão "Adicionar aula" já preenche o próximo número.
- O formulário de aula ganha: descrição, "Como o nome aparece" (sugerido), seção, imersão +
  número e imagem do card (upload opcional).
- **Duplicar**, numa aula de imersão, incrementa o número.
- Foto do professor e imagem da aula: até 900×900, WebP, sem filtro.

### 11.5 Carga inicial (substitui §8)

O seed importa setembro e outubro/2026 exatamente como publicados:
- seções NutriOnfire, NutriLabs, PRO, Curadoria e Certificação;
- a imersão de outubro da Samira Lima (5 aulas com descrição e imagem própria `Samira-Lima2-1.jpg`);
- `nome_exibicao` copiado do texto de cada card do site.

A grafia "Respitatórios" é corrigida para "Respiratórios".
