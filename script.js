// --- CONFIGURAÇÕES DE API ---
const OMDB_API_KEY = '8fa8be48'; // Sua chave OMDB
const TMDB_API_KEY = 'a0e715211fab6edda0bd3c35858a070c'; // <<<< SUBSTITUA PELA SUA CHAVE TMDB AQUI <<<<

const OMDB_BASE_URL = 'https://omdbapi.com/';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3/';

// --- SELETORES GLOBAIS ---
const searchBar = document.getElementById('search-bar');
const suggestionsList = document.getElementById('suggestions');
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

// Seções específicas
const homeSection = document.getElementById('home-section');
const exploreSection = document.getElementById('explore-section');
const categoriesSection = document.getElementById('categories-section');
const favoritesSection = document.getElementById('favorites-section');
const searchResultsSection = document.getElementById('search-results-section');

// Grids de filmes
const recentMoviesGrid = document.getElementById('recent-movies-grid');
const popularSeriesGrid = document.getElementById('popular-series-grid');
const topRatedMoviesGrid = document.getElementById('top-rated-movies-grid');
const exploreGrid = document.getElementById('explore-grid');
const genresList = document.getElementById('genres-list');
const categoryMoviesGrid = document.getElementById('category-movies-grid');
const favoritesGrid = document.getElementById('favorites-grid');
const searchResultsGrid = document.getElementById('search-results-grid');

// Mensagens de carregamento/erro
const exploreLoadingMessage = document.getElementById('explore-loading');
const categoryLoadingMessage = document.getElementById('category-loading');
const searchLoadingMessage = document.getElementById('search-loading');
const searchErrorMessage = document.getElementById('search-error');
const noFavoritesMessage = document.getElementById('no-favorites-message');
const categoryTitle = document.getElementById('category-title');
const searchResultsTitle = document.getElementById('search-results-title');


let currentExplorePage = 1;
let currentCategoryPage = 1;
let currentSearchPage = 1;
let currentCategoryId = null; // Para manter o controle da categoria atual

// --- FUNÇÕES DE UTILIDADE ---

// Função para obter o código de idioma preferencial do usuário
function getLanguageCode() {
    const lang = (navigator.language || navigator.userLanguage).slice(0, 2);
    // TMDB suporta muitos idiomas, mas vamos priorizar pt-BR ou en-US
    return lang === 'pt' ? 'pt-BR' : 'en-US';
}
const APP_LANG = getLanguageCode();

// Função para construir URL de poster da TMDB
function getPosterUrl(path, size = 'w342') {
    return path ? `https://image.tmdb.org/t/p/${size}${path}` : 'https://via.placeholder.com/200x300?text=Sem+Poster';
}

// Função para limpar um elemento HTML
function clearElement(element) {
    element.innerHTML = '';
}

// Função para mostrar/esconder mensagens
function showMessage(element, text = '', isError = false) {
    element.textContent = text;
    element.style.display = 'block';
    if (isError) {
        element.classList.add('error');
    } else {
        element.classList.remove('error');
    }
}

function hideMessage(element) {
    element.style.display = 'none';
    element.classList.remove('error');
}

// Função para formatar o tipo (Filme/Série)
function formatMediaType(type) {
    return type === 'movie' ? 'Filme' : 'Série';
}


// --- FUNÇÕES DE NAVEGAÇÃO E EXIBIÇÃO DE SEÇÕES ---

