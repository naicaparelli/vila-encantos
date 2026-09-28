# CLAUDE.md — Vila dos Pequenos Encantos

Registro de tudo que foi feito para transformar o documento de conceito (`README.md`) em um jogo jogável, com as decisões tomadas e o porquê de cada uma. Serve como guia para quem for continuar o projeto (humano ou IA).

## 1. Resumo do que foi entregue

Um cozy game completo do primeiro arco (8 missões, 4 mapas, 3 NPCs, 3 mesas de crafting, 6+2 materiais, 15 mobílias), rodando no navegador (desktop e celular), sem nenhum asset binário: toda a pixel art e a música são geradas em código. O jogo vai da cinemática de abertura até a restauração da fonte, a carta misteriosa e o gancho para o "Bosque dos Sussurros", exatamente como o README descreve.

Estado atual: **jogável de ponta a ponta**, verificado por um playthrough automatizado (desktop e mobile) que percorre as 8 missões sem erros de console.

## 2. Como rodar

```bash
npm install
npm run dev        # http://localhost:5173 (com --host para testar no celular na mesma rede)
npm run build      # gera dist/
npm run preview    # serve dist/ em http://localhost:4173
npm run typecheck  # tsc --noEmit
```

Testes automatizados (precisam do `npm run preview` rodando e do Google Chrome instalado):

```bash
npm run test:smoke          # playthrough completo em 1280x720 (teclado/mouse)
npm run test:smoke:mobile   # playthrough em 844x390 com toque
npm run test:diag           # diagnóstico rápido: cenas ativas, texturas, logs
```

`?renderer=canvas` na URL força o renderizador Canvas (o headless usa isso; no navegador normal o WebGL é o padrão).

## 3. Stack e decisões de arquitetura

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Engine | **Phaser 3.90** + **Vite 6** + **TypeScript 5** | Engine 2D madura para tiles/pixel art, funciona em web e mobile, sem build nativo. Phaser 4 já existe, mas 3.x é mais estável e documentada. |
| Assets | **Zero arquivos de imagem/áudio.** Tudo gerado em runtime | Não havia arte no repositório. Gerar pixel art por código garante consistência de paleta, permite a variante "desbotada" de cada textura automaticamente e mantém o projeto 100% versionável em texto. |
| Renderização de mapa | Uma `Image` por tile (não `Tilemap`) | Permite trocar a textura de cada tile individualmente na animação de restauração (ondas a partir de um ponto). Mapas são pequenos (≤ 24×18), custo irrelevante. |
| Colisão | Grade de tiles própria (sem Arcade Physics) | Movimento previsível, colisão por AABB nos pés do personagem, bloqueios dinâmicos (caixas, NPCs, mobílias) somados a bloqueios estáticos. |
| Estado | Singleton `game` (`src/state/GameState.ts`) com `EventEmitter` + autosave em `localStorage` | UI e mundo reagem a eventos (`changed`, `flag`, `quest-started`, ...). Save debounced em 400 ms. |
| Missões | Dados declarativos com objetivos avaliados por função (`check(state)`) | Objetivos derivam do estado (contadores, flags, inventário, mobílias colocadas, atributos do ambiente). Sem máquina de estados paralela para desincronizar. |
| Timers de coleta | Timestamps absolutos no save | O contador continua correto ao fechar/reabrir o jogo (README §9.1). |
| Música | Sequenciador Web Audio procedural por mapa | Estilo 16 bits (ondas quadrada/triângulo), melodia determinística por seed, eco leve. Uma faixa por mapa + variantes "restauradas". |
| Escala | `Scale.RESIZE` + zoom inteiro da câmera (1–4) | Pixels sempre inteiros (sem shimmer). Mapas menores que a tela ficam centralizados. UI escala por `uiScale()` (1–2,2×). |
| Mobile | Joystick virtual + botões redondos (Ação, Correr, Decorar, Girar, Sair) + ícones no topo | Detecção por `ontouchstart`/`maxTouchPoints`. No modo decoração, o toque move o cursor e um segundo toque no mesmo tile confirma. |
| Rotação de mobílias | 4 passos de 90° | O README pede "rotação livre"; em pixel art de 32 px rotação arbitrária gera artefatos. 90° mantém o visual limpo. Documentado como simplificação consciente. |

