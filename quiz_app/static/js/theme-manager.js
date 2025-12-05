/**
 * Advanced Theme Manager
 * Handles theme switching, persistence, and dynamic theme application
 * 
 * Currently supports:
 * - Academic Pro: Professional theme designed for educational management (default)
 * - Green Vibrant: Fresh, energetic green theme with modern gradients
 * - Purple Vibrant: Elegant, vibrant purple theme with royal gradients
 * - Red Vibrant: Bold, energetic red theme with vibrant gradients
 * 
 * Theme switcher allows users to switch between available themes
 */

class ThemeManager {
    constructor() {
        this.themes = {};

        // Add Academic Pro theme (default - designed for educational management)
        this.themes.academic = {
            name: 'Academic Pro',
            icon: 'bi-mortarboard',
            class: 'academic-pro-theme-page',
            dataAttribute: 'academic',
            description: 'Professional theme designed specifically for educational management'
        };

        // Add green vibrant theme
        this.themes.green = {
            name: 'Green Vibrant',
            icon: 'bi-palette-fill',
            class: 'green-theme-page',
            dataAttribute: 'green',
            description: 'Fresh, energetic green theme with modern gradients'
        };

        // Add purple vibrant theme
        this.themes.purple = {
            name: 'Purple Vibrant',
            icon: 'bi-palette2',
            class: 'purple-theme-page',
            dataAttribute: 'purple',
            description: 'Elegant, vibrant purple theme with royal gradients'
        };

        // Add red vibrant theme
        this.themes.red = {
            name: 'Red Vibrant',
            icon: 'bi-palette',
            class: 'red-theme-page',
            dataAttribute: 'red',
            description: 'Bold, energetic red theme with vibrant gradients'
        };



        this.currentTheme = null;
        this.htmlElement = document.documentElement;
        this.bodyElement = document.body;
        this.storageKey = 'preferredTheme';

        this.init();
    }

    init() {
        this.loadSavedTheme();
        this.bindEvents();
        this.updateThemeSwitcher();
        this.showContent();
    }

