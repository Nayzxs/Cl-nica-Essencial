const menuButton = document.querySelector(".menu-button");
const menuLinks = document.querySelector(".menu-links");

if (menuButton && menuLinks) {
    menuButton.addEventListener("click", (event) => {
        event.stopPropagation();

        const isOpen = menuLinks.classList.toggle("open");
        menuButton.setAttribute("aria-expanded", isOpen);
        menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });

    menuLinks.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            menuLinks.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Abrir menu");
        }
    });

    document.addEventListener("click", (event) => {
        if (!menuLinks.contains(event.target) && !menuButton.contains(event.target)) {
            menuLinks.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Abrir menu");
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 650) {
            menuLinks.classList.remove("open");
            menuButton.setAttribute("aria-expanded", "false");
            menuButton.setAttribute("aria-label", "Abrir menu");
        }
    });
}
