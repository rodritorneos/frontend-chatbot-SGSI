// ======================================================
// CONFIG
// ======================================================
const API_URL = "https://watched-hawaii-exclusion-strips.trycloudflare.com/chat";

// Chat elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// General buttons
const clearBtn = document.getElementById("clear-btn");
const audioBtn = document.getElementById("audio-btn");
const avatarBtn = document.getElementById("avatar-btn");

// ======================================================
// HISTORIAL
// ======================================================
let chatHistory = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");
let contextHistory = [];

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
// mode: "chat"
// sender: "user" or "bot"
// ======================================================
function addMessageBubble(mode, sender, text, isLoading = false) {
    const container = mode === "chat" ? chatBox : null;

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

        // ✅ DETECCIÓN DEL FILTRO
        const wasFiltered = data.filtered === true;

        // ✅ DEFINIR EXPRESIÓN BASE
        if (wasFiltered) {
            setAvatarAlertBase();
        } else {
            setAvatarNeutralBase();
        }

        const audioEnabled = sessionStorage.getItem("audioEnabled") === "true";
        let audio = null;

        if (data.audio_url && audioEnabled) {
            audio = new Audio("http://localhost:8000" + data.audio_url);
        }

        // ✅ SI HAY AUDIO → TEXTO + BOCA VAN JUNTOS
        if (audio) {
            audio.onplay = async () => {
                startAvatarTalking(wasFiltered);
                await typeWriterEffect(loadingBubble, botText); // ✅ TEXTO SINCRONIZADO CON EL HABLA
            };

            audio.onended = () => {
                stopAvatarTalking();
                if (wasFiltered) returnToNeutralAfterAlert();

                chatHistory.push({ sender: "bot", text: botText });
                saveHistory();
                contextHistory.push({ role: "assistant", content: botText });
            };

            audio.play();

        } else {
            // ✅ SIN AUDIO → SE MANTIENE COMO YA TE FUNCIONABA BIEN
            startAvatarTalking(wasFiltered);
            await typeWriterEffect(loadingBubble, botText);

            stopAvatarTalking();
            if (wasFiltered) returnToNeutralAfterAlert();

            chatHistory.push({ sender: "bot", text: botText });
            saveHistory();
            contextHistory.push({ role: "assistant", content: botText });
        }

    } catch (error) {
        loadingBubble.textContent = "Error de conexión con el servidor.";
    }
}

// ======================================================
// CLEAR CHAT
// ======================================================
clearBtn.addEventListener("click", () => {
    chatBox.innerHTML = "";
    chatHistory = [];
    contextHistory = [];
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
// AVATAR TOGGLE
// ======================================================

const avatarContainer = document.getElementById("avatar-container");

if (!sessionStorage.getItem("avatarEnabled"))
    sessionStorage.setItem("avatarEnabled", "true");

updateAvatarToggleButton();

avatarBtn.addEventListener("click", () => {
    const current = sessionStorage.getItem("avatarEnabled") === "true";
    sessionStorage.setItem("avatarEnabled", current ? "false" : "true");
    updateAvatarToggleButton();
});

function updateAvatarToggleButton() {
    const enabled = sessionStorage.getItem("avatarEnabled") === "true";

    if (enabled) {
        avatarBtn.textContent = "Avatar ON";
        avatarBtn.classList.remove("opacity-50");

        // 👉 Mostrar avatar
        avatarContainer.classList.remove("hidden");

    } else {
        avatarBtn.textContent = "Avatar OFF";
        avatarBtn.classList.add("opacity-50");

        // 👉 Ocultar avatar
        avatarContainer.classList.add("hidden");
    }
}


// ======================================================
// AVATAR CONTROL (SINCRONIZADO)
// ======================================================

const avatar = document.getElementById("avatar");
let avatarInterval = null;
let avatarMouthOpen = false;
let avatarMode = "neutral"; // "neutral" | "alerta"

function applyAvatarState() {
    if (!avatar) return;
    if (sessionStorage.getItem("avatarEnabled") !== "true") return;

    const state = avatarMouthOpen ? "Abierto" : "Cerrado";

    if (avatarMode === "alerta") {
        avatar.src = `img/alerta${state}.png`;
    } else {
        avatar.src = `img/neutral${state}.png`;
    }
}

function setAvatarNeutralBase() {
    avatarMode = "neutral";
    avatarMouthOpen = false;
    applyAvatarState();
}

function setAvatarAlertBase() {
    avatarMode = "alerta";
    avatarMouthOpen = false;
    applyAvatarState();
}

function startAvatarTalking(isAlert) {
    if (sessionStorage.getItem("avatarEnabled") !== "true") return;

    stopAvatarTalking();
    avatarMouthOpen = false;
    avatarMode = isAlert ? "alerta" : "neutral";

    avatarInterval = setInterval(() => {
        avatarMouthOpen = !avatarMouthOpen;
        applyAvatarState();
    }, 160);
}

function stopAvatarTalking() {
    if (sessionStorage.getItem("avatarEnabled") !== "true") return;

    if (avatarInterval) {
        clearInterval(avatarInterval);
        avatarInterval = null;
    }
    avatarMouthOpen = false;
    applyAvatarState();
}

function returnToNeutralAfterAlert() {
    setTimeout(() => {
        avatarMode = "neutral";
        avatarMouthOpen = false;
        applyAvatarState();
    }, 900);
}


// ======================================================
// CHAT EVENTS
// ======================================================
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
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

