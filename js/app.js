/* =========================
   SMARTCARDS - APP CORE
   ========================= */

const STORAGE_KEY = 'smartcards-state';

function getInitialState() {
    return {
        decks: {
            ingles: {
                id: 'ingles',
                title: 'Idioma: Inglés',
                category: 'idiomas',
                description: 'Vocabulario básico en inglés y frases comunes',
                cards: [
                    { id: 'ing-c1', front: 'Hello', back: 'Hola' },
                    { id: 'ing-c2', front: 'Thank you', back: 'Gracias' },
                    { id: 'ing-c3', front: 'Please', back: 'Por favor' },
                    { id: 'ing-c4', front: 'Goodbye', back: 'Adiós' }
                ]
            },
            historia: {
                id: 'historia',
                title: 'Historia Mundial',
                category: 'ciencias',
                description: 'Eventos históricos clave',
                cards: [
                    { id: 'his-c1', front: 'Revolución Francesa', back: '1789-1799' },
                    { id: 'his-c2', front: 'Primera Guerra Mundial', back: '1914-1918' },
                    { id: 'his-c3', front: 'Segunda Guerra Mundial', back: '1939-1945' },
                    { id: 'his-c4', front: 'Caída del Muro de Berlín', back: '1989' }
                ]
            }
        }
    };
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    const initial = getInitialState();
    saveState(initial);
    return initial;
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDeckIdFromURL() {
    return new URLSearchParams(location.search).get("deck");
}

function getDeckById(deckId) {
    return appState.decks[deckId];
}

// Estado global de la aplicación
const appState = loadState();

//DEBUG
console.log('App State Loaded:', appState);

/* =====================================================
  Activar en la sidebar el deck que coincide con la URL
  ===================================================== */

(function setActiveDeckInSidebar() {
    const deckId = getDeckIdFromURL();
    if (!deckId) return;

    // activar solo el que coincide con la URL
    const target = document.querySelector(`.nav-deck[data-deck-id="${deckId}"]`);
    if (target) target.classList.add("active");
})();

/* =====================================================
  En Deck.html, ajustar el enlace "Añadir tarjetas" para mantener ?deck=
  ===================================================== */
(function wireDeckLinks() {
    const deckId = getDeckIdFromURL();
    if (!deckId) return;

    const addLink = document.querySelector('[data-js="go-add-cards"]');
    if (addLink) addLink.setAttribute("href", `Add_card.html?deck=${deckId}`);
})();

/* =====================================================
  En Add_card.html, pintar datos del deck activo
  ===================================================== */
(function wireAddCardsPage() {
    const titleEl = document.querySelector('[data-js="deck-title"]');
    const subtitleEl = document.querySelector('[data-js="deck-subtitle"]');
    const backEl = document.querySelector('[data-js="back-to-deck"]');

    // Si no estamos en Add_card.html, salimos (evita tocar otras páginas)
    if (!titleEl && !subtitleEl && !backEl) return;

    const deckId = getDeckIdFromURL();
    if (!deckId) return;

    const deck = getDeckById(deckId);
    if (!deck) return;

    // Título de la cabecera
    if (titleEl) titleEl.textContent = deck.title;

    // Subtítulo (descripción + nº tarjetas)
    if (subtitleEl) {
        subtitleEl.innerHTML = `
      <b>Descripción:</b> ${deck.description}<br>
      <b>Detalles:</b> ${deck.cards.length} tarjetas
    `;
    }

    // Title del navegador
    document.title = `SmartCards - Add Cards - ${deck.title}`;

    // Enlace "volver al mazo"
    if (backEl) backEl.setAttribute("href", `Deck.html?deck=${deckId}`);
})();

/* =====================================================
   ADD_CARDS: render + add + delete + save (localStorage)
   Se activa solo si existe [data-js="cards-list"]
   ===================================================== */

function generateId(prefix = "c") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function updateDeckInState(deckId, patch) {
    if (!appState.decks[deckId]) return;
    appState.decks[deckId] = { ...appState.decks[deckId], ...patch };
}

function renderAddCardsPage() {
    const listEl = document.querySelector('[data-js="cards-list"]');
    if (!listEl) return; // no estamos en Add_card.html

    const deckId = getDeckIdFromURL() || "ingles";
    const deck = getDeckById(deckId);
    if (!deck) return;

    // Header (título)
    const deckTitleEl = document.querySelector('[data-js="deck-title"]');
    if (deckTitleEl) deckTitleEl.textContent = deck.title;

    // Back link al deck actual
    const backLink = document.querySelector('[data-js="back-to-deck"]');
    if (backLink) backLink.setAttribute("href", `Deck.html?deck=${deckId}`);

    // Plantilla (se clona)
    const template = listEl.querySelector('.edit-card[data-card-id="__TEMPLATE__"]');
    if (!template) return;

    // Limpieza: dejamos el template oculto (y no se renderiza como tarjeta real)
    template.style.display = "none";

    // Borra tarjetas renderizadas anteriores (excepto el template)
    [...listEl.querySelectorAll('.edit-card')].forEach((cardEl) => {
        if (cardEl.getAttribute("data-card-id") !== "__TEMPLATE__") cardEl.remove();
    });

    // Render de tarjetas reales
    deck.cards.forEach((card, idx) => {
        const node = template.cloneNode(true);
        node.style.display = ""; // visible
        node.setAttribute("data-card-id", card.id);

        const indexEl = node.querySelector('[data-js="card-index"]');
        if (indexEl) indexEl.textContent = String(idx + 1);

        const defInput = node.querySelector('[data-js="card-def"]');
        const resInput = node.querySelector('[data-js="card-res"]');
        if (defInput) defInput.value = card.front ?? "";
        if (resInput) resInput.value = card.back ?? "";

        listEl.appendChild(node);
    });
}

// Delegación de eventos (un solo listener)
function wireAddCardsEvents() {
    const listEl = document.querySelector('[data-js="cards-list"]');
    if (!listEl) return;

    const deckId = getDeckIdFromURL() || "ingles";

    // AÑADIR tarjeta
    const addBtn = document.querySelector('[data-js="add-card"]');
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            const deck = getDeckById(deckId);
            if (!deck) return;

            const newCard = { id: generateId(deckId), front: "", back: "" };
            deck.cards.push(newCard);
            saveState(appState);
            renderAddCardsPage();
        });
    }

    // BORRAR tarjeta (delegación)
    listEl.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-action="delete-card"]');
        if (!btn) return;

        const cardEl = btn.closest(".edit-card");
        if (!cardEl) return;

        const cardId = cardEl.getAttribute("data-card-id");
        if (!cardId || cardId === "__TEMPLATE__") return;

        const deck = getDeckById(deckId);
        if (!deck) return;

        deck.cards = deck.cards.filter((c) => c.id !== cardId);
        saveState(appState);
        renderAddCardsPage();
    });

    // LISTO: recoger valores del DOM → state → guardar → volver
    const saveBtn = document.querySelector('[data-js="save-deck"]');
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const deck = getDeckById(deckId);
            if (!deck) return;

            const cardEls = [...listEl.querySelectorAll('.edit-card')]
                .filter((el) => el.getAttribute("data-card-id") !== "__TEMPLATE__");

            const nextCards = cardEls.map((el) => {
                const id = el.getAttribute("data-card-id");
                const front = el.querySelector('[data-js="card-def"]')?.value?.trim() ?? "";
                const back = el.querySelector('[data-js="card-res"]')?.value?.trim() ?? "";
                return { id, front, back };
            });

            // (Opcional) guardar título/desc del set
            const setTitle = document.querySelector('[data-js="set-title"]')?.value?.trim();
            const setDesc = document.querySelector('[data-js="set-desc"]')?.value?.trim();

            updateDeckInState(deckId, {
                cards: nextCards,
                // solo si quieres usarlos en el deck:
                // title: setTitle ? setTitle : deck.title,
                // description: setDesc ? setDesc : deck.description,
            });

            saveState(appState);
            location.href = `Deck.html?deck=${deckId}`;
        });
    }
}

// Inicialización específica de Add_Cards
(function initAddCards() {
    renderAddCardsPage();
    wireAddCardsEvents();
})();
