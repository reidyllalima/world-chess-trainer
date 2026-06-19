const ADVICE = [
  // ── Ruy López / Abertura Espanhola (C60–C99) ──────────────────────
  {
    test: eco => eco[0] === 'C' && +eco.slice(1) >= 60,
    tip: 'Pressione o cavalo em c6 que sustenta e5. Jogue Rfe1 para reforçar o centro e busque expansão com a4 ou d4 no momento certo. A partida costuma ser longa e estratégica — evite trocas precipitadas e prepare um avanço no lado da dama.',
  },
  // ── Jogo Italiano / Giuoco Piano (C50–C59) ────────────────────────
  {
    test: eco => eco[0] === 'C' && +eco.slice(1) >= 50 && +eco.slice(1) <= 59,
    tip: 'Mantenha o bispo em c4 mirando f7, o ponto mais fraco de pretas. Jogue d3 para solidez ou d4 para tensão imediata. Conecte as torres cedo e explore a diagonal aberta; na Variante Evans, o gambito c3-d4 abre o centro rapidamente.',
  },
  // ── Jogo Escocês (C44–C45) ────────────────────────────────────────
  {
    test: eco => eco[0] === 'C' && +eco.slice(1) >= 44 && +eco.slice(1) <= 45,
    tip: 'Com d4 no terceiro lance você troca peão por controle central. Desenvolva o bispo para c4 ou b5 e ataque o cavalo em d4. Busque jogo ativo e rápido de peças; o bispo em c4 mira o ponto f7 e cria ameaças constantes.',
  },
  // ── Gambito do Rei (C30–C39) ──────────────────────────────────────
  {
    test: eco => eco[0] === 'C' && +eco.slice(1) >= 30 && +eco.slice(1) <= 39,
    tip: 'Gambit agressivo! Ao sacrificar o peão f4 você ganha controle do centro e abertura de linhas para atacar. Desenvolva cavalos e bispos rapidamente, faça o roque pelo lado da dama se necessário e lance o ataque antes de pretas consolidarem.',
  },
  // ── Philidor / Petrov (C40–C43) ───────────────────────────────────
  {
    test: eco => eco[0] === 'C' && +eco.slice(1) >= 40 && +eco.slice(1) <= 43,
    tip: 'Contra a Philidor avance d4 imediatamente para ganhar vantagem no centro. Contra a Petrov (Defesa Russa), evite a simetria com d4 ou Nc3 — pretas buscam igualdade fácil, então crie desequilíbrios para manter a iniciativa.',
  },
  // ── Defesa Francesa (C00–C19) ─────────────────────────────────────
  {
    test: eco => eco[0] === 'C' && +eco.slice(1) <= 19,
    tip: 'Pretas constroem uma muralha com e6-d5. Na Variante de Avanço (e4-e5), restrinja o bispo de c8 e ataque o lado do rei. Na Variante de Troca, abra o jogo cedo. Cuidado com o contra-jogo de pretas na coluna c com c5.',
  },
  // ── Defesa Siciliana (B20–B99) ────────────────────────────────────
  {
    test: eco => eco[0] === 'B' && +eco.slice(1) >= 20,
    tip: 'A abertura mais popular contra 1.e4. Jogue a Siciliana Aberta (2.Nf3 + 3.d4) para desequilíbrio e jogo dinâmico — brancas atacam no lado do rei com f4-f5 enquanto pretas contraatacam na coluna c. Não permita que pretas se consolidem: seja agressivo e concreto.',
  },
  // ── Caro-Kann (B10–B19) ───────────────────────────────────────────
  {
    test: eco => eco[0] === 'B' && +eco.slice(1) >= 10 && +eco.slice(1) <= 19,
    tip: 'Defesa sólida: pretas jogam c6-d5 sem bloquear o bispo de c8. Na Variante Clássica capture em d5 com o cavalo (Nd2) para manter tensão. Na Variante de Avanço, avance e5 e ataque com Bc1-f4 e Qd2 enquanto pretas lutam para liberar as peças.',
  },
  // ── Pirc / Defesa Moderna (B06–B09) ──────────────────────────────
  {
    test: eco => eco[0] === 'B' && +eco.slice(1) >= 6 && +eco.slice(1) <= 9,
    tip: 'Pretas deixam brancas ocuparem o centro para depois atacá-lo. Não recue! Avance com d4, c4 e f4 (Sistema Austríaco) criando um centro poderoso. Lance o ataque no lado do rei enquanto pretas tentam minar o centro com c5 ou e5.',
  },
  // ── Defesa Escandinava (B01) ──────────────────────────────────────
  {
    test: eco => eco[0] === 'B' && +eco.slice(1) === 1,
    tip: 'Pretas atacam e4 imediatamente com d5. Após exd5 e Dxd5, jogue Nc3 ganhando tempo contra a dama. Desenvolva rapidamente, expulse a dama inimiga e mantenha a vantagem de desenvolvimento — evite trocas que igualem a posição.',
  },
  // ── Defesa Alekhine (B02–B05) ─────────────────────────────────────
  {
    test: eco => eco[0] === 'B' && +eco.slice(1) >= 2 && +eco.slice(1) <= 5,
    tip: 'Pretas provocam você a avançar peões centrais. Jogue com moderação: e5, d4, c4. Não superestenda os peões. Mantenha controle central sólido e desenvolva peças ativas para explorar o desequilíbrio gerado.',
  },
  // ── Grünfeld (D70–D99) ────────────────────────────────────────────
  {
    test: eco => eco[0] === 'D' && +eco.slice(1) >= 70,
    tip: 'Pretas permitem seu grande centro para depois destruí-lo com c5 e d5. Reforce os peões d4 e c4 com Nc3 e Be3. Na Variante de Troca, após dxc4 construa um centro dominante — no final, o par de bispos longos será decisivo.',
  },
  // ── Gambito da Dama (D06–D69) ─────────────────────────────────────
  {
    test: eco => eco[0] === 'D' && +eco.slice(1) >= 6 && +eco.slice(1) <= 69,
    tip: 'Ofereça c4 para ganhar controle central. Se aceito (DGA), recupere com e3 e Bxc4 desenvolvendo ativamente. Se recusado (DGD), pressione com Bg5 fixando o peão d5. Na Eslava, respeite a solidez de pretas e jogue pela vantagem posicional de longo prazo.',
  },
  // ── Nimzo-Indiana (E20–E59) ───────────────────────────────────────
  {
    test: eco => eco[0] === 'E' && +eco.slice(1) >= 20 && +eco.slice(1) <= 59,
    tip: 'Pretas pregam o cavalo c3 com Bb4. Cuidado com peões duplos em c! Jogue e3 para solidez ou a3 para forçar a troca e ganhar o par de bispos. Com o par de bispos em posição semiaberta, a vantagem estrutural se concretiza no final.',
  },
  // ── Indiana da Dama (E12–E19) ─────────────────────────────────────
  {
    test: eco => eco[0] === 'E' && +eco.slice(1) >= 12 && +eco.slice(1) <= 19,
    tip: 'Pretas controlam e4 com Bb7 e Nf6. Responda com Nc3 e Bg5 para pressionar. Avance e4 quando possível para ganhar espaço central. O jogo estratégico favorece quem controlar o centro e as casas-chave e4 e d5.',
  },
  // ── Indiana do Rei (E60–E99) ──────────────────────────────────────
  {
    test: eco => eco[0] === 'E' && +eco.slice(1) >= 60,
    tip: 'Pretas fianchetam o bispo e contra-atacam com e5 ou c5. Mantenha seu centro com d4-c4-e4. No Sistema Clássico, avance e4-e5 para o ataque no flanco do rei. No Sämisch, f3-f4-f5 cria pressão devastadora. Não deixe pretas liberarem e5 facilmente.',
  },
  // ── Catalan (E00–E09) ─────────────────────────────────────────────
  {
    test: eco => eco[0] === 'E' && +eco.slice(1) <= 9,
    tip: 'Sistema posicional elegante com g3 e Bg2. O bispo pressiona a diagonal a8-h1 e o centro. No Catalan Aberto, recupere o peão c4 ativamente com Qa4+. Pressão contínua no peão d5 e jogo na coluna c são seus trunfos principais.',
  },
  // ── Defesa Holandesa (A80–A99) ────────────────────────────────────
  {
    test: eco => eco[0] === 'A' && +eco.slice(1) >= 80,
    tip: 'Pretas jogam f5 para controlar e4 e atacar o flanco do rei. Responda com Bg5 ou avance e4 para explorar a fraqueza de e6. Na Leningrado (g6-Bg7), mantenha peças ativas e explore a coluna e semis-aberta antes que pretas se organizem.',
  },
  // ── Abertura Inglesa (A10–A39) ────────────────────────────────────
  {
    test: eco => eco[0] === 'A' && +eco.slice(1) >= 10 && +eco.slice(1) <= 39,
    tip: 'Abertura flexível com c4 — controle d5 sem comprometer o centro prematuramente. Contra a Defesa Simétrica (c5), jogue Nf3-g3-Bg2 para o "Reversed Dragon" com um tempo a mais. Mantenha flexibilidade e adapte-se à estrutura de pretas.',
  },
  // ── Trompowsky / Torre / Sistemas A45–A79 ─────────────────────────
  {
    test: eco => eco[0] === 'A' && +eco.slice(1) >= 40 && +eco.slice(1) <= 79,
    tip: 'No Ataque Torre (Nf3-Bg5) ou Trompowsky (Bg5 contra Nf6), pressione o desenvolvimento de pretas. Evite a troca automática do bispo — use-o para criar ameaças. Mantenha controle central e desenvolva peças harmonicamente para um jogo sólido.',
  },
  // ── Flanco / Irregulares (A00–A09) ───────────────────────────────
  {
    test: eco => eco[0] === 'A' && +eco.slice(1) <= 9,
    tip: 'Abertura não convencional de flanco. Responda ocupando o centro com d4-e4 e desenvolvendo peças ativamente. Não imite o adversário — estableleça jogo sólido no centro e capitalize sobre o desenvolvimento mais lento de pretas.',
  },
  // ── Fallback ──────────────────────────────────────────────────────
  {
    test: () => true,
    tip: 'Desenvolva suas peças ativamente, controle o centro e garanta a segurança do rei com o roque o mais cedo possível.',
  },
];

export function getOpeningAdvice(eco) {
  if (!eco) return ADVICE[ADVICE.length - 1];
  return ADVICE.find(e => e.test(eco)) ?? ADVICE[ADVICE.length - 1];
}
