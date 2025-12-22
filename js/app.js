/* =========================
   SMARTCARDS - APP CORE
   ========================= */

/* =====================================================
   AUTH (fake login) - guard simple por localStorage
   ===================================================== */

const AUTH_KEY = "smartcards-auth";

(function authGuard() {
    const path = (location.pathname || "").toLowerCase();
    const isLoginPage = path.includes("login.html");

    const isAuthed = localStorage.getItem(AUTH_KEY) === "1";

    if (!isAuthed && !isLoginPage) {
        location.href = "Login.html";
    }
})();

/* =====================================================
   ESTADO GLOBAL DE LA APLICACIÓN:
   - Define la estructura de datos (decks y tarjetas)
   - Gestiona carga y guardado en localStorage
   ===================================================== */

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

// Obtención del deck activo desde la URL -Helpers de navegación-
function getDeckIdFromURL() {
    return new URLSearchParams(location.search).get("deck");
}

// Estado global de la aplicación
const appState = loadState();

// Acceso al deck desde el estado global -Helpers de navegación-
function getDeckById(deckId) {
    return appState.decks[deckId];
}

/* DEBUG
console.log('App State Loaded:', appState);
*/

/* =====================================================
   LOGIN.html: handler de login (fake)
   ===================================================== */

(function wireLogin() {
    const form = document.querySelector('[data-js="login-form"]');
    if (!form) return;

    const DEMO_EMAIL = "demo@smartcards.com";
    const DEMO_PASS = "1234";

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = document.querySelector("#email")?.value.trim().toLowerCase();
        const pass = document.querySelector("#password")?.value.trim();

        if (email === DEMO_EMAIL && pass === DEMO_PASS) {
            localStorage.setItem(AUTH_KEY, "1");
            location.href = "Home.html";
        }
    });
})();


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
  En Deck.html, ajustar el enlace "Jugar" para mantener ?deck=
  ===================================================== */

(function wireGameLinks() {
    const deckId = getDeckIdFromURL();
    if (!deckId) return;

    const game1Link = document.querySelector('[data-js="go-game1"]');
    if (game1Link) game1Link.setAttribute("href", `Juego_1.html?deck=${deckId}`);
})();


/* =====================================================
  DECK.html: renderizar tabla de tarjetas + pestañas (Items/Favoritas)
  - Pinta filas desde appState (no HTML “de mentira”)
  - Actualiza contador: ITEMS DEL MAZO (N)
  - “Favoritas” (corazón) funcional
  - Deshabilita botones no implementados (audio/abrir/editar)
  ===================================================== */

function getDeckIdOrDefault() {
    return getDeckIdFromURL() || "ingles";
}

function ensureCardFlags(deck) {
    if (!deck || !deck.cards) return;
    // Unificamos: todas las tarjetas deben tener favorite y learnt
    deck.cards = deck.cards.map((c) => ({
        favorite: false,
        learnt: false,
        ...c
    }));
}

// Renderiza la tabla de tarjetas en Deck.html
function renderDeckTable(deckId, mode = "all") {
    const tableBody = document.querySelector('[data-js="table-body"]');
    const tabItems = document.querySelector('[data-js="tab-items"]');
    const tabFavs = document.querySelector('[data-js="tab-favs"]');

    // Si no estamos en Deck.html, salimos
    if (!tableBody || !tabItems || !tabFavs) return;

    const deck = getDeckById(deckId);
    if (!deck) return;

    ensureCardFlags(deck);

    // Tabs label + estado visual
    tabItems.textContent = `ITEMS DEL MAZO (${deck.cards.length})`;

    const favCount = deck.cards.filter((c) => c.favorite).length;
    tabFavs.textContent = `FAVORITAS (${favCount})`;

    tabItems.classList.toggle("is-active", mode === "all");
    tabFavs.classList.toggle("is-active", mode === "favs");

    // Filtrado
    const cardsToShow = mode === "favs"
        ? deck.cards.filter((c) => c.favorite)
        : deck.cards;

    // Si el deck está vacío o no existe, salimos   
    if (cardsToShow.length === 0) {
        tableBody.innerHTML = "<p class='muted' style='padding:20px'>Este mazo aún no tiene tarjetas.</p>";
        return;
    }

    // Pintar filas
    tableBody.innerHTML = "";

    cardsToShow.forEach((card) => {
        const row = document.createElement("div");
        row.className = "table-row";
        row.setAttribute("data-card-id", card.id);

        row.innerHTML = `
      <span class="table-cell def">${card.front || "<span class='muted'>—</span>"}</span>
      <span class="table-cell res muted">${card.back || "<span class='muted'>—</span>"}</span>
      <div class="table-actions">
        <button class="icon-btn" type="button" aria-label="Favorito" data-action="toggle-fav" title="Marcar como favorita">
          <i class="${card.favorite ? "fas" : "far"} fa-heart"></i>
        </button>

        <button class="icon-btn" type="button" aria-label="Audio" data-action="disabled" disabled aria-disabled="true" title="No disponible">
          <i class="fas fa-volume-up"></i>
        </button>

        <button class="icon-btn" type="button" aria-label="Abrir" data-action="disabled" disabled aria-disabled="true" title="No disponible">
          <i class="fas fa-external-link-alt"></i>
        </button>

        <button class="icon-btn" type="button" aria-label="Editar" data-action="disabled" disabled aria-disabled="true" title="No disponible">
          <i class="far fa-edit"></i>
        </button>
      </div>
    `;

        tableBody.appendChild(row);
    });
}

