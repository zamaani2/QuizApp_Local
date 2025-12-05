/**
 * Quiz Assignment Overview JavaScript
 * Handles filtering and search for quiz assignments
 */
(function ($) {
    'use strict';

    $(document).ready(function () {
        // Initialize DataTables
        if ($('#quizzesTable').length) {
            $('#quizzesTable').DataTable({
                pageLength: 25,
                order: [[6, 'desc']], // Order by created date
            });
        }

        // Initialize filters
        initializeFilters();
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
        $('#subjectFilter, #statusFilter').on('change', function () {
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
        const subject = $('#subjectFilter').val();
        const status = $('#statusFilter').val();

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (subject) params.append('subject', subject);
        if (status) params.append('status', status);

        const queryString = params.toString();
        window.location.href = baseUrl + (queryString ? '?' + queryString : '');
    }

})(jQuery);

