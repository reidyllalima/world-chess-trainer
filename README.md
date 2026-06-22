# ♔ World Chess Trainer

Treinador de xadrez interativo com motor **Stockfish 18**, detecção de aberturas e análise pós-partida — tudo no navegador, sem backend.

## Funcionalidades

- **Jogo contra a IA** — Stockfish 18 rodando via Web Worker (WebAssembly)
- **4 níveis de dificuldade** — Básico, Médio, Avançado e Campeonato Mundial.
  Cada nível combina um *Skill Level* do Stockfish com um tempo máximo de cálculo,
  então a IA sempre responde rápido e na força certa para o nível.
- **Modo Básico** — círculos verdes nas peças que podem se mover e destinos
  visíveis ao clicar, ideal para iniciantes
- **Painel de abertura** — detecta a abertura em tempo real (livro local com 3733
  variantes do dataset CC0 do Lichess) e mostra o nome, o código ECO e uma dica
  estratégica de **como conduzir** aquela abertura
- **Dicas em duas fases** — com o botão *Dicas* ligado:
  - **Antes de jogar:** uma **seta verde** no tabuleiro sugere um bom lance para
    jogar agora ("💡 Sugestão: Nf3 — desenvolve e controla o centro")
  - **Depois de jogar:** avalia o seu lance (Excelente / Boa / Imprecisão / Erro /
    Grave Erro). Lances equivalentes à sugestão são elogiados; só aponta "Melhor
    era X" quando você realmente perde vantagem
- **Relógio** — 10 minutos com incremento de 5 segundos por lance
- **Indicador de pensamento** — ponto pulsante e borda azul enquanto o motor calcula
- **Análise pós-partida** — precisão geral (%) e classificação lance a lance, com
  comentário educativo em português e a melhor alternativa
- **Histórico clicável** — clique em qualquer lance para rever a posição no tabuleiro
  com o lance e a melhor jogada destacados

## Classificação de lances

Baseada na perda de avaliação (em peões) comparada à melhor jogada do Stockfish:

| Classificação | Cor | Critério |
|---|---|---|
| ✨ Excelente | Verde escuro | Melhor jogada, ou perda ≤ 0,15 peão |
| 👍 Boa | Verde | Perda ≤ 0,4 peão |
| ⚠️ Inexatidão | Amarelo | Perda ≤ 1,0 peão |
| ❌ Erro | Laranja | Perda ≤ 2,5 peões |
| 💥 Grave Erro | Vermelho | Perda > 2,5 peões |

## Tecnologias

- [Vite](https://vitejs.dev/) — build tool
- [Chessground](https://github.com/lichess-org/chessground) — tabuleiro de xadrez (UI do Lichess)
- [chess.js](https://github.com/jhlywa/chess.js) — regras e validação de movimentos
- [Stockfish 18](https://stockfishchess.org/) — motor de xadrez (WebAssembly)
- [Playwright](https://playwright.dev/) — teste de fumaça end-to-end (apenas dev)

## Como rodar

```bash
# Instalar dependências
npm install

# Os arquivos WASM do Stockfish (~108 MB cada) não vão no repositório.
# Baixe e coloque stockfish-18.wasm e stockfish-18-single.wasm em public/stockfish/

# Desenvolvimento
npm run dev

# Build de produção (regenera o livro de aberturas a partir do dataset do Lichess)
npm run build
```

> **Nota:** os `.wasm` do Stockfish não estão no repositório (ver `.gitignore`).
> Baixe-os em [stockfishchess.org](https://stockfishchess.org/download/) e coloque
> em `public/stockfish/`. O livro de aberturas (`src/openings/openingBook.js`) é
> gerado automaticamente pelo passo `prebuild`.

## Testes

```bash
npm test
```

Sobe o dev server e dirige o **Google Chrome** do sistema (via Playwright,
`channel: "chrome"` — não baixa navegador) para verificar movimentos, resposta da
IA, detecção de abertura e o painel de dicas de ponta a ponta.

## Estrutura do projeto

```
src/
├── main.js                  # Orquestra o jogo (lances, dicas, relógio, fim de jogo)
├── style.css                # Estilos globais
├── board/
│   └── board.js             # Wrapper do Chessground
├── analysis/
│   └── gameAnalyzer.js      # Análise pós-partida e classificação de lances
├── clock/
│   └── chessClock.js        # Relógio com incremento (Fischer)
├── data/
│   └── gameStore.js         # Histórico de lances com FEN para análise
├── engine/
│   └── stockfishManager.js  # Interface do Stockfish (fila serializada + níveis)
├── openings/
│   ├── openingBook.js       # Livro gerado (3733 variantes, CC0 Lichess)
│   ├── openingDetector.js   # Detecta a abertura pelo prefixo de lances
│   └── openingAdvice.js     # Dica estratégica por faixa de ECO
└── ui/
    └── ui.js                # Histórico, painéis e modal de análise

scripts/build-openings.mjs   # Gera openingBook.js a partir do dataset do Lichess
tests/smoke.mjs              # Teste end-to-end (Playwright + Chrome)
```
