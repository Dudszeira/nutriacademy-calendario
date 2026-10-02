# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Alunos da Escola NutriAcademy** (nutricionistas): abrem o calendário, quase sempre pelo celular, a partir de um link no WhatsApp, no site ou na área de membros. Querem saber rápido **o que acontece este mês, quando e com quem**, salvar uma aula na agenda e, às vezes, rever o que já aconteceu em meses anteriores.
- **Equipe da NutriAcademy** (1 a 3 pessoas, todas com o mesmo acesso): publicam e mantêm a programação mensal. Hoje fazem isso editando a página no Elementor, um processo manual e sujeito a erro. O trabalho delas é cadastrar uma aula em menos de 1 minuto e confiar que o site se atualizou.

## Product Purpose

Substituir a página manual `escolanutriacademy.com.br/calendario-nutriacademy/` por uma plataforma própria (`calendario.escolanutriacademy.com.br` + `/admin`). A programação é cadastrada uma vez e o calendário público:
- se atualiza sozinho;
- vira o mês automaticamente;
- guarda o histórico de todos os meses anteriores, navegável.

**Sucesso:** a equipe para de editar o Elementor; o aluno encontra a aula, salva na agenda e consegue rever meses passados.

## Positioning

É o calendário oficial da Escola NutriAcademy, com os programas da casa (NutriOnfire, NutriLabs, NutriAcademy PRO, Curadoria, Certificação), os professores da casa e as imersões da casa. Não é uma agenda genérica: cada programa tem a própria apresentação, herdada da identidade que os alunos já conhecem.

## Operating Context

- A programação é publicada **por mês** ("Programação mês de outubro"). O mês corrente abre por padrão e os anteriores ficam acessíveis.
- As aulas costumam ser às 19h, horário de São Paulo, com duração de cerca de 60 minutos.
- **Seções (programas):** NutriOnfire, NutriLabs, NutriAcademy PRO, Curadoria e Certificação. Cada seção tem um jeito de aparecer: card grande com foto, ou card compacto com avatar (PRO). Seções novas podem surgir.
- **Imersões / eventos estratégicos:** sequências pontuais de aulas numeradas ("Aula 01…05"), com descrição e imagem próprias. Exemplo: a imersão de outubro/2026 com Samira Lima (Captação → Pré-consulta → Consulta → Pós-consulta → Consulta de retorno). Uma imersão acontece uma vez e não tem substituta; precisa de uma forma fácil de ser publicada e de destaque visual próprio.
- **O título do professor varia por aula** ("Dra. Samira Lima" numa aula, "Samira Lima" em outra). Ele é definido em cada aula, nunca inferido.
- **A imagem do card** é a foto do professor por padrão, com opção de uma imagem própria da aula.

## Capabilities and Constraints

- Público: mês corrente, navegação entre meses, página por professor, "Adicionar à agenda" (Google Agenda + .ics) e selo "Realizada" automático.
- Painel `/admin`: CRUD de aulas, professores, seções e imersões; duplicar aula; login por e-mail para 1 a 3 pessoas.
- Stack já definida: Next.js 16 + shadcn/ui + Tailwind v4 + Supabase, na Vercel. Spec em `docs/superpowers/specs/2026-10-01-calendario-nutriacademy-design.md`.
- Fuso: sempre `America/Sao_Paulo`.
- Fora do escopo: busca e filtros, link ao vivo, gravações, área logada do aluno, notificações.

## Brand Commitments

- **A identidade visual deve ser a mesma da página atual do calendário** (decisão explícita do usuário em 2026-10-01): fundo preto com gradiente dourado/marrom, hero com o logo NutriAcademy e "PROGRAMAÇÃO MÊS DE …", pílula "Escola NutriAcademy", cards com foto, dourado para NutriOnfire/NutriLabs, verde-azulado (teal) para NutriAcademy PRO, rodapé "Curadoria · Módulo · Calendário" e fonte Poppins. A plataforma nova moderniza a experiência, mas não troca essa identidade.
- As fotos aparecem como no original, sem filtros, inclusive nas aulas realizadas.
- A navegação entre meses é em texto, sem botão com borda. Quando há dois controles, ficam separados por uma barra vertical.
- Os ativos ficam em `escolanutriacademy.com.br/wp-content/uploads/` (Light-logo-1.webp, logov4.png do PRO, BG-01.jpg e as fotos dos professores).

## Evidence on Hand

- Programação real de setembro e outubro/2026, com fotos, capturada da página atual.
- Não há depoimentos, números ou métricas. Não inventar.

## Product Principles

1. **Publicar tem que ser mais fácil que editar o Elementor.** Se cadastrar uma aula exigir mais passos que hoje, falhou.
2. **O mês é a unidade.** Tudo se organiza por "programação do mês"; o histórico é só navegar para trás.
3. **Cada programa com a sua cara.** Seções e imersões têm apresentação própria, mas dentro da mesma identidade da casa.
4. **Celular primeiro.** O aluno chega pelo WhatsApp.
5. **Nunca inventar dados** sobre pessoas: títulos, gêneros e nomes vêm do cadastro.

## Accessibility & Inclusion

Texto claro sobre fundo escuro com contraste AA; foco visível; respeitar `prefers-reduced-motion`; nomes e títulos de professores exatamente como cadastrados.
