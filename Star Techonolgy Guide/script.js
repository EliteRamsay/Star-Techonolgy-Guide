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
