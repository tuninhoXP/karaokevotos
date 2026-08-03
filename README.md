# 🎤 KARAOKE VOTES

> **O sistema de votação definitivo para a sua festa de karaokê.**

Cadastre os cantores, gire a roleta e deixe a plateia votar! Um app 100% local, sem servidor, sem internet — perfeito para projetar na TV e animar qualquer festa. 🎉🎶

---

## ✨ Funcionalidades

| Emoji | Recurso |
|---|---|
| 🎡 | **Roleta real** que gira com desaceleração, som de tique-taque e confete ao sortear o cantor da vez |
| 📊 | **Votação obrigatória** de 1 a 10 — o cantor da vez não vota em si mesmo |
| 🔁 | **Múltiplas rodadas** configuráveis no início (1 a 10) |
| 🏆 | **Ranking final** com média e frases engraçadas para cada faixa de nota |
| 💾 | **Dados salvos no navegador** (`localStorage`) — feche e abra que continua de onde parou |
| 📺 | **Visual arcade retrô** (CRT com scanlines, neon e estética de fliperama) |
| 🖥️ | **100% local** — sem servidor, sem internet, sem instalar nada |
| 🔇 | **Zero emojis nos dados** — mas muito estilo (e o confete é garantido) 😄 |

---

## 🚀 Como usar

1. **Abra o `index.html`** no seu navegador (duplo clique funciona).
2. **Cadastre os cantores** da festa (nome apenas — a música fica por conta do cantor 😎).
3. Escolha a **quantidade de rodadas** com os botões `-` / `+`.
4. Clique em **COMEÇAR A FESTA**.
5. **GIRE A ROLETA** 🎰 e veja quem foi sorteado para cantar.
6. Cada pessoa da plateia **dá sua nota de 1 a 10** no computador central.
7. Ao concluir, a roleta gira de novo — **sem repetir quem já cantou** na rodada.
8. Ao final de todas as rodadas, veja o **ranking** com as médias e as frases engraçadas. 🏆

> 💡 Dica: projete a tela na TV e use o navegador em **modo tela cheia** (F11) para o melhor efeito.

---

## 🎯 Fluxo do evento

- **1 rodada = todos os cantores cantam 1 vez.**
- A roleta sorteia apenas entre **quem ainda não cantou** na rodada atual.
- Quando todos cantaram, a rodada avança automaticamente.
- Ao terminar a última rodada, a festa encerra e o **ranking final** aparece.

---

## 😄 Frases engraçadas

Cada média gera uma frase especial no resultado final:

| Média | Frase |
|---|---|
| 90%+ | 🏅 *Nível Beyoncé! Assina o contrato AGORA!* |
| 80–89% | 🔥 *Inacreditável! Isso não é karaokê, é um show particular!* |
| 70–79% | 🎤 *Mandou muito bem! O chuveiro vai ficar com inveja.* |
| 60–69% | 🤩 *Olha só, quase profissional! Cadê o contrato?* |
| 50–59% | 😅 *Uou, você é quase profissional hein!* |
| 40–49% | 🤫 *Entre a gente, melhor deixar só no karaokê mesmo...* |
| 30–39% | 🥹 *A plateia fingiu que gostou. Mas a gente te ama de qualquer jeito!* |
| <30% | 💪 *O microfone merece um pedido de desculpas. Mas você é corajoso(a)!* |

---

## 🛠️ Tecnologias

- **HTML5** — estrutura
- **CSS3** — tema arcade retrô (scanlines CRT, sombras duras, animações)
- **JavaScript puro** — lógica, roleta em SVG, WebAudio para os sons
- **localStorage** — persistência dos dados
- **Zero dependências** — não usa nenhuma biblioteca externa

---

## 📁 Estrutura do projeto

```
karaokevotos/
├── index.html              # Estrutura das telas
├── style.css               # Tema arcade retrô (CRT)
├── app.js                  # Lógica, roleta, sons e persistência
└── karaokebackground.jpg   # Imagem de fundo da festa
```

---

## 🗺️ Roadmap

- 📱 **Votação pelo celular** (via QR Code / rede local)
- 🎨 **Temas visuais alternativos** (cassino, feira, boombox)
- 🔊 **Personalização dos sons** da roleta e da fanfarra
- 🎵 Campo de **música** opcional por cantor

---

Feito com 💜 para animar suas festas. **Boa cantoria!** 🎤✨
