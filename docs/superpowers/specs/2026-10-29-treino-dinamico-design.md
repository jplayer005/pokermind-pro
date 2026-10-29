# PokerMind: treino dinâmico centrado na mesa

## Context
Num torneio real, o usuário caiu faltando um para a bolha. Era chip leader e apostou alto com top par contra um vilão com 60% do seu stack, que tinha trinca. Ele aprende melhor jogando e pediu quatro frentes, nesta ordem:
1. Ler o range do vilão (posição, stack, quem já agiu, linha de apostas).
2. Calcular odds rápido.
3. Pressão de ICM e da bolha.
4. Ranges de pré-flop.

O objetivo é um treino dinâmico, intuitivo e que fixe na memória.

**O que já existe e será reaproveitado:**
- **Mesa:** `PlayTable` + `useTableEngine`, com coach `off`/`after`/`live`.
- **Coach:** `gradeDecision`, `buildVillainRange`/`describeRange`, EV HU e multiway (`engine/coach/ev.ts`) e leaks com `dueLeaks`/`drillTarget`.
- **Equity:** `equityVsCombos`, `equity169`.
- **Torneio:** `icmPressure`, `isBubble`, `isHandForHand`.
- **Ranges:** `data/ranges.ts`, com RFI, 3bet, defesa e push/fold por posição e stack.
- **Repetição espaçada:** SM2 (`useSpacedRepetitionStore`).

**Lacunas encontradas no código:**
- (a) `startHand` só embaralha (`reducer.ts:154`). Não dá para montar uma situação com cartas, board e stacks escolhidos.
- (b) `buildVillainRange` abre o pré-flop pelo percentil de Chen e pelo perfil. Ignora posição e stack, e não usa `data/ranges.ts`.
- (c) O feedback só chega depois da ação. Nada pede para você estimar antes de agir, e é estimar antes que treina o raciocínio.
- (d) O cronômetro só existe no `competition` do Preflop.

**Princípio do desenho:** aprender pela recuperação ativa. A mesa pausa no momento crítico, você estima (range, equity, decisão) e o coach compara com o seu palpite. Cada erro vira um card que volta pelo SM2.

---

## Fase 0: publicar o que foi aprovado (antes de qualquer código novo)
1. Rodar `npm test` e `npm run build` na `teste/motor-e-mesa`.
2. Fazer o merge na `main` e o push, o que dispara a publicação no Pages.
3. Subir `versionCode` de 1 para 2 em `android/app/build.gradle`.
4. Limpar `app/build` pelo PowerShell (tirar o somente leitura antes de apagar). Gerar o AAB de release duas vezes e comparar os tamanhos. Não gerar APK de release.
5. Lembrar o usuário de pegar o SHA do certificado de assinatura no Play Console e registrar no Firebase.
6. Escrever o spec deste plano em `docs/superpowers/specs/2026-10-29-treino-dinamico-design.md`, numa branch nova `teste/treino-dinamico`.

Cada fase abaixo termina num APK debug publicado no Firebase App Distribution, com notas em linguagem de usuário, na `teste/treino-dinamico`. A `main` só recebe as fases depois da aprovação.

---

## Fase 1: Leitura de range (prioridade 1)

### 1.1 Fundação: range com posição e stack
- Novo `engine/coach/preflopRange.ts`, com `preflopRangeFor(state, seat)`. A largura inicial vem de `data/ranges.ts` e depende de:
  - a posição (`positionsBySeat`);
  - a ação (RFI, call vs open conforme a posição do opener, 3bet, 4bet, limp, BB que só checou);
  - o stack efetivo em bb (abaixo de cerca de 20bb, usa `PUSH_FOLD_RANGES` e trata o shove como range de push).
  
  Ajustar pelo perfil do bot (looseness) como hoje.
- `buildVillainRange` passa a chamar essa função no lugar do `cap` por Chen (`range.ts:107-120`). As regras pós-flop por rua continuam iguais. Os `steps` ganham o contexto, por exemplo "BTN abriu com 35bb: ~40% das mãos".
- Mais um ajuste pós-flop: um raise no turn/river de quem só pagou no flop deixa o range bem mais forte e polarizado. É exatamente a sua mão. A regra entra no mesmo laço por rua, com teste.

