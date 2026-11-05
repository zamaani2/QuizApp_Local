(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('app-sidebar');
    const menu = sidebar && sidebar.querySelector('.sidebar-menu');
    const backdrop = document.querySelector('.app-sidebar-backdrop');
    const toggleButton = document.querySelector('.app-sidebar-toggle');

    if (!sidebar || !menu) {
      return;
    }

    const isMobile = function () {
      return window.innerWidth < 992;
    };

    const setSidebarState = function (open) {
      const expanded = !isMobile() || open;
      sidebar.classList.toggle('is-open', expanded);
      sidebar.inert = !expanded;
      sidebar.setAttribute('aria-hidden', String(!expanded));
      document.body.classList.toggle('sidebar-open', isMobile() && expanded);
      if (toggleButton) {
        toggleButton.setAttribute('aria-expanded', String(isMobile() && expanded));
      }
    };

    const setExpanded = function (item, expanded) {
      const submenu = item.querySelector(':scope > .nav-treeview');
      const link = item.querySelector(':scope > .nav-link');
      if (!submenu || !link) {
        return;
      }

      item.classList.toggle('is-open', expanded);
      submenu.hidden = !expanded;
      link.setAttribute('aria-expanded', String(expanded));

      if (!expanded) {
        item.querySelectorAll('.nav-treeview > .nav-item.is-open').forEach(function (child) {
          setExpanded(child, false);
        });
      }
    };

    const parentItems = Array.from(menu.querySelectorAll('.nav-item')).filter(function (item) {
      return Boolean(item.querySelector(':scope > .nav-treeview'));
    });

    parentItems.forEach(function (item, index) {
      const submenu = item.querySelector(':scope > .nav-treeview');
      const link = item.querySelector(':scope > .nav-link');
      if (!submenu || !link) {
        return;
      }

      if (!submenu.id) {
        submenu.id = 'app-sidebar-submenu-' + index;
      }
      link.setAttribute('aria-controls', submenu.id);
      setExpanded(item, false);
    });

    const normalizePath = function (path) {
      const normalized = path.replace(/\/+$/, '');
      return normalized || '/';
    };
    const currentPath = normalizePath(window.location.pathname);
    const candidates = [];

    menu.querySelectorAll('.nav-link').forEach(function (link) {
      const href = link.getAttribute('href');
      if (!href || href === '#') {
        return;
      }

      const target = new URL(href, window.location.origin);
      if (target.origin !== window.location.origin) {
        return;
      }

      const targetPath = normalizePath(target.pathname);
      const exact = targetPath === currentPath;
      const prefix = targetPath !== '/' && currentPath.startsWith(targetPath + '/');
      if (exact || prefix) {
        candidates.push({ link: link, path: targetPath, exact: exact });
      }
    });

    candidates.sort(function (a, b) {
      if (a.exact !== b.exact) {
        return a.exact ? -1 : 1;
      }
      return b.path.length - a.path.length;
    });

    const activeLink = candidates.length ? candidates[0].link : null;
    if (activeLink) {
      activeLink.classList.add('active');
      activeLink.setAttribute('aria-current', 'page');

      let submenu = activeLink.closest('.nav-treeview');
      while (submenu) {
        const parentItem = submenu.closest('.nav-item');
        if (!parentItem) {
          break;
        }
        setExpanded(parentItem, true);
        submenu = parentItem.parentElement.closest('.nav-treeview');
      }
    }

    parentItems.forEach(function (item) {
      const link = item.querySelector(':scope > .nav-link');
      const submenu = item.querySelector(':scope > .nav-treeview');

      link.addEventListener('click', function (event) {
        event.preventDefault();
        const shouldExpand = !item.classList.contains('is-open');
        if (shouldExpand) {
          Array.from(item.parentElement.children).forEach(function (sibling) {
            if (sibling !== item && sibling.classList.contains('nav-item')) {
              setExpanded(sibling, false);
            }
          });
        }
        setExpanded(item, shouldExpand);
      });

      link.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          setExpanded(item, true);
          const firstLink = submenu.querySelector('.nav-link');
          if (firstLink) {
            firstLink.focus();
          }
        } else if (event.key === 'ArrowLeft' && item.classList.contains('is-open')) {
          event.preventDefault();
          setExpanded(item, false);
        }
      });
    });

    if (toggleButton) {
      toggleButton.addEventListener('click', function () {
        setSidebarState(!sidebar.classList.contains('is-open'));
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setSidebarState(false);
      });
    }

    sidebar.addEventListener('click', function (event) {
      const link = event.target.closest('.nav-link');
      if (link && link.getAttribute('href') !== '#' && isMobile()) {
        setSidebarState(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isMobile() && sidebar.classList.contains('is-open')) {
        setSidebarState(false);
        if (toggleButton) {
          toggleButton.focus();
        }
      }
    });

    let mobileLayout = isMobile();
    window.addEventListener('resize', function () {
      const nextMobileLayout = isMobile();
      if (nextMobileLayout !== mobileLayout) {
        mobileLayout = nextMobileLayout;
        setSidebarState(!mobileLayout);
      }
    });

    setSidebarState(!isMobile());
  });
})();
