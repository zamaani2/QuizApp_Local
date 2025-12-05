/**
 * Quiz Results List JavaScript
 * Handles filtering, search, and export for quiz results
 */
(function ($) {
    'use strict';

    $(document).ready(function () {
        // Initialize DataTables
        if ($('#resultsTable').length) {
            $('#resultsTable').DataTable({
                pageLength: 25,
                order: [[7, 'desc']], // Order by submitted date (column index changed due to checkbox column)
                columnDefs: [
                    { orderable: false, targets: 0 } // Disable sorting on checkbox column
                ]
            });
        }

        // Initialize filters
        initializeFilters();

        // Initialize export
        initializeExport();

        // Initialize bulk print
        initializeBulkPrint();
    });

    /**
     * Initialize filter functionality
     */
    function initializeFilters() {
        const currentUrl = new URL(window.location.href);
        const baseUrl = currentUrl.pathname;

        // Search input
        $('#searchInput').on('keyup', function (e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });

        // Filter dropdowns
        $('#quizFilter, #academicYearFilter, #classFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            window.location.href = baseUrl;
        });
    }

    /**
     * Apply filters and reload page
     */
    function applyFilters() {
        const currentUrl = new URL(window.location.href);
        const baseUrl = currentUrl.pathname;

        const search = $('#searchInput').val();
        const quiz = $('#quizFilter').val();
        const academicYear = $('#academicYearFilter').val();
        const classFilter = $('#classFilter').val();

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (quiz) params.append('quiz', quiz);
        if (academicYear) params.append('academic_year', academicYear);
        if (classFilter) params.append('class', classFilter);

        const queryString = params.toString();
        window.location.href = baseUrl + (queryString ? '?' + queryString : '');
    }

    /**
     * Initialize export functionality
     */
    function initializeExport() {
        $('#exportResultsBtn').on('click', function () {
            exportToExcel();
        });
    }

    /**
     * Export results to Excel
     */
    function exportToExcel() {
        // Get current filter values
        const quiz = $('#quizFilter').val() || '';
        const academicYear = $('#academicYearFilter').val() || '';
        const classFilter = $('#classFilter').val() || '';

        // Build export URL with current filters
        const params = new URLSearchParams();
        if (quiz) params.append('quiz', quiz);
        if (academicYear) params.append('academic_year', academicYear);
        if (classFilter) params.append('class', classFilter);

        const exportUrl = '/quizzes/results/export/?' + params.toString();

        // Show loading message
        Swal.fire({
            title: 'Exporting...',
            html: 'Preparing Excel file...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = exportUrl;
        link.download = 'quiz_results.xlsx';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Close loading message after a delay
        setTimeout(() => {
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Export Complete',
                text: 'Your Excel file should begin downloading shortly.',
                timer: 2000,
                timerProgressBar: true,
            });
        }, 1000);
    }

    /**
     * Initialize bulk print functionality
     */
    function initializeBulkPrint() {
        // Select all checkbox
        $('#selectAllCheckbox').on('change', function () {
            const isChecked = $(this).prop('checked');
            $('.attempt-checkbox').prop('checked', isChecked);
            updateBulkPrintButton();
        });

        // Individual checkboxes
        $(document).on('change', '.attempt-checkbox', function () {
            updateSelectAllCheckbox();
            updateBulkPrintButton();
        });

        // Bulk print selected
        $('#bulkPrintBtn').on('click', function () {
            const selectedIds = getSelectedAttemptIds();
            if (selectedIds.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Selection',
                    text: 'Please select at least one result to print.',
                });
                return;
            }
            printSelectedResults(selectedIds);
        });

        // Print all filtered results
        $('#printAllBtn').on('click', function () {
            printAllFilteredResults();
        });
    }

    /**
     * Update select all checkbox state
     */
    function updateSelectAllCheckbox() {
        const totalCheckboxes = $('.attempt-checkbox').length;
        const checkedCheckboxes = $('.attempt-checkbox:checked').length;
        $('#selectAllCheckbox').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
    }

    /**
     * Update bulk print button state
     */
    function updateBulkPrintButton() {
        const selectedIds = getSelectedAttemptIds();
        $('#bulkPrintBtn').prop('disabled', selectedIds.length === 0);
    }

    /**
     * Get selected attempt IDs
     */
    function getSelectedAttemptIds() {
        const selectedIds = [];
        $('.attempt-checkbox:checked').each(function () {
            selectedIds.push($(this).val());
        });
        return selectedIds;
    }

    /**
     * Print selected results
     */
    function printSelectedResults(attemptIds) {
        if (attemptIds.length === 0) {
            return;
        }

        // Build URL with attempt IDs
        const params = new URLSearchParams();
        attemptIds.forEach(id => {
            params.append('attempt_ids', id);
        });

        const printUrl = '/quizzes/results/bulk-print/?' + params.toString();
        window.open(printUrl, '_blank');
    }

    /**
     * Print all filtered results
     */
    function printAllFilteredResults() {
        // Get current filter values
        const currentUrl = new URL(window.location.href);
        const search = $('#searchInput').val() || '';
        const quiz = $('#quizFilter').val() || '';
        const academicYear = $('#academicYearFilter').val() || '';
        const classFilter = $('#classFilter').val() || '';

        // Build URL with current filters
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (quiz) params.append('quiz', quiz);
        if (academicYear) params.append('academic_year', academicYear);
        if (classFilter) params.append('class', classFilter);

        const printUrl = '/quizzes/results/bulk-print/?' + params.toString();
        window.open(printUrl, '_blank');
    }

})(jQuery);