function activateSection(targetSectionId) {
    // Esconde todas as seções e remove a classe 'active' da navegação
    contentSections.forEach(section => section.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));

    // Mostra a seção desejada
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Ativa o link de navegação correspondente
    const activeLink = document.querySelector(`[data-section="${targetSectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Esconde a seção de resultados de busca, a menos que seja ela mesma
    if (targetSectionId !== 'search-results-section') {
        searchResultsSection.classList.remove('active');
        searchBar.value = ''; // Limpa a barra de busca ao trocar de seção
        clearElement(suggestionsList); // Limpa as sugestões
        suggestionsList.classList.remove('visible'); // Esconde a lista de sugestões
    }

    // Limpa os grids de categorias e busca ao sair delas
    if (targetSectionId !== 'categories-section' && targetSectionId !== 'search-results-section') {
        clearElement(categoryMoviesGrid);
        hideMessage(categoryLoadingMessage);
        categoryTitle.style.display = 'none';
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSectionId = e.target.dataset.section;
        activateSection(targetSectionId);

        // Recarrega o conteúdo da seção se necessário
        if (targetSectionId === 'home-section') loadHomeContent();
        if (targetSectionId === 'explore-section') loadExploreContent(true);
        if (targetSectionId === 'categories-section') loadGenres();
        if (targetSectionId === 'favorites-section') {
            activateSection('favorites-section');
            displayFavorites();
        }
    });
});

// --- FUNÇÕES DE BUSCA (OMDB para sugestões, TMDB para busca principal) ---

// Busca sugestões da OMDB (rápida para autocompletar)
async function fetchOmdbSuggestions(query) {
    if (!query || query.length < 3) { // Só busca com 3+ caracteres
        clearElement(suggestionsList);
        suggestionsList.classList.remove('visible');
        return;
    }

    const url = `${OMDB_BASE_URL}?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.Response === "True" && data.Search) {
            displayOmdbSuggestions(data.Search);
        } else {
            clearElement(suggestionsList);
            suggestionsList.classList.remove('visible');
        }
    } catch (error) {
        console.error("Erro ao buscar sugestões OMDB:", error);
        clearElement(suggestionsList);
        suggestionsList.classList.remove('visible');
    }
}

// funcão pra carregaro ID de imdb pra tmdb
async function getTmdbIdFromImdb(imdbId, type) {
    const url = `${TMDB_BASE_URL}find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (type === 'movie' && data.movie_results.length > 0) return data.movie_results[0].id;
        if (type === 'tv' && data.tv_results.length > 0) return data.tv_results[0].id;
    } catch (err) {
        console.error('Erro ao buscar TMDb ID:', err);
    }
    return null;
}


function displayOmdbSuggestions(movies) {
    clearElement(suggestionsList);
    if (movies.length > 0) {
        movies.slice(0, 7).forEach(movie => {
            const li = document.createElement('li');
            li.textContent = `${movie.Title} (${movie.Year || 'N/A'}) - ${formatMediaType(movie.Type)}`;
            li.dataset.imdbId = movie.imdbID;
            li.dataset.title = movie.Title;
            li.dataset.tmdbId = movie.TMDB_ID; // Certifique-se de que você tem o TMDb ID disponível
            li.dataset.type = movie.Type; // 'movie' ou 'tv'

            li.addEventListener('click', async () => {
                const tmdbId = await getTmdbIdFromImdb(movie.imdbID, movie.Type);
                if (!tmdbId) return alert('Não foi possível obter o TMDb ID');

                const url = `./player/?tmdb_id=${tmdbId}&type=${movie.Type}&title=${encodeURIComponent(movie.Title)}`;
                window.location.href = url;

                searchBar.value = movie.Title;
                clearElement(suggestionsList);
                suggestionsList.classList.remove('visible');
            });


            suggestionsList.appendChild(li);
        });
        suggestionsList.classList.add('visible');
    } else {
        suggestionsList.classList.remove('visible');
    }
}


searchBar.addEventListener('input', (e) => {
    fetchOmdbSuggestions(e.target.value);
});

// Esconder sugestões ao clicar fora
document.addEventListener('click', (e) => {
    if (!searchBar.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.classList.remove('visible');
    }
});

// Busca principal de filmes/séries na TMDB
async function searchTmdb(query, page = 1) {
    if (!query) return;

    activateSection('search-results-section');
    clearElement(searchResultsGrid);
    hideMessage(searchErrorMessage);
    showMessage(searchLoadingMessage, 'Carregando resultados...');
    searchResultsTitle.textContent = `Resultados da Busca para "${query}"`;
    currentSearchPage = page;

    const url = `${TMDB_BASE_URL}search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=${APP_LANG}&include_adult=false`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        hideMessage(searchLoadingMessage);

        const validResults = data.results.filter(item => 
            (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
        );

        if (validResults.length > 0) {
            displayMovies(validResults, searchResultsGrid);
        } else {
            showMessage(searchErrorMessage, `Nenhum resultado encontrado para "${query}".`, true);
        }

    } catch (error) {
        console.error("Erro ao buscar filmes TMDB:", error);
        hideMessage(searchLoadingMessage);
        showMessage(searchErrorMessage, 'Ocorreu um erro ao buscar. Tente novamente.', true);
    }
}

searchBar.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const query = searchBar.value.trim();
        if (query) {
            searchTmdb(query);
            suggestionsList.classList.remove('visible'); // Esconde sugestões após a busca principal
        }
    }
});

// --- FUNÇÕES DE CARREGAMENTO DE CONTEÚDO PRINCIPAL (HOME, EXPLORAR) ---

async function fetchTmdbMovies(endpoint, gridElement, type = 'movie') {
    const url = `${TMDB_BASE_URL}${type}/${endpoint}?api_key=${TMDB_API_KEY}&language=${APP_LANG}&page=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results) {
            displayMovies(data.results.slice(0, 12), gridElement, type); // Limita a 12 para a home
        }
    } catch (error) {
        console.error(`Erro ao buscar ${type}s do endpoint ${endpoint}:`, error);
        gridElement.innerHTML = `<p class="message error">Não foi possível carregar ${type}s.</p>`;
    }
}

