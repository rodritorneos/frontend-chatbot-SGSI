// ======================================================
// CONFIG
// ======================================================
const API_URL = "https://principle-reports-professor-further.trycloudflare.com/chat";
const ESCENARIO_URL = "https://principle-reports-professor-further.trycloudflare.com/escenario";

// Chat elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Scenario elements
const scenarioBox = document.getElementById("scenario-box");
const scenarioInput = document.getElementById("scenario-input");
const scenarioSendBtn = document.getElementById("scenario-send-btn");
const escenarioBtn = document.getElementById("escenario-btn");

// General buttons
const clearBtn = document.getElementById("clear-btn");
const audioBtn = document.getElementById("audio-btn");

// ======================================================
// HISTORIAL
// ======================================================
let chatHistory = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");
let contextHistory = [];
let scenarioHistory = [];
let currentScenarioId = null;

// ======================================================
// LOAD HISTORY ON START
// ======================================================
window.addEventListener("DOMContentLoaded", () => {
    chatHistory.forEach(msg => addMessageBubble("chat", msg.sender, msg.text));
    smoothScroll(chatBox);

    if (!sessionStorage.getItem("audioEnabled"))
        sessionStorage.setItem("audioEnabled", "true");

    updateAudioButton();
});

// ======================================================
// SAVE HISTORY
// ======================================================
function saveHistory() {
    sessionStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

// ======================================================
// SMOOTH SCROLL
// ======================================================
function smoothScroll(container) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
}

// ======================================================
// CREATE MESSAGE BUBBLE
// mode: "chat" o "scenario"
// sender: "user" o "bot"
// ======================================================
function addMessageBubble(mode, sender, text, isLoading = false) {
    const container = mode === "chat" ? chatBox : scenarioBox;

    // Contenedor que usará Flexbox
    const wrapper = document.createElement("div");
    wrapper.classList.add("msg-container"); // Por defecto, los mensajes estarán alineados a la izquierda

    const bubble = document.createElement("div");

    // Asignamos las clases y alineación correctas
    if (sender === "bot") {
        // Aplica la clase para el mensaje del bot
        bubble.classList.add("msg-bot");
    } else {
        // Aplica la clase para el mensaje del usuario
        bubble.classList.add("msg-user");
        // Alinea el mensaje del usuario a la derecha
        wrapper.classList.add("msg-container-user");
    }

    // Si el mensaje está cargando, mostramos la animación de los puntos
    if (isLoading) {
        bubble.innerHTML = `
            <div class="flex gap-1 items-center">
                <div class="w-2 h-2 rounded-full bg-white/60 dot"></div>
                <div class="w-2 h-2 rounded-full bg-white/60 dot"></div>
                <div class="w-2 h-2 rounded-full bg-white/60 dot"></div>
            </div>`;
    } else {
        bubble.textContent = text;
    }

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    smoothScroll(container);

    return bubble;
}

// ======================================================
// TYPING EFFECT
// ======================================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeWriterEffect(bubble, text) {
    bubble.innerHTML = "";
    for (let i = 0; i < text.length; i++) {
        bubble.textContent += text[i];
        await sleep(12);
    }
}

// ======================================================
// SEND CHAT MESSAGE
// ======================================================
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessageBubble("chat", "user", message);
    chatHistory.push({ sender: "user", text: message });
    saveHistory();

    contextHistory.push({ role: "user", content: message });
    userInput.value = "";

    const loadingBubble = addMessageBubble("chat", "bot", "", true);

    const combinedPrompt = contextHistory
        .map(msg => `${msg.role === "user" ? "Usuario" : "Asistente"}: ${msg.content}`)
        .join("\n") + `\nUsuario: ${message}\nAsistente:`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: combinedPrompt,
                temperature: 0.3,
                max_tokens: 150
            })
        });

        const data = await response.json();
        const botText = data.response || "Error al obtener respuesta.";

        await typeWriterEffect(loadingBubble, botText);

        chatHistory.push({ sender: "bot", text: botText });
        saveHistory();

        contextHistory.push({ role: "assistant", content: botText });

        if (data.audio_url && sessionStorage.getItem("audioEnabled") === "true") {
            new Audio("https://principle-reports-professor-further.trycloudflare.com" + data.audio_url).play();
        }

    } catch (error) {
        loadingBubble.textContent = "Error de conexión con el servidor.";
    }
}

