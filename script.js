// Constants
const SPHERE_RADIUS = 30;
const MARGIN = 2;
const GOOGLE_SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFLL954GSvF127n_H4N-vEdyIuleRF3fC_0hJw8G8J50hS9KMShj0sZfuBC7c_iYeS/exec';

// DOM Elements
const gameCanvas = document.getElementById("gameCanvas");
const ctx = gameCanvas.getContext("2d");
const instructionsElement = document.getElementById("instructions");
const countdownElement = document.getElementById("countdown");
const userWishInput = document.getElementById("userWishInput");
const fullPhraseText = document.getElementById("fullPhraseText");

// Popups
const popupWish = document.getElementById("popup-wish");
const popupShenlongReply = document.getElementById("popup-shenlong-reply");
const popupMysticForm = document.getElementById("popup-mystic-form");
const popupFinal = document.getElementById("popup-final");

// Buttons
const submitWishButton = document.getElementById("submitWishButton");
const continueToFormButton = document.getElementById("continueToFormButton");
const shareWhatsappButton = document.getElementById("shareWhatsappButton");
const invokeAgainButton = document.getElementById("invokeAgainButton");
const mysticForm = document.getElementById("mysticForm"); // Get the form itself

// Audio
const sphere7Audio = new Audio('quienmehallamado.mp3');
const sphere8Audio = new Audio('deseofacil.mp3');

// Game State Variables
let speedMultiplier = 2.5;
let currentStep = 1;
let spheres = [];
let countdownInterval;
let userWish = "";

// Image Preloading
const images = [];
for (let i = 1; i <= 7; i++) {
    const img = new Image();
    img.src = `esfera${i}.png`;
    images.push(img);
}

// --- DragonBall Class ---
class DragonBall {
    constructor(x, y, number) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * 2 * Math.PI;
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
        this.number = number;
        this.radius = SPHERE_RADIUS;
        this.found = false;
        this.image = images[number - 1];
    }

    update() {
        if (this.found) return;

        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;

        // Boundary collision detection
        const leftLimit = this.radius + MARGIN;
        const rightLimit = gameCanvas.width - this.radius - MARGIN;
        const topLimit = this.radius + MARGIN;
        const bottomLimit = gameCanvas.height - this.radius - MARGIN;

        if (this.x < leftLimit) {
            this.x = leftLimit;
            this.vx *= -1;
        }
        if (this.x > rightLimit) {
            this.x = rightLimit;
            this.vx *= -1;
        }
        if (this.y < topLimit) {
            this.y = topLimit;
            this.vy *= -1;
        }
        if (this.y > bottomLimit) {
            this.y = bottomLimit;
            this.vy *= -1;
        }
    }

    draw() {
        ctx.drawImage(this.image, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    }

    isInside(mx, my) {
        return Math.hypot(mx - this.x, my - this.y) <= this.radius;
    }
}

// --- Game Functions ---
function generateSpheres() {
    const newSpheres = [];
    for (let i = 1; i <= 7; i++) {
        let valid = false, x, y;
        while (!valid) {
            x = Math.random() * (gameCanvas.width - 2 * (SPHERE_RADIUS + MARGIN)) + (SPHERE_RADIUS + MARGIN);
            y = Math.random() * (gameCanvas.height - 2 * (SPHERE_RADIUS + MARGIN)) + (SPHERE_RADIUS + MARGIN);
            valid = true;
            // Check for overlap with existing spheres
            for (const s of newSpheres) {
                const dx = s.x - x;
                const dy = s.y - y;
                if (Math.hypot(dx, dy) < SPHERE_RADIUS * 2 + 4) { // Add a small buffer (4)
                    valid = false;
                    break;
                }
            }
        }
        newSpheres.push(new DragonBall(x, y, i));
    }
    return newSpheres;
}

function drawAll() {
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    for (const s of spheres) {
        s.update();
        s.draw();
    }
    requestAnimationFrame(drawAll);
}

function resetGame() {
    currentStep = 1;
    spheres = generateSpheres();
    instructionsElement.textContent = "Selecciona en orden las esferas del dragón";
}

function setSpeed(factor) {
    speedMultiplier = factor;
    for (const s of spheres) {
        if (!s.found) {
            const angle = Math.atan2(s.vy, s.vx);
            s.vx = Math.cos(angle);
            s.vy = Math.sin(angle);
        }
    }
}

// --- Popup Management ---
function openPopup(popupElement) {
    // Hide all popups first to ensure only one is visible
    [popupWish, popupShenlongReply, popupMysticForm, popupFinal].forEach(p => p.style.display = 'none');
    popupElement.style.display = 'flex'; // Use flex to center
}

function closePopup(popupElement) {
    popupElement.style.display = 'none';
}

