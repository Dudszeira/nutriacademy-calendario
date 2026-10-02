---
version: 1
slug: "app-admin-painel-page-tsx"
primary_target: "app/admin/(painel)/page.tsx"
related_targets: ["app/admin/login/page.tsx"]
---

# Painel da equipe — /admin

**Modo:** Operate. 1 a 3 pessoas publicam a programação mensal; a tarefa é cadastrar ou duplicar uma aula em menos de 1 minuto e ter certeza de que o site atualizou.
**Escopo:** `/admin` (aulas do mês), aulas, professores, seções, imersões e login.
**Estados importantes:** mês vazio, salvando, erro de campo, sessão expirada, exclusão bloqueada ("tem N aulas"), upload de foto com erro de formato (HEIC).

## Direction contract

THESIS: a mesa de produção da programação, na mesma casa visual do calendário, e não um CMS genérico. Recusa o shadcn cinza padrão e o dashboard de métricas.

OWN-WORLD: base `#0C0B09` e vidro escuro; ação primária em dourado sólido `#D8BB68` com texto `#1A160C`; bordas `#3A352A`; chips de seção (ouro/teal) iguais aos do público; Poppins com rótulos pequenos de tracking 1.6px; componentes shadcn (sidebar colapsável, field, calendar + popover, combobox, empty, alert-dialog, sonner) retematizados por tokens.

STORY: a pessoa entra, vê o mês com as aulas em ordem, clica em Nova aula ou Duplicar, preenche com os padrões (19:00, 60 min, nome sugerido), salva, recebe o toast e vê a aula no lugar.

FIRST VIEWPORT: sidebar à esquerda (logo, Aulas, Imersões, Professores, Seções, "Ver calendário ↗"). No conteúdo: cabeçalho "‹ Outubro 2026 ›" + "Nova aula" dourado; tabela do mês com data dourada tabular, título + chip de seção/AULA 0N, nome de exibição e ações. O formulário abre num painel lateral (Sheet) com prévia ao vivo do card.

FORM: extensão Operate do mundo incumbente; item 1 de 1; seed key: none (brief-pinned world).

Interação assinatura: prévia ao vivo do card público dentro do formulário, mostrando como a aula vai aparecer enquanto é digitada.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
