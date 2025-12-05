/**
 * Quiz Management JavaScript
 * Handles all interactions for quiz management including modals, forms, and operations
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        // Ensure jQuery is loaded
        if (typeof $ === 'undefined') {
            console.error('jQuery is not loaded!');
            return;
        }

        // Ensure Bootstrap is loaded
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded!');
            return;
        }

        // Initialize modals first
        initializeModals();

        // Then initialize event listeners
        initializeEventListeners();

        // Finally initialize DataTable
        try {
            initializeDataTable();
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    });

    /**
     * Initialize DataTables for quizzes table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#quizzesTable');
        if (table.length === 0) {
            console.warn('Quizzes table not found');
            return;
        }

        // Check if table already has DataTable initialized
        if ($.fn.DataTable.isDataTable('#quizzesTable')) {
            try {
                table.DataTable().destroy();
            } catch (e) {
                console.warn('Error destroying existing DataTable:', e);
                table.removeData();
            }
        }

        try {
            // Count columns in header
            const headerRow = table.find('thead tr:first');
            const headerCols = headerRow.find('th').length;

            if (headerCols === 0) {
                console.warn('No header columns found in table');
                return;
            }

            // Ensure tbody exists
            let tbody = table.find('tbody');
            if (tbody.length === 0) {
                tbody = $('<tbody></tbody>');
                table.append(tbody);
            }

            // Remove any rows with colspan
            tbody.find('tr').each(function () {
                const $row = $(this);
                if ($row.find('td[colspan]').length > 0) {
                    $row.remove();
                }
            });

            // Validate and fix body rows
            const bodyRows = tbody.find('tr');
            let rowsFixed = 0;

            bodyRows.each(function (index) {
                const $row = $(this);
                let rowCols = $row.find('td').length;

                $row.find('th').each(function () {
                    $(this).replaceWith($('<td>').html($(this).html()));
                    rowCols = $row.find('td').length;
                });

                if (rowCols !== headerCols) {
                    if (rowCols < headerCols) {
                        for (let i = rowCols; i < headerCols; i++) {
                            $row.append('<td></td>');
                        }
                        rowsFixed++;
                    } else if (rowCols > headerCols) {
                        $row.find('td').slice(headerCols).remove();
                        rowsFixed++;
                    }
                }

                $row.find('td').each(function () {
                    if (this.tagName !== 'TD') {
                        $(this).replaceWith($('<td>').html($(this).html()));
                    }
                });
            });

            if (rowsFixed > 0) {
                console.log(`Fixed ${rowsFixed} row(s) with incorrect column counts`);
            }

            // Final validation
            let allRowsValid = true;
            tbody.find('tr').each(function (index) {
                if ($(this).find('td').length !== headerCols) {
                    allRowsValid = false;
                }
            });

            if (!allRowsValid) {
                console.error('Some rows still have incorrect column counts. Cannot initialize DataTable safely.');
                return;
            }

            // Explicitly define columns
            const columns = [];
            for (let i = 0; i < headerCols; i++) {
                columns.push({ orderable: true });
            }

            table.DataTable({
                autoWidth: false,
                columns: columns,
                responsive: true,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                order: [[8, 'desc']], // Order by created date
                deferRender: true,
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ quizzes",
                    infoEmpty: "No quizzes found",
                    infoFiltered: "(filtered from _TOTAL_ total quizzes)",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing DataTable:', error);
            console.error('Error details:', error.message, error.stack);

            try {
                if ($.fn.DataTable.isDataTable('#quizzesTable')) {
                    $('#quizzesTable').DataTable().destroy();
                }
            } catch (cleanupError) {
                console.error('Error cleaning up DataTable:', cleanupError);
            }
        }
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Search input
        $('#searchInput').on('keyup', debounce(function () {
            const searchValue = $(this).val();
            if ($.fn.DataTable) {
                $('#quizzesTable').DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#subjectFilter, #statusFilter, #categoryFilter, #academicYearFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#subjectFilter, #statusFilter, #categoryFilter, #academicYearFilter').val('');
            if ($.fn.DataTable) {
                $('#quizzesTable').DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete quiz button
        $(document).on('click', '.delete-quiz-btn', function () {
            const quizId = $(this).data('quiz-id');
            const quizTitle = $(this).data('quiz-title');
            deleteQuiz(quizId, quizTitle);
        });

        // Require password checkbox
        $(document).on('change', '#require_password', function () {
            if ($(this).is(':checked')) {
                $('#passwordField').show();
                $('#quiz_password').prop('required', true);
            } else {
                $('#passwordField').hide();
                $('#quiz_password').prop('required', false);
            }
        });

        // Academic year change - load terms
        $(document).on('change', '#academic_year', function () {
            const academicYearId = $(this).val();
            if (academicYearId) {
                loadTermsForAcademicYear(academicYearId);
            } else {
                $('#term').html('<option value="">Select Term</option>');
            }
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add Quiz Modal
        $(document).on('click', '#addQuizBtn, #addQuizMenuBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url = $(this).data('modal-url');
            const title = $(this).data('modal-title') || 'Create New Quiz';

            if (!url) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the quiz modal.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadQuizModal(url, title);
        });

        // Edit Quiz Modal
        $(document).on('click', '.edit-quiz-btn, #editQuizBtn, #editQuizBtn2', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url = $(this).data('modal-url');
            const title = $(this).data('modal-title') || 'Edit Quiz';

            if (!url) return;

            loadQuizModal(url, title);
        });
    }

    /**
     * Load quiz form modal
     */
    function loadQuizModal(url, title) {
        Swal.fire({
            title: 'Loading...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                // Remove existing modal
                $('#quizFormModal').remove();

                // Add modal to container
                $('#quizModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('quizFormModal'));
                modal.show();

                // Handle form submission
                $('#quizForm').on('submit', function (e) {
                    e.preventDefault();
                    submitQuizForm(url, $(this));
                });

                // Setup academic year change handler
                $('#academic_year').on('change', function () {
                    const academicYearId = $(this).val();
                    if (academicYearId) {
                        loadTermsForAcademicYear(academicYearId);
                    } else {
                        $('#term').html('<option value="">Select Term</option>');
                    }
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load form.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit quiz form
     */
    function submitQuizForm(url, form) {
        const formElement = form[0];

        // Validate required fields before creating FormData
        const titleInput = formElement.querySelector('#title');
        if (titleInput && !titleInput.value.trim()) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Quiz title is required.',
                confirmButtonColor: '#3085d6'
            });
            titleInput.focus();
            return;
        }

        const formData = new FormData(formElement);
        const isEdit = url.includes('/edit/');

        // Debug: Log form data to console
        console.log('Form submission data:', {
            url: url,
            title: formData.get('title'),
            subject: formData.get('subject'),
            isEdit: isEdit
        });

        Swal.fire({
            title: isEdit ? 'Updating...' : 'Creating...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('quizFormModal'));
                        if (modal) {
                            modal.hide();
                        }

                        // Reload page to show updated data
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while saving.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Delete quiz
     */
    function deleteQuiz(quizId, quizTitle) {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete the quiz "${quizTitle}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Deleting...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                $.ajax({
                    url: `/quizzes/${quizId}/delete/`,
                    type: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: '#3085d6',
                                timer: 2000,
                                timerProgressBar: true
                            }).then(() => {
                                // Remove row from table
                                $(`tr[data-quiz-id="${quizId}"]`).fadeOut(300, function () {
                                    $(this).remove();
                                    // Redraw DataTable
                                    if ($.fn.DataTable) {
                                        $('#quizzesTable').DataTable().draw();
                                    }
                                });
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to delete quiz.',
                                confirmButtonColor: '#3085d6'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMessage = xhr.responseJSON?.error || 'An error occurred while deleting.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMessage,
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    /**
     * Apply filters to table
     */
    function applyFilters() {
        if (!$.fn.DataTable) return;

        const table = $('#quizzesTable').DataTable();
        const subjectFilter = $('#subjectFilter').val();
        const statusFilter = $('#statusFilter').val();
        const categoryFilter = $('#categoryFilter').val();
        const academicYearFilter = $('#academicYearFilter').val();

        // Build filter URL
        const params = new URLSearchParams();
        if (subjectFilter) params.append('subject', subjectFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (categoryFilter) params.append('category', categoryFilter);
        if (academicYearFilter) params.append('academic_year', academicYearFilter);

        // Reload page with filters
        if (params.toString()) {
            window.location.href = window.location.pathname + '?' + params.toString();
        } else {
            window.location.href = window.location.pathname;
        }
    }

    /**
     * Load terms for selected academic year
     */
    function loadTermsForAcademicYear(academicYearId) {
        $.ajax({
            url: '/quizzes/get-terms/',
            type: 'GET',
            data: {
                academic_year_id: academicYearId
            },
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                const termSelect = $('#term');
                termSelect.html('<option value="">Select Term</option>');

                if (response.terms && response.terms.length > 0) {
                    response.terms.forEach(function (term) {
                        termSelect.append(`<option value="${term.id}">${term.name}</option>`);
                    });
                }
            },
            error: function () {
                console.error('Failed to load terms');
            }
        });
    }

    /**
     * Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Get CSRF token from cookie
     */
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
})(jQuery);