// ======================================================
// CLEAR CHAT
// ======================================================
clearBtn.addEventListener("click", () => {
    const chatVisible = !document.getElementById("chat-mode").classList.contains("hidden");
    const scenarioVisible = !document.getElementById("scenario-mode").classList.contains("hidden");

    if (chatVisible) {
        chatBox.innerHTML = "";
        chatHistory = [];
        contextHistory = [];
    }

    if (scenarioVisible) {
        scenarioBox.innerHTML = "";
        scenarioHistory = [];
        currentScenarioId = null;
    }

    saveHistory();
});

// ======================================================
// AUDIO TOGGLE
// ======================================================
audioBtn.addEventListener("click", () => {
    const current = sessionStorage.getItem("audioEnabled") === "true";
    sessionStorage.setItem("audioEnabled", current ? "false" : "true");
    updateAudioButton();
});

function updateAudioButton() {
    if (sessionStorage.getItem("audioEnabled") === "true") {
        audioBtn.textContent = "🔊 Audio ON";
        audioBtn.classList.remove("opacity-50");
    } else {
        audioBtn.textContent = "🔇 Audio OFF";
        audioBtn.classList.add("opacity-50");
    }
}

// ======================================================
// CHAT EVENTS
// ======================================================
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ======================================================
// SCENARIO MODE — GENERATE SCENARIO
// ======================================================
async function generarEscenario() {
    // Limpiar la conversación previa del escenario antes de generar uno nuevo
    scenarioBox.innerHTML = "";
    scenarioHistory = [];
    currentScenarioId = null;

    const loadingBubble = addMessageBubble("scenario", "bot", "", true);

    try {
        const response = await fetch(ESCENARIO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fase: "generar" })
        });

        const data = await response.json();
        const texto = data.response || "Error al generar escenario.";

        await typeWriterEffect(loadingBubble, texto);

        currentScenarioId = data.scenario_id;
        scenarioHistory = [];

        if (data.audio_url && sessionStorage.getItem("audioEnabled") === "true") {
            new Audio("https://principle-reports-professor-further.trycloudflare.com" + data.audio_url).play();
        }

    } catch (error) {
        loadingBubble.textContent = "Error de conexión al generar escenario.";
    }
}

escenarioBtn.addEventListener("click", generarEscenario);

// ======================================================
// SCENARIO MODE — SEND RESPONSE
// ======================================================
async function enviarRespuestaEscenario(text) {
    if (!currentScenarioId) {
        alert("No hay escenario activo. Genera uno primero.");
        return;
    }

    addMessageBubble("scenario", "user", text);
    scenarioInput.value = "";

    const loadingBubble = addMessageBubble("scenario", "bot", "", true);

    try {
        const response = await fetch(ESCENARIO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fase: "retro",
                scenario_id: currentScenarioId,
                respuesta_usuario: text
            })
        });

        const data = await response.json();
        const retro = data.response || "Error en la retroalimentación.";

        await typeWriterEffect(loadingBubble, retro);

        scenarioHistory.push({ role: "assistant", content: retro });

        if (data.audio_url && sessionStorage.getItem("audioEnabled") === "true") {
            new Audio("https://principle-reports-professor-further.trycloudflare.com" + data.audio_url).play();
        }

    } catch (error) {
        loadingBubble.textContent = "Error de conexión al enviar respuesta.";
    }
}

scenarioSendBtn.addEventListener("click", () => {
    const txt = scenarioInput.value.trim();
    if (txt) enviarRespuestaEscenario(txt);
});

scenarioInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        const txt = scenarioInput.value.trim();
        if (txt) enviarRespuestaEscenario(txt);
    }
});

// ======================================================
// DOT LOADING ANIMATION
// ======================================================
document.head.insertAdjacentHTML("beforeend", `
<style>
    .dot {
        animation: dotPulse 1.3s infinite ease-in-out;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotPulse {
        0%, 80%, 100% { transform: scale(0); opacity: .4; }
        40% { transform: scale(1); opacity: 1; }
    }
</style>
`);
