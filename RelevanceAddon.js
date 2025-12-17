module.exports = {
  name: "relevanceAddon",

  calculateScore({ titulo, descricao, prompt, cidade, posicao }) {
    let score = 0;

    const texto = `${titulo} ${descricao}`.toLowerCase();

    if (prompt) {
      prompt.toLowerCase().split(" ").forEach(p => {
        if (texto.includes(p)) score += 3;
      });
    }

    if (cidade) {
      cidade.toLowerCase().split(" ").forEach(c => {
        if (texto.includes(c)) score += 2;
      });
    }

    score += Math.max(0, 10 - posicao);

    return score;
  }
};