async function loadHomeContent() {
    clearElement(recentMoviesGrid);
    clearElement(popularSeriesGrid);
    clearElement(topRatedMoviesGrid);

    recentMoviesGrid.innerHTML = '<p class="message">Carregando filmes recentes...</p>';
    popularSeriesGrid.innerHTML = '<p class="message">Carregando séries populares...</p>';
    topRatedMoviesGrid.innerHTML = '<p class="message">Carregando mais vistos...</p>';

    await fetchTmdbMovies('now_playing', recentMoviesGrid, 'movie');
    await fetchTmdbMovies('popular', popularSeriesGrid, 'tv');
    await fetchTmdbMovies('top_rated', topRatedMoviesGrid, 'movie');
}

async function loadExploreContent(reset = false) {
    if (reset) {
        clearElement(exploreGrid);
        currentExplorePage = 1;
        showMessage(exploreLoadingMessage, 'Carregando títulos para explorar...');
    }

    const urlMovies = `${TMDB_BASE_URL}movie/popular?api_key=${TMDB_API_KEY}&language=${APP_LANG}&page=${currentExplorePage}`;
    const urlTv = `${TMDB_BASE_URL}tv/popular?api_key=${TMDB_API_KEY}&language=${APP_LANG}&page=${currentExplorePage}`;

    try {
        const [moviesRes, tvRes] = await Promise.all([fetch(urlMovies), fetch(urlTv)]);
        const [moviesData, tvData] = await Promise.all([moviesRes.json(), tvRes.json()]);

        let combinedResults = [];
        if (moviesData.results) combinedResults = combinedResults.concat(moviesData.results.map(m => ({...m, media_type: 'movie'})));
        if (tvData.results) combinedResults = combinedResults.concat(tvData.results.map(t => ({...t, media_type: 'tv'})));

        // Mistura os resultados para uma experiência mais variada
        combinedResults.sort(() => 0.5 - Math.random());

        hideMessage(exploreLoadingMessage);
        displayMovies(combinedResults, exploreGrid, 'mixed', false); // Adiciona ao invés de limpar

    } catch (error) {
        console.error("Erro ao carregar conteúdo para explorar:", error);
        showMessage(exploreLoadingMessage, 'Erro ao carregar conteúdo.', true);
    }
}

// Implementar "carregar mais" para a seção explorar (scroll infinito)
exploreSection.addEventListener('scroll', () => {
    if (exploreSection.scrollTop + exploreSection.clientHeight >= exploreSection.scrollHeight - 100) { // 100px antes do fim
        currentExplorePage++;
        loadExploreContent(false);
    }
});


// --- FUNÇÕES DE CATEGORIAS (TMDB GÊNEROS) ---

