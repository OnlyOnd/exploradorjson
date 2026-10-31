const POSTS_URL = 'https://jsonplaceholder.typicode.com/posts';
const USERS_URL = 'https://jsonplaceholder.typicode.com/users';

// Referencias al DOM principales
const postsContainer = document.getElementById('posts-container');
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const retryButton = document.getElementById('retry-button');
const searchInput = document.getElementById('search-input');
const userFilter = document.getElementById('user-filter');
const resultsSummary = document.getElementById('results-summary');
const paginationControls = document.getElementById('pagination-controls');
const previousPageBtn = document.getElementById('previous-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');

// Referencias al DOM del Modal y Formulario
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const postModal = document.getElementById('post-modal');
const newPostForm = document.getElementById('new-post-form');
const newTitleInput = document.getElementById('new-title');
const newBodyInput = document.getElementById('new-body');
const userModal = document.getElementById('user-modal');
const closeUserModalBtn = document.getElementById('close-user-modal-btn');
const userDetails = {
    id: document.getElementById('user-id'),
    name: document.getElementById('user-name'),
    username: document.getElementById('user-username'),
    email: document.getElementById('user-email'),
    phone: document.getElementById('user-phone'),
    website: document.getElementById('user-website'),
    address: document.getElementById('user-address'),
    city: document.getElementById('user-city'),
    company: document.getElementById('user-company')
};

let allPosts = [];
let allUsers = [];
let currentPage = 1;
let modalTrigger = null;
const POSTS_PER_PAGE = 9;

/**
 * Inicializar aplicación cargando datos GET
 */
async function initApp() {
    showLoading(true);
    showError(false); // Corregido: Oculta el error al iniciar correctamente

    try {
        // Realizamos peticiones en paralelo usando Promise.all
        const [postsResponse, usersResponse] = await Promise.all([
            fetch(POSTS_URL),
            fetch(USERS_URL)
        ]);

        if (!postsResponse.ok || !usersResponse.ok) {
            throw new Error('Error al conectar con el servidor.');
        }

        const posts = await postsResponse.json();
        allUsers = await usersResponse.json();

        // Mapeamos los posts para adjuntar el nombre del autor
        allPosts = posts.map(post => {
            const author = allUsers.find(user => user.id === post.userId);
            return {
                ...post,
                authorName: author ? author.name : 'Usuario Desconocido'
            };
        });

        populateUserFilter();
        renderFilteredPosts();

    } catch (error) {
        console.error('Hubo un problema:', error);
        showError(true);
    } finally {
        showLoading(false);
    }
}

function populateUserFilter() {
    const allUsersOption = userFilter.options[0];
    const options = allUsers.map(user => {
        const option = document.createElement('option');
        option.value = String(user.id);
        option.textContent = `${user.name} (@${user.username})`;
        return option;
    });

    userFilter.replaceChildren(allUsersOption, ...options);
}

function getFilteredPosts() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedUserId = userFilter.value;

    return allPosts.filter(post => {
        const matchesSearch = [
            post.title,
            post.body,
            post.authorName,
            allUsers.find(user => user.id === post.userId)?.username ?? ''
        ].some(value => value.toLowerCase().includes(searchTerm));
        const matchesUser = !selectedUserId || String(post.userId) === selectedUserId;
        return matchesSearch && matchesUser;
    });
}

