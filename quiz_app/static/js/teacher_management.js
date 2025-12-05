/**
 * Teacher Management JavaScript
 * Handles all interactions for teacher management including modals, forms, and bulk operations
 */

(function ($) {
    'use strict';

    let selectedTeachers = new Set();

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

        // Initialize modals first (they don't depend on DataTables)
        initializeModals();

        // Then initialize event listeners
        initializeEventListeners();

        // Finally initialize DataTable (wrap in try-catch to prevent breaking other functionality)
        try {
            initializeDataTable();
        } catch (error) {
            console.error('Error during initialization:', error);
            // Continue with other functionality even if DataTables fails
        }
    });

    /**
     * Initialize DataTables for teachers table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#teachersTable');
        if (table.length === 0) {
            console.warn('Teachers table not found');
            return;
        }

        // Check if table already has DataTable initialized
        if ($.fn.DataTable.isDataTable('#teachersTable')) {
            console.log('DataTable already initialized, destroying and reinitializing');
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

            // Remove any rows with colspan (empty message rows) before initializing DataTables
            tbody.find('tr').each(function () {
                const $row = $(this);
                const hasColspan = $row.find('td[colspan]').length > 0;
                if (hasColspan) {
                    console.log('Removing row with colspan before DataTables initialization');
                    $row.remove();
                }
            });

            // Validate and fix body rows - ensure all rows have correct column count
            const bodyRows = tbody.find('tr');
            let rowsFixed = 0;

            bodyRows.each(function (index) {
                const $row = $(this);
                let rowCols = $row.find('td').length;

                // Remove any th elements that might be in tbody
                $row.find('th').each(function () {
                    $(this).replaceWith($('<td>').html($(this).html()));
                    rowCols = $row.find('td').length;
                });

                if (rowCols !== headerCols) {
                    console.warn(`Row ${index} has ${rowCols} columns, expected ${headerCols}. Fixing...`);

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
                const rowCols = $(this).find('td').length;
                if (rowCols !== headerCols) {
                    console.error(`Row ${index} still has ${rowCols} columns after fixing! Expected ${headerCols}.`);
                    allRowsValid = false;
                }
            });

            if (!allRowsValid) {
                console.error('Some rows still have incorrect column counts. Cannot initialize DataTable safely.');
                return;
            }

            if (tbody.find('tr').length > 0) {
                const firstRowCols = tbody.find('tr:first td').length;
                if (firstRowCols !== headerCols) {
                    console.error(`First row has ${firstRowCols} columns, expected ${headerCols}. Aborting DataTable initialization.`);
                    return;
                }
            }

            console.log('Initializing DataTable with', headerCols, 'columns');

            // Explicitly define columns
            const columns = [];
            for (let i = 0; i < headerCols; i++) {
                columns.push({
                    orderable: (i === 0 || i === 7) ? false : true
                });
            }

            table.DataTable({
                autoWidth: false,
                columns: columns,
                responsive: true,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                order: [[2, 'asc']],
                columnDefs: [
                    { orderable: false, targets: [0, 7] }
                ],
                deferRender: true,
                // Handle empty tables gracefully
                emptyTable: "No teachers found",
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ teachers",
                    infoEmpty: "No teachers found",
                    infoFiltered: "(filtered from _TOTAL_ total teachers)",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                // Suppress DataTables warnings for column count issues
                initComplete: function () {
                    console.log('DataTable initialization complete');
                }
            });

            console.log('DataTable initialized successfully');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
            // Don't let DataTables error break the rest of the page
        }
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Select all checkbox
        $('#selectAll').on('change', function () {
            const isChecked = $(this).prop('checked');
            $('.teacher-checkbox').prop('checked', isChecked);
            updateSelectedTeachers();
        });

        // Individual teacher checkbox
        $(document).on('change', '.teacher-checkbox', function () {
            updateSelectedTeachers();
        });

        // Search input
        $('#searchInput').on('keyup', debounce(function () {
            const searchValue = $(this).val();
            if ($.fn.DataTable) {
                $('#teachersTable').DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#departmentFilter, #genderFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#departmentFilter, #genderFilter').val('');
            if ($.fn.DataTable) {
                $('#teachersTable').DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete teacher button
        $(document).on('click', '.delete-teacher-btn', function () {
            const teacherId = $(this).data('teacher-id');
            const teacherName = $(this).data('teacher-name');
            deleteTeacher(teacherId, teacherName);
        });

        // Bulk delete button
        $('#bulkDeleteBtn').on('click', function () {
            if (selectedTeachers.size === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Selection',
                    text: 'Please select at least one teacher to delete.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }
            const url = $(this).data('modal-url');
            if (url) {
                loadBulkDeleteModal(url);
            }
        });

        // Confirm bulk delete
        $(document).on('click', '#confirmBulkDeleteBtn', function () {
            performBulkDelete();
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add/Edit Teacher Modal
        $(document).on('click', '#addTeacherBtn, #addTeacherMenuBtn, .edit-teacher-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Teacher Form';

            if (!url) return;

            loadTeacherModal(url, title);
        });

        // Bulk Import Modal
        $(document).on('click', '#importTeachersBtn', function () {
            const url = $(this).data('modal-url');
            if (!url) return;

            loadBulkImportModal(url);
        });
    }

    /**
     * Load teacher form modal
     */
    function loadTeacherModal(url, title) {
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
                $('#teacherFormModal').remove();

                // Add modal to container
                $('#teacherModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('teacherFormModal'));
                modal.show();

                // Handle form submission
                $('#teacherForm').on('submit', function (e) {
                    e.preventDefault();
                    submitTeacherForm(url, $(this));
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
     * Submit teacher form
     */
    function submitTeacherForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('teacherFormModal')).hide();

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
     * Delete a single teacher
     */
    function deleteTeacher(teacherId, teacherName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Teacher?',
            html: `Are you sure you want to delete <strong>${teacherName}</strong>?<br>This action cannot be undone.`,
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
                    url: `/teachers/${teacherId}/delete/`,
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
                                text: response.error || 'Failed to delete teacher.',
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
     * Load bulk import modal
     */
    function loadBulkImportModal(url) {
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
                $('#bulkImportModal').remove();

                // Add modal to container
                $('#teacherModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('bulkImportModal'));
                modal.show();

                // Handle form submission
                $('#bulkImportForm').on('submit', function (e) {
                    e.preventDefault();
                    submitBulkImport($(this));
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load import form.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit bulk import form
     */
    function submitBulkImport(form) {
        const formData = new FormData(form[0]);

        Swal.fire({
            title: 'Importing...',
            html: 'Please wait while we process your file.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/teachers/bulk-import/',
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
                    let message = response.message;
                    if (response.errors && response.errors.length > 0) {
                        message += `<br><br><strong>Errors (${response.error_count}):</strong><br>`;
                        message += response.errors.slice(0, 10).join('<br>');
                        if (response.errors.length > 10) {
                            message += `<br>... and ${response.errors.length - 10} more errors.`;
                        }
                    }

                    Swal.fire({
                        icon: response.imported > 0 ? 'success' : 'warning',
                        title: response.imported > 0 ? 'Import Complete!' : 'Import Failed',
                        html: message,
                        confirmButtonColor: response.imported > 0 ? '#28a745' : '#ffc107'
                    }).then(() => {
                        if (response.imported > 0) {
                            bootstrap.Modal.getInstance(document.getElementById('bulkImportModal')).hide();
                            location.reload();
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred during import.',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while importing.';
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
     * Load bulk delete modal
     */
    function loadBulkDeleteModal(url) {
        if (selectedTeachers.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Selection',
                text: 'Please select at least one teacher to delete.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        $.ajax({
            url: url,
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                // Remove existing modal
                $('#bulkDeleteModal').remove();

                // Add modal to container (response.html contains the HTML)
                $('#teacherModalsContainer').html(response.html || response);

                // Update selected count
                $('#selectedCount').text(selectedTeachers.size);

                // List selected teachers
                const listContainer = $('#selectedTeachersList');
                listContainer.empty();
                selectedTeachers.forEach(function (teacherId) {
                    const row = $(`tr[data-teacher-id="${teacherId}"]`);
                    const name = row.find('td:eq(2)').text().trim();
                    listContainer.append(`<div class="badge bg-secondary me-1 mb-1">${name}</div>`);
                });

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('bulkDeleteModal'));
                modal.show();
            },
            error: function (xhr) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load delete confirmation.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Perform bulk delete
     */
    function performBulkDelete() {
        const teacherIds = Array.from(selectedTeachers);

        Swal.fire({
            icon: 'warning',
            title: 'Confirm Delete',
            html: `Are you sure you want to delete <strong>${teacherIds.length}</strong> teacher(s)?<br>This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete them!',
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
                    url: '/teachers/bulk-delete/',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ teacher_ids: teacherIds }),
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
                                bootstrap.Modal.getInstance(document.getElementById('bulkDeleteModal')).hide();
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to delete teachers.',
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
     * Update selected teachers set
     */
    function updateSelectedTeachers() {
        selectedTeachers.clear();
        $('.teacher-checkbox:checked').each(function () {
            selectedTeachers.add($(this).val());
        });

        // Update bulk delete button state
        $('#bulkDeleteBtn').prop('disabled', selectedTeachers.size === 0);

        // Update select all checkbox
        const totalCheckboxes = $('.teacher-checkbox').length;
        const checkedCheckboxes = $('.teacher-checkbox:checked').length;
        $('#selectAll').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
    }

    /**
     * Apply filters
     */
    function applyFilters() {
        const departmentFilter = $('#departmentFilter').val();
        const genderFilter = $('#genderFilter').val();

        // Build URL with filters
        const params = new URLSearchParams();
        if (departmentFilter) params.append('department', departmentFilter);
        if (genderFilter) params.append('gender', genderFilter);

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        // Reload page with filters
        window.location.href = '/teachers/?' + params.toString();
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