// Conexión de eventos en Deck.html
function wireDeckTable() {
    const tableBody = document.querySelector('[data-js="table-body"]');
    const tabItems = document.querySelector('[data-js="tab-items"]');
    const tabFavs = document.querySelector('[data-js="tab-favs"]');

    // Si no estamos en Deck.html, salimos
    if (!tableBody || !tabItems || !tabFavs) return;

    const deckId = getDeckIdOrDefault();

    // Render inicial (esto también arregla “entro directo por Live Server sin ?deck” => usa ingles)
    renderDeckTable(deckId, "all");

    // Tabs
    tabItems.addEventListener("click", () => renderDeckTable(deckId, "all"));
    tabFavs.addEventListener("click", () => renderDeckTable(deckId, "favs"));

    // Delegación: favoritos
    tableBody.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-action="toggle-fav"]');
        if (!btn) return;

        const row = btn.closest(".table-row");
        const cardId = row?.getAttribute("data-card-id");
        if (!cardId) return;

        const deck = getDeckById(deckId);
        if (!deck) return;

        ensureCardFlags(deck);

        const card = deck.cards.find((c) => c.id === cardId);
        if (!card) return;

        card.favorite = !card.favorite;
        saveState(appState);

        // Re-render en el modo actual (según pestaña activa)
        const mode = tabFavs.classList.contains("is-active") ? "favs" : "all";
        renderDeckTable(deckId, mode);
    });
}

// INIT específico de Deck.html
(function initDeckTable() {
    wireDeckTable();
})();


/* =====================================================
  ADD_CARD:En Add_card.html, pintar datos del deck activo
  ===================================================== */

//Rellenar título, subtítulo, inputs y enlace "volver al mazo"
(function wireAddCardsPage() {
    const titleEl = document.querySelector('[data-js="deck-title"]');
    const subtitleEl = document.querySelector('[data-js="deck-subtitle"]');
    const backEl = document.querySelector('[data-js="back-to-deck"]');

    const setTitleInput = document.querySelector('[data-js="set-title"]');
    const setDescInput = document.querySelector('[data-js="set-desc"]');

    // Si no estamos en Add_card.html, salimos (evita tocar otras páginas)
    if (!titleEl && !subtitleEl && !backEl && !setTitleInput && !setDescInput) return;

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

    // Inputs (los editables)
    if (setTitleInput) setTitleInput.value = deck.title;
    if (setDescInput) setDescInput.value = deck.description;

    // Title del navegador
    document.title = `SmartCards - Add Cards - ${deck.title}`;

    // Enlace "volver al mazo"
    if (backEl) backEl.setAttribute("href", `Deck.html?deck=${deckId}`);
})();

/* =====================================================
   ADD_CARD: render + add + delete + save (localStorage)
   Se activa solo si existe [data-js="cards-list"]
   ===================================================== */

/* Utilidades Internas */
// Crea IDs únicos para tarjetas
function generateId(prefix = "c") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Actualiza el deck en el estado global
function updateDeckInState(deckId, patch) {
    if (!appState.decks[deckId]) return;
    appState.decks[deckId] = { ...appState.decks[deckId], ...patch };
}

/* Renderiza la página Add_card.html con las tarjetas del deck activo */
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

    // Limpieza: dejamos el template oculto (no se renderiza como tarjeta real)
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

// Sincroniza y validaciones. Extrae las tarjetas del DOM en formato {id, front, back}
function getCardsFromDOM(listEl) {
    const cardEls = [...listEl.querySelectorAll('.edit-card')]
        .filter((el) => el.getAttribute("data-card-id") !== "__TEMPLATE__");

    return cardEls.map((el) => {
        const id = el.getAttribute("data-card-id");
        const front = el.querySelector('[data-js="card-def"]')?.value?.trim() ?? "";
        const back = el.querySelector('[data-js="card-res"]')?.value?.trim() ?? "";
        return { id, front, back };
    });
}