### 1.2 "Pausa e leia" na mesa (núcleo do treino)
- Novo modo de coach, `quiz`, ao lado de `off`/`after`/`live`. Quando o herói enfrenta uma aposta grande (mais de 50% do pote, raise ou all-in), a mesa pausa antes da sua vez e mostra um painel em 2 passos:
  1. **Range dele:** você escolhe em 3 a 4 faixas ("mãos feitas fortes / top par+ / draws / blefes"). Opcional: uma grade 13x13 compacta para pintar.
  2. **Sua equity:** um slider de 0 a 100%.
- Depois da resposta, aparece a revelação:
  - o range estimado (`describeRange`), com a composição por categoria;
  - a sua equity real (`equityVsCombos`);
  - a equity necessária (pot odds);
  - o erro do seu palpite, por exemplo "você achou 65%, era 31%".
  
  Aí você age.
- Pontuação entra no XP: acertar a equity dentro de ±10 pontos conta como acerto. Erros grandes viram card SM2 com o snapshot do spot.
- Frequência configurável: todo spot grande, metade ou só river/all-in. Assim a mesa não fica travada.
- Arquivos:
  - `components/table/ReadRangeSheet.tsx` (novo);
  - `hooks/useTableEngine.ts` (gancho de pausa antes da ação do herói);
  - `pages/PlayTable.tsx` (seletor do modo).

### 1.3 Laboratório de cenários (repetir a sua mão)
- `startHand` ganha um parâmetro opcional `preset`. Com ele você fixa as cartas do herói, as do vilão (opcional), o board, os stacks, o botão e o estado do torneio. As cartas fixas saem do baralho e o resto embaralha normalmente. Sem `preset`, o comportamento atual fica idêntico, com teste de regressão.
- Novo `data/scenarios.ts`, com cenários curados e nomeados. O primeiro é **"Chip leader na bolha: top par contra check-raise"**: herói com 2x o stack do vilão, vilão com 60%, bolha mão a mão, vilão `station` que faz slowplay de set. Outros: overpair contra 3bet pot com board molhado, flush draw contra shove, BB defendendo contra o BTN com 15bb.
- Cada cenário roda N vezes com cartas variando dentro do tema, por exemplo "top par" é sempre top par num board seco, mas com cartas diferentes. Assim treina o padrão e não decora a mão.
- **"Recriar minha mão":** um formulário simples para registrar mãos reais (posições, stacks, cartas, board, ações). A mão vira um cenário e pode ser jogada de novo com o coach analisando. Fica salva no store local e sincroniza junto como mais um documento em `SYNC_DOCS`, com merger em `syncMerge.ts`.
- Nova tela `pages/ScenarioLab.tsx`, com rota `/lab` e entrada no Dashboard.

### 1.4 Revisão pós-mão com a linha do range
- `HandReviewSheet` ganha uma faixa por rua com a largura do range do vilão (%), a sua equity contra ele e o pote. É ali que se vê o momento em que o top par passou a perder: no seu caso, o raise do turn.

---

## Fase 2: Odds rápidas (prioridade 2)
- Nova tela `pages/OddsRush.tsx`, com rota `/odds`. Rodadas de 60s de perguntas geradas na hora, a partir de spots aleatórios (board real e mão real):
  - **Outs:** "quantos outs?" (com outs sujos descontados);
  - **Regra do 2 e 4:** quanto vale em %;
  - **Pot odds:** quanto pagar e que equity precisa (`potOdds`, `breakEvenEquity`);
  - **Decisão:** "equity X contra pot odds Y: paga ou larga?";
  - **Equity contra range:** usa o range da Fase 1.
- Dificuldade adaptativa por tipo, que acelera quando você acerta. O recorde por tipo fica salvo. Erros viram cards SM2.
- **Atalho mental:** depois de cada erro, a explicação mostra a conta de cabeça em 1 linha (ex: "9 outs × 2 = 18% no turn").
- Na mesa, a opção "pergunta de odds antes de agir" reaproveita o painel 1.2 só com o slider de equity e o de pot odds.
- **Reuso:**
  - `lib/poker.ts`: `potOdds`, `outsToEquity`, `breakEvenEquity`;
  - `engine/equity.ts` para o gabarito;
  - um contador de outs novo e pequeno em `engine/coach/outs.ts`, com testes.

