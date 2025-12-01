document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("#topnav a");
    const content = document.getElementById("content");
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchPage = document.getElementById('search-page');
    const searchResultsContainer = document.getElementById('search-results-container');
    const mainContent = document.getElementById('content');

    // Store sidebar state
    let sidebarState = {
        openMenus: new Set()
    };

    // ROUTING CONFIGURATION
    const DEFAULT_ROUTE = 'pages/getting-started.html';

    // ========== ROUTING FUNCTIONS ==========
    function updateUrl(path) {
        const page = path || DEFAULT_ROUTE;
        const url = new URL(window.location);
        url.hash = `#${page}`;
        history.pushState({ page }, '', url.toString());
    }

    function getCurrentRoute() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#pages/')) {
            return hash.substring(1);
        }
        return DEFAULT_ROUTE;
    }

    function handlePopState(event) {
        const page = event.state ? event.state.page : getCurrentRoute();
        loadPage(page, null, false);
    }

    function initRouting() {
        const initialPage = getCurrentRoute();
        history.replaceState({ page: initialPage }, '', window.location);
        loadPage(initialPage, null, false);
        window.addEventListener('popstate', handlePopState);
    }

    // ========== SEARCH FUNCTIONS ==========
    function generateSearchIndex() {
        const index = [];
        const allNavLinks = document.querySelectorAll('a[data-page]');
        
        allNavLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            const title = link.textContent.trim();
            let path = '';
            
            if (link.closest('#topnav')) {
                path = 'Main Navigation';
            } else if (link.closest('.guides-sidebar')) {
                const pathParts = [];
                let currentElement = link.closest('li');
                
                while (currentElement) {
                    const toggle = currentElement.previousElementSibling;
                    if (toggle && toggle.classList.contains('toggle')) {
                        pathParts.unshift(toggle.textContent.trim());
                    }
                    currentElement = currentElement.parentElement.closest('li');
                }
                
                path = pathParts.join(' > ');
            }
            
            if (title && page) {
                index.push({
                    title: title,
                    path: path,
                    url: page,
                    excerpt: `Navigate to ${title}${path ? ` in ${path}` : ''}`
                });
            }
        });
        
        return index;
    }

    function performSearch(query) {
        if (!query.trim()) {
            return [];
        }
        
        const searchIndex = generateSearchIndex();
        const lowerQuery = query.toLowerCase();
        
        return searchIndex.filter(item => 
            item.title.toLowerCase().includes(lowerQuery) || 
            item.path.toLowerCase().includes(lowerQuery)
        );
    }

    function displaySearchResults(results) {
        searchResults.innerHTML = '';
        
        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }
        
        results.slice(0, 5).forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="search-result-title">${result.title}</div>
                <div class="search-result-path">${result.path}</div>
            `;
            
            resultItem.addEventListener('click', () => {
                navigateToResult(result);
            });
            
            searchResults.appendChild(resultItem);
        });
        
        searchResults.style.display = 'block';
    }

    function displaySearchPageResults(results, query) {
        searchResultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            searchResultsContainer.innerHTML = `
                <div class="no-results">
                    <h3>No results found for "${query}"</h3>
                    <p>Try different keywords or browse the navigation menu.</p>
                </div>
            `;
            return;
        }
        
        results.forEach(result => {
            const resultCard = document.createElement('div');
            resultCard.className = 'search-result-card';
            resultCard.innerHTML = `
                <h3>${result.title}</h3>
                <div class="path">${result.path}</div>
                <div class="excerpt">${result.excerpt}</div>
            `;
            
            resultCard.addEventListener('click', () => {
                navigateToResult(result);
            });
            
            resultCard.style.cursor = 'pointer';
            searchResultsContainer.appendChild(resultCard);
        });
    }

    function navigateToResult(result) {
        searchPage.style.display = 'none';
        searchResults.style.display = 'none';
        mainContent.style.display = 'block';
        searchInput.value = '';
        loadPage(result.url, null, true);
    }

    // ========== PAGE LOADING ==========
    async function loadPage(page, link, updateHistory = true) {
        try {
            const response = await fetch(page);
            const html = await response.text();
            
            // Update active state in navigation
            navLinks.forEach(a => a.classList.remove("active"));
            if (link) link.classList.add("active");

            // Update URL if requested
            if (updateHistory) {
                updateUrl(page);
            }

            // Handle different page types
            if (page.includes('guides/') || page === 'pages/guides.html') {
                await loadGuidePage(page, html);
            } else {
                content.innerHTML = html;
            }

            // Initialize components
            setupGuidesSidebar();
            initElectrolyzerConfigs();
            attachContentLinkListeners();
            
            // Scroll to top
            window.scrollTo(0, 0);
        } catch (err) {
            content.innerHTML = `<p>Error loading page: ${err.message || err}</p>`;
            console.error(err);
        }
    }

    async function loadGuidePage(page, html) {
        saveSidebarState();
        
        try {
            const sidebarHtml = await fetch('pages/guides.html');
            const sidebarContent = await sidebarHtml.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sidebarContent;
            
            const guidesSidebar = tempDiv.querySelector('.guides-sidebar');
            const guidesContentArea = tempDiv.querySelector('.guides-content');
            
            if (guidesSidebar && guidesContentArea) {
                const layoutContainer = document.createElement('div');
                layoutContainer.className = 'guides-layout';
                
                layoutContainer.appendChild(guidesSidebar.cloneNode(true));
                
                const contentArea = document.createElement('div');
                contentArea.className = 'guides-content';
                contentArea.innerHTML = html;
                
                layoutContainer.appendChild(contentArea);
                content.innerHTML = '';
                content.appendChild(layoutContainer);
                
                setTimeout(() => {
                    restoreSidebarState();
                    highlightCurrentPageInSidebar(page);
                }, 10);
            } else {
                content.innerHTML = html;
            }
        } catch (err) {
            content.innerHTML = html; // Fallback to just showing content
        }
    }

    // ========== SIDEBAR MANAGEMENT ==========
    function saveSidebarState() {
        const openMenus = document.querySelectorAll('.guides-sidebar .submenu.open');
        sidebarState.openMenus.clear();
        
        openMenus.forEach(menu => {
            const toggle = menu.previousElementSibling;
            if (toggle && toggle.classList.contains('toggle')) {
                sidebarState.openMenus.add(toggle.textContent.trim());
            }
        });
    }

    function restoreSidebarState() {
        const toggles = document.querySelectorAll('.guides-sidebar .toggle');
        toggles.forEach(toggle => {
            if (sidebarState.openMenus.has(toggle.textContent.trim())) {
                const submenu = toggle.nextElementSibling;
                if (submenu && submenu.classList.contains('submenu')) {
                    submenu.classList.add('open');
                }
            }
        });
    }

    function highlightCurrentPageInSidebar(currentPage) {
        const allLinks = document.querySelectorAll('.guides-sidebar a');
        allLinks.forEach(link => link.classList.remove('active'));
        
        const currentLink = document.querySelector(`.guides-sidebar a[data-page="${currentPage}"]`);
        
        if (currentLink) {
            currentLink.classList.add('active');
            
            let parentElement = currentLink.closest('.submenu');
            while (parentElement) {
                const toggle = parentElement.previousElementSibling;
                if (toggle && toggle.classList.contains('toggle')) {
                    parentElement.classList.add('open');
                    sidebarState.openMenus.add(toggle.textContent.trim());
                }
                parentElement = parentElement.parentElement.closest('.submenu');
            }
        }
    }

    // ========== EVENT HANDLERS ==========
    function attachContentLinkListeners() {
        const contentLinks = content.querySelectorAll('a[data-page]');
        contentLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                loadPage(page, null, true);
            });
        });
    }

    function setupGuidesSidebar() {
        const toggles = document.querySelectorAll(".toggle");
        const contentArea = document.querySelector(".guides-content");
        const itemLinks = document.querySelectorAll(".submenu a");

        // Handle dropdown toggles
        toggles.forEach(toggle => {
            toggle.addEventListener("click", () => {
                const submenu = toggle.nextElementSibling;
                if (submenu) {
                    submenu.classList.toggle("open");
                    
                    if (submenu.classList.contains('open')) {
                        sidebarState.openMenus.add(toggle.textContent.trim());
                    } else {
                        sidebarState.openMenus.delete(toggle.textContent.trim());
                    }
                }
            });
        });

        // Handle sidebar navigation
        itemLinks.forEach(link => {
            link.addEventListener("click", async e => {
                e.preventDefault();
                const page = link.getAttribute("data-page");
                
                if (contentArea) {
                    saveSidebarState();
                    
                    try {
                        const response = await fetch(page);
                        const html = await response.text();
                        
                        contentArea.innerHTML = html;
                        itemLinks.forEach(a => a.classList.remove("active"));
                        link.classList.add("active");
                        
                        updateUrl(page);
                        initElectrolyzerConfigs();
                        attachContentLinkListeners();
                        
                        setTimeout(() => {
                            restoreSidebarState();
                            highlightCurrentPageInSidebar(page);
                        }, 10);
                    } catch (err) {
                        contentArea.innerHTML = `<p>Error loading section: ${err.message || err}</p>`;
                        console.error(err);
                    }
                } else {
                    loadPage(page, null, true);
                }
            });
        });
    }

    // ========== SEARCH EVENT LISTENERS ==========
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value;
            if (query.length < 2) {
                if (searchResults) searchResults.style.display = 'none';
                return;
            }
            
            const results = performSearch(query);
            displaySearchResults(results);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value;
                if (query.trim()) {
                    const results = performSearch(query);
                    if (mainContent) mainContent.style.display = 'none';
                    if (searchPage) searchPage.style.display = 'block';
                    displaySearchPageResults(results, query);
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (searchInput && searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // ========== NAVIGATION LINKS ==========
    navLinks.forEach(link => {
        if (link.getAttribute('data-page')) {
            link.addEventListener("click", e => {
                e.preventDefault();
                const page = link.getAttribute("data-page");
                loadPage(page, link, true);
            });
        }
    });

    // ========== INITIALIZATION ==========
    initRouting();
    setupGuidesSidebar();
    attachContentLinkListeners();
});

// Electrolyzer configuration
function initElectrolyzerConfigs() {
    const containers = document.querySelectorAll('.electrolyzer-config');
    containers.forEach(container => {
        if (container.dataset.initialized) return;

        let tiers = [];
        const raw = container.getAttribute('data-tiers');
        if (!raw) return;
        try {
            tiers = JSON.parse(raw);
        } catch (e) {
            console.error('electrolyzer-config: invalid JSON in data-tiers', e, raw);
            return;
        }

        const select = document.createElement('select');
        select.className = 'electrolyzer-tier-select';
        tiers.forEach((t, i) => {
            const opt = document.createElement('option');
            opt.value = t.tier;
            opt.textContent = t.tier;
            opt.dataset.sec = t.sec;
            if (i === 0) opt.selected = true;
            select.appendChild(opt);
        });

        let timeTarget = null;
        const para = container.closest('p');
        if (para) timeTarget = para.querySelector('.electrolyzer-time');
        if (!timeTarget) timeTarget = document.querySelector('.electrolyzer-time');

        if (timeTarget && tiers[0]) timeTarget.textContent = tiers[0].sec;

        select.addEventListener('change', () => {
            const sec = select.selectedOptions[0].dataset.sec;
            if (timeTarget) timeTarget.textContent = sec;
        });

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(select);
        container.dataset.initialized = '1';
    });
}

initElectrolyzerConfigs();