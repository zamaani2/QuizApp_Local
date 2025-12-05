/**
 * Active Menu State Handler
 * Only handles active menu states - lets AdminLTE handle treeview functionality
 */

document.addEventListener('DOMContentLoaded', function () {
    // Wait for AdminLTE to initialize
    setTimeout(function () {
        setActiveMenu();
    }, 1000);
});

// Handle active menu states
function setActiveMenu() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');

    // Remove active class from all links
    navLinks.forEach(link => link.classList.remove('active'));

    // Find and activate current page menu item
    navLinks.forEach(function (link) {
        const href = link.getAttribute('href');
        if (href && href !== '#' && currentPath.includes(href)) {
            // Add active class to current link
            link.classList.add('active');

            // Open parent menu if this is a submenu item
            const parentTreeview = link.closest('.nav-treeview');
            if (parentTreeview) {
                const parentNavItem = parentTreeview.closest('.nav-item');
                if (parentNavItem) {
                    parentNavItem.classList.add('menu-open');
                    // Also ensure the arrow is rotated
                    const navArrow = parentNavItem.querySelector('.nav-arrow');
                    if (navArrow) {
                        navArrow.style.transform = 'rotate(90deg)';
                    }
                }
            }
        }
    });
}

// Re-initialize when navigating
window.addEventListener('popstate', setActiveMenu);
window.addEventListener('load', setActiveMenu);