## 4. Estrutura do código

```
index.html                 viewport mobile, canvas pixelated
src/main.ts                config do Phaser (RESIZE, pixelArt, ?renderer=canvas), expõe window.__game/__state para testes
src/config.ts              TILE=32, velocidades, tempos de regeneração, espécies
src/art/palette.ts         paleta do README §16 + fade() (Desbotamento) + mix/darken/lighten
src/art/pix.ts             buffer de pixels (rect, disc, line, triangle, outline, rows, mapColors…) e PRNG determinístico
src/art/tiles.ts           tiles 32 px: grama, caminho, pedra, água (3 frames), piso, parede, cerca…
src/art/characters.ts      gerador dos personagens 32×48 (3 espécies do jogador + 3 NPCs), 4 direções × (parado + 4 frames)
src/art/objects.ts         props, pontos de coleta, fachadas (velha/restaurada), fonte, mobílias, ícones de itens e UI, escritório
src/art/ui.ts              molduras 9-slice, botões, slots, joystick e ícones de UI (texturas ui_*)
src/art/textures.ts        registra tudo no Phaser; gera automaticamente a variante `__faded` de cada textura e os 9 frames das molduras
src/audio/music.ts         sequenciador chiptune por mapa (title, office, atelier, praca, praca_restored, floresta, loja, loja_restored, ending)
src/audio/sfx.ts           efeitos curtos por osciladores
src/data/items.ts          materiais, itens-chave e mobílias com atributos (aconchego / iluminação / natural)
src/data/recipes.ts        receitas por mesa e grupos de desbloqueio
src/data/maps.ts           4 mapas em ASCII + objetos (portas, props, interações, nós, NPCs)
src/data/quests.ts         8 missões com objetivos, entrega a NPC, efeitos e fragmentos de memória
src/data/dialogues.ts      diálogos dos NPCs por fase da história + textos narrativos
src/state/GameState.ts     inventário, flags, contadores, receitas, missões, decoração, nós, save/load
src/scenes/BootScene.ts    gera texturas → título
src/scenes/TitleScene.ts   título, Continuar/Novo jogo, escolha de personagem
src/scenes/IntroScene.ts   cinemática (escritório → anúncio → ônibus → chegada → ateliê furado)
src/scenes/WorldScene.ts   mapa, jogador, colisão, portas, interações, coleta, NPCs, restauração, modo decoração, sequência da fonte
src/scenes/UIScene.ts      HUD, diálogo, mochila, caderno (5 abas), mapa, crafting, HUD de decoração, controles de toque
src/scenes/EndingScene.ts  carta misteriosa e fim do capítulo 1
src/ui/widgets.ts          PixelPanel (9-slice em Canvas), Button, RoundButton, PixelBar, textStyle/hudStyle
tools/smoke.mjs            playthrough automatizado (Playwright + Chrome local)
tools/diag.mjs             diagnóstico de boot
tools/serve.sh             reinicia o `vite preview` (ele guarda o index.html em cache; reiniciar após cada build)
tools/peek.mjs             captura rápida de cada mapa (velho/restaurado), painéis e diálogo
tools/atlas.mjs            folha de contato de todas as texturas ampliadas (por grupo)
tools/furn.mjs             ateliê com todas as mobílias nas 4 orientações
tools/panels.mjs           mochila, caderno (missões/receitas) e crafting com itens de teste
```

## 5. Sistemas implementados (mapeamento com o README)