    loadSavedTheme() {
        var savedTheme = 'academic'; // Default to Academic Pro theme
        try {
            savedTheme = localStorage.getItem(this.storageKey) || 'academic';
            // If saved theme is 'violet' (old default), migrate to 'academic'
            if (savedTheme === 'violet') {
                savedTheme = 'academic';
            }
        } catch (e) {
            // Fallback for browsers without localStorage
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                if (cookie.indexOf(this.storageKey + '=') === 0) {
                    savedTheme = cookie.substring(this.storageKey.length + 1);
                    // Migrate 'violet' to 'academic'
                    if (savedTheme === 'violet') {
                        savedTheme = 'academic';
                    }
                    break;
                }
            }
        }
        this.applyTheme(savedTheme);
    }

    applyTheme(themeName) {
        console.log('Applying theme:', themeName);

        if (!this.themes[themeName]) {
            console.warn('Theme "' + themeName + '" not found. Falling back to academic theme.');
            themeName = 'academic';
        }

        var theme = this.themes[themeName];
        this.currentTheme = themeName;

        // Set Bootstrap theme attribute (with fallback for older browsers)
        try {
            this.htmlElement.setAttribute('data-bs-theme', theme.dataAttribute);
            console.log('Set data-bs-theme to:', theme.dataAttribute);
        } catch (e) {
            // Fallback for older browsers
            this.htmlElement.setAttribute('data-theme', theme.dataAttribute);
            console.log('Set data-theme to:', theme.dataAttribute);
        }

        // Remove all theme classes from body
        var themeValues = Object.values(this.themes);
        for (var i = 0; i < themeValues.length; i++) {
            this.bodyElement.classList.remove(themeValues[i].class);
        }

        // Add current theme class
        this.bodyElement.classList.add(theme.class);
        console.log('Added theme class:', theme.class);

        // Theme CSS is loaded statically, no dynamic loading needed

        // Save to localStorage (with fallback)
        try {
            localStorage.setItem(this.storageKey, themeName);
            console.log('Saved theme to localStorage:', themeName);
        } catch (e) {
            // Fallback for browsers without localStorage
            document.cookie = this.storageKey + '=' + themeName + '; path=/';
        }

        // Update theme switcher UI
        this.updateThemeSwitcher();

        // Dispatch custom event for other components
        this.dispatchThemeChangeEvent(themeName, theme);

        // Apply theme-specific animations
        this.applyThemeAnimations(themeName);
    }


    updateThemeSwitcher() {
        const themeButtons = document.querySelectorAll('[data-theme]');

        themeButtons.forEach(button => {
            const buttonTheme = button.getAttribute('data-theme');
            const isActive = buttonTheme === this.currentTheme;

            // Update active state
            button.classList.toggle('active', isActive);

            // Update icon color
            const icon = button.querySelector('i');
            if (icon) {
                icon.classList.toggle('text-primary', isActive);
            }

            // Add checkmark for active theme
            let checkmark = button.querySelector('.theme-checkmark');
            if (isActive && !checkmark) {
                checkmark = document.createElement('span');
                checkmark.className = 'theme-checkmark';
                checkmark.innerHTML = '✓';
                checkmark.style.cssText = `
          position: absolute;
          right: 10px;
          color: var(--bs-primary, #007bff);
          font-weight: bold;
          font-size: 0.9em;
        `;
                button.style.position = 'relative';
                button.appendChild(checkmark);
            } else if (!isActive && checkmark) {
                checkmark.remove();
            }
        });
    }

    bindEvents() {
        // Use event delegation to handle dynamically added elements
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-theme]')) {
                e.preventDefault();
                const themeButton = e.target.closest('[data-theme]');
                const theme = themeButton.getAttribute('data-theme');
                this.applyTheme(theme);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + T to cycle through themes
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.cycleTheme();
            }
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                const hasManualPreference = localStorage.getItem(this.storageKey);
                if (!hasManualPreference) {
                    this.applyTheme('academic');
                }
            });
        }
    }

    cycleTheme() {
        const themeNames = Object.keys(this.themes);
        const currentIndex = themeNames.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themeNames.length;
        this.applyTheme(themeNames[nextIndex]);
    }

    dispatchThemeChangeEvent(themeName, theme) {
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: themeName,
                themeData: theme,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    applyThemeAnimations(themeName) {
        // Add transition class for smooth theme switching
        this.bodyElement.classList.add('theme-transitioning');

        // Remove transition class after animation completes
        setTimeout(() => {
            this.bodyElement.classList.remove('theme-transitioning');
        }, 300);
    }

    // Public methods for external use
    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeData(themeName) {
        return this.themes[themeName] || null;
    }

    getAllThemes() {
        return { ...this.themes };
    }

    setTheme(themeName) {
        this.applyTheme(themeName);
    }

    // Method to add custom themes dynamically
    addTheme(name, themeData) {
        this.themes[name] = themeData;
        // Update theme switcher UI if it exists
        this.updateThemeSwitcher();
    }

    // Method to remove themes
    removeTheme(name) {
        if (name !== 'academic') { // Prevent removing the default academic theme
            delete this.themes[name];
        }
    }

    // Show content after theme is loaded to prevent flash
    showContent() {
        const appWrapper = document.querySelector('.app-wrapper');
        if (appWrapper) {
            appWrapper.classList.add('theme-loaded');
        }
    }
}

// CSS for theme transitions
const themeTransitionCSS = `
  .theme-transitioning * {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
  }
  
  .theme-transitioning {
    transition: all 0.3s ease !important;
  }
`;

// Inject transition CSS
const style = document.createElement('style');
style.textContent = themeTransitionCSS;
document.head.appendChild(style);

// Initialize theme manager immediately to prevent flash
(function () {
    // Create theme manager immediately
    window.themeManager = new ThemeManager();

    // Make it globally available
    window.switchTheme = (themeName) => {
        window.themeManager.setTheme(themeName);
    };

    // Add utility functions
    window.getCurrentTheme = () => window.themeManager.getCurrentTheme();
    window.cycleTheme = () => window.themeManager.cycleTheme();
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}