// --- Data Submission ---
async function sendToGoogleSheets(data) {
    const params = new URLSearchParams(data).toString();
    try {
        await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        });
        console.log("Data sent to Google Sheets successfully (no-cors mode).");
    } catch (error) {
        console.error("Error sending data to Google Sheets:", error);
    }
}

// --- Event Handlers ---

// Game Canvas Click
gameCanvas.addEventListener("click", e => {
    const rect = gameCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const s of spheres) {
        if (!s.found && s.isInside(mx, my)) {
            if (s.number === currentStep) {
                s.found = true;
                s.vx = 0; // Stop the sphere
                s.vy = 0;
                currentStep++;
                instructionsElement.textContent = `¡Correcto! Ahora busca la esfera ${currentStep}.`;

                if (currentStep > 7) {
                    instructionsElement.textContent = "¡Has reunido todas las esferas!";
                    sphere7Audio.play().catch(err => console.error("Error playing audio:", err));
                    openPopup(popupWish);

                    let countdownValue = 20;
                    countdownElement.innerText = countdownValue;
                    countdownInterval = setInterval(() => {
                        countdownValue--;
                        countdownElement.innerText = countdownValue;
                        if (countdownValue <= 0) {
                            clearInterval(countdownInterval);
                            closePopup(popupWish);
                            location.reload(); // Full reload if time runs out
                        }
                    }, 1000);
                }
            } else {
                instructionsElement.textContent = `Esa no es. Busca la esfera ${currentStep}.`;
            }
            break; // Stop checking after finding a clicked sphere
        }
    }
});

// Submit Wish Button
submitWishButton.addEventListener('click', () => {
    clearInterval(countdownInterval); // Stop the countdown
    sphere7Audio.pause(); // Pause the previous audio

    const wish = userWishInput.value.trim();
    if (!wish) {
        alert("Debes escribir tu deseo, mortal.");
        return;
    }

    userWish = wish; // Store the wish
    sendToGoogleSheets({ deseo: userWish });

    closePopup(popupWish);
    sphere8Audio.play().catch(err => console.error("Error playing audio:", err));
    fullPhraseText.innerHTML = `<em>“${userWish}”</em><br><br><h5>¡Adelante, sigue el camino de la luz y haz que el universo conspire a favor de tu grandeza!</h5>`;
    openPopup(popupShenlongReply);
});

// Continue to Form Button
continueToFormButton.addEventListener('click', () => {
    closePopup(popupShenlongReply);
    openPopup(popupMysticForm);
});

// Mystic Form Submission
mysticForm.addEventListener("submit", function(e) {
    e.preventDefault(); // Prevent default form submission

    const energia = this.energia.value; // Radio buttons use `this.name.value`
    const experiencia = this.experiencia.value;
    const consentimiento = this.consentimiento.value;

    // Basic client-side validation (HTML 'required' attribute helps too)
    if (!energia || !experiencia || !consentimiento) {
        alert("Por favor, responde todas las preguntas antes de sellar tu deseo.");
        return;
    }

    sendToGoogleSheets({
        deseo: userWish, // Include the stored wish
        energia: energia,
        experiencia: experiencia,
        consentimiento: consentimiento
    });

    closePopup(popupMysticForm);
    openPopup(popupFinal);
});

// Share on WhatsApp Button
shareWhatsappButton.addEventListener('click', () => {
    const mensaje = "*Acabo de pedirle un deseo a Shenlong 🐉👇*\nhttps://invocaldragon.github.io/Shenlong\n\n*¡Apresúrate!*\nQuizá te comparta un poco de mi suerte🍀";
    const whatsappURL = "https://wa.me/?text=" + encodeURIComponent(mensaje);
    window.open(whatsappURL, "_blank"); // Open in new tab
});

// Invoke Again Button
invokeAgainButton.addEventListener('click', () => {
    userWish = ""; // Reset wish
    userWishInput.value = ""; // Clear input field
    mysticForm.reset(); // Reset radio buttons and form state
    // Hide all popups, then fully reload the page to restart the game
    [popupWish, popupShenlongReply, popupMysticForm, popupFinal].forEach(p => p.style.display = 'none');
    location.reload();
});

// Close popups with ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        // Find the currently visible popup and close it
        const visiblePopup = [popupWish, popupShenlongReply, popupMysticForm, popupFinal].find(p => p.style.display === 'flex');
        if (visiblePopup) {
            closePopup(visiblePopup);
            clearInterval(countdownInterval); // Stop countdown if active popup is wish input
        }
    }
});

// --- Initialization ---
// Ensure all images are loaded before starting the game
Promise.all(images.map(img => new Promise(res => img.onload = res)))
    .then(startGame)
    .catch(err => console.error("Failed to load one or more sphere images:", err));

function startGame() {
    resetGame(); // Initialize spheres and game state
    drawAll(); // Start the animation loop
}