- **§5 Personagens**: coelho, gato e cachorro com as paletas aprovadas (jardineira lilás/azul-petróleo/mostarda, lenços amarelo/coral/verde-sálvia, botas e bolsa marrons). Escolha apenas estética. Sprites 32×48, 4 direções, 1 frame parado + 4 de caminhada.
- **§6 Cinemática**: 5 quadros com legendas; pode ser pulada.
- **§7 Ateliê**: interior com caixas, teias, janela fechada, bancada quebrada, mesa de costura e de pintura bloqueadas, Caderno dos Encantos. Fachada externa velha (telhado furado, tábuas, placa quebrada, mato, brilho âmbar) e restaurada (mesma arquitetura).
- **§8 Loop**: missão → explorar → coletar → craftar → decorar → concluir → nova história/receita.
- **§9.1 Coleta**: 7 materiais (os 6 do README + Flor-de-lua da missão 6 e Tinta encantada produzida). Nós com barra de progresso + timer `m:ss`; tempos: folhas 30 s, fibra 45 s, madeira 60 s, pedra 90 s, flor 120 s, flor-de-lua 150 s, pó de encanto 180 s.
- **§9.2 Crafting**: marcenaria (inicial), costura (missão 5) e pintura (missão 6). Painel mostra ingredientes com contagem e atributos.
- **§9.3 Decoração**: prévia fantasma, cursor válido/inválido, colocar, pegar, mover, girar; mobílias de parede só encostadas na parede; tapetes não bloqueiam; progresso dos requisitos na tela.
- **§9.4/§12 Missões**: as 8 do README, com as mecânicas apresentadas na ordem pedida. Missões 4 e 7 são entregues falando com Amora.
- **§9.5 Caderno**: abas Missões, Receitas, Materiais, Memórias e Encantos.
- **§10 Locais**: Ateliê, Praça, Floresta (com clareira do altar gated por tronco), Loja de Amora.
- **§11 NPCs**: Amora (aparece no ateliê após a missão 3, depois na loja), Pingo (praça após a missão 4), Lilo (praça; cético até o final).
- **§13 Primeira missão**: 5 caixas, 3 teias, janela (luz entra, flash), fotografia (aparece após abrir a janela), verso da foto, bancada brilhando.
- **§14 Desafios**: requisitos por item e por atributo (aconchego ≥ 10, iluminação ≥ 2, natural ≥ 2) na loja.
- **§15 Final**: fragmento voa até a fonte, flash, água volta, cores retornam em ondas, flores nascem, moradores saem, música muda, placa para o Bosque dos Sussurros aparece, fala de Lilo, carta, decoração livre, EndingScene.
- **§16 Arte**: paleta limitada, contorno escuro em tudo, sem antialiasing (`pixelArt: true`, `image-rendering: pixelated`), texturas desbotadas via `fade()` e vibrantes após restauração.
- **§18 Controles**: WASD/setas, Shift correr, E interagir, B mochila, Tab caderno, M mapa, F decorar, R girar, Esc fechar. Todos os painéis também abrem por ícones clicáveis/tocáveis.
- **§19**: uma música por mapa (16 bits, relaxante) e mapas por tiles.

## 6. Problemas encontrados e como foram resolvidos

1. **Loop infinito na geração de arte** — `Pix.line` (Bresenham) recebia coordenadas fracionárias na teia de aranha e nunca atingia o ponto final. Corrigido arredondando as entradas.
2. **Toques de tecla perdidos** — `Phaser.Input.Keyboard.JustDown` perde um `keydown`+`keyup` que caem no mesmo frame (a flag é zerada no keyup). Ações (E, Espaço, F, R, Esc) passaram a ser eventos `keydown` enfileirados e consumidos no `update`.
3. **WebGL em headless** — o Chrome headless falhou em criar framebuffer; adicionado `?renderer=canvas` para testes (e como fallback para navegadores problemáticos).
4. **Sobreposição na seleção de personagem** em telas grandes — escala da UI limitada a 1,5× nesse painel e botões dentro do painel.
5. **Mapas pequenos grudados no canto** em telas largas — a câmera centraliza mapas menores que a viewport.
6. **Nomes de campo em `Container`** — `Button` não pode declarar `w`/`h` privados (colidem com o Phaser). Renomeados para `btnW`/`btnH`.

## 7. Como o teste automatizado funciona

`tools/smoke.mjs` abre o jogo no Chrome instalado (via `playwright-core`, sem download de navegador), joga o fluxo inteiro e verifica o estado em cada etapa. Foi executado com sucesso nos três cenários: desktop + Canvas, desktop + WebGL (`npm run test:smoke http://localhost:4173/`) e mobile com toque. Para as partes que dependem só de caminhar, ele teleporta o jogador (`WorldScene.player.setPosition`) e usa as teclas/toques reais para interagir; o movimento e as portas são testados com teclas reais. Materiais extras são injetados via `window.__state` para não depender dos timers de regeneração. As capturas ficam em `tools/shots/` (ou na pasta apontada por `SHOT_DIR`).

## 8. Balanceamento inicial

