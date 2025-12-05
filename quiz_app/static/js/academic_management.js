/**
 * Academic Year and Term Management JavaScript
 * Handles all interactions for academic year and term management including modals, forms, and operations
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        initializeDataTables();
        initializeEventListeners();
        initializeModals();
    });

    /**
     * Initialize DataTables with validation
     */
    function initializeDataTableForTable(tableSelector, orderColumn, orderDirection, languageConfig) {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $(tableSelector);
        if (table.length === 0) {
            return;
        }

        if ($.fn.DataTable.isDataTable(tableSelector)) {
            try {
                table.DataTable().destroy();
            } catch (e) {
                console.warn('Error destroying existing DataTable:', e);
                table.removeData();
            }
        }

        try {
            const headerRow = table.find('thead tr:first');
            const headerCols = headerRow.find('th').length;

            if (headerCols === 0) {
                console.warn('No header columns found in table:', tableSelector);
                return;
            }

            let tbody = table.find('tbody');
            if (tbody.length === 0) {
                tbody = $('<tbody></tbody>');
                table.append(tbody);
            }

            tbody.find('tr').each(function () {
                const $row = $(this);
                if ($row.find('td[colspan]').length > 0) {
                    $row.remove();
                }
            });

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
                console.log(`Fixed ${rowsFixed} row(s) with incorrect column counts in ${tableSelector}`);
            }

            let allRowsValid = true;
            tbody.find('tr').each(function (index) {
                if ($(this).find('td').length !== headerCols) {
                    allRowsValid = false;
                }
            });

            if (!allRowsValid) {
                console.error('Some rows still have incorrect column counts. Cannot initialize DataTable safely for:', tableSelector);
                return;
            }

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
                order: [[orderColumn, orderDirection]],
                deferRender: true,
                language: languageConfig
            });
        } catch (error) {
            console.error('Error initializing DataTable for', tableSelector, ':', error);
            console.error('Error details:', error.message, error.stack);

            try {
                if ($.fn.DataTable.isDataTable(tableSelector)) {
                    $(tableSelector).DataTable().destroy();
                }
            } catch (cleanupError) {
                console.error('Error cleaning up DataTable:', cleanupError);
            }
        }
    }

    /**
     * Initialize DataTables for academic years and terms tables
     */
    function initializeDataTables() {
        // Academic Years Table
        if ($('#academicYearsTable').length) {
            initializeDataTableForTable('#academicYearsTable', 1, 'desc', {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ academic years",
                infoEmpty: "No academic years found",
                infoFiltered: "(filtered from _TOTAL_ total academic years)",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            });
        }

        // Terms Table
        if ($('#termsTable').length) {
            initializeDataTableForTable('#termsTable', 2, 'desc', {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ terms",
                infoEmpty: "No terms found",
                infoFiltered: "(filtered from _TOTAL_ total terms)",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            });
        }
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Search input for academic years
        $('#searchInput').on('keyup', debounce(function () {
            const searchValue = $(this).val();
            if ($.fn.DataTable) {
                const tableId = $('#academicYearsTable').length ? '#academicYearsTable' : '#termsTable';
                $(tableId).DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#currentFilter, #academicYearFilter, #termNumberFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#currentFilter, #academicYearFilter, #termNumberFilter').val('');
            if ($.fn.DataTable) {
                const tableId = $('#academicYearsTable').length ? '#academicYearsTable' : '#termsTable';
                $(tableId).DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete academic year button
        $(document).on('click', '.delete-academic-year-btn', function () {
            const academicYearId = $(this).data('academic-year-id');
            const academicYearName = $(this).data('academic-year-name');
            deleteAcademicYear(academicYearId, academicYearName);
        });

        // Delete term button
        $(document).on('click', '.delete-term-btn', function () {
            const termId = $(this).data('term-id');
            const termName = $(this).data('term-name');
            deleteTerm(termId, termName);
        });

        // Set current academic year button
        $(document).on('click', '.set-current-btn', function () {
            const academicYearId = $(this).data('academic-year-id');
            setCurrentAcademicYear(academicYearId);
        });

        // Set current term button
        $(document).on('click', '.set-current-term-btn', function () {
            const termId = $(this).data('term-id');
            setCurrentTerm(termId);
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add/Edit Academic Year Modal
        $(document).on('click', '#addAcademicYearBtn, .edit-academic-year-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Academic Year Form';

            if (!url) return;

            loadAcademicYearModal(url, title);
        });

        // Add/Edit Term Modal
        $(document).on('click', '#addTermBtn, .edit-term-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Term Form';

            if (!url) return;

            loadTermModal(url, title);
        });
    }

    /**
     * Load academic year form modal
     */
    function loadAcademicYearModal(url, title) {
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
                $('#academicYearFormModal').remove();

                // Add modal to container
                $('#academicModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('academicYearFormModal'));
                modal.show();

                // Handle form submission
                $('#academicYearForm').on('submit', function (e) {
                    e.preventDefault();
                    submitAcademicYearForm(url, $(this));
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
     * Submit academic year form
     */
    function submitAcademicYearForm(url, form) {
        const formData = new FormData(form[0]);
        const isEdit = url.includes('/edit/');

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
                        title: 'Success!',
                        text: response.message,
                        confirmButtonColor: '#28a745',
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    }).then(() => {
                        // Close modal
                        bootstrap.Modal.getInstance(document.getElementById('academicYearFormModal')).hide();

                        // Reload page to show updated data
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred.',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                let errorMsg = 'An error occurred while saving.';

                try {
                    if (xhr.responseJSON) {
                        errorMsg = xhr.responseJSON.error || xhr.responseJSON.message || errorMsg;
                    } else if (xhr.responseText) {
                        const parsed = JSON.parse(xhr.responseText);
                        errorMsg = parsed.error || parsed.message || errorMsg;
                    }
                } catch (e) {
                    console.error('Error parsing response:', e);
                    if (xhr.responseText) {
                        errorMsg = xhr.responseText.substring(0, 200);
                    }
                }

                console.error('Academic year form error:', xhr.status, errorMsg, xhr.responseJSON);

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMsg,
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    /**
     * Load term form modal
     */
    function loadTermModal(url, title) {
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
                $('#termFormModal').remove();

                // Add modal to container
                $('#academicModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('termFormModal'));
                modal.show();

                // Handle form submission
                $('#termForm').on('submit', function (e) {
                    e.preventDefault();
                    submitTermForm(url, $(this));
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
     * Submit term form
     */
    function submitTermForm(url, form) {
        const formData = new FormData(form[0]);
        const isEdit = url.includes('/edit/');

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
                        title: 'Success!',
                        text: response.message,
                        confirmButtonColor: '#28a745',
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                    }).then(() => {
                        // Close modal
                        bootstrap.Modal.getInstance(document.getElementById('termFormModal')).hide();

                        // Reload page to show updated data
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred.',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while saving.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMsg,
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    /**
     * Delete an academic year
     */
    function deleteAcademicYear(academicYearId, academicYearName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Academic Year?',
            html: `Are you sure you want to delete <strong>${academicYearName}</strong>?<br>This will also delete all associated terms. This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
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
                    url: `/academic-years/${academicYearId}/delete/`,
                    type: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: '#28a745',
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to delete academic year.',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMsg = xhr.responseJSON?.error || 'An error occurred while deleting.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMsg,
                            confirmButtonColor: '#dc3545'
                        });
                    }
                });
            }
        });
    }

    /**
     * Delete a term
     */
    function deleteTerm(termId, termName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Term?',
            html: `Are you sure you want to delete <strong>${termName}</strong>?<br>This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
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
                    url: `/terms/${termId}/delete/`,
                    type: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: '#28a745',
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to delete term.',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMsg = xhr.responseJSON?.error || 'An error occurred while deleting.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMsg,
                            confirmButtonColor: '#dc3545'
                        });
                    }
                });
            }
        });
    }

    /**
     * Set current academic year
     */
    function setCurrentAcademicYear(academicYearId) {
        Swal.fire({
            icon: 'question',
            title: 'Set as Current?',
            text: 'Are you sure you want to set this academic year as current?',
            showCancelButton: true,
            confirmButtonText: 'Yes, set as current',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Updating...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                $.ajax({
                    url: `/academic-years/${academicYearId}/set-current/`,
                    type: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success!',
                                text: response.message,
                                confirmButtonColor: '#28a745',
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to set current academic year.',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMsg = xhr.responseJSON?.error || 'An error occurred.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMsg,
                            confirmButtonColor: '#dc3545'
                        });
                    }
                });
            }
        });
    }

    /**
     * Set current term
     */
    function setCurrentTerm(termId) {
        Swal.fire({
            icon: 'question',
            title: 'Set as Current?',
            text: 'Are you sure you want to set this term as current?',
            showCancelButton: true,
            confirmButtonText: 'Yes, set as current',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Updating...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                $.ajax({
                    url: `/terms/${termId}/set-current/`,
                    type: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success!',
                                text: response.message,
                                confirmButtonColor: '#28a745',
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to set current term.',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMsg = xhr.responseJSON?.error || 'An error occurred.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMsg,
                            confirmButtonColor: '#dc3545'
                        });
                    }
                });
            }
        });
    }

    /**
     * Apply filters
     */
    function applyFilters() {
        const currentFilter = $('#currentFilter').val();
        const academicYearFilter = $('#academicYearFilter').val();
        const termNumberFilter = $('#termNumberFilter').val();

        // Build URL with filters
        const params = new URLSearchParams();
        if (currentFilter) params.append('is_current', currentFilter);
        if (academicYearFilter) params.append('academic_year', academicYearFilter);
        if (termNumberFilter) params.append('term_number', termNumberFilter);

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        // Reload page with filters
        const currentPath = window.location.pathname;
        window.location.href = currentPath + '?' + params.toString();
    }

    /**
     * Get CSRF token
     */
    function getCsrfToken() {
        return $('[name=csrfmiddlewaretoken]').val() ||
            document.cookie.split('; ')
                .find(row => row.startsWith('csrftoken='))
                ?.split('=')[1] || '';
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

})(jQuery);