// Sincroniza las tarjetas del DOM al estado global (deck.cards)
// Retorna las tarjetas actuales
// Mantiene propiedades previas (favorite, etc.) al hacer merge
function syncCardsFromDOMToState(deckId, listEl) {
    const deck = getDeckById(deckId);
    if (!deck) return [];

    // Mapa de tarjetas previas por id (para conservar favorite, etc.)
    const prevCardsById = new Map(deck.cards.map(c => [c.id, c]));

    // Tarjetas actuales leídas del DOM (solo id/front/back)
    const domCards = getCardsFromDOM(listEl);

    // Merge: mantenemos propiedades previas y actualizamos front/back
    const nextCards = domCards.map((c) => {
        const prev = prevCardsById.get(c.id) || {};
        return { ...prev, ...c };
    });

    deck.cards = nextCards;
    saveState(appState);
    return nextCards;
}


function hasEmptyCard(cards) {
    return cards.some((c) => !c.front || !c.back);
}

/* =====================================================
   ADD_CARD: Delegación de eventos (un solo listener) para añadir, 
   borrar y guardar tarjetas
   ===================================================== */

function wireAddCardsEvents() {
    const listEl = document.querySelector('[data-js="cards-list"]');
    if (!listEl) return;

    const deckId = getDeckIdFromURL() || "ingles";

    // AÑADIR tarjeta
    const addBtn = document.querySelector('[data-js="add-card"]');
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            // 1) Guardamos lo escrito ANTES de renderizar
            const currentCards = syncCardsFromDOMToState(deckId, listEl);

            // 2) No permitir crear otra si hay alguna incompleta
            if (hasEmptyCard(currentCards)) {
                alert("Tienes una tarjeta incompleta. Rellénala (Palabra y Significado) antes de añadir otra.");
                return;
            }

            // 3) Añadimos la nueva y re-render
            const deck = getDeckById(deckId);
            if (!deck) return;

            deck.cards.push({ id: generateId(deckId), front: "", back: "" });
            saveState(appState);
            renderAddCardsPage();
        });
    }

    // BORRAR tarjeta (delegación)
    listEl.addEventListener("click", (e) => {
        const btn = e.target.closest('[data-action="delete-card"]');
        if (!btn) return;

        // Guardamos lo escrito antes de borrar (para no perder cambios)
        syncCardsFromDOMToState(deckId, listEl);

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

    // LISTO: guardar (con validación) volver
    const saveBtn = document.querySelector('[data-js="save-deck"]');
    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            const currentCards = syncCardsFromDOMToState(deckId, listEl);

            if (hasEmptyCard(currentCards)) {
                alert("No puedes guardar: hay tarjetas incompletas. Rellena (Palabra y Significado) o bórralas.");
                return;
            }

            // FEEDBACK VISUAL
            saveBtn.classList.add("is-saved");
            saveBtn.textContent = "Guardado ✓";

            // SALIDA CON DELAY
            // Envolvemos el cambio de página en un setTimeout para dar tiempo al CSS
            setTimeout(() => {
                location.href = `Deck.html?deck=${deckId}`;
            }, 1000); // 1000 milisegundos = 1 segundo
        });
    }
}

/* =====================================================
   ADD_CARD: INIT Add_Cards (solo en Add_card.html)
   ===================================================== */

// Pintar tarjetas + conectar eventos
(function initAddCards() {
    const listEl = document.querySelector('[data-js="cards-list"]');
    if (!listEl) return; // si no estamos en Add_card.html, no hace nada

    // 1) Primero pintamos las tarjetas del state (para que el DOM tenga cards)
    renderAddCardsPage();

    // 2) Conectamos eventos
    wireAddCardsEvents();
})();

/* =====================================================
   BOTÓN RESET DEMO (en todas las páginas)
   - Elimina el estado guardado en localStorage
   - Recarga la página para restaurar el estado inicial
   ===================================================== */

(function wireResetDemo() {
    const btn = document.querySelector('[data-js="reset-demo"]');
    if (!btn) return;

    btn.addEventListener("click", () => {
        const ok = confirm("Esto borrará los datos guardados del proyecto (localStorage). ¿Continuar?");
        if (!ok) return;

        localStorage.removeItem(STORAGE_KEY);
        location.href = "Home.html";
    });
})();

/* =====================================================
  JUEGO 1 (Flashcards): flip + siguiente/anterior (sesión)
  - Lee deck por ?deck= (fallback: ingles)
  - Muestra front/back con flip al click
  - Prev/Next + progreso X/N
  - Si no hay tarjetas -> mensaje
  ===================================================== */

function getCompleteCards(deck) {
    if (!deck || !Array.isArray(deck.cards)) return [];
    return deck.cards.filter(c =>
        c?.front && c.front.trim() && c?.back && c.back.trim()
    );
}

