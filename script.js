async function loadChat() {
  const res = await fetch("/chat");
  const data = await res.json();

  const chat = document.getElementById("chat");
  chat.innerHTML = "";

  data.forEach(entry => {
    const div = document.createElement("div");
    div.className = "msg";

    div.innerHTML = `<strong>${entry.prompt}</strong>${entry.cidade ? " — " + entry.cidade : ""}`;

    entry.resultados.forEach(r => {
      div.innerHTML += `
        <div class="result">
          <img src="${r.imagem}">
          <div>
            <a href="${r.link}" target="_blank">${r.titulo}</a>
            <p>${r.descricao || ""}</p>
          </div>
        </div>
      `;
    });

    chat.appendChild(div);
  });

  chat.scrollTop = chat.scrollHeight;
}

async function search(event) {
  event.preventDefault(); // 🔥 ESSENCIAL

  const prompt = document.getElementById("prompt").value.trim();
  const cidade = document.getElementById("cidade").value.trim();

  if (!prompt) {
    alert("Digite um prompt");
    return;
  }

  await fetch("/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, cidade })
  });

  document.getElementById("prompt").value = "";

  loadChat();
}

document.getElementById("searchForm").addEventListener("submit", search);

loadChat();