async function loadGenres() {
    clearElement(genresList);
    clearElement(categoryMoviesGrid);
    categoryTitle.style.display = 'none';
    hideMessage(categoryLoadingMessage);

    genresList.innerHTML = '<p class="message">Carregando gêneros...</p>';

    const movieGenresUrl = `${TMDB_BASE_URL}genre/movie/list?api_key=${TMDB_API_KEY}&language=${APP_LANG}`;
    const tvGenresUrl = `${TMDB_BASE_URL}genre/tv/list?api_key=${TMDB_API_KEY}&language=${APP_LANG}`;

    try {
        const [movieRes, tvRes] = await Promise.all([fetch(movieGenresUrl), fetch(tvGenresUrl)]);
        const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);

        const combinedGenresMap = new Map();

        // Adiciona gêneros de filmes
        if (movieData.genres) {
            movieData.genres.forEach(genre => combinedGenresMap.set(genre.id, {...genre, type: 'movie'}));
        }
        // Adiciona gêneros de TV, evitando duplicatas e mesclando se necessário
        if (tvData.genres) {
            tvData.genres.forEach(genre => {
                if (!combinedGenresMap.has(genre.id)) {
                    combinedGenresMap.set(genre.id, {...genre, type: 'tv'});
                } else {
                    // Se o gênero já existe, marca que ele serve para ambos
                    const existing = combinedGenresMap.get(genre.id);
                    existing.type = 'both';
                    combinedGenresMap.set(genre.id, existing);
                }
            });
        }

        const sortedGenres = Array.from(combinedGenresMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        clearElement(genresList); // Limpa a mensagem de carregamento

        const genreGridContainer = document.createElement('div');
        genreGridContainer.id = 'categories-grid'; // Aplica o estilo de grid de categorias
        genresList.appendChild(genreGridContainer);


        sortedGenres.forEach(genre => {
            const genreCard = document.createElement('div');
            genreCard.classList.add('category-card');
            genreCard.innerHTML = `
                <h3>${genre.name}</h3>
                <p>${genre.type === 'movie' ? 'Filmes' : genre.type === 'tv' ? 'Séries' : 'Filmes e Séries'}</p>
            `;
            genreCard.addEventListener('click', () => {
                loadMoviesByCategory(genre.id, genre.name, true);
            });
            genreGridContainer.appendChild(genreCard);
        });

    } catch (error) {
        console.error("Erro ao carregar gêneros:", error);
        genresList.innerHTML = '<p class="message error">Erro ao carregar gêneros.</p>';
    }
}