- Nós da floresta: 5 madeira, 3 pedra, 3 folhas, 3 fibra, 3 flor, 2 pó, 3 flor-de-lua; praça: 1 pó, 1 pedra, 1 folhas. Uma volta pela floresta rende madeira suficiente para a bancada + primeira mobília.
- Consertos: bancada 5 madeira; costura 4 madeira + 3 pedra + 2 fibra; pintura 3 madeira + 2 pedra + 1 flor-de-lua.
- Pedido de Amora (missão 7): vitrine, 2 mesas de chá, 2 almofadas, tapete, quadro e atributos aconchego ≥ 10, iluminação ≥ 2, natural ≥ 2 (ex.: luminária + vaso de flores).

## 9. Próximos passos sugeridos

- Validar em aparelho real (o teste mobile roda em viewport simulada com toque); ajustar tamanhos dos botões se necessário.
- Substituir a arte procedural por sprites desenhados à mão mantendo as mesmas chaves de textura (`src/art/textures.ts` é o único ponto de registro).
- Trilhas compostas à mão podem substituir o sequenciador mantendo a interface `music.play(id)`.
- Capítulo 2: Bosque dos Sussurros (a placa e o caminho ao norte da praça já aparecem após o final).
- Pathfinding simples para NPCs se moverem; hoje eles ficam parados e apenas viram para o jogador.

## 10. Upgrade visual (branch `art-boost`)

Passe completo de pixel art e interface, feito sem nenhum asset binário (tudo continua gerado em código). Cada etapa foi verificada com `typecheck`, `build`, smoke desktop e mobile, e comparada em screenshots antes/depois.

### Commits

| Commit | Etapa |
| --- | --- |
| `5a730a2` | Tiles com variação orgânica, bordas automáticas (lago afundado, caminho, meio-fio), sombras no chão, laterais de parede |
| `14af7bc` | Personagens com sombreamento em 3 tons, caminhada com balanço, retratos 48×48 |
| `09f57b7` | Props, fachadas, fonte e mobílias redesenhados; mobílias com 4 orientações desenhadas |
| `62d54c3` | UI em pixel art: molduras 9-slice, botões, slots, diálogo com retrato, controles de toque |
| `82746fa` | Título, cinemática e efeitos (partículas, luz da janela, onda da restauração, cantos arredondados) |
| (este) | Seleção de personagem adaptada a telas baixas + esta documentação |

### O que mudou, por área

- **Terreno** (`src/art/tiles.ts`): tiles desenhados com `wrap = true` (manchas e tufos atravessam a borda, sem emendas). Grama com manchas em dithering, tufos e florzinhas; caminho com pedrinhas com volume; calçamento com pedras arredondadas e juntas; água com ondulações e reflexos por frame; cercas, piso de tábuas, azulejo da loja, papel de parede listrado, lateral de parede (`wallSide`).
- **Transições automáticas** (`WorldScene.addEdges`): por vizinho, sobrepõe `edgeWater*` (orelha de grama + parede de terra + sombra na água: o lago fica "afundado"), `edgePath*` (grama avançando sobre o caminho, 1 px mais baixo), `edgeCobble*` (meio-fio), cantos internos `corner*` e cantos externos arredondados `cap*`.
- **Sombras**: `groundShadow()` sob árvores, props, nós de coleta e NPCs (a sombra acompanha visibilidade/remoção).
- **Personagens** (`src/art/characters.ts`): cabeça arredondada com luz/sombra, olhos com brilho, bochechas, bigodes, jardineira com peitilho/alças/botões/bolso, lenço com nó, bolsa com fivela; ciclo de caminhada contato/passagem com o corpo subindo na passagem, braços e orelhas balançando; perfil com focinho projetado e costas com alças cruzadas. `drawPortrait()` gera `portrait_player_*` / `portrait_npc_*` para o diálogo.
- **Props e fachadas** (`src/art/objects.ts`): helpers `plank`, `stoneBlock`, `roofShingles` (telhas arredondadas com sombreamento por fileira), `eave`, `windowFrame` (peitoril, venezianas, cortinas, floreira, tábuas), `doorFrame`, `potPlant`, `canopy`/`trunk`. Fachadas com base de pedra e enxaimel; variantes velhas com buracos, tábuas, rachaduras e teias. Fonte em blocos com água e jatos; altar, tronco, poste, placas e nós refeitos.
- **Mobílias com 4 orientações**: cada gerador `furn*` recebe `Facing` (`south | east | north | west`) e desenha o móvel visto daquele ângulo. Texturas `furn_<id>_<dir>`; `furn_<id>` continua apontando para a vista sul (ícones, receitas, caderno). `WorldScene.furnTexture(item, rot)` faz o mapeamento `rot` 0..3 → sul/leste/norte/oeste em `addPlacedSprite`, `refreshGhost` e `decorRotate`; `setAngle` não é mais usado e o save continua guardando só `rot`.
  - 4 vistas distintas: cama (cabeceira/travesseiro mudam de lado), cadeira (encosto atrás, à frente ou na lateral), banco, mesa de chá (arranjo de xícara e bule gira), vasos (arranjo das flores), luminária (cordinha muda de lado).
  - **Decisão documentada**: mobílias de parede (prateleira, vitrine, cortina, quadro) ficam sempre encostadas na parede norte, então têm só 2 arranjos (sul = norte; leste = oeste com os objetos invertidos). Tapete, almofada e banquinho são simétricos: 2 variantes (padrão/pregas/pernas girados 90°).
