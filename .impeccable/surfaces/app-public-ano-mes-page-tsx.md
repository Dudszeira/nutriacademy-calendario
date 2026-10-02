---
version: 1
slug: "app-public-ano-mes-page-tsx"
primary_target: "app/(public)/[ano]/[mes]/page.tsx"
related_targets: ["app/(public)/page.tsx","app/(public)/professores/[slug]/page.tsx"]
---

# Calendário público — mês e professor

**Modo:** Read, com uma ação (Adicionar à agenda). O aluno quer entender o que acontece este mês, quando e com quem.
**Escopo:** `/`, `/AAAA/MM`, `/professores/[slug]`.
**Visual:** identidade fixada pelo usuário, a página atual do WP. Superfície dentro de um mundo já estabelecido, sem sorteio de direção. Referência aprovada: prévia https://claude.ai/artifact/Pbvo3VrPFiDCHwqaEcRcB7 (v4).
**Pendências:** nenhuma de layout; os títulos por aula vêm do cadastro.

## Direction contract

THESIS: a programação do mês como um cartaz da casa, igual à página que os alunos já conhecem, agora viva, com histórico, agenda e status. Recusa a grade de calendário genérica (tabela de dias) e a lista de cards neutros.

OWN-WORLD: preto profundo com halo marrom `#31291F`; dourado `#D8BB68` para data e nome; teal `#9DCCCC` só no PRO. Vidro escuro com borda `#5E5E5E` e raio 15px; Poppins com títulos em caixa alta 700 e rótulos de 11px com tracking 2.2px; pílulas com brilho difuso; fotos reais sem filtro.

STORY: o aluno abre pelo WhatsApp e reconhece a casa no hero. Lê as aulas por programa (destaque → imersão → PRO), salva a próxima na agenda e volta meses pelo texto ‹ AGO | NOV ›.

FIRST VIEWPORT: hero com moldura dourada ocupando cerca de 70% da altura, com logo (358px), "PROGRAMAÇÃO / MÊS DE OUTUBRO" (63px), pílula "ESCOLA NUTRIACADEMY" e navegação de meses em texto sob a pílula. No celular, o topo do primeiro card aparece abaixo da dobra. A ação principal (Adicionar à agenda) fica em cada card futuro.

FORM: replicação fiel da página incumbente (brief-pinned), item 1 de 1; seed key: none (brief-pinned world, concept-seed não aplicável).

Interação assinatura: a moldura dourada da imersão, com cards numerados "AULA 01…05", entrando em sequência. Gramática de movimento: subida curta de 10px e opacidade em 500ms, escalonada a 70ms, desligada com `prefers-reduced-motion`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
