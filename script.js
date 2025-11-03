document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("#topnav a");
    const content = document.getElementById("content");
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchPage = document.getElementById('search-page');
    const searchResultsContainer = document.getElementById('search-results-container');
    const mainContent = document.getElementById('content');

    // Auto-generate search index from navigation
    function generateSearchIndex() {
        const index = [];
        
        // Get all navigation links with data-page attributes
        const allNavLinks = document.querySelectorAll('a[data-page]');
        
        allNavLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            const title = link.textContent.trim();
            
            // Determine the path based on the link's location in the DOM
            let path = '';
            
            if (link.closest('#topnav')) {
                path = 'Main Navigation';
            } else if (link.closest('.guides-sidebar')) {
                // Build path from parent elements
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

    // Search function
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

    // Display search results in dropdown
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

    // Display search results on search page
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

    // Navigate to a search result
    function navigateToResult(result) {
        // Hide search page and results dropdown
        searchPage.style.display = 'none';
        searchResults.style.display = 'none';
        mainContent.style.display = 'block';
        
        // Clear search input
        searchInput.value = '';
        
        // Load the page using your existing navigation system
        loadPage(result.url);
    }

    // Event listeners for search
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
                    // Show search page with all results
                    const results = performSearch(query);
                    if (mainContent) mainContent.style.display = 'none';
                    if (searchPage) searchPage.style.display = 'block';
                    displaySearchPageResults(results, query);
                }
            }
        });
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (searchInput && searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    // Load page dynamically
    async function loadPage(page, link) {
        try {
            const response = await fetch(page);
            const html = await response.text();
            content.innerHTML = html;

            // Update active state
            navLinks.forEach(a => a.classList.remove("active"));
            if (link) link.classList.add("active");

            // Reinitialize any dynamic content
            if (page.includes('guides.html')) {
                setupGuidesSidebar();
            }
            
            // Initialize electrolyzer controls
            initElectrolyzerConfigs();
        } catch (err) {
            content.innerHTML = "<p>Error loading page: " + (err && err.message ? err.message : err) + "</p>";
            console.error(err);
        }
    }

    // Topnav click - Fixed to prevent default and use data-page
    navLinks.forEach(link => {
        if (link.getAttribute('data-page')) {
            link.addEventListener("click", e => {
                e.preventDefault();
                const page = link.getAttribute("data-page");
                loadPage(page, link);
            });
        }
    });

    // Setup guides nested dropdowns
    function setupGuidesSidebar() {
        const toggles = document.querySelectorAll(".toggle");
        const contentArea = document.querySelector(".guides-content");
        const itemLinks = document.querySelectorAll(".submenu a");

        // Dropdown open/close
        toggles.forEach(toggle => {
            toggle.addEventListener("click", () => {
                const submenu = toggle.nextElementSibling;
                if (submenu) {
                    submenu.classList.toggle("open");
                }
            });
        });

        // Load right-hand content dynamically
        if (itemLinks.length > 0 && contentArea) {
            itemLinks.forEach(link => {
                link.addEventListener("click", async e => {
                    e.preventDefault();
                    const page = link.getAttribute("data-page");
                    try {
                        const response = await fetch(page);
                        const html = await response.text();
                        contentArea.innerHTML = html;
                        itemLinks.forEach(a => a.classList.remove("active"));
                        link.classList.add("active");
                        initElectrolyzerConfigs();
                    } catch (err) {
                        contentArea.innerHTML = "<p>Error loading guide section: " + (err && err.message ? err.message : err) + "</p>";
                        console.error(err);
                    }
                });
            });
        }
    }

    // Initialize the page
    setupGuidesSidebar();
});

// Initialize electrolyte/electrolyzer controls for recipes.
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

        // build select (show only tier label — time is displayed by the surrounding markup)
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

        // find a nearby time target (prefer within the same paragraph)
        let timeTarget = null;
        const para = container.closest('p');
        if (para) timeTarget = para.querySelector('.electrolyzer-time');
        // fallback: search document
        if (!timeTarget) timeTarget = document.querySelector('.electrolyzer-time');

        // set initial time if target exists
        if (timeTarget && tiers[0]) timeTarget.textContent = tiers[0].sec;

        select.addEventListener('change', () => {
            const sec = select.selectedOptions[0].dataset.sec;
            if (timeTarget) timeTarget.textContent = sec;
        });

        // Clear existing content but preserve data attributes
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(select);

        container.dataset.initialized = '1';
    });
}

// initialize any controls in the static content at page load
initElectrolyzerConfigs();