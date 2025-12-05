/**
 * Term Filter Script
 * This standalone script handles the dynamic updating of the term dropdown
 * when an academic year is selected in the teacher monitoring dashboard.
 */

// Self-executing function to avoid polluting the global namespace
(function () {
    console.log('Term filter script loaded');

    // Function to find the academic year select element
    function findAcademicYearSelect() {
        // Try multiple selector strategies
        const selectors = [
            '#id_academic_year',
            'select[name="academic_year"]',
            'form select:nth-of-type(1)'  // First select in the form
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.tagName === 'SELECT') {
                console.log('Found academic year select with selector:', selector);
                return element;
            }
        }

        // Try all selects as a last resort
        const allSelects = document.querySelectorAll('select');
        for (const select of allSelects) {
            if ((select.id && select.id.includes('academic_year')) ||
                (select.name && select.name.includes('academic_year'))) {
                console.log('Found academic year select by name/id inspection');
                return select;
            }

            // Check if label contains "Academic Year"
            const label = document.querySelector(`label[for="${select.id}"]`);
            if (label && label.textContent.includes('Academic Year')) {
                console.log('Found academic year select by label inspection');
                return select;
            }
        }

        console.error('Could not find academic year select element');
        return null;
    }

    // Function to find the term select element
    function findTermSelect() {
        // Try multiple selector strategies
        const selectors = [
            '#id_term',
            'select[name="term"]',
            'form select:nth-of-type(2)'  // Second select in the form
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.tagName === 'SELECT') {
                console.log('Found term select with selector:', selector);
                return element;
            }
        }

        // Try all selects as a last resort
        const allSelects = document.querySelectorAll('select');
        for (const select of allSelects) {
            if ((select.id && select.id.includes('term')) ||
                (select.name && select.name.includes('term'))) {
                console.log('Found term select by name/id inspection');
                return select;
            }

            // Check if label contains "Term"
            const label = document.querySelector(`label[for="${select.id}"]`);
            if (label && label.textContent.includes('Term')) {
                console.log('Found term select by label inspection');
                return select;
            }
        }

        console.error('Could not find term select element');
        return null;
    }

    // Function to update terms when academic year changes
    function updateTermsForYear(academicYearId) {
        if (!academicYearId) return;

        const termSelect = findTermSelect();
        if (!termSelect) return;

        const schoolId = document.getElementById('school_id')?.value || '';

        console.log('Updating terms for academic year:', academicYearId, 'school:', schoolId);

        // Show loading state
        termSelect.disabled = true;

        // Make AJAX request
        fetch(`/api/terms/?academic_year=${academicYearId}&school=${schoolId}`)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                console.log('Terms data received:', data);

                // Clear existing options
                while (termSelect.options.length > 0) {
                    termSelect.remove(0);
                }

                // Add an empty option
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = '---------';
                termSelect.appendChild(emptyOption);

                // Add new options
                if (Array.isArray(data) && data.length > 0) {
                    data.forEach(term => {
                        const option = document.createElement('option');
                        option.value = term.id;
                        option.textContent = term.name || `Term ${term.term_number}`;
                        termSelect.appendChild(option);
                    });
                    console.log(`Added ${data.length} term options`);
                }
            })
            .catch(error => {
                console.error('Error fetching terms:', error);
            })
            .finally(() => {
                termSelect.disabled = false;
            });
    }

    // Set up the event handler when the DOM is loaded
    function setupHandler() {
        const academicYearSelect = findAcademicYearSelect();
        if (!academicYearSelect) return;

        console.log('Setting up academic year change handler');

        // Add change event listener
        academicYearSelect.addEventListener('change', function () {
            console.log('Academic year changed to:', this.value);
            updateTermsForYear(this.value);
        });

        // If there's an initial value, update terms
        if (academicYearSelect.value) {
            console.log('Initial academic year value:', academicYearSelect.value);
            updateTermsForYear(academicYearSelect.value);
        }
    }

    // Check if the DOM is already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupHandler);
    } else {
        // DOM already loaded, run the setup immediately
        setupHandler();
    }
})(); 