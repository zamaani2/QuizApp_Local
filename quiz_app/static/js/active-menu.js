/**
 * Active Menu State Handler
 * Only handles active menu states - lets AdminLTE handle treeview functionality
 */

document.addEventListener('DOMContentLoaded', function () {
    setActiveMenu();
});

// Handle active menu states
function setActiveMenu() {
    const normalizePath = path => path.length > 1 ? path.replace(/\/+$/, '') : path;
    const currentPath = normalizePath(window.location.pathname);
    const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');

    // Remove active class from all links
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    });

    let activeLink = null;
    let activePathLength = -1;
    navLinks.forEach(function (link) {
        const href = link.getAttribute('href');
        if (!href || href === '#') {
            return;
        }
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) {
            return;
        }
        const linkPath = normalizePath(url.pathname);
        const isCurrentPage = currentPath === linkPath ||
            (linkPath !== '/' && currentPath.startsWith(linkPath + '/'));
        if (isCurrentPage && linkPath.length > activePathLength) {
            activeLink = link;
            activePathLength = linkPath.length;
        }
    });

    if (!activeLink) {
        return;
    }

    activeLink.classList.add('active');
    activeLink.setAttribute('aria-current', 'page');
    const parentTreeview = activeLink.closest('.nav-treeview');
    if (parentTreeview) {
        const parentNavItem = parentTreeview.closest('.nav-item');
        if (parentNavItem) {
            parentNavItem.classList.add('menu-open');
            parentTreeview.style.display = 'block';
            const parentLink = parentNavItem.querySelector(':scope > .nav-link');
            const navArrow = parentNavItem.querySelector('.nav-arrow');
            if (parentLink) {
                parentLink.setAttribute('aria-expanded', 'true');
            }
            if (navArrow) {
                navArrow.style.transform = 'rotate(90deg)';
            }
        }
    }
}

// Re-initialize when navigating
window.addEventListener('popstate', setActiveMenu);
window.addEventListener('load', setActiveMenu);