function renderFilteredPosts() {
    const filteredPosts = getFilteredPosts();
    const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
    currentPage = Math.min(currentPage, Math.max(totalPages, 1));

    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const postsOnPage = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
    renderPosts(postsOnPage, filteredPosts.length > 0);

    if (filteredPosts.length === 0) {
        const searchTerm = searchInput.value.trim();
        const hasSelectedUser = Boolean(userFilter.value);
        resultsSummary.textContent = `0 publicaciones encontradas${searchTerm || hasSelectedUser ? ' con los criterios seleccionados.' : '.'}`;
    } else {
        const firstResult = startIndex + 1;
        const lastResult = Math.min(startIndex + POSTS_PER_PAGE, filteredPosts.length);
        const postLabel = filteredPosts.length === 1 ? 'publicación' : 'publicaciones';
        resultsSummary.textContent = `Se encontraron ${filteredPosts.length} ${postLabel}. Mostrando ${firstResult}-${lastResult}.`;
    }

    paginationControls.classList.toggle('hidden', totalPages <= 1);
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    previousPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

/**
 * Renderizar tarjetas en el DOM
 */
function renderPosts(postsToRender, hasResults) {
    const fragment = document.createDocumentFragment();

    if (!hasResults) {
        const noResults = document.createElement('p');
        noResults.className = 'no-results';
        const hasSearch = Boolean(searchInput.value.trim());
        const hasSelectedUser = Boolean(userFilter.value);
        if (hasSearch && hasSelectedUser) {
            noResults.textContent = 'No hay publicaciones que coincidan con la búsqueda y el usuario seleccionado.';
        } else if (hasSearch) {
            noResults.textContent = 'No hay publicaciones que coincidan con la búsqueda.';
        } else if (hasSelectedUser) {
            noResults.textContent = 'Este usuario no tiene publicaciones para mostrar.';
        } else {
            noResults.textContent = 'No hay publicaciones para mostrar.';
        }
        fragment.appendChild(noResults);
        postsContainer.replaceChildren(fragment);
        return;
    }

    postsToRender.forEach(post => {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.dataset.userId = post.userId;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Ver datos del usuario ${post.authorName}`);

        const content = document.createElement('div');
        const title = document.createElement('h2');
        title.className = 'post-title';
        title.textContent = post.title;

        const body = document.createElement('p');
        body.className = 'post-body';
        body.textContent = post.body;

        const author = document.createElement('span');
        author.className = 'post-author';
        author.textContent = `✍️ ${post.authorName}`;

        content.append(title, body);
        card.append(content, author);
        fragment.appendChild(card);
    });

    postsContainer.replaceChildren(fragment);
}

function showUserDetails(userId, card) {
    const user = allUsers.find(item => item.id === Number(userId));
    if (!user) {
        console.error(`No se encontraron datos para el usuario con ID ${userId}.`);
        return;
    }

    const address = user.address
        ? [user.address.street, user.address.suite, user.address.zipcode].filter(Boolean).join(', ')
        : 'No disponible';
    const details = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        website: user.website,
        address,
        city: user.address?.city ?? 'No disponible',
        company: user.company?.name ?? 'No disponible'
    };

    Object.entries(userDetails).forEach(([key, element]) => {
        element.textContent = details[key] ?? 'No disponible';
    });

    openModal(userModal, card, closeUserModalBtn);
}

function openModal(modal, trigger, initialFocus) {
    modalTrigger = trigger;
    modal.classList.remove('hidden');
    initialFocus.focus();
}

function closeModal(modal) {
    modal.classList.add('hidden');
    if (modalTrigger && document.contains(modalTrigger)) {
        modalTrigger.focus();
    }
    modalTrigger = null;
}

function getOpenModal() {
    return Array.from(document.querySelectorAll('.modal'))
        .find(modal => !modal.classList.contains('hidden'));
}

postsContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.post-card');
    if (card) {
        showUserDetails(card.dataset.userId, card);
    }
});

postsContainer.addEventListener('keydown', (event) => {
    const card = event.target.closest('.post-card');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        showUserDetails(card.dataset.userId, card);
    }
});

closeUserModalBtn.addEventListener('click', () => closeModal(userModal));
retryButton.addEventListener('click', initApp);

/**
 * Manejo del Modal (Abrir y Cerrar)
 */
openModalBtn.addEventListener('click', () => {
    openModal(postModal, openModalBtn, newTitleInput);
});

closeModalBtn.addEventListener('click', () => {
    closeModal(postModal);
});

window.addEventListener('click', event => {
    if (event.target === postModal) {
        closeModal(postModal);
    } else if (event.target === userModal) {
        closeModal(userModal);
    }
});

window.addEventListener('keydown', (event) => {
    const modal = getOpenModal();
    if (!modal) return;

    if (event.key === 'Escape') {
        closeModal(modal);
        return;
    }

    if (event.key === 'Tab') {
        const focusableElements = Array.from(modal.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(element => element.getClientRects().length > 0);

        if (focusableElements.length === 0) {
            event.preventDefault();
            modal.querySelector('.modal-content').focus();
            return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (!modal.contains(document.activeElement)) {
            event.preventDefault();
            (event.shiftKey ? lastElement : firstElement).focus();
        } else if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }
});

/**
 * Enviar Nueva Publicación mediante Petición POST
 */
newPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = newTitleInput.value.trim();
    const body = newBodyInput.value.trim();

    if (!title || !body) return;

    const newPostPayload = {
        title: title,
        body: body,
        userId: 1 // Simulamos que el usuario actual tiene ID 1
    };

    try {
        const response = await fetch(POSTS_URL, {
            method: 'POST',
            body: JSON.stringify(newPostPayload),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });

        if (!response.ok) {
            throw new Error('Error al registrar la publicación en el servidor.');
        }

        const createdPost = await response.json();
        createdPost.authorName = 'Tú (Autor Actual)';

        // Insertamos el nuevo post al inicio del arreglo global
        allPosts.unshift(createdPost);

        currentPage = 1;
        renderFilteredPosts();

        // Limpiamos formulario y cerramos modal
        newPostForm.reset();
        closeModal(postModal);

        alert('¡Publicación creada exitosamente!');

    } catch (error) {
        console.error('Error al enviar POST:', error);
        alert('No se pudo crear la publicación. Inténtalo de nuevo.');
    }
});

/**
 * Búsqueda, filtro y paginación
 */
searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderFilteredPosts();
});

userFilter.addEventListener('change', () => {
    currentPage = 1;
    renderFilteredPosts();
});

previousPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage -= 1;
        renderFilteredPosts();
        postsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredPosts().length / POSTS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage += 1;
        renderFilteredPosts();
        postsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// Funciones auxiliares de UI (Control de estados)
function showLoading(isLoading) {
    retryButton.disabled = isLoading;
    if (isLoading) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function showError(hasError) {
    if (hasError) {
        errorMessage.classList.remove('hidden');
    } else {
        errorMessage.classList.add('hidden');
    }
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', initApp);