---

## Fase 3: ICM e bolha (prioridade 3)
- Na revelação 1.2 e no `HandReviewSheet` em MTT/SNG: equity necessária em **chipEV contra ICM**. O ICM vem de `calculateICM`/`mwCallEV` com os payouts do torneio. Também mostra o **prêmio de risco** em pontos de equity, por exemplo "pagar aqui precisa de 31% em fichas, mas de 44% em ICM: ele te cobre 60%, perder te tira da liderança".
- Indicador na mesa de **quem você cobre e quem te machuca**: um selo em cada assento, calculado pelo stack relativo e pelo ICM. Isso entra em `TournamentHeader` e nos assentos.
- Cenários de bolha no Lab (Fase 1.3):
  - chip leader pressionando stacks médios;
  - stack médio contra chip leader;
  - short stack de bolha;
  - a mesma decisão perto e longe da bolha, para sentir a diferença.
- O `gradeDecision` já recebe `icmPayouts`. Conferir se o pós-flop usa ICM para pagar ou apostar alto e, se não usar, estender com teste comparando chipEV e ICM num spot conhecido.

---

## Fase 4: Ranges de pré-flop (prioridade 4)
- **"Pinte o range":** na grade 13x13, você pinta o range de uma posição, stack e ação (RFI CO 40bb, BB contra BTN 25bb, push SB 10bb...). A nota sai pela sobreposição ponderada por combos com `data/ranges.ts`, e o diff aparece colorido (faltou ou sobrou). Fica no `PreflopTrainer` como novo modo, ou num componente `RangePainter` reaproveitável.
- **Na mesa, "range check":** no pré-flop, o coach `quiz` às vezes pergunta "essa mão está no seu range de abertura daqui?" antes de você agir.
- Os spots errados entram no SM2 já existente (`updateSM2`/`getDueQuestions`).

---

## Transversal: memorização
- Uma **"Revisão do dia"** única no Dashboard junta cards SM2 de todas as fontes: drills, erros da mesa no modo quiz, Odds Rush e Pinte o range. Ela reaproveita `dueLeaks` e a store SR. A meta diária passa a contar a revisão.
- **Sequência e XP:** as novas fontes entram em `XP_PER_GRADE` e no limite diário existente.

## Arquivos críticos
- **Novos:**
  - `engine/coach/preflopRange.ts`, `engine/coach/outs.ts`;
  - `data/scenarios.ts`;
  - `pages/ScenarioLab.tsx`, `pages/OddsRush.tsx`;
  - `components/table/ReadRangeSheet.tsx`, `components/RangePainter.tsx`.
- **Alterados:**
  - `engine/game/reducer.ts` (`preset`), `engine/coach/range.ts`, `engine/coach/grade.ts`;
  - `hooks/useTableEngine.ts`, `pages/PlayTable.tsx`, `components/table/HandReviewSheet.tsx`, `TournamentHeader`;
  - `App.tsx` (rotas), `store/index.ts`, `firebase/sync.ts` + `engine/syncMerge.ts` (mãos recriadas).

## Verificação (por fase)
- **TDD:** cada função de engine nova ganha teste Vitest antes do código:
  - `preflopRangeFor` por posição e stack;
  - raise do turn polarizando o range;
  - `startHand` com e sem `preset` (regressão: sem `preset`, o mesmo rng dá a mesma mão de antes);
  - contador de outs;
  - chipEV contra ICM num spot calculado à mão.
- `npm test` com todos passando (hoje 165) e `npm run build` limpo.
- Verificação no navegador (Vite) de cada tela nova em 320 a 390px.
- APK debug: limpar `app/build`, gerar duas vezes e conferir o tamanho. Depois distribuir pelo Firebase App Distribution com notas do que testar e do que é comportamento esperado.
- **Teste de aceitação da Fase 1:** jogar o cenário "Chip leader na bolha" e ver a mesa pausar no raise do turn, o range estimado mostrar sets e dois pares dominando, e a equity do top par aparecer baixa com a explicação.
