/**
 * Search Chat Server
 * Express + DuckDuckGo + Addons + Chat JSON
 * Sem IA
 */

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const relevanceAddon = require("./addons/relevanceAddon");

const app = express();
const PORT = 3000;

/* ===============================
   Middlewares
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   Paths seguros
================================ */
const DATA_DIR = path.join(__dirname, "data");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");

/* ===============================
   Inicialização segura
================================ */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CHAT_FILE)) {
  fs.writeFileSync(CHAT_FILE, JSON.stringify([], null, 2));
}

/* ===============================
   Utilitário: normalizar link DDG
================================ */
function normalizeDuckLink(rawLink) {
  if (!rawLink) return null;

  // Redirecionamento /l/?uddg=
  if (rawLink.includes("/l/?")) {
    try {
      const parsed = new URL(
        rawLink.startsWith("http")
          ? rawLink
          : `https://duckduckgo.com${rawLink}`
      );
      const real = parsed.searchParams.get("uddg");
      return real ? decodeURIComponent(real) : null;
    } catch {
      return null;
    }
  }

  // Link direto
  if (rawLink.startsWith("http")) {
    return rawLink;
  }

  return null;
}

/* ===============================
   Função de pesquisa
================================ */
async function searchDuckDuckGo(prompt, cidade) {
  const query = `${prompt} ${cidade}`.trim();
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000
  });

  const $ = cheerio.load(response.data);
  const resultados = [];

  $(".result, .results_links, .web-result").each((i, el) => {
    const anchor = $(el).find("a.result__a").first();
    const titulo = anchor.text().trim();
    const rawLink = anchor.attr("href");
    const descricao = $(el).find(".result__snippet").text().trim();

    const link = normalizeDuckLink(rawLink);
    if (!titulo || !link) return;

    let score = 0;
    try {
      score = relevanceAddon.calculateScore({
        titulo,
        descricao,
        prompt,
        cidade,
        posicao: i
      });
    } catch {
      score = 0;
    }

    resultados.push({
      titulo,
      link,
      descricao,
      score,
      imagem: `https://www.google.com/s2/favicons?sz=64&domain_url=${link}`
    });
  });

  return resultados.sort((a, b) => b.score - a.score);
}

/* ===============================
   Rotas
================================ */

// Pesquisa
app.post("/search", async (req, res) => {
  try {
    const { prompt, cidade } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Informe o prompt" });
    }

    const resultados = await searchDuckDuckGo(prompt, cidade || "");

    const chat = JSON.parse(fs.readFileSync(CHAT_FILE, "utf8"));
    chat.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      prompt,
      cidade: cidade || "",
      resultados: resultados.slice(0, 8)
    });

    fs.writeFileSync(CHAT_FILE, JSON.stringify(chat, null, 2));

    res.json({
      success: true,
      total: resultados.length,
      resultados: resultados.slice(0, 8)
    });

  } catch (err) {
    console.error("❌ Erro:", err.message);
    res.status(500).json({
      error: "Erro ao realizar pesquisa",
      detalhe: err.message
    });
  }
});

// Histórico
app.get("/chat", (req, res) => {
  try {
    const chat = JSON.parse(fs.readFileSync(CHAT_FILE, "utf8"));
    res.json(chat);
  } catch {
    res.json([]);
  }
});

/* ===============================
   Start server
================================ */
app.listen(PORT, () => {
  console.log(`🔥 Server rodando em http://localhost:${PORT}`);
});
