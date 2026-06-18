# ♔ World Chess Trainer

Treinador de xadrez interativo com análise pós-partida powered by **Stockfish 18**.

## Funcionalidades

- **Jogo contra IA** — Stockfish 18 rodando via Web Worker no navegador
- **4 níveis de dificuldade** — Básico, Médio, Avançado e Campeonato Mundial
- **Modo Básico** — círculos verdes proativos nas peças que podem se mover e destinos visíveis ao clicar
- **Relógio** — 10 minutos com incremento de 5 segundos por lance
- **Indicador de pensamento** — ponto pulsante e borda azul no relógio enquanto o engine calcula
- **Análise pós-partida** — precisão geral (%) e classificação de cada lance com Stockfish
- **Histórico clicável** — clique em qualquer lance para ver a posição no tabuleiro
- **Navegação pela partida** — tabuleiro muda para a posição exata do lance selecionado com o movimento destacado
- **Melhor jogada** — seta azul no tabuleiro mostrando onde deveria ter jogado (quando o lance foi subótimo)

## Classificação de lances

| Classificação | Cor | Critério |
|---|---|---|
| ✨ Excelente | Verde escuro | Melhor jogada possível |
| 👍 Boa | Verde | Perda ≤ 0,3 peão |
| ⚠️ Inexatidão | Amarelo | Perda de 0,3 a 0,8 peão |
| ❌ Erro | Laranja | Perda de 0,8 a 2,0 peões |
| 💥 Grave Erro | Vermelho | Perda > 2,0 peões |

## Tecnologias

- [Vite](https://vitejs.dev/) — build tool
- [Chessground](https://github.com/lichess-org/chessground) — tabuleiro de xadrez (UI do Lichess)
- [chess.js](https://github.com/jhlywa/chess.js) — regras e validação de movimentos
- [Stockfish 18](https://stockfishchess.org/) — engine de xadrez (WebAssembly)

## Como rodar

```bash
# Instalar dependências
npm install

# Baixar os arquivos WASM do Stockfish (não incluídos no repositório por serem grandes)
# Coloque stockfish-18.wasm e stockfish-18-single.wasm em public/stockfish/

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build
```

> **Nota:** Os arquivos `.wasm` do Stockfish (~108 MB cada) não estão no repositório. Baixe-os em [stockfishchess.org](https://stockfishchess.org/download/) e coloque na pasta `public/stockfish/`.

## Estrutura do projeto

```
src/
├── main.js              # Lógica principal do jogo
├── style.css            # Estilos globais
├── board/
│   └── board.js         # Wrapper do Chessground
├── analysis/
│   └── gameAnalyzer.js  # Análise pós-partida com Stockfish
├── clock/
│   └── chessClock.js    # Relógio com incremento
├── data/
│   └── gameStore.js     # Histórico de lances da partida
├── engine/
│   ├── stockfish.js         # Web Worker wrapper
│   └── stockfishManager.js  # Interface de alto nível do engine
└── ui/
    └── ui.js            # Renderização do histórico e modais
```