async function loadMoviesByCategory(genreId, genreName, reset = false) {
    if (reset) {
        clearElement(categoryMoviesGrid);
        currentCategoryPage = 1;
        categoryTitle.textContent = `Resultados para: ${genreName}`;
        categoryTitle.style.display = 'block';
        currentCategoryId = genreId; // Guarda o ID da categoria
        showMessage(categoryLoadingMessage, `Carregando filmes de ${genreName}...`);
    }

    const url = `${TMDB_BASE_URL}discover/movie?api_key=${TMDB_API_KEY}&language=${APP_LANG}&sort_by=popularity.desc&include_adult=false&include_video=false&page=${currentCategoryPage}&with_genres=${genreId}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        hideMessage(categoryLoadingMessage);

        if (data.results && data.results.length > 0) {
            displayMovies(data.results, categoryMoviesGrid, 'movie', false);
        } else if (reset) {
            categoryMoviesGrid.innerHTML = `<p class="message">Nenhum filme encontrado nesta categoria.</p>`;
        }
    } catch (error) {
        console.error(`Erro ao carregar filmes da categoria ${genreName}:`, error);
        showMessage(categoryLoadingMessage, 'Erro ao carregar filmes da categoria.', true);
    }
}

// Implementar "carregar mais" para a seção de categorias
categoriesSection.addEventListener('scroll', () => {
    // Verifica se currentCategoryId está definido para evitar carregar sem categoria selecionada
    if (currentCategoryId && categoriesSection.scrollTop + categoriesSection.clientHeight >= categoriesSection.scrollHeight - 100) {
        currentCategoryPage++;
        // Garante que o nome do gênero seja passado novamente
        const genreName = categoryTitle.textContent.replace('Resultados para: ', '');
        loadMoviesByCategory(currentCategoryId, genreName, false);
    }
});


// --- FUNÇÃO PARA RENDERIZAR FILMES/SÉRIES EM GRID ---

function displayMovies(movies, gridElement, mediaType = 'movie', clearBefore = true) {
    if (clearBefore) {
        clearElement(gridElement);
    }

    if (!movies || movies.length === 0) {
        gridElement.innerHTML = `<p class="message">Nenhum título para exibir.</p>`;
        return;
    }

    movies.forEach(item => {
        // Tenta inferir o tipo se não estiver explícito
        const type = item.media_type || mediaType; // Use item.media_type se disponível, senão o passado para a função

        // A API TMDB usa 'title' para filmes e 'name' para séries
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date) ? new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A';
        const posterPath = item.poster_path;
        const imdbId = item.id; // TMDB ID, teremos que buscar OMDB ID se necessário

        if (!title || !posterPath) return; // Ignora itens sem título ou poster

        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');

        movieCard.innerHTML = `
            <img src="${getPosterUrl(posterPath)}" alt="${title}">
            <h3>${title}</h3>
            <p>${formatMediaType(type)} (${year})</p>
            <div class="actions">
                <button class="watch-button" data-tmdb-id="${imdbId}" data-type="${type}" data-title="${title}">
                    <i class="fas fa-play"></i> Assistir
                </button>
                <button class="favorite-button" data-tmdb-id="${imdbId}" data-type="${type}" data-title="${title}" data-poster="${posterPath}" data-year="${year}">
                    <i class="far fa-heart"></i> Favoritar
                </button>
            </div>
        `;

        // Verifica se já está nos favoritos para atualizar o ícone
        const favoriteButton = movieCard.querySelector('.favorite-button');
        if (isFavorite(imdbId)) {
            favoriteButton.classList.add('active');
            favoriteButton.querySelector('i').classList.replace('far', 'fas'); // Ícone preenchido
        }

        movieCard.querySelector('.watch-button').addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que o click se propague para o card inteiro
            const tmdbId = e.currentTarget.dataset.tmdbId;
            const itemType = e.currentTarget.dataset.type;
            const itemTitle = e.currentTarget.dataset.title;
            // Redireciona para o player. O player buscará o OMDB ID se for um filme/série
            const url = `./player/?tmdb_id=${tmdbId}&type=${itemType}&title=${encodeURIComponent(itemTitle)}`;
            window.location.href = url;
        });

        favoriteButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que o click se propague para o card inteiro
            toggleFavorite({
                id: e.currentTarget.dataset.tmdbId,
                title: e.currentTarget.dataset.title,
                poster: e.currentTarget.dataset.poster,
                year: e.currentTarget.dataset.year,
                type: e.currentTarget.dataset.type
            }, e.currentTarget);
        });

        gridElement.appendChild(movieCard);
    });
}

// --- FUNÇÕES DE FAVORITOS (LOCALSTORAGE) ---

  //notificação
function showFavoritePopup(message) {
    const popup = document.createElement('div');
    popup.textContent = message;

    // Estilo do popup
    Object.assign(popup.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        maxWidth: '300px',
        padding: '15px 25px',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.8))',
        color: '#fff',
        border: '2px solid rgba(229, 9, 20, 0.5)',
        boxShadow: '0 4px 20px rgba(229, 9, 20, 0.6), 0 8px 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(5px)',
        borderRadius: '12px',
        zIndex: 9999,
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        fontWeight: '450',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        opacity: 0,
        transform: 'translateX(120px) rotateZ(2deg)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        cursor: 'default',
    });


    document.body.appendChild(popup);

    // Entrada
    requestAnimationFrame(() => {
        popup.style.opacity = 1;
        popup.style.transform = 'translateX(0) rotateZ(0deg)';
    });

    // Saída
    setTimeout(() => {
        popup.style.opacity = 0;
        popup.style.transform = 'translateX(120px) rotateZ(2deg)';
        setTimeout(() => popup.remove(), 400); // remove do DOM
    }, 2500); // duração do popup visível
}

const FAVORITES_KEY = 'cineblack_favorites';

function getFavorites() {
    try {
        const favorites = localStorage.getItem(FAVORITES_KEY);
        return favorites ? JSON.parse(favorites) : [];
    } catch (e) {
        console.error("Erro ao ler favoritos do localStorage:", e);
        return [];
    }
}

function saveFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
        console.error("Erro ao salvar favoritos no localStorage:", e);
        alert("Não foi possível salvar os favoritos. Seu navegador pode estar no modo de navegação anônima ou com pouco espaço.");
    }
}

function isFavorite(id) {
    return getFavorites().some(item => item.id === String(id)); // Converter para string para consistência
}

function toggleFavorite(itemData, buttonElement) {
    let favorites = getFavorites();
    const isCurrentlyFavorite = isFavorite(itemData.id);

    if (isCurrentlyFavorite) {
        favorites = favorites.filter(item => item.id !== String(itemData.id));
        buttonElement.classList.remove('active');
        buttonElement.querySelector('i').classList.replace('fas', 'far');
        showFavoritePopup(`${itemData.title} removido dos favoritos!`);
    } else {
        favorites.push({ ...itemData, id: String(itemData.id) });
        buttonElement.classList.add('active');
        buttonElement.querySelector('i').classList.replace('far', 'fas');
        showFavoritePopup(`${itemData.title} adicionado aos favoritos!`);
    }
    saveFavorites(favorites);
    // Atualiza a exibição de favoritos se estiver na seção
    if (favoritesSection.classList.contains('active')) {
        displayFavorites();
    }
}

function displayFavorites() {
    clearElement(favoritesGrid);
    const favorites = getFavorites();

    if (favorites.length > 0) {
        hideMessage(noFavoritesMessage);
        favorites.forEach(item => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.innerHTML = `
                <img src="${getPosterUrl(item.poster)}" alt="${item.title}">
                <h3>${item.title}</h3>
                <p>${formatMediaType(item.type)} (${item.year})</p>
                <div class="actions">
                    <button class="watch-button" data-tmdb-id="${item.id}" data-type="${item.type}" data-title="${item.title}">
                        <i class="fas fa-play"></i> Assistir
                    </button>
                    <button class="favorite-button active" data-tmdb-id="${item.id}" data-type="${item.type}" data-title="${item.title}" data-poster="${item.poster}" data-year="${item.year}">
                        <i class="fas fa-heart"></i> Favoritar
                    </button>
                </div>
            `;
            favoritesGrid.appendChild(movieCard);
        });

    } else {
        showMessage(noFavoritesMessage, 'Você ainda não adicionou nenhum favorito.');
    }
}


// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    // Carrega a home por padrão
    activateSection('home-section');
    loadHomeContent();

    // Carrega o conteúdo da seção "Explorar" para que o scroll funcione
    loadExploreContent(true);

    // Carrega os gêneros em segundo plano para agilizar quando o usuário for para a seção
    loadGenres();

    // Carrega os favoritos para que os botões já venham marcados
    displayFavorites();
});

// --- Delegação de evento para funcionar em todos os cards, inclusive favoritos ---
document.addEventListener('click', (event) => {
    if (event.target.closest('.favorite-button')) {
        const button = event.target.closest('.favorite-button');
        const itemData = {
            id: button.dataset.tmdbId,
            title: button.dataset.title,
            type: button.dataset.type,
            poster: button.dataset.poster,
            year: button.dataset.year
        };
        toggleFavorite(itemData, button);
    }
});

// Aprimoramento: Suporte para scroll infinito em seções
function setupInfiniteScroll(sectionElement, loadingMessageElement, loadMoreFunction) {
    sectionElement.addEventListener('scroll', () => {
        if (sectionElement.scrollTop + sectionElement.clientHeight >= sectionElement.scrollHeight - 200) { // 200px antes do fim
            loadMoreFunction();
        }
    });
}

// Configura o scroll infinito para as seções aplicáveis
// setupInfiniteScroll(exploreSection, exploreLoadingMessage, () => {
//     currentExplorePage++;
//     loadExploreContent(false);
// });

// Não precisamos do scroll infinito no `categoriesSection` para a lista de gêneros,
// apenas para os filmes de uma categoria específica. Isso será tratado dentro de `loadMoviesByCategory`.