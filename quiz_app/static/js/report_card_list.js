/**
 * Report Card List Management JavaScript
 * Handles all report card list functionality including filtering, bulk operations, and dynamic dropdowns
 */

document.addEventListener('DOMContentLoaded', function () {
    // Enable debug mode - set this to false in production
    const DEBUG = true;

    // Better console logging function that only logs in debug mode
    function debugLog(message, data) {
        if (DEBUG) {
            if (data !== undefined) {
                console.log(`[DEBUG] ${message}:`, data);
            } else {
                console.log(`[DEBUG] ${message}`);
            }
        }
    }

    // Log errors regardless of debug setting
    function errorLog(message, error) {
        console.error(`[ERROR] ${message}:`, error);
    }

    // Check browser compatibility for AJAX requests
    function checkBrowserCompatibility() {
        const browserInfo = {
            userAgent: navigator.userAgent,
            vendor: navigator.vendor,
            platform: navigator.platform,
            appVersion: navigator.appVersion,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            online: navigator.onLine,
            hasXMLHttpRequest: typeof XMLHttpRequest !== 'undefined',
            hasFormData: typeof FormData !== 'undefined',
            hasJSON: typeof JSON !== 'undefined',
            hasPromise: typeof Promise !== 'undefined',
            hasLocalStorage: (function () {
                try {
                    return 'localStorage' in window && window['localStorage'] !== null;
                } catch (e) {
                    return false;
                }
            })(),
            hasSessionStorage: (function () {
                try {
                    return 'sessionStorage' in window && window['sessionStorage'] !== null;
                } catch (e) {
                    return false;
                }
            })(),
            hasFetch: typeof fetch !== 'undefined',
            hasJQuery: typeof $ !== 'undefined' && typeof $.ajax === 'function'
        };

        debugLog('Browser compatibility info:', browserInfo);

        // Check if any critical capabilities are missing
        const missingFeatures = [];
        if (!browserInfo.hasXMLHttpRequest) missingFeatures.push('XMLHttpRequest');
        if (!browserInfo.hasJSON) missingFeatures.push('JSON');
        if (!browserInfo.hasJQuery) missingFeatures.push('jQuery');

        // Add warning if critical features are missing
        if (missingFeatures.length > 0) {
            setTimeout(function () {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'alert alert-warning mt-3';
                warningDiv.innerHTML = `
                    <strong>Browser Compatibility Warning:</strong> 
                    Your browser may be missing features required for this page to work correctly.
                    Missing: ${missingFeatures.join(', ')}
                `;

                const cardBody = document.querySelector('.card-body');
                if (cardBody) {
                    cardBody.insertBefore(warningDiv, cardBody.firstChild);
                }

                errorLog('Browser compatibility issues detected:', missingFeatures);
            }, 500);
        }

        return browserInfo;
    }

    debugLog("DOM fully loaded");
    checkBrowserCompatibility();

    // Important: Add a small delay to ensure all scripts are properly loaded
    setTimeout(function () {
        // Initialize filter form with current values
        initializeFilterForm();

        // FIXED: Check and correct academic year and term option display
        checkAndFixDropdownOptions();

        // Initialize UI components
        initializeSelect2();

        // Fix for class parameter in URL
        fixClassParameter();

        // Apply initial filtering based on URL parameters
        applyInitialFiltering();

        debugLog("All initialization complete");

        // Function to apply initial filtering based on URL parameters
        function applyInitialFiltering() {
            // Get URL parameters
            const urlParams = new URLSearchParams(window.location.search);

            // Check if academic year is in the URL
            const academicYearParam = urlParams.get('academic_year');

            if (academicYearParam) {
                debugLog(`Found academic_year parameter in URL: ${academicYearParam}`);

                // Ensure the academic year dropdown has this value selected
                const academicYearSelect = document.getElementById('academic_year');
                if (academicYearSelect && academicYearSelect.value === academicYearParam) {
                    debugLog(`Academic year ${academicYearParam} already selected in dropdown`);

                    // Force term filtering
                    debugLog(`Forcing term filtering for academic year: ${academicYearParam}`);
                    serverSideFilterTermsByAcademicYear(academicYearParam);
                }
            } else {
                // If there's a selected academic year but no URL parameter, still filter
                const academicYearSelect = document.getElementById('academic_year');
                if (academicYearSelect && academicYearSelect.value) {
                    debugLog(`No academic_year in URL, but dropdown has value: ${academicYearSelect.value}`);
                    debugLog(`Forcing term filtering for selected academic year: ${academicYearSelect.value}`);
                    serverSideFilterTermsByAcademicYear(academicYearSelect.value);
                }
            }
        }

        // Initialize components in the correct order
        setupCheckboxes();
        setupBulkActions();
        setupIndividualActions();
        setupDynamicFilters();
        setupResetFilters();
        setupTableSearch();
        setupFilterForm();

        // Add handler for the test term filter button
        setupTestTermFilter();

        // Add handler for the manual term filter button
        setupManualTermFilter();

        // Add handler for the test bulk actions button
        setupTestBulkActions();

        // Initialize dropdowns after other components
        initializeDropdowns();

        // Initialize DataTable after dropdowns
        initializeDataTable();

        // Fix dropdown positioning and visibility issues
        fixDropdownPositioning();

        // Initial state update
        updateSelectedCount();

        // Fix for class parameter in URL
        fixClassParameter();

        debugLog("All initialization complete");

        // Add handler for the test term filter button
        function setupTestTermFilter() {
            const testBtn = document.getElementById('testTermFilterBtn');
            if (testBtn) {
                testBtn.addEventListener('click', function () {
                    const academicYearSelect = document.getElementById('academic_year');
                    const selectedYear = academicYearSelect ? academicYearSelect.value : '';

                    debugLog("Test button clicked - selected year:", selectedYear);

                    // Add a visual indicator that the test is running
                    Swal.fire({
                        title: 'Testing Term Filter',
                        text: selectedYear ? `Fetching terms for academic year ID: ${selectedYear}` : 'Fetching all terms (no academic year selected)',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    // Prepare the URL and request data similar to the production code
                    const apiUrl = window.getTermsByAcademicYearUrl || '/reports/get-terms-by-academic-year/';

                    // Add URL parameters directly in the URL instead of data object for GET request
                    // This avoids potential issues with parameter encoding
                    let requestUrl = apiUrl;
                    if (selectedYear) {
                        // Add ? if it's the first parameter, otherwise &
                        const separator = requestUrl.includes('?') ? '&' : '?';
                        requestUrl += `${separator}academic_year_id=${encodeURIComponent(selectedYear)}`;
                        debugLog(`Making test AJAX call for academic year ${selectedYear} to URL:`, requestUrl);
                    } else {
                        debugLog(`Making test AJAX call for ALL terms (no academic year filter) to URL:`, requestUrl);
                    }

                    // Create a direct AJAX call to test the endpoint
                    $.ajax({
                        url: requestUrl,
                        method: 'GET',
                        beforeSend: function (xhr) {
                            debugLog("Making direct test AJAX call to:", requestUrl);
                            // Add custom header to potentially bypass caching
                            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                        },
                        success: function (data) {
                            debugLog("Test AJAX call successful:", data);

                            let termsCount = data.terms ? data.terms.length : 0;
                            let title = selectedYear
                                ? `Found ${termsCount} Terms for Academic Year ID: ${selectedYear}`
                                : `Found ${termsCount} Terms (All Years)`;

                            let noteText = '';
                            if (data.note) {
                                noteText = `<div class="alert alert-info my-3"><strong>Note from server:</strong> ${data.note}</div>`;
                            }

                            // Show success message with data info
                            Swal.fire({
                                title: title,
                                html: `
                                    ${noteText}
                                    <pre style="text-align:left;max-height:300px;overflow:auto;">${JSON.stringify(data, null, 2)}</pre>
                                `,
                                icon: 'success'
                            });

                            // Show the filtered terms in the dropdown
                            serverSideFilterTermsByAcademicYear(selectedYear);
                        },
                        error: function (xhr, status, error) {
                            errorLog("Test AJAX call error:", error);
                            errorLog("Error details:", {
                                status: status,
                                statusCode: xhr.status,
                                statusText: xhr.statusText,
                                responseText: xhr.responseText,
                                url: requestUrl
                            });

                            let errorDetails = `Status Code: ${xhr.status}\nStatus: ${status}\nError: ${error}`;
                            let responseContent = "No response received";

                            try {
                                // Try to parse error response
                                if (xhr.responseText) {
                                    const errorJson = JSON.parse(xhr.responseText);
                                    errorLog("Parsed error response:", errorJson);
                                    responseContent = JSON.stringify(errorJson, null, 2);
                                } else {
                                    responseContent = "Empty response";
                                }
                            } catch (e) {
                                errorLog("Could not parse error response as JSON:", e);
                                responseContent = xhr.responseText || "Empty or invalid JSON response";
                            }

                            errorDetails += `\n\nResponse:\n${responseContent}`;

                            // Show error message
                            Swal.fire({
                                title: 'AJAX Test Failed',
                                html: `<div class="alert alert-danger">
                                    <p><strong>The request failed, but this gives us important debugging information:</strong></p>
                                    <ol>
                                        <li>Check the server logs for detailed error messages</li>
                                        <li>Verify that the academic_year_id parameter is being sent correctly</li>
                                        <li>Check that the selected academic year (${selectedYear || 'None'}) exists in the database</li>
                                    </ol>
                                </div>
                                <pre style="text-align:left;max-height:300px;overflow:auto;">${errorDetails}</pre>`,
                                icon: 'error',
                                width: 800
                            });
                        }
                    });
                });
            }
        }

        // Add handler for the manual term filter button
        function setupManualTermFilter() {
            const manualBtn = document.getElementById('manualTermFilterBtn');
            if (manualBtn) {
                manualBtn.addEventListener('click', function () {
                    const academicYearSelect = document.getElementById('academic_year');
                    const selectedYear = academicYearSelect ? academicYearSelect.value : '';

                    debugLog("Manual filter button clicked - selected year:", selectedYear);

                    // Directly call the filter function without any alerts
                    serverSideFilterTermsByAcademicYear(selectedYear);

                    // Show a small toast notification
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: selectedYear ?
                            `Filtering terms for year ID: ${selectedYear}` :
                            'Showing all terms',
                        showConfirmButton: false,
                        timer: 2000
                    });
                });
            }
        }

        // Add handler for the test bulk actions button
        function setupTestBulkActions() {
            const testBtn = document.getElementById('testBulkActionsBtn');
            if (testBtn) {
                testBtn.addEventListener('click', function () {
                    debugLog("Test bulk actions button clicked");

                    // First, select some checkboxes to enable the bulk actions button
                    const checkboxes = document.querySelectorAll('.report-card-checkbox');
                    if (checkboxes.length > 0) {
                        // Select the first few checkboxes
                        for (let i = 0; i < Math.min(2, checkboxes.length); i++) {
                            checkboxes[i].checked = true;
                        }
                        updateSelectedCount();

                        // Now test the bulk actions dropdown
                        const bulkActionsBtn = document.querySelector('#bulkActionsDropdownToggle');
                        if (bulkActionsBtn) {
                            debugLog("Testing bulk actions dropdown programmatically");

                            // Simulate a click on the bulk actions button
                            bulkActionsBtn.click();

                            // Check if the dropdown opened
                            const dropdownMenu = document.querySelector('#bulkActionsDropdown .dropdown-menu');
                            if (dropdownMenu) {
                                setTimeout(() => {
                                    const isOpen = dropdownMenu.classList.contains('show');
                                    debugLog("Bulk actions dropdown is open:", isOpen);

                                    if (isOpen) {
                                        Swal.fire({
                                            title: 'Bulk Actions Test',
                                            text: 'Bulk actions dropdown opened successfully!',
                                            icon: 'success',
                                            timer: 2000
                                        });
                                    } else {
                                        Swal.fire({
                                            title: 'Bulk Actions Test',
                                            text: 'Bulk actions dropdown failed to open. Check console for details.',
                                            icon: 'error',
                                            timer: 3000
                                        });
                                    }
                                }, 100);
                            }
                        } else {
                            Swal.fire({
                                title: 'Bulk Actions Test',
                                text: 'Bulk actions button not found!',
                                icon: 'error'
                            });
                        }
                    } else {
                        Swal.fire({
                            title: 'Bulk Actions Test',
                            text: 'No report cards found to test with!',
                            icon: 'warning'
                        });
                    }
                });
            }
        }

        // Debug button click handler
        $("#debugBtn").on("click", function (e) {
            e.preventDefault();
            debugLog("Debug button clicked");

            // Test dropdown functionality
            testDropdownFunctionality();

            // Get DOM state
            const academicYearSelect = document.getElementById('academic_year');
            const termSelect = document.getElementById('term');
            const classSelect = document.getElementById('class');

            const academicYearValue = academicYearSelect ? academicYearSelect.value : "N/A";
            const termValue = termSelect ? termSelect.value : "N/A";
            const classValue = classSelect ? classSelect.value : "N/A";

            const academicYearText = academicYearSelect ?
                academicYearSelect.options[academicYearSelect.selectedIndex]?.text || "None" : "N/A";
            const termText = termSelect ?
                termSelect.options[termSelect.selectedIndex]?.text || "None" : "N/A";
            const classText = classSelect ?
                classSelect.options[classSelect.selectedIndex]?.text || "None" : "N/A";

            // Get Select2 status
            const select2Status = {
                academicYear: {
                    initialized: !!(academicYearSelect && $(academicYearSelect).data('select2')),
                    options: academicYearSelect ? Array.from(academicYearSelect.options).map(o => ({ value: o.value, text: o.text })) : []
                },
                term: {
                    initialized: !!(termSelect && $(termSelect).data('select2')),
                    options: termSelect ? Array.from(termSelect.options).map(o => ({ value: o.value, text: o.text })) : [],
                    visibleOptions: termSelect ? Array.from(termSelect.options).filter(o => o.style.display !== 'none').length : 0
                },
                class: {
                    initialized: !!(classSelect && $(classSelect).data('select2')),
                    options: classSelect ? Array.from(classSelect.options).map(o => ({ value: o.value, text: o.text })) : []
                }
            };

            // Get network status info
            const networkInfo = {
                online: navigator.onLine,
                readyState: document.readyState
            };

            // Build debug info
            let debugInfo = "=== FORM STATE ===\n";
            debugInfo += `Academic Year: ${academicYearText} (ID: ${academicYearValue})\n`;
            debugInfo += `Term: ${termText} (ID: ${termValue})\n`;
            debugInfo += `Class: ${classText} (ID: ${classValue})\n\n`;

            debugInfo += "=== DROPDOWN STATE ===\n";
            debugInfo += `Academic Year Dropdown Enabled: ${!academicYearSelect?.disabled}\n`;
            debugInfo += `Term Dropdown Enabled: ${!termSelect?.disabled}\n`;
            debugInfo += `Class Dropdown Enabled: ${!classSelect?.disabled}\n\n`;

            debugInfo += "=== SELECT2 INFO ===\n";
            debugInfo += `Academic Year Select2 Initialized: ${!!select2Status.academicYear.initialized}\n`;
            debugInfo += `Term Select2 Initialized: ${!!select2Status.term.initialized}\n`;
            debugInfo += `Class Select2 Initialized: ${!!select2Status.class.initialized}\n\n`;

            debugInfo += "=== DATA STATS ===\n";
            debugInfo += `Academic Year Options Count: ${select2Status.academicYear.options.length}\n`;
            debugInfo += `Term Options Count: ${select2Status.term.options.length}\n`;
            debugInfo += `Term Visible Options Count: ${select2Status.term.visibleOptions}\n`;
            debugInfo += `Class Options Count: ${select2Status.class.options.length}\n\n`;

            debugInfo += "=== URL PARAMETERS ===\n";
            const urlParams = new URLSearchParams(window.location.search);
            for (const [key, value] of urlParams.entries()) {
                debugInfo += `${key}: ${value}\n`;
            }

            debugInfo += "\n=== NETWORK STATUS ===\n";
            debugInfo += `Online: ${networkInfo.online}\n`;
            debugInfo += `Document Ready State: ${networkInfo.readyState}\n`;

            // Show debug info in modal
            Swal.fire({
                title: "Debug Information",
                html: `<pre style="text-align:left;font-size:12px;">${debugInfo}</pre>`,
                width: 800,
                confirmButtonText: "Close"
            });

            // Log to console as well
            debugLog("Full debug information", {
                formState: {
                    academicYear: {
                        text: academicYearText,
                        id: academicYearValue
                    },
                    term: {
                        text: termText,
                        id: termValue
                    },
                    class: {
                        text: classText,
                        id: classValue
                    }
                },
                dropdownState: {
                    academicYearEnabled: !academicYearSelect?.disabled,
                    termEnabled: !termSelect?.disabled,
                    classEnabled: !classSelect?.disabled
                },
                select2Status,
                networkInfo,
                urlParams: Object.fromEntries(urlParams.entries())
            });
        });
    }, 100);

    // ---- Functions ----

    // FIXED: Check and fix display issues with academic year and term dropdowns
    function checkAndFixDropdownOptions() {
        // Fix academic year display if needed
        const academicYearSelect = document.getElementById('academic_year');
        if (academicYearSelect) {
            const options = academicYearSelect.querySelectorAll('option');
            options.forEach(function (option) {
                // If the option text is the same as its value (likely just a number), 
                // we need to fetch and display the proper academic year name
                if (option.value && option.textContent.trim() === option.value && !isNaN(option.value)) {
                    // Make an AJAX request to get the actual academic year name
                    fetchAcademicYearInfo(option.value, function (yearName) {
                        if (yearName) {
                            option.textContent = yearName;
                        }
                    });
                }
            });
        }

        // Fix term display if needed
        const termSelect = document.getElementById('term');
        if (termSelect) {
            const options = termSelect.querySelectorAll('option');
            options.forEach(function (option) {
                if (option.value && option.textContent.includes('-')) {
                    // Extract the term part and academic year part
                    const parts = option.textContent.split('-');
                    if (parts.length === 2) {
                        const termPart = parts[0].trim();
                        const yearPart = parts[1].trim();

                        // Check if term part is missing actual term information
                        if (!termPart || termPart === "") {
                            // Try to find term info from the option value
                            const termId = option.value;
                            // We can't directly access term info by ID here, 
                            // but we'll ensure the template has proper term info
                            option.textContent = `Term ${termId} - ${yearPart}`;
                        }
                    }
                }
            });
        }
    }

    // Function to fetch academic year information by ID
    function fetchAcademicYearInfo(academicYearId, callback) {
        // Use a simple cache to avoid repeated requests for the same year
        if (!window.academicYearCache) {
            window.academicYearCache = {};
        }

        // If we already have this year in cache, use it
        if (window.academicYearCache[academicYearId]) {
            callback(window.academicYearCache[academicYearId]);
            return;
        }

        // Otherwise fetch it from the server
        fetch(`/api/get-academic-year-info/${academicYearId}/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.name) {
                    // Cache the result
                    window.academicYearCache[academicYearId] = data.name;
                    // Return it via callback
                    callback(data.name);
                } else {
                    throw new Error('Invalid response format');
                }
            })
            .catch(error => {
                console.error('Error fetching academic year info:', error);
                // If there's an error, use a fallback format (e.g., "AY 2023-2024")
                const fallbackName = `Academic Year ${academicYearId}`;
                window.academicYearCache[academicYearId] = fallbackName;
                callback(fallbackName);
            });
    }

    // FIXED: Initialize all dropdowns in the document
    function initializeDropdowns() {
        console.log("Initializing dropdowns");

        // Check if Bootstrap is available
        if (typeof bootstrap === 'undefined') {
            console.warn("Bootstrap not available, using fallback dropdown handling");
            setupFallbackDropdowns();
            return;
        }

        // Initialize all dropdowns using Bootstrap's API
        var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
        dropdownElementList.forEach(function (dropdownToggleEl) {
            try {
                // Dispose existing instance first
                const existingInstance = bootstrap.Dropdown.getInstance(dropdownToggleEl);
                if (existingInstance) {
                    existingInstance.dispose();
                }

                new bootstrap.Dropdown(dropdownToggleEl, {
                    popperConfig: {
                        strategy: 'fixed', // Fixed positioning strategy
                        modifiers: [
                            {
                                name: 'preventOverflow',
                                options: {
                                    boundary: document.body, // Use body as boundary
                                }
                            }
                        ]
                    }
                });
                console.log("Initialized dropdown:", dropdownToggleEl.id || 'unnamed dropdown');
            } catch (e) {
                console.error("Error initializing dropdown:", e);
                // Fallback to manual handling
                setupManualDropdown(dropdownToggleEl);
            }
        });

        // Add click event listener to all action dropdowns to ensure they open
        document.querySelectorAll('.action-dropdown .dropdown-toggle').forEach(function (button) {
            // Remove existing listeners to prevent duplicates
            button.removeEventListener('click', handleActionDropdownClick);
            button.addEventListener('click', handleActionDropdownClick);
        });

        // Close dropdowns when clicking outside
        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);
    }

    // Fallback dropdown handling when Bootstrap is not available
    function setupFallbackDropdowns() {
        console.log("Setting up fallback dropdown handling");

        document.querySelectorAll('.dropdown-toggle').forEach(function (button) {
            setupManualDropdown(button);
        });

        // Close dropdowns when clicking outside
        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);
    }

    // Manual dropdown setup
    function setupManualDropdown(button) {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const dropdownMenu = this.nextElementSibling;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                // Close all other dropdowns
                document.querySelectorAll('.dropdown-menu.show').forEach(function (menu) {
                    if (menu !== dropdownMenu) {
                        menu.classList.remove('show');
                        const toggle = menu.previousElementSibling;
                        if (toggle && toggle.classList.contains('dropdown-toggle')) {
                            toggle.setAttribute('aria-expanded', 'false');
                        }
                    }
                });

                // Toggle this dropdown
                dropdownMenu.classList.toggle('show');
                this.setAttribute('aria-expanded', dropdownMenu.classList.contains('show'));
            }
        });
    }

    // Separate function for action dropdown click handling
    function handleActionDropdownClick(e) {
        e.stopPropagation();

        // Close all other open dropdowns first
        document.querySelectorAll('.dropdown-menu.show').forEach(function (menu) {
            if (!menu.closest('.action-dropdown').contains(this)) {
                menu.classList.remove('show');
            }
        }.bind(this));

        // Toggle this dropdown
        const dropdownMenu = this.nextElementSibling;
        if (dropdownMenu) {
            dropdownMenu.classList.toggle('show');
            this.setAttribute('aria-expanded', dropdownMenu.classList.contains('show'));
        }
    }

    // Separate function for outside click handling
    function handleOutsideClick(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(function (menu) {
                menu.classList.remove('show');
                const toggle = menu.previousElementSibling;
                if (toggle && toggle.classList.contains('dropdown-toggle')) {
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }

    // Separate function for bulk actions dropdown click handling
    function handleBulkActionsClick(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Bulk actions dropdown button clicked");

        if (this.disabled) {
            console.log("Button is disabled, preventing dropdown");
            return false;
        }

        const dropdownMenu = document.querySelector('#bulkActionsDropdown .dropdown-menu');
        if (dropdownMenu) {
            // Close all other dropdowns first
            document.querySelectorAll('.dropdown-menu.show').forEach(function (menu) {
                if (menu !== dropdownMenu) {
                    menu.classList.remove('show');
                    const toggle = menu.previousElementSibling;
                    if (toggle && toggle.classList.contains('dropdown-toggle')) {
                        toggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            // Toggle this dropdown
            dropdownMenu.classList.toggle('show');
            this.setAttribute('aria-expanded', dropdownMenu.classList.contains('show'));

            console.log("Bulk actions dropdown toggled:", dropdownMenu.classList.contains('show'));
        }
    }

    // Test dropdown functionality
    function testDropdownFunctionality() {
        console.log("=== DROPDOWN FUNCTIONALITY TEST ===");

        // Test bulk actions dropdown
        const bulkActionsBtn = document.querySelector('#bulkActionsDropdownToggle');
        const bulkActionsMenu = document.querySelector('#bulkActionsDropdown .dropdown-menu');

        console.log("Bulk Actions Button:", bulkActionsBtn);
        console.log("Bulk Actions Menu:", bulkActionsMenu);
        console.log("Bulk Actions Button Disabled:", bulkActionsBtn ? bulkActionsBtn.disabled : 'N/A');
        console.log("Bulk Actions Menu Visible:", bulkActionsMenu ? bulkActionsMenu.classList.contains('show') : 'N/A');

        // Test action dropdowns
        const actionDropdowns = document.querySelectorAll('.action-dropdown');
        console.log("Action Dropdowns Found:", actionDropdowns.length);

        actionDropdowns.forEach((dropdown, index) => {
            const button = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            console.log(`Action Dropdown ${index + 1}:`, {
                button: button,
                menu: menu,
                buttonDisabled: button ? button.disabled : 'N/A',
                menuVisible: menu ? menu.classList.contains('show') : 'N/A'
            });
        });

        // Test Bootstrap availability
        console.log("Bootstrap Available:", typeof bootstrap !== 'undefined');
        if (typeof bootstrap !== 'undefined') {
            console.log("Bootstrap Version:", bootstrap.Dropdown.VERSION || 'Unknown');
        }

        // Test jQuery availability
        console.log("jQuery Available:", typeof $ !== 'undefined');
        if (typeof $ !== 'undefined') {
            console.log("jQuery Version:", $.fn.jquery || 'Unknown');
        }

        console.log("=== END DROPDOWN TEST ===");
    }

    // FIXED: Fix dropdown positioning and visibility issues
    function fixDropdownPositioning() {
        // Handle table scrolling and ensure dropdowns remain visible
        const tableResponsive = document.querySelector('.table-responsive');
        if (tableResponsive) {
            // When a dropdown is shown, make the table overflow visible
            document.addEventListener('shown.bs.dropdown', function (e) {
                if (e.target.closest('.table-responsive')) {
                    e.target.closest('.table-responsive').style.overflow = 'visible';
                }
            }, true);

            // When a dropdown is hidden, restore the table overflow
            document.addEventListener('hidden.bs.dropdown', function (e) {
                if (e.target.closest('.table-responsive')) {
                    setTimeout(function () {
                        e.target.closest('.table-responsive').style.overflow = '';
                    }, 10);
                }
            }, true);
        }

        // Ensure dropdowns don't get cut off at screen edges
        document.querySelectorAll('.action-dropdown').forEach(function (dropdown) {
            const rect = dropdown.getBoundingClientRect();
            const menu = dropdown.querySelector('.dropdown-menu');

            if (menu && rect.right + menu.offsetWidth > window.innerWidth) {
                menu.classList.add('dropdown-menu-end');
            }
        });
    }

    // Fix for class parameter in URL - "class" vs "clas"
    function fixClassParameter() {
        // Get the class value from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const classValue = urlParams.get('class');

        // If class is in the URL, select the corresponding option
        if (classValue) {
            const classSelect = document.getElementById('class');
            if (classSelect) {
                classSelect.value = classValue;
                $(classSelect).trigger('change');
            }
        }
    }

    // Initialize filter form with current values
    function initializeFilterForm() {
        const urlParams = new URLSearchParams(window.location.search);

        // Check if there are any filters applied
        const hasFilters = urlParams.has('academic_year') ||
            urlParams.has('term') ||
            urlParams.has('class') ||
            urlParams.has('approval_status') ||
            urlParams.has('search');

        if (hasFilters) {
            // Auto-expand the filter section if filters are applied
            const filterCollapse = document.getElementById('filterCollapse');
            if (filterCollapse) {
                const collapseInstance = new bootstrap.Collapse(filterCollapse, { show: true });
            }
        }
    }

    // Initialize Select2 dropdown enhancements
    function initializeSelect2() {
        try {
            debugLog("Initializing Select2 dropdowns");

            $('.select2-enable').select2({
                theme: 'bootstrap-5',
                width: '100%',
                dropdownParent: $('#filterSection'),
                dropdownCssClass: 'select2-dropdown-above',
                placeholder: 'Select an option',
                allowClear: true,
                placeholderOption: 'first'
            });

            // Ensure Select2 change events trigger native change events
            $('.select2-enable').on('select2:select', function (e) {
                debugLog(`Select2 selection changed for ${this.id}: ${this.value}`);
                // Manually trigger the native change event
                const event = new Event('change', { bubbles: true });
                this.dispatchEvent(event);
            });

            // Fix Select2 inside hidden elements (like collapsed filters)
            $('#filterSection').on('shown.bs.collapse', function () {
                debugLog("Filter section shown, reinitializing Select2 dropdowns");
                $('.select2-enable').each(function () {
                    try {
                        $(this).select2('destroy').select2({
                            theme: 'bootstrap-5',
                            width: '100%',
                            dropdownParent: $('#filterSection'),
                            dropdownCssClass: 'select2-dropdown-above',
                            placeholder: 'Select an option',
                            allowClear: true,
                            placeholderOption: 'first'
                        });
                        debugLog(`Reinitialized Select2 for element: ${this.id || 'unnamed'}`);
                    } catch (e) {
                        errorLog(`Error reinitializing Select2 for element: ${this.id || 'unnamed'}`, e);
                    }
                });
            });

            debugLog("Select2 initialization complete");

            // Fix the academic year options immediately on load
            const academicYearSelect = document.getElementById('academic_year');
            if (academicYearSelect) {
                debugLog("Processing academic year dropdown initial state");
                // First fix display of all academic year options
                checkAndFixDropdownOptions();

                // Then if an academic year is selected, filter terms accordingly
                // Add a slight delay to ensure options are updated first
                setTimeout(function () {
                    if (academicYearSelect.value) {
                        debugLog(`Academic year already selected: ${academicYearSelect.value}, filtering terms`);
                        serverSideFilterTermsByAcademicYear(academicYearSelect.value);
                    }
                }, 500);
            }
        } catch (e) {
            errorLog("Error initializing Select2", e);

            // Try to initialize without advanced options as fallback
            try {
                $('.select2-enable').select2({
                    theme: 'bootstrap-5',
                    width: '100%',
                    placeholder: 'Select an option',
                    allowClear: true
                });
                debugLog("Fallback Select2 initialization succeeded");
            } catch (fallbackError) {
                errorLog("Critical error: Fallback Select2 initialization also failed", fallbackError);
            }
        }
    }

    // FIXED: Initialize DataTable with proper configuration for dropdowns
    function initializeDataTable() {
        try {
            // Destroy any existing DataTable instance first
            if ($.fn.DataTable && $('#reportCardsTable').length) {
                // Check if DataTable is already initialized before trying to get it
                if ($.fn.DataTable.isDataTable('#reportCardsTable')) {
                    var existingTable = $('#reportCardsTable').DataTable();
                    if (existingTable) {
                        existingTable.destroy();
                    }
                }
            }

            // Apply DataTable with proper options for Bootstrap 5
            if ($.fn.DataTable && $('#reportCardsTable').length) {
                // Check if table has data rows (not just empty state)
                const hasDataRows = $('#reportCardsTable tbody tr').not('.empty-row').filter(function () {
                    return $(this).find('td').length > 1; // Real data rows have multiple cells
                }).length > 0;

                // Additional check: ensure table structure is valid
                const headerCells = $('#reportCardsTable thead th').length;
                const firstDataRow = $('#reportCardsTable tbody tr').not('.empty-row').first();
                const dataRowCells = firstDataRow.find('td').length;

                // Only initialize if we have data rows and column count matches
                if (hasDataRows && headerCells === dataRowCells) {
                    $('#reportCardsTable').DataTable({
                        paging: false,           // No pagination needed since we use Django's pagination
                        lengthChange: false,     // No length changing
                        searching: false,        // Disable DataTables search - use server-side search instead
                        ordering: true,          // Allow column sorting
                        info: false,             // No showing X of Y entries
                        autoWidth: false,        // Don't auto-adjust column widths
                        responsive: false,       // Disable responsive features to avoid layout issues with dropdowns
                        columnDefs: [
                            { orderable: false, targets: [0, 9] },  // Checkbox and actions columns not sortable
                            { width: "120px", targets: 9 }          // Set width for actions column
                        ],
                        dom: 'rt', // Only show table and processing elements (no search box)
                        initComplete: function () {
                            // After DataTable initializes, fix dropdowns
                            setTimeout(function () {
                                // Re-initialize dropdowns after DataTable initialization
                                initializeDropdowns();
                                fixDropdownPositioning();
                            }, 200);
                        },
                        drawCallback: function () {
                            // Re-initialize dropdowns after table redraws (sorting, searching, etc.)
                            setTimeout(function () {
                                initializeDropdowns();
                                fixDropdownPositioning();
                            }, 100);
                        }
                    });
                    console.log("DataTable initialized");
                } else {
                    if (!hasDataRows) {
                        console.log("No data rows found, skipping DataTable initialization");
                    } else if (headerCells !== dataRowCells) {
                        console.log("Column count mismatch detected, skipping DataTable initialization");
                        console.log("Header cells:", headerCells, "Data row cells:", dataRowCells);
                    }
                }
            } else {
                console.log("DataTable not available or no table found, skipping DataTable initialization");
            }
        } catch (e) {
            console.error("Error initializing DataTable:", e);
            // Continue without DataTable if it fails
            console.log("Continuing without DataTable functionality");
        }
    }

    // Set up reset filters button
    function setupResetFilters() {
        const resetBtn = document.getElementById('resetFiltersBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                // Clear all form inputs
                const form = document.getElementById('filterForm');
                if (form) {
                    form.reset();
                }

                // Clear table search box
                const tableSearchInput = document.getElementById('tableSearch');
                if (tableSearchInput) {
                    tableSearchInput.value = '';
                }

                // Perform AJAX refresh to clear all filters
                performTableSearch('');
            });
        }
    }

    // Set up table search functionality
    function setupTableSearch() {
        const tableSearchInput = document.getElementById('tableSearch');
        if (tableSearchInput) {
            let searchTimeout;

            // Handle search input with debouncing
            tableSearchInput.addEventListener('input', function () {
                const searchValue = this.value.trim();
                debugLog("Table search input changed to", searchValue);

                // Clear existing timeout
                clearTimeout(searchTimeout);

                // Set new timeout for search debouncing (500ms)
                searchTimeout = setTimeout(() => {
                    performTableSearch(searchValue);
                }, 500);
            });

            // Handle Enter key for immediate search
            tableSearchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(searchTimeout);

                    const searchValue = this.value.trim();
                    performTableSearch(searchValue);
                }
            });
        }
    }

    // Perform table search without page reload
    function performTableSearch(searchValue) {
        debugLog("Performing table search for:", searchValue);

        // Show loading indicator
        showTableLoadingIndicator();

        // Build URL with current filter values plus search
        const urlParams = new URLSearchParams(window.location.search);

        if (searchValue) {
            urlParams.set('search', searchValue);
        } else {
            urlParams.delete('search');
        }

        // Add AJAX parameter to indicate we only want table content
        urlParams.set('ajax', '1');

        const searchUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        debugLog("Making AJAX request to:", searchUrl);

        // Make AJAX request to get updated table content
        $.ajax({
            url: searchUrl,
            method: 'GET',
            dataType: 'html',
            beforeSend: function () {
                debugLog("Sending AJAX search request");
            },
            success: function (data) {
                debugLog("Search results received");

                // Extract table content from response
                const $response = $(data);
                const $newTableContainer = $response.find('#report-cards-container');

                if ($newTableContainer.length > 0) {
                    // Replace table content
                    $('#report-cards-container').html($newTableContainer.html());

                    // Re-initialize components after content update
                    setTimeout(function () {
                        setupCheckboxes();
                        setupBulkActions();
                        setupIndividualActions();
                        initializeDropdowns();
                        updateSelectedCount();
                        debugLog("Table content updated and components re-initialized");
                    }, 100);

                    // Update URL without page reload
                    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                    window.history.pushState({}, '', newUrl);

                    debugLog("URL updated to:", newUrl);
                } else {
                    debugLog("No table content found in response");
                }

                // Hide loading indicator
                hideTableLoadingIndicator();
            },
            error: function (xhr, status, error) {
                errorLog("Search AJAX error:", error);
                errorLog("Error details:", {
                    status: status,
                    statusCode: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText
                });

                // Hide loading indicator
                hideTableLoadingIndicator();

                // Show error message
                Swal.fire({
                    title: 'Search Error',
                    text: 'Failed to perform search. Please try again.',
                    icon: 'error',
                    timer: 3000
                });
            }
        });
    }

    // Show table loading indicator
    function showTableLoadingIndicator() {
        // Remove any existing indicator
        const existingIndicator = document.querySelector('.table-loading-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'table-loading-indicator';
        loadingOverlay.innerHTML = `
            <div class="position-relative">
                <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                     style="background-color: rgba(255, 255, 255, 0.8); z-index: 1000;">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Searching...</span>
                        </div>
                        <div class="mt-2 text-muted">Searching...</div>
                    </div>
                </div>
            </div>
        `;

        // Add to table container
        const tableContainer = document.querySelector('#report-cards-container');
        if (tableContainer) {
            tableContainer.style.position = 'relative';
            tableContainer.appendChild(loadingOverlay);
        }
    }

    // Hide table loading indicator
    function hideTableLoadingIndicator() {
        const loadingIndicator = document.querySelector('.table-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    // Set up filter form submission
    function setupFilterForm() {
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', function (e) {
                e.preventDefault();

                // Get form data
                const formData = new FormData(filterForm);
                const urlParams = new URLSearchParams();

                // Add form values to URL parameters
                for (let [key, value] of formData.entries()) {
                    if (value.trim()) {
                        urlParams.set(key, value);
                    }
                }

                // Preserve existing search value from table search box
                const tableSearchInput = document.getElementById('tableSearch');
                if (tableSearchInput && tableSearchInput.value.trim()) {
                    urlParams.set('search', tableSearchInput.value.trim());
                }

                // Add AJAX parameter
                urlParams.set('ajax', '1');

                // Perform AJAX request
                const filterUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                debugLog("Applying filters via AJAX:", filterUrl);

                // Show loading indicator
                showTableLoadingIndicator();

                $.ajax({
                    url: filterUrl,
                    method: 'GET',
                    dataType: 'html',
                    success: function (data) {
                        debugLog("Filter results received");

                        // Extract table content from response
                        const $response = $(data);
                        const $newTableContainer = $response.find('#report-cards-container');

                        if ($newTableContainer.length > 0) {
                            // Replace table content
                            $('#report-cards-container').html($newTableContainer.html());

                            // Re-initialize components after content update
                            setTimeout(function () {
                                setupCheckboxes();
                                setupBulkActions();
                                setupIndividualActions();
                                initializeDropdowns();
                                updateSelectedCount();
                                debugLog("Table content updated and components re-initialized");
                            }, 100);

                            // Update URL without page reload
                            const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                            window.history.pushState({}, '', newUrl);

                            debugLog("URL updated to:", newUrl);
                        } else {
                            debugLog("No table content found in response");
                        }

                        // Hide loading indicator
                        hideTableLoadingIndicator();
                    },
                    error: function (xhr, status, error) {
                        errorLog("Filter AJAX error:", error);

                        // Hide loading indicator
                        hideTableLoadingIndicator();

                        // Show error message
                        Swal.fire({
                            title: 'Filter Error',
                            text: 'Failed to apply filters. Please try again.',
                            icon: 'error',
                            timer: 3000
                        });
                    }
                });
            });
        }
    }

    // Set up checkbox functionality
    function setupCheckboxes() {
        const checkAll = document.getElementById('checkAll');
        const selectAll = document.getElementById('selectAll');
        const selectAllFiltered = document.getElementById('selectAllFiltered');
        const deselectAll = document.getElementById('deselectAll');
        const checkboxes = document.querySelectorAll('.report-card-checkbox');
        const bulkActionsBtn = document.querySelector('#bulkActionsDropdownToggle');

        if (checkAll) {
            checkAll.addEventListener('click', function () {
                console.log("Check all clicked:", this.checked);
                checkboxes.forEach(function (checkbox) {
                    checkbox.checked = checkAll.checked;
                });
                updateSelectedCount();

                // Enable/disable bulk actions button directly
                if (bulkActionsBtn) {
                    bulkActionsBtn.disabled = !this.checked;
                }
            });
        }

        if (selectAll) {
            selectAll.addEventListener('click', function () {
                console.log("Select all on page clicked");

                // Get all report card IDs from the page (including hidden ones)
                const allReportCardIds = Array.from(document.querySelectorAll('.report-card-checkbox')).map(cb => cb.value);

                // Select all visible checkboxes
                checkboxes.forEach(function (checkbox) {
                    checkbox.checked = true;
                });

                if (checkAll) checkAll.checked = true;
                updateSelectedCount();

                // Always enable bulk actions button when selecting all
                if (bulkActionsBtn) {
                    bulkActionsBtn.disabled = false;
                }
            });
        }

        if (selectAllFiltered) {
            selectAllFiltered.addEventListener('click', function () {
                console.log("Select all filtered clicked");

                // Get all filtered report card IDs from the hidden field
                const allFilteredIdsField = document.getElementById('allFilteredReportCardIds');
                if (!allFilteredIdsField || !allFilteredIdsField.value) {
                    console.log("No filtered IDs found");
                    return;
                }

                const allFilteredIds = allFilteredIdsField.value.split(',').filter(id => id.trim() !== '');
                console.log("All filtered IDs:", allFilteredIds);

                // Check all visible checkboxes
                checkboxes.forEach(function (checkbox) {
                    checkbox.checked = true;
                });

                // Also store the fact that we've selected all filtered items
                // We'll use a data attribute to track this
                document.body.setAttribute('data-all-filtered-selected', 'true');
                document.body.setAttribute('data-all-filtered-ids', allFilteredIds.join(','));

                if (checkAll) checkAll.checked = true;
                updateSelectedCount();

                // Always enable bulk actions button when selecting all filtered
                if (bulkActionsBtn) {
                    bulkActionsBtn.disabled = false;
                }

                // Show a notification to the user
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `Selected all ${allFilteredIds.length} filtered report cards`,
                    showConfirmButton: false,
                    timer: 2000
                });
            });
        }

        if (deselectAll) {
            deselectAll.addEventListener('click', function () {
                console.log("Deselect all clicked");
                checkboxes.forEach(function (checkbox) {
                    checkbox.checked = false;
                });

                if (checkAll) checkAll.checked = false;

                // Clear the all-filtered-selected flag
                document.body.removeAttribute('data-all-filtered-selected');
                document.body.removeAttribute('data-all-filtered-ids');

                updateSelectedCount();

                // Always disable bulk actions button when deselecting all
                if (bulkActionsBtn) {
                    bulkActionsBtn.disabled = true;
                }
            });
        }

        checkboxes.forEach(function (checkbox) {
            checkbox.addEventListener('change', function () {
                console.log("Checkbox changed:", this.value, "checked:", this.checked);

                // If any individual checkbox is unchecked, clear the all-filtered-selected flag
                if (!this.checked) {
                    document.body.removeAttribute('data-all-filtered-selected');
                    document.body.removeAttribute('data-all-filtered-ids');
                }

                updateSelectedCount();

                // Update bulk actions button state directly
                if (bulkActionsBtn) {
                    // Check if any checkbox is checked OR if all filtered are selected
                    const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
                    const allFilteredSelected = document.body.getAttribute('data-all-filtered-selected') === 'true';
                    bulkActionsBtn.disabled = !(anyChecked || allFilteredSelected);
                    console.log("Any checkbox checked:", anyChecked, "All filtered selected:", allFilteredSelected, "Button disabled:", !(anyChecked || allFilteredSelected));
                }
            });
        });
    }

    // Update selected count and bulk action button state
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.report-card-checkbox');
        const selectedCount = document.getElementById('selectedCount');
        const bulkActionsBtn = document.querySelector('#bulkActionsDropdownToggle');
        const checkAll = document.getElementById('checkAll');

        let count = 0;
        checkboxes.forEach(function (checkbox) {
            if (checkbox.checked) count++;
        });

        // Check if all filtered items are selected
        const allFilteredSelected = document.body.getAttribute('data-all-filtered-selected') === 'true';
        const allFilteredIds = document.body.getAttribute('data-all-filtered-ids');

        if (allFilteredSelected && allFilteredIds) {
            const totalFilteredCount = allFilteredIds.split(',').length;
            if (selectedCount) {
                selectedCount.textContent = `${totalFilteredCount} selected (all filtered)`;
            }
        } else {
            if (selectedCount) selectedCount.textContent = count + " selected";
        }

        // Update bulk actions button state based on global selection
        if (bulkActionsBtn) {
            if (count > 0 || allFilteredSelected) {
                bulkActionsBtn.disabled = false;
                bulkActionsBtn.setAttribute('aria-expanded', 'false');
            } else {
                bulkActionsBtn.disabled = true;
                // Hide dropdown if it's open
                const dropdownMenu = document.querySelector('#bulkActionsDropdown .dropdown-menu');
                if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                    // Use Bootstrap 5 API to hide dropdown
                    bootstrap.Dropdown.getInstance(bulkActionsBtn)?.hide();
                }
            }

            console.log("Bulk actions button state:",
                "Count:", count,
                "All filtered selected:", allFilteredSelected,
                "Disabled:", !(count > 0 || allFilteredSelected),
                "Button:", bulkActionsBtn);
        }

        if (checkAll) checkAll.checked = count > 0 && count === checkboxes.length;
        console.log("Selected count updated:", count, "All filtered selected:", allFilteredSelected);
    }

    // Set up bulk action buttons with Bootstrap 5 dropdowns
    function setupBulkActions() {
        const bulkActionsDropdown = document.getElementById('bulkActionsDropdown');
        const bulkActionsBtn = document.querySelector('#bulkActionsDropdownToggle');
        const batchPrintBtn = document.getElementById('batchPrintBtn');
        const batchApproveBtn = document.getElementById('batchApproveBtn');
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');

        // Initialize the Button State
        updateSelectedCount();

        // Fix: Ensure the dropdown toggle works correctly
        if (bulkActionsBtn) {
            console.log("Setting up bulk actions dropdown");

            // Remove any existing event listeners to prevent duplicates
            bulkActionsBtn.removeEventListener('click', handleBulkActionsClick);

            // Add click listener to manually toggle dropdown
            bulkActionsBtn.addEventListener('click', handleBulkActionsClick);

            // Try to initialize with Bootstrap if available
            if (typeof bootstrap !== 'undefined') {
                try {
                    // Dispose existing instance first
                    const existingInstance = bootstrap.Dropdown.getInstance(bulkActionsBtn);
                    if (existingInstance) {
                        existingInstance.dispose();
                    }

                    // Create new Bootstrap dropdown instance
                    const bulkDropdown = new bootstrap.Dropdown(bulkActionsBtn, {
                        popperConfig: {
                            strategy: 'fixed',
                            modifiers: [
                                {
                                    name: 'preventOverflow',
                                    options: {
                                        boundary: document.body,
                                    }
                                }
                            ]
                        }
                    });

                    console.log("Bootstrap bulk actions dropdown initialized");
                } catch (e) {
                    console.error("Error initializing Bootstrap bulk actions dropdown:", e);
                    console.log("Falling back to manual dropdown handling");
                }
            } else {
                console.log("Bootstrap not available, using manual bulk actions dropdown handling");
            }
        }

        // Handle print action
        if (batchPrintBtn) {
            batchPrintBtn.addEventListener('click', function (e) {
                e.preventDefault();
                console.log("Batch print button clicked");

                // Check if all filtered items are selected
                const allFilteredSelected = document.body.getAttribute('data-all-filtered-selected') === 'true';
                const allFilteredIds = document.body.getAttribute('data-all-filtered-ids');

                let selectedIds = [];

                if (allFilteredSelected && allFilteredIds) {
                    // Use all filtered IDs
                    selectedIds = allFilteredIds.split(',').filter(id => id.trim() !== '');
                    console.log("Using all filtered IDs for printing:", selectedIds);
                } else {
                    // Use checked checkboxes
                    const checkboxes = document.querySelectorAll('.report-card-checkbox:checked');
                    selectedIds = Array.from(checkboxes).map(cb => cb.value);
                    console.log("Using checked checkbox IDs for printing:", selectedIds);
                }

                if (selectedIds.length === 0) {
                    Swal.fire({
                        title: 'Batch Print - No Selection',
                        text: "Please select at least one report card to print by checking the boxes or using 'Select All'.",
                        icon: 'warning'
                    });
                    return;
                }

                // Create form to submit with a unique ID
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = window.batchPrintUrl || '/reports/batch-print-report-cards/';
                form.target = '_blank';
                form.id = 'dynamic-batch-print-form-' + Date.now(); // Unique ID to avoid conflicts

                // Add CSRF token
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrfmiddlewaretoken';
                csrfInput.value = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
                form.appendChild(csrfInput);

                // Add selected IDs
                selectedIds.forEach(function (id) {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'report_card_ids';
                    input.value = id;
                    form.appendChild(input);
                });

                // Submit form
                document.body.appendChild(form);
                console.log("Submitting batch print form with", selectedIds.length, "report cards");
                form.submit();

                // Clean up after a delay to ensure form submission completes
                setTimeout(() => {
                    if (document.body.contains(form)) {
                        document.body.removeChild(form);
                        console.log("Removed dynamic batch print form");
                    }
                }, 1000);
            });
        }

        // Handle approve action
        if (batchApproveBtn) {
            batchApproveBtn.addEventListener('click', function (e) {
                e.preventDefault();
                console.log("Batch approve button clicked");

                // Check if all filtered items are selected
                const allFilteredSelected = document.body.getAttribute('data-all-filtered-selected') === 'true';
                const allFilteredIds = document.body.getAttribute('data-all-filtered-ids');

                let selectedIds = [];

                if (allFilteredSelected && allFilteredIds) {
                    // Use all filtered IDs
                    selectedIds = allFilteredIds.split(',').filter(id => id.trim() !== '');
                    console.log("Using all filtered IDs for approval:", selectedIds);
                } else {
                    // Use checked checkboxes
                    const checkedBoxes = document.querySelectorAll('.report-card-checkbox:checked');
                    selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
                    console.log("Using checked checkbox IDs for approval:", selectedIds);
                }

                if (selectedIds.length === 0) {
                    Swal.fire({
                        title: 'No Selection',
                        text: "Please select at least one report card to approve.",
                        icon: 'warning'
                    });
                    return;
                }

                // Count pending approvals (only for visible checkboxes)
                const checkedBoxes = document.querySelectorAll('.report-card-checkbox:checked');
                const pendingCount = Array.from(checkedBoxes).filter(
                    cb => cb.getAttribute('data-approved') === "false"
                ).length;

                console.log("Pending approval count:", pendingCount);

                // If all filtered are selected, we can't accurately count pending from visible checkboxes
                // So we'll show a different message
                if (allFilteredSelected) {
                    Swal.fire({
                        title: 'Confirm Approval',
                        text: `Are you sure you want to approve all ${selectedIds.length} filtered report card(s)? Only pending report cards will be approved.`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#28a745',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Yes, approve them!'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // Add loading state to button
                            batchApproveBtn.classList.add('btn-loading');

                            const container = document.getElementById('approve_report_card_ids_container');
                            if (container) {
                                // Clear existing inputs
                                container.innerHTML = '';

                                // Add inputs for each ID
                                selectedIds.forEach(function (id) {
                                    const input = document.createElement('input');
                                    input.type = 'hidden';
                                    input.name = 'report_card_ids';
                                    input.value = id;
                                    container.appendChild(input);
                                });

                                // Submit the form
                                const form = document.getElementById('bulk-approve-form');
                                if (form) {
                                    console.log("Submitting approve form");
                                    form.submit();
                                }
                            }
                        }
                    });
                } else {
                    // Regular approval flow for individual selections
                    if (pendingCount === 0) {
                        Swal.fire({
                            title: 'Already Approved',
                            text: "All selected report cards are already approved.",
                            icon: 'info'
                        });
                        return;
                    }

                    Swal.fire({
                        title: 'Confirm Approval',
                        text: `Are you sure you want to approve ${pendingCount} report card(s)?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonColor: '#28a745',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'Yes, approve them!'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // Add loading state to button
                            batchApproveBtn.classList.add('btn-loading');

                            const container = document.getElementById('approve_report_card_ids_container');
                            if (container) {
                                // Clear existing inputs
                                container.innerHTML = '';

                                // Add inputs for each ID
                                selectedIds.forEach(function (id) {
                                    const input = document.createElement('input');
                                    input.type = 'hidden';
                                    input.name = 'report_card_ids';
                                    input.value = id;
                                    container.appendChild(input);
                                });

                                // Submit the form
                                const form = document.getElementById('bulk-approve-form');
                                if (form) {
                                    console.log("Submitting approve form");
                                    form.submit();
                                }
                            }
                        }
                    });
                }
            });
        }

        // Handle delete action
        if (batchDeleteBtn) {
            batchDeleteBtn.addEventListener('click', function (e) {
                e.preventDefault();
                console.log("Batch delete button clicked");

                // Check if all filtered items are selected
                const allFilteredSelected = document.body.getAttribute('data-all-filtered-selected') === 'true';
                const allFilteredIds = document.body.getAttribute('data-all-filtered-ids');

                let selectedIds = [];

                if (allFilteredSelected && allFilteredIds) {
                    // Use all filtered IDs
                    selectedIds = allFilteredIds.split(',').filter(id => id.trim() !== '');
                    console.log("Using all filtered IDs for deletion:", selectedIds);
                } else {
                    // Use checked checkboxes
                    const checkedBoxes = document.querySelectorAll('.report-card-checkbox:checked');
                    selectedIds = Array.from(checkedBoxes).map(cb => cb.value);
                    console.log("Using checked checkbox IDs for deletion:", selectedIds);
                }

                if (selectedIds.length === 0) {
                    Swal.fire({
                        title: 'No Selection',
                        text: "Please select at least one report card to delete.",
                        icon: 'warning'
                    });
                    return;
                }

                Swal.fire({
                    title: 'Confirm Deletion',
                    text: `Are you sure you want to delete ${selectedIds.length} report card(s)? This cannot be undone!`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, delete them!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Add loading state to button
                        batchDeleteBtn.classList.add('btn-loading');

                        const container = document.getElementById('delete_report_card_ids_container');
                        if (container) {
                            // Clear existing inputs
                            container.innerHTML = '';

                            // Add inputs for each ID
                            selectedIds.forEach(function (id) {
                                const input = document.createElement('input');
                                input.type = 'hidden';
                                input.name = 'report_card_ids';
                                input.value = id;
                                container.appendChild(input);
                            });

                            // Submit the form
                            const form = document.getElementById('bulk-delete-form');
                            if (form) {
                                console.log("Submitting delete form");
                                form.submit();
                            }
                        }
                    }
                });
            });
        }
    }

    // Set up individual action buttons
    function setupIndividualActions() {
        // Handle individual approve forms
        document.querySelectorAll('.approve-form').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                console.log("Approve form submitted");

                Swal.fire({
                    title: 'Confirm Approval',
                    text: "Are you sure you want to approve this report card?",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#28a745',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, approve it!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Add loading state to button
                        const button = form.querySelector('button');
                        if (button) button.classList.add('btn-loading');

                        // Submit the form
                        form.submit();
                    }
                });
            });
        });

        // Handle individual delete forms
        document.querySelectorAll('.delete-form').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                const formId = form.id;
                const operationType = form.getAttribute('data-operation-type');
                console.log(`Delete form submitted: ${formId}, Operation type: ${operationType}`);

                // Extra verification that this is an individual delete operation
                if (operationType !== 'individual-delete') {
                    console.error("Form doesn't have the correct operation type attribute");
                    return;
                }

                Swal.fire({
                    title: 'Confirm Deletion',
                    text: "Are you sure you want to delete this report card? This cannot be undone!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, delete it!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Add loading state to button
                        const button = form.querySelector('button');
                        if (button) button.classList.add('btn-loading');

                        // Log form details before submission for debugging
                        console.log("Submitting individual delete form:");
                        console.log("- Form ID:", formId);
                        console.log("- Form action:", form.action);
                        console.log("- Form method:", form.method);
                        console.log("- Form has CSRF token:", !!form.querySelector('input[name="csrfmiddlewaretoken"]'));

                        // Submit the form directly
                        form.submit();
                    }
                });
            });
        });
    }

    // Set up dynamic filter interactions (academic year and term change affects classes dropdown)
    function setupDynamicFilters() {
        const academicYearSelect = document.getElementById('academic_year');
        const termSelect = document.getElementById('term');
        const classSelect = document.getElementById('class');

        // Set up academic year change handler
        if (academicYearSelect) {
            academicYearSelect.addEventListener('change', function () {
                const selectedYear = this.value;
                debugLog("Academic year changed to", selectedYear);

                // Clear term and class selections when academic year changes
                if (termSelect) {
                    termSelect.value = "";
                }
                if (classSelect) {
                    classSelect.value = "";
                }

                // Disable the term and class dropdowns while filtering
                if (termSelect) termSelect.disabled = true;
                if (classSelect) classSelect.disabled = true;

                // Always use server-side filtering for consistent behavior
                serverSideFilterTermsByAcademicYear(selectedYear);

                // Update class options based on the new academic year
                updateClassOptions();

                // Trigger Select2 update for the class dropdown
                if (classSelect) {
                    $(classSelect).trigger('change.select2');
                }

                // Auto-apply filters after academic year change
                applyFiltersAjax();
            });
        }

        // Set up term change handler
        if (termSelect) {
            termSelect.addEventListener('change', function () {
                const selectedTermValue = this.value;
                debugLog("Term changed to", selectedTermValue);

                // Handle class dropdown updates
                updateClassOptions();

                // Auto-apply filters after term change
                applyFiltersAjax();
            });
        }

        // Set up class change handler
        if (classSelect) {
            classSelect.addEventListener('change', function () {
                const selectedClassValue = this.value;
                debugLog("Class changed to", selectedClassValue);

                // Auto-apply filters after class change
                applyFiltersAjax();
            });
        }

        // Set up approval status change handler
        const approvalStatusSelect = document.getElementById('approval_status');
        if (approvalStatusSelect) {
            approvalStatusSelect.addEventListener('change', function () {
                const selectedStatusValue = this.value;
                debugLog("Approval status changed to", selectedStatusValue);

                // Auto-apply filters after status change
                applyFiltersAjax();
            });
        }

        function updateClassOptions() {
            const selectedTerm = termSelect ? termSelect.value : '';
            const selectedYear = academicYearSelect ? academicYearSelect.value : '';
            debugLog("Updating class options", { term: selectedTerm, year: selectedYear });

            // Reset class selection
            if (classSelect) {
                classSelect.value = "";
            }

            // If no term or year selected, just reset and return
            if (!selectedTerm && !selectedYear) {
                debugLog("No term or year selected, resetting class options");
                // Enable all class options
                if (classSelect) {
                    classSelect.querySelectorAll('option').forEach(function (option) {
                        option.style.display = '';
                        option.disabled = false;
                    });
                    $(classSelect).trigger('change.select2');
                }
                return;
            }

            // Show loading indicator
            const classFormGroup = classSelect ? classSelect.closest('.form-group') : null;
            if (classFormGroup) {
                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'text-center mt-2 class-loading';
                loadingSpinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="sr-only">Loading...</span></div> Loading classes...';

                // Remove any existing loading spinners
                classFormGroup.querySelectorAll('.class-loading').forEach(el => el.remove());

                // Add new spinner
                classFormGroup.appendChild(loadingSpinner);
            }

            // Build query parameters
            const queryParams = [];
            if (selectedTerm) queryParams.push(`term_id=${selectedTerm}`);
            if (selectedYear) queryParams.push(`academic_year=${selectedYear}`);

            const apiUrl = (window.getClassesByTermUrl || '/reports/get-classes-by-term/') + '?' + queryParams.join('&');
            debugLog("Fetching classes with URL", apiUrl);

            // Make AJAX request to get classes for the selected term/year
            $.ajax({
                url: apiUrl,
                method: 'GET',
                dataType: 'json',
                beforeSend: function () {
                    debugLog("Sending AJAX request for classes", { params: queryParams });
                },
                success: function (response) {
                    debugLog("Classes data received", response);

                    if (!classSelect) {
                        debugLog("Class select element not found, skipping update");
                        return;
                    }

                    // Clear existing options except the first one (All Classes)
                    const firstOption = classSelect.querySelector('option:first-child');
                    classSelect.innerHTML = '';
                    if (firstOption) {
                        classSelect.appendChild(firstOption);
                    }

                    // Add new options
                    if (response.classes && response.classes.length > 0) {
                        debugLog(`Adding ${response.classes.length} classes to dropdown`);
                        response.classes.forEach(function (cls) {
                            const option = document.createElement('option');
                            option.value = cls.id;
                            option.textContent = cls.name;
                            classSelect.appendChild(option);
                            debugLog(`Added class: ${cls.name} with ID: ${cls.id}`);
                        });
                    } else {
                        debugLog("No classes found for the selected term/year");
                    }

                    // If the previously selected class is still available, select it
                    const prevSelectedClass = window.previousSelectedClass || '';
                    if (prevSelectedClass) {
                        const option = classSelect.querySelector(`option[value="${prevSelectedClass}"]`);
                        if (option) {
                            classSelect.value = prevSelectedClass;
                            debugLog(`Restored previous class selection: ${prevSelectedClass}`);
                        }
                    }

                    // Update Select2
                    $(classSelect).trigger('change.select2');

                    // Re-enable the class dropdown
                    classSelect.disabled = false;

                    // Remove loading spinner
                    document.querySelectorAll('.class-loading').forEach(el => el.remove());

                    // Auto-apply filters after class options are updated
                    applyFiltersAjax();
                },
                error: function (xhr, status, error) {
                    errorLog("Error fetching classes", error);
                    errorLog("AJAX Error Details", {
                        status: status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        url: apiUrl
                    });

                    try {
                        // Try to parse error response if it's JSON
                        const errorResponse = JSON.parse(xhr.responseText);
                        errorLog("Parsed error response:", errorResponse);
                    } catch (e) {
                        // Ignore parsing errors
                    }

                    // Remove loading spinner
                    document.querySelectorAll('.class-loading').forEach(el => el.remove());

                    // Show error message
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to load classes. Please try again.',
                        icon: 'error'
                    });

                    // Still enable the class select even on error
                    if (classSelect) {
                        classSelect.disabled = false;
                        $(classSelect).trigger('change.select2');
                    }
                }
            });
        }

        // Auto-apply filters function
        function applyFiltersAjax() {
            debugLog("Auto-applying filters via AJAX");

            // Get all filter values
            const academicYearSelect = document.getElementById('academic_year');
            const termSelect = document.getElementById('term');
            const classSelect = document.getElementById('class');
            const approvalStatusSelect = document.getElementById('approval_status');
            const tableSearchInput = document.getElementById('tableSearch');

            // Build URL parameters
            const urlParams = new URLSearchParams();

            if (academicYearSelect && academicYearSelect.value) {
                urlParams.set('academic_year', academicYearSelect.value);
            }
            if (termSelect && termSelect.value) {
                urlParams.set('term', termSelect.value);
            }
            if (classSelect && classSelect.value) {
                urlParams.set('class', classSelect.value);
            }
            if (approvalStatusSelect && approvalStatusSelect.value) {
                urlParams.set('approval_status', approvalStatusSelect.value);
            }
            if (tableSearchInput && tableSearchInput.value.trim()) {
                urlParams.set('search', tableSearchInput.value.trim());
            }

            // Add AJAX parameter
            urlParams.set('ajax', '1');

            // Perform AJAX request
            const filterUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
            debugLog("Making AJAX filter request to:", filterUrl);

            // Show loading indicator
            showTableLoadingIndicator();

            $.ajax({
                url: filterUrl,
                method: 'GET',
                dataType: 'html',
                success: function (data) {
                    debugLog("Filter results received");

                    // Extract table content from response
                    const $response = $(data);
                    const $newTableContainer = $response.find('#report-cards-container');

                    if ($newTableContainer.length > 0) {
                        // Replace table content
                        $('#report-cards-container').html($newTableContainer.html());

                        // Re-initialize components after content update
                        setTimeout(function () {
                            setupCheckboxes();
                            setupBulkActions();
                            setupIndividualActions();
                            initializeDropdowns();
                            updateSelectedCount();
                            debugLog("Table content updated and components re-initialized");
                        }, 100);

                        // Update URL without page reload
                        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                        window.history.pushState({}, '', newUrl);

                        debugLog("URL updated to:", newUrl);
                    } else {
                        debugLog("No table content found in response");
                    }

                    // Hide loading indicator
                    hideTableLoadingIndicator();
                },
                error: function (xhr, status, error) {
                    errorLog("Filter AJAX error:", error);

                    // Hide loading indicator
                    hideTableLoadingIndicator();

                    // Show error message
                    Swal.fire({
                        title: 'Filter Error',
                        text: 'Failed to apply filters. Please try again.',
                        icon: 'error',
                        timer: 3000
                    });
                }
            });
        }
    }

    // Function to check and log the state of the class dropdown
    function checkClassDropdownState() {
        const classSelect = document.getElementById('class');
        if (!classSelect) {
            debugLog("Class dropdown not found in DOM");
            return;
        }

        // Log the current state
        debugLog("Class dropdown state:", {
            disabled: classSelect.disabled,
            value: classSelect.value,
            optionCount: classSelect.options.length,
            select2Initialized: !!($(classSelect).data('select2')),
            visible: $(classSelect).is(':visible'),
            parentVisible: $(classSelect).parent().is(':visible'),
            cssDisplay: $(classSelect).css('display'),
            cssVisibility: $(classSelect).css('visibility'),
            width: $(classSelect).width(),
            height: $(classSelect).height()
        });

        // If disabled, try to enable it
        if (classSelect.disabled) {
            debugLog("Class dropdown is disabled, attempting to enable it");
            classSelect.disabled = false;

            // Also update Select2 if needed
            if ($(classSelect).data('select2')) {
                $(classSelect).prop('disabled', false).trigger('change.select2');
                debugLog("Updated Select2 disabled state");
            }
        }
    }

    // IMPROVED: Server-side function to filter terms by academic year
    function serverSideFilterTermsByAcademicYear(selectedYear) {
        const termSelect = document.getElementById('term');
        if (!termSelect) return;

        // Get the class select element
        const classSelect = document.getElementById('class');

        // Get current selected term value to try to preserve it if possible
        const currentTermValue = termSelect.value;

        debugLog("SERVER-SIDE: Filtering terms for academic year", selectedYear || "ALL (no filter)");

        // Add a loading indicator to the term select
        termSelect.disabled = true;

        // Also disable class select while loading terms
        if (classSelect) {
            classSelect.disabled = true;
            debugLog("Disabled class dropdown during term filtering");
        }

        // Add visual loading indicator
        const termGroup = termSelect.closest('.form-group');
        let loadingSpinner = null;

        if (termGroup) {
            // Remove any existing loading indicators
            termGroup.querySelectorAll('.term-loading').forEach(el => el.remove());

            // Add loading indicator
            loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'text-center mt-2 term-loading';
            loadingSpinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="sr-only">Loading...</span></div> ' +
                (selectedYear ? `Loading terms for academic year ${selectedYear}...` : 'Loading all terms...');
            termGroup.appendChild(loadingSpinner);
        }

        // Remember the first "All Terms" option
        const firstOption = termSelect.querySelector('option[value=""]');

        // Use the endpoint for the report card list specifically
        const apiUrl = window.getTermsByAcademicYearUrl || '/reports/get-terms-by-academic-year/';

        // Build the request URL with parameters directly in the URL for consistency
        let requestUrl = apiUrl;
        if (selectedYear) {
            // Add ? if it's the first parameter, otherwise &
            const separator = requestUrl.includes('?') ? '&' : '?';
            requestUrl += `${separator}academic_year_id=${encodeURIComponent(selectedYear)}`;
            debugLog(`Making AJAX request for academic year ${selectedYear} to:`, requestUrl);
        } else {
            debugLog(`Making AJAX request for ALL terms (no filter) to:`, requestUrl);
        }

        // Make an AJAX request to get terms for the selected academic year
        $.ajax({
            url: requestUrl,
            method: 'GET',
            dataType: 'json',
            beforeSend: function (xhr) {
                debugLog("Making AJAX request to server for terms",
                    selectedYear ? `with academic year ID ${selectedYear}` : "for all years");
                // Add custom header to potentially bypass caching
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            },
            success: function (data) {
                debugLog("Terms data received from server:", data);

                // Add more detailed debugging information
                if (data.terms && data.terms.length > 0) {
                    debugLog(`Successfully received ${data.terms.length} terms for academic year ${selectedYear || 'ALL'}`);
                    data.terms.forEach((term, index) => {
                        debugLog(`Term ${index + 1}: ID=${term.id}, Name="${term.name}"`);
                    });
                } else {
                    debugLog(`No terms received for academic year ${selectedYear || 'ALL'}`);
                }

                // Check if there's a note in the response (indicating a fallback)
                if (data.note && selectedYear) {
                    debugLog("NOTE from server:", data.note);
                    // Small notification to user that something is different
                    // Only show if an academic year was selected - otherwise all terms is expected
                    const noteDiv = document.createElement('div');
                    noteDiv.className = 'small text-warning mt-1 mb-2 term-note';
                    noteDiv.innerHTML = `<i class="bi bi-info-circle"></i> ${data.note}`;

                    // Remove any existing notes
                    termGroup.querySelectorAll('.term-note').forEach(el => el.remove());

                    // Add note to the term group
                    termGroup.appendChild(noteDiv);

                    // Auto-remove after 8 seconds
                    setTimeout(() => {
                        noteDiv.style.opacity = '0';
                        noteDiv.style.transition = 'opacity 0.5s';
                        setTimeout(() => noteDiv.remove(), 500);
                    }, 8000);
                }

                // Temporarily suspend Select2 if it's active
                let wasSelect2Active = false;
                if ($.fn.select2 && $(termSelect).data('select2')) {
                    wasSelect2Active = true;
                    $(termSelect).select2('destroy');
                }

                // First, clear all options
                termSelect.innerHTML = '';

                // Re-add the first "All Terms" option
                if (firstOption) {
                    termSelect.appendChild(firstOption.cloneNode(true));
                } else {
                    const newFirstOption = document.createElement('option');
                    newFirstOption.value = '';
                    newFirstOption.textContent = 'All Terms';
                    termSelect.appendChild(newFirstOption);
                }

                // Add the terms from the response
                let foundCurrentTerm = false;

                if (data.terms && data.terms.length > 0) {
                    debugLog(`Adding ${data.terms.length} terms from server`);

                    data.terms.forEach(function (term) {
                        const option = document.createElement('option');
                        option.value = term.id;

                        // Extract just the term name without school name
                        // If term.name contains " - " or similar separators, take only the first part
                        let termDisplayName = term.name;
                        if (term.name && term.name.includes(' - ')) {
                            termDisplayName = term.name.split(' - ')[0].trim();
                        } else if (term.name && term.name.includes('|')) {
                            termDisplayName = term.name.split('|')[0].trim();
                        }

                        option.textContent = termDisplayName;

                        // Set the data-academic-year attribute if we have a selected year
                        if (selectedYear) {
                            option.setAttribute('data-academic-year', selectedYear);
                        }

                        termSelect.appendChild(option);

                        // Check if this was the previously selected term
                        if (term.id == currentTermValue) {
                            foundCurrentTerm = true;
                        }
                    });

                    // Log the current state of the dropdown after adding options
                    debugLog(`Term dropdown updated with ${termSelect.options.length} options (including 'All Terms')`);
                    debugLog(`Current term dropdown options:`, Array.from(termSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })));

                    // Re-select the previously selected term if it's still available
                    if (foundCurrentTerm && currentTermValue) {
                        termSelect.value = currentTermValue;
                        debugLog(`Re-selected previously selected term: ${currentTermValue}`);
                    } else {
                        // Otherwise, default to "All Terms"
                        termSelect.value = '';
                        debugLog("Selected 'All Terms' as previous term is not available");
                    }
                } else {
                    debugLog("No terms received from server");

                    // Create a "No terms available" option as feedback
                    const noTermsOption = document.createElement('option');
                    noTermsOption.value = '';
                    noTermsOption.textContent = selectedYear ? 'No terms available for this academic year' : 'No terms available';
                    noTermsOption.disabled = true;
                    termSelect.appendChild(noTermsOption);
                }

                // Re-enable the term select
                termSelect.disabled = false;

                // Also re-enable the class select that was disabled during filtering
                if (classSelect) {
                    classSelect.disabled = false;
                    debugLog("Re-enabled class dropdown after term filtering");
                }

                // Remove loading spinner
                if (loadingSpinner) {
                    loadingSpinner.remove();
                }

                // Re-initialize Select2 if it was active
                if (wasSelect2Active && $.fn.select2) {
                    $(termSelect).select2({
                        theme: 'bootstrap-5',
                        width: '100%',
                        dropdownParent: $('#filterSection'),
                        dropdownCssClass: 'select2-dropdown-above',
                        placeholder: 'Select an option',
                        allowClear: true,
                        placeholderOption: 'first'
                    });
                }

                // Trigger change to update dependent dropdowns
                $(termSelect).trigger('change');

                // Check and log the state of the class dropdown
                checkClassDropdownState();

                // Update class options
                updateClassOptions();
            },
            error: function (xhr, status, error) {
                errorLog("Error fetching terms:", error);
                errorLog("AJAX Error Details:", {
                    status: status,
                    statusCode: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText,
                    url: requestUrl
                });

                let errorMessage = "Failed to load terms. Please try again.";

                try {
                    // Try to parse error response
                    if (xhr.responseText) {
                        const responseJson = JSON.parse(xhr.responseText);
                        errorLog("Parsed error response:", responseJson);
                        if (responseJson.error) {
                            errorMessage = responseJson.error;
                        }
                    } else {
                        errorLog("Empty response received");
                    }
                } catch (e) {
                    errorLog("Could not parse error response as JSON:", e);
                }

                // Re-enable the term select
                termSelect.disabled = false;

                // Remove loading spinner
                if (loadingSpinner) {
                    loadingSpinner.remove();
                }

                // Also re-enable the class select in case of error
                if (classSelect) {
                    classSelect.disabled = false;
                    debugLog("Re-enabled class dropdown after term filtering error");
                }

                // Check and log the state of the class dropdown
                checkClassDropdownState();

                // Show small error message near the dropdown
                if (termGroup) {
                    const errorNote = document.createElement('div');
                    errorNote.className = 'small text-danger my-1 term-error';
                    errorNote.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${errorMessage}`;

                    // Remove any existing errors
                    termGroup.querySelectorAll('.term-error').forEach(el => el.remove());
                    termGroup.appendChild(errorNote);

                    // Auto-remove after 8 seconds
                    setTimeout(() => {
                        errorNote.style.opacity = '0';
                        errorNote.style.transition = 'opacity 0.5s';
                        setTimeout(() => errorNote.remove(), 500);
                    }, 8000);
                }
            }
        });
    }
});