- **Interface** (`src/art/ui.ts`, `src/ui/widgets.ts`): `PixelPanel` monta uma moldura 9-slice com 9 imagens (o `NineSlice` do Phaser é só WebGL; o teste headless usa Canvas). Pergaminho com moldura de madeira, cantos arredondados e gemas lilás; `ui_pill` fino para HUD; `ui_panel_inset` para áreas afundadas; botões madeira/coral/lilás/desabilitado com relevo; slots; botão redondo; joystick. Texto de painel escuro sem contorno (`textStyle`), texto sobre o mundo claro com contorno (`hudStyle`). Diálogo com retrato em moldura, etiqueta de nome e seta de continuar. Mochila com slots e painel de detalhes, caderno com abas e caixas de seleção, mapa com trilha pontilhada, crafting com ícones dos ingredientes.
- **Título e cinemática**: placa de madeira pendurada por cordas, céu em faixas, sol/colinas, nuvens à deriva, folhas/pétalas caindo, personagem na porta; anúncio da intro em pergaminho dentro do monitor, estrada com cercas e nuvens, postes na chegada.
- **Efeitos** (`WorldScene.buildAmbient/updateAmbient`): folhas na praça desbotada e pétalas na restaurada, vaga-lumes na floresta, feixe de luz (blend ADD) e poeira na janela do ateliê após abri-la, nuvem de poeira nos pés ao andar/correr, brilhos na fonte, e na restauração um anel de luz expandindo com pulso de tint em cada objeto restaurado.

### Novos helpers em `src/art/pix.ts`

`wrap` (coordenadas dão a volta), `blend`/`rectBlend`/`ellipseBlend` (composição alpha), `rectDither` (padrões `DITHER.checker/sparse/dense/rows/cols`, só sobre pixels opacos por padrão), `discSoft` (borda em dithering), `rrectR`/`rrectOutline` (cantos com raio), `bevel` (luz/sombra automática na silhueta), `replace`, `rotated`/`flippedX`/`flippedY`/`clone`, `opaque`/`getHex`, `shadowPix`.

### Screenshots comparativas

`tools/shots/` está no `.gitignore`; as capturas ficam locais:

- `tools/shots/before/` — playthrough completo e atlas de texturas antes do upgrade.
- `tools/shots/after/` — mapas velhos/restaurados, painéis, diálogo, título, intro, decoração, final, mobile, ateliê com as mobílias nas 4 orientações (`atelier_A/B.png`) e atlas por grupo.
- `tools/shots/run/` — última execução do smoke (desktop `NN_*.png`, mobile `m_NN_*.png`).

Para regerar: `npm run build && bash tools/serve.sh && node tools/peek.mjs && node tools/furn.mjs && node tools/atlas.mjs`.

### Observações

- O `vite preview` serve o `index.html` em cache; depois de cada `build` é preciso reiniciá-lo (`tools/serve.sh`), senão os testes rodam o bundle antigo.
- O Desbotamento continua automático: toda textura nova ganha a variante `__faded`, exceto UI, ícones e efeitos (`NO_FADE_PREFIXES`).
