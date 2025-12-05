/**
 * School Management JavaScript
 * Handles all interactions for school information management
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        initializeDataTable();
        initializeEventListeners();
        initializeModals();
    });

    /**
     * Initialize DataTables for schools table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#schoolsTable');
        if (table.length === 0) {
            console.warn('Schools table not found');
            return;
        }

        if ($.fn.DataTable.isDataTable('#schoolsTable')) {
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
                console.warn('No header columns found in table');
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
                console.log(`Fixed ${rowsFixed} row(s) with incorrect column counts`);
            }

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
                order: [[0, 'asc']],
                deferRender: true,
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ schools",
                    infoEmpty: "No schools found",
                    infoFiltered: "(filtered from _TOTAL_ total schools)",
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
                if ($.fn.DataTable.isDataTable('#schoolsTable')) {
                    $('#schoolsTable').DataTable().destroy();
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
            if ($.fn.DataTable && $('#schoolsTable').length) {
                $('#schoolsTable').DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#activeFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#activeFilter').val('');
            if ($.fn.DataTable && $('#schoolsTable').length) {
                $('#schoolsTable').DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete school button
        $(document).on('click', '.delete-school-btn', function () {
            const schoolId = $(this).data('school-id');
            const schoolName = $(this).data('school-name');
            deleteSchool(schoolId, schoolName);
        });

        // Edit school button on detail page
        $('#editSchoolBtn').on('click', function () {
            const url = $(this).data('modal-url');
            const title = $(this).data('modal-title');
            if (url) {
                loadSchoolModal(url, title);
            }
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add/Edit School Modal
        $(document).on('click', '#addSchoolBtn, #addSchoolMenuBtn, #editSchoolMenuBtn, .edit-school-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'School Form';

            if (!url) return;

            loadSchoolModal(url, title);
        });

        // Use event delegation for form submission on modals container
        $(document).on('submit', '#schoolForm', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const form = $(this);
            const modal = form.closest('#schoolFormModal');
            const url = modal.data('form-url') || form.data('form-url');
            if (url) {
                submitSchoolForm(url, form);
            }
        });
    }

    /**
     * Load school form modal
     */
    function loadSchoolModal(url, title) {
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
                $('#schoolFormModal').remove();

                // Add modal to container
                $('#schoolModalsContainer').html(response.html);

                // Show modal
                const modalElement = document.getElementById('schoolFormModal');
                const modal = new bootstrap.Modal(modalElement);

                // Store the URL in the modal element for the event delegation handler
                $(modalElement).data('form-url', url);

                modal.show();
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
     * Submit school form
     */
    function submitSchoolForm(url, form) {
        const formData = new FormData(form[0]);
        const isEdit = url.includes('/edit/') || url.includes('/update/');

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
                        bootstrap.Modal.getInstance(document.getElementById('schoolFormModal')).hide();

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
     * Delete a school
     */
    function deleteSchool(schoolId, schoolName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete School?',
            html: `Are you sure you want to delete <strong>${schoolName}</strong>?<br>This action cannot be undone.`,
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
                    url: `/schools/${schoolId}/delete/`,
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
                                text: response.error || 'Failed to delete school.',
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
     * Apply filters
     */
    function applyFilters() {
        const activeFilter = $('#activeFilter').val();

        // Build URL with filters
        const params = new URLSearchParams();
        if (activeFilter) params.append('is_active', activeFilter);

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        // Reload page with filters
        window.location.href = '/schools/?' + params.toString();
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

