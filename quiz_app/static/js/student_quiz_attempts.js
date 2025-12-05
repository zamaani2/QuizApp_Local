/**
 * Student Quiz Attempts JavaScript
 * Handles filtering, searching, and interactions for the quiz attempts list
 */

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const quizFilter = document.getElementById('quizFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const academicYearFilter = document.getElementById('academicYearFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const attemptsTable = document.getElementById('attemptsTable');

    // Get current URL parameters
    const baseUrl = window.location.pathname;

    // Function to update URL and reload
    function updateFilters() {
        const params = new URLSearchParams();

        if (searchInput.value.trim()) {
            params.set('search', searchInput.value.trim());
        }
        if (quizFilter.value) {
            params.set('quiz', quizFilter.value);
        }
        if (subjectFilter.value) {
            params.set('subject', subjectFilter.value);
        }
        if (academicYearFilter.value) {
            params.set('academic_year', academicYearFilter.value);
        }
        if (statusFilter.value) {
            params.set('status', statusFilter.value);
        }

        const queryString = params.toString();
        const newUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
        window.location.href = newUrl;
    }

    // Debounce function for search
    let searchTimeout;
    function debounceSearch(func, delay) {
        return function (...args) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Search input handler
    if (searchInput) {
        searchInput.addEventListener('input', debounceSearch(function () {
            updateFilters();
        }, 500));
    }

    // Filter change handlers
    if (quizFilter) {
        quizFilter.addEventListener('change', updateFilters);
    }
    if (subjectFilter) {
        subjectFilter.addEventListener('change', updateFilters);
    }
    if (academicYearFilter) {
        academicYearFilter.addEventListener('change', updateFilters);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', updateFilters);
    }

    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function () {
            searchInput.value = '';
            quizFilter.value = '';
            subjectFilter.value = '';
            academicYearFilter.value = '';
            statusFilter.value = '';
            window.location.href = baseUrl;
        });
    }

    // Initialize DataTables if available
    if (typeof $.fn.DataTable !== 'undefined' && attemptsTable) {
        $(attemptsTable).DataTable({
            pageLength: 25,
            order: [[7, 'desc']], // Sort by submitted date
            columnDefs: [
                { orderable: false, targets: -1 } // Disable sorting on Actions column
            ],
            language: {
                search: "Search:",
                lengthMenu: "Show _MENU_ attempts per page",
                info: "Showing _START_ to _END_ of _TOTAL_ attempts",
                infoEmpty: "No attempts available",
                infoFiltered: "(filtered from _MAX_ total attempts)",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            }
        });
    }

    // View result button handler
    $(document).on('click', '.view-result-btn', function () {
        const attemptId = $(this).data('attempt-id');
        // Redirect to result detail page
        window.location.href = `/quizzes/attempts/${attemptId}/result/`;
    });

    // Print result button handler
    $(document).on('click', '.print-result-btn', function () {
        const attemptId = $(this).data('attempt-id');
        // Open print page in new window
        window.open(`/quizzes/attempts/${attemptId}/result/print/`, '_blank');
    });
});