function renderGame1UI({ deck, cards, index, showBack }) {
    const titleEl = document.querySelector('[data-js="deck-title"]');
    const subtitleEl = document.querySelector('[data-js="deck-subtitle"]');
    const backLink = document.querySelector('[data-js="back-to-deck"]');

    const gameTitle = document.querySelector('[data-js="game-title"]');
    const progressEl = document.querySelector('[data-js="game-progress"]');
    const hintEl = document.querySelector('[data-js="reveal-hint"]');
    const cardTextEl = document.querySelector('[data-js="card-text"]');

    if (!gameTitle || !progressEl || !hintEl || !cardTextEl) return;

    // Header + volver al mazo
    if (titleEl) titleEl.textContent = deck?.title || "Mazo";
    if (subtitleEl) {
        const desc = deck?.description || "Sin descripción";
        subtitleEl.innerHTML = `<b>Descripción:</b> ${desc}<br><b>Detalles:</b> ${cards.length} tarjetas`;
    }
    if (backLink) backLink.setAttribute("href", `Deck.html?deck=${deck.id}`);

    // Sin tarjetas
    if (cards.length === 0) {
        gameTitle.textContent = deck?.title || "Mazo";
        progressEl.textContent = `0/0`;
        hintEl.textContent = `No hay tarjetas completas en este mazo`;
        cardTextEl.textContent = `Añade tarjetas desde "Añadir tarjetas"`;
        return;
    }

    // Título + progreso
    gameTitle.textContent = deck?.title || "Mazo";
    progressEl.textContent = `${index + 1}/${cards.length}`;

    // Texto de tarjeta
    const current = cards[index];
    if (showBack) {
        hintEl.textContent = "Click para ver el original";
        cardTextEl.textContent = current.back;
    } else {
        hintEl.textContent = "Click para ver la definición";
        cardTextEl.textContent = current.front;
    }
}

function wireGame1() {
    const flashcardEl = document.querySelector('[data-js="flashcard"]');
    if (!flashcardEl) return;

    const deckId = getDeckIdFromURL() || "ingles";
    const deck = getDeckById(deckId);
    if (!deck) return;

    //Limpieza y unificación de flags
    ensureCardFlags(deck);

    // Filtrado: Solo tarjetas completas Y que NO estén marcadas como aprendidas
    let cards = getCompleteCards(deck).filter(c => !c.learnt);
    let index = 0;
    let showBack = false;

    renderGame1UI({ deck, cards, index, showBack });

    // Flip tarjeta
    flashcardEl.addEventListener("click", () => {
        if (cards.length === 0) return;
        showBack = !showBack;
        renderGame1UI({ deck, cards, index, showBack });
    });

    // NAVEGACIÓN:

    // BOTÓN: Anterior
    document.querySelector('[data-js="prev-card"]')?.addEventListener("click", () => {
        if (cards.length <= 1) return;
        index = (index - 1 + cards.length) % cards.length; // Salto circular hacia atrás
        showBack = false;
        renderGame1UI({ deck, cards, index, showBack });
    });

    // BOTÓN: Siguiente
    document.querySelector('[data-js="next-card"]')?.addEventListener("click", () => {
        if (cards.length <= 1) return;
        index = (index + 1) % cards.length; // Salto circular hacia adelante
        showBack = false;
        renderGame1UI({ deck, cards, index, showBack });
    });

    // BOTÓN RESET
    document.querySelector('.btn-secondary.game1-btn')?.addEventListener("click", () => {
        if (!confirm("¿Reiniciar el mazo y volver a ver todas las tarjetas?")) return;

        deck.cards.forEach(c => c.learnt = false);
        saveState(appState);

        cards = getCompleteCards(deck).filter(c => !c.learnt);
        index = 0;
        showBack = false;
        renderGame1UI({ deck, cards, index, showBack });
    });

    // BOTÓN GUARDAR 
    const saveBtn = document.querySelector('.btn-primary.game1-btn');
    saveBtn?.addEventListener("click", () => {
        if (cards.length === 0) return;

        // Marcamos la tarjeta actual como aprendida en el estado global
        const currentCardId = cards[index].id;
        const cardInState = deck.cards.find(c => c.id === currentCardId);
        if (cardInState) cardInState.learnt = true;

        saveState(appState);

        // Actualizamos la lista local del juego (sacamos la tarjeta)
        cards = cards.filter(c => c.id !== currentCardId);

        // Ajustamos el índice si nos hemos quedado fuera de rango
        if (index >= cards.length) index = 0;
        showBack = false;

        renderGame1UI({ deck, cards, index, showBack });
    });
}

// INIT Juego 1
(function initGame1() {
    wireGame1();
})();

