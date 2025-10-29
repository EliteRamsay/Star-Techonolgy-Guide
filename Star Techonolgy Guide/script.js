document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("#topnav a");
    const content = document.getElementById("content");

    // Load page dynamically
    async function loadPage(page, link) {
        try {
            const response = await fetch(page);
            const html = await response.text();
            content.innerHTML = html;

            navLinks.forEach(a => a.classList.remove("active"));
            if (link) link.classList.add("active");

            setupGuidesSidebar();
        } catch (err) {
            content.innerHTML = "<p>Error loading page: " + (err && err.message ? err.message : err) + "</p>";
            console.error(err);
        }
    }

    // Delegated handler for any links that use data-page (works for "See also" links inside loaded fragments)
    document.addEventListener('click', async function(e) {
        const link = e.target.closest('a[data-page]');
        if (!link) return;

        // If the link is part of the left-hand guides sidebar or the top navigation,
        // let the existing explicit handlers handle it (they set up proper targets and active classes).
        const inSidebar = link.closest('.guides-sidebar');
        const inTopnav = link.closest('#topnav');
        if (inSidebar || inTopnav) return;

        e.preventDefault();

        // Determine target container: if the clicked link is inside the right-hand guides content, load there;
        // otherwise load into the main #content area.
        const insideGuides = link.closest('.guides-content');
        const target = insideGuides || document.getElementById('content');

        const page = link.getAttribute('data-page');
        try {
            // encodeURI to handle spaces and special characters in the path
            const response = await fetch(encodeURI(page));
            const html = await response.text();
            target.innerHTML = html;

            // If the link was part of a submenu, update active classes (best-effort)
            if (!insideGuides) {
                const navLinks = document.querySelectorAll('#topnav a');
                navLinks.forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            } else {
                const itemLinks = document.querySelectorAll('.submenu a');
                itemLinks.forEach(a => a.classList.remove('active'));
                link.classList.add('active');
            }
        } catch (err) {
            console.error('Error loading page (delegated):', err);
            target.innerHTML = '<p>Error loading page: ' + (err && err.message ? err.message : err) + '</p>';
        }
    });

    // Topnav click
    navLinks.forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const page = link.getAttribute("data-page");
            loadPage(page, link);
        });
    });

    // Hash support
    const hash = window.location.hash.replace("#", "");
    if (hash) {
        const link = [...navLinks].find(a => a.getAttribute("href") === "#" + hash);
        if (link) loadPage(link.getAttribute("data-page"), link);
    }

    // Setup guides nested dropdowns
    function setupGuidesSidebar() {
        const toggles = document.querySelectorAll(".toggle");
        const contentArea = document.querySelector(".guides-content");
        const itemLinks = document.querySelectorAll(".submenu a");

        // Dropdown open/close
        toggles.forEach(toggle => {
            toggle.addEventListener("click", () => {
                const submenu = toggle.nextElementSibling;
                submenu.classList.toggle("open");
            });
        });

        // Load right-hand content dynamically
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
                } catch (err) {
                    contentArea.innerHTML = "<p>Error loading guide section: " + (err && err.message ? err.message : err) + "</p>";
                    console.error(err);
                }
            });
        });
    }
});
