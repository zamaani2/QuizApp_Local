/**
 * Sidebar Menu Treeview Handler
 * Handles expansion and collapse of sidebar menu items
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize AdminLTE sidebar menu
    if (typeof AdminLTE !== 'undefined') {
        // AdminLTE should auto-initialize, but we ensure it's ready
        const sidebar = document.querySelector('.sidebar-menu');
        if (sidebar) {
            // Wait a bit for AdminLTE to initialize
            setTimeout(function () {
                initializeMenuTreeview();
            }, 100);
        }
    } else {
        // Fallback: Manual initialization if AdminLTE is not available
        initializeMenuTreeview();
    }
});

function initializeMenuTreeview() {
    // Get all menu items with treeview children
    const menuItems = document.querySelectorAll('.sidebar-menu .nav-item');

    menuItems.forEach(function (item) {
        const navLink = item.querySelector('.nav-link');
        const treeview = item.querySelector('.nav-treeview');
        const arrow = item.querySelector('.nav-arrow');

        // Only process items that have a treeview
        if (navLink && treeview && arrow) {
            // Initially hide the treeview
            if (!item.classList.contains('menu-open')) {
                treeview.style.display = 'none';
            }

            // Add click handler to the nav link
            navLink.addEventListener('click', function (e) {
                // Prevent default if it's a hash link
                if (navLink.getAttribute('href') === '#') {
                    e.preventDefault();
                }

                // Toggle menu-open class
                const isOpen = item.classList.contains('menu-open');

                if (isOpen) {
                    // Close the menu
                    item.classList.remove('menu-open');
                    treeview.style.display = 'none';
                    arrow.style.transform = 'rotate(0deg)';
                } else {
                    // Open the menu
                    item.classList.add('menu-open');
                    treeview.style.display = 'block';
                    arrow.style.transform = 'rotate(90deg)';

                    // If accordion mode is enabled, close other open menus
                    const sidebar = document.querySelector('.sidebar-menu');
                    if (sidebar && sidebar.getAttribute('data-accordion') === 'true') {
                        const openMenus = sidebar.querySelectorAll('.nav-item.menu-open');
                        openMenus.forEach(function (openMenu) {
                            if (openMenu !== item) {
                                openMenu.classList.remove('menu-open');
                                const openTreeview = openMenu.querySelector('.nav-treeview');
                                const openArrow = openMenu.querySelector('.nav-arrow');
                                if (openTreeview) {
                                    openTreeview.style.display = 'none';
                                }
                                if (openArrow) {
                                    openArrow.style.transform = 'rotate(0deg)';
                                }
                            }
                        });
                    }
                }
            });

            // Set initial arrow rotation if menu is open
            if (item.classList.contains('menu-open')) {
                arrow.style.transform = 'rotate(90deg)';
                treeview.style.display = 'block';
            } else {
                arrow.style.transform = 'rotate(0deg)';
            }

            // Add transition for smooth rotation
            arrow.style.transition = 'transform 0.3s ease';
        }
    });
}

