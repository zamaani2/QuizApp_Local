/**
 * Class Management JavaScript
 * Handles all interactions for class management including modals, forms, and ClassSubject management
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        initializeDataTable();
        initializeEventListeners();
        initializeModals();
    });

    /**
     * Initialize DataTables for classes table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#classesTable');
        if (table.length === 0) {
            console.warn('Classes table not found');
            return;
        }

        // Check if table already has DataTable initialized
        if ($.fn.DataTable.isDataTable('#classesTable')) {
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

            console.log('Table has', headerCols, 'header columns');

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
                    rowCols = $row.find('td').length; // Recalculate
                });

                if (rowCols !== headerCols) {
                    console.warn(`Row ${index} has ${rowCols} columns, expected ${headerCols}. Fixing...`);

                    // If row has fewer columns, add empty cells
                    if (rowCols < headerCols) {
                        for (let i = rowCols; i < headerCols; i++) {
                            $row.append('<td></td>');
                        }
                        rowsFixed++;
                    }
                    // If row has more columns, remove excess
                    else if (rowCols > headerCols) {
                        $row.find('td').slice(headerCols).remove();
                        rowsFixed++;
                    }
                }

                // Ensure all cells are proper td elements
                $row.find('td').each(function () {
                    if (this.tagName !== 'TD') {
                        $(this).replaceWith($('<td>').html($(this).html()));
                    }
                });
            });

            if (rowsFixed > 0) {
                console.log(`Fixed ${rowsFixed} row(s) with incorrect column counts`);
            }

            // Final validation - re-check all rows after fixes
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

            // Additional check: ensure table structure is valid
            if (tbody.find('tr').length > 0) {
                const firstRowCols = tbody.find('tr:first td').length;
                if (firstRowCols !== headerCols) {
                    console.error(`First row has ${firstRowCols} columns, expected ${headerCols}. Aborting DataTable initialization.`);
                    return;
                }
            }

            console.log('Initializing DataTable with', headerCols, 'columns');

            // Explicitly define columns to prevent auto-detection issues
            const columns = [];
            for (let i = 0; i < headerCols; i++) {
                columns.push({
                    orderable: (i === 7) ? false : true  // Actions column (7) not sortable
                });
            }

            table.DataTable({
                autoWidth: false,
                columns: columns,
                responsive: true,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                order: [[4, 'desc']],
                columnDefs: [
                    { orderable: false, targets: [7] }  // Actions column (7)
                ],
                deferRender: true,
                // Handle empty tables gracefully
                emptyTable: "No classes found",
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ classes",
                    infoEmpty: "No classes found",
                    infoFiltered: "(filtered from _TOTAL_ total classes)",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                initComplete: function () {
                    console.log('DataTable initialization complete');
                }
            });

            console.log('DataTable initialized successfully');
        } catch (error) {
            console.error('Error initializing DataTable:', error);
            console.error('Error details:', error.message, error.stack);

            // Try to clean up any partial initialization
            try {
                if ($.fn.DataTable.isDataTable('#classesTable')) {
                    $('#classesTable').DataTable().destroy();
                }
            } catch (cleanupError) {
                console.error('Error cleaning up DataTable:', cleanupError);
            }

            // Log table structure for debugging
            const headerCols = table.find('thead tr:first th').length;
            const bodyRows = table.find('tbody tr');
            console.log('Table structure at error:');
            console.log('- Header columns:', headerCols);
            console.log('- Body rows:', bodyRows.length);
            bodyRows.each(function (index) {
                const cols = $(this).find('td').length;
                console.log(`- Row ${index}: ${cols} columns`);
            });
        }
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Search input
        $('#searchInput').on('keyup', debounce(function () {
            const searchValue = $(this).val();
            if ($.fn.DataTable && $('#classesTable').length) {
                $('#classesTable').DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#formFilter, #learningAreaFilter, #academicYearFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#formFilter, #learningAreaFilter, #academicYearFilter').val('');
            if ($.fn.DataTable && $('#classesTable').length) {
                $('#classesTable').DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete class button
        $(document).on('click', '.delete-class-btn', function () {
            const classId = $(this).data('class-id');
            const className = $(this).data('class-name');
            deleteClass(classId, className);
        });

        // Add subject to class button (on detail page)
        $('#confirmAddSubjectBtn').on('click', function () {
            addSubjectToClass();
        });

        // Remove subject from class button
        $(document).on('click', '.remove-subject-btn', function () {
            const classSubjectId = $(this).data('class-subject-id');
            const subjectName = $(this).data('subject-name');
            removeSubjectFromClass(classSubjectId, subjectName);
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add/Edit Class Modal
        $(document).on('click', '#addClassBtn, #addClassMenuBtn, .edit-class-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Class Form';

            if (!url) return;

            loadClassModal(url, title);
        });
    }

    /**
     * Load class form modal
     */
    function loadClassModal(url, title) {
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
                $('#classFormModal').remove();

                // Add modal to container
                $('#classModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('classFormModal'));
                modal.show();

                // Handle form submission
                $('#classForm').on('submit', function (e) {
                    e.preventDefault();
                    submitClassForm(url, $(this));
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
     * Submit class form
     */
    function submitClassForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('classFormModal')).hide();

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
     * Delete a class
     */
    function deleteClass(classId, className) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Class?',
            html: `Are you sure you want to delete <strong>${className}</strong>?<br>This action cannot be undone.`,
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
                    url: `/classes/${classId}/delete/`,
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
                                text: response.error || 'Failed to delete class.',
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
     * Add subject to class
     */
    function addSubjectToClass() {
        const subjectId = $('#subjectSelect').val();
        const currentClassId = typeof classId !== 'undefined' ? classId : null;

        if (!currentClassId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Class ID not found.',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        if (!subjectId) {
            Swal.fire({
                icon: 'warning',
                title: 'No Selection',
                text: 'Please select a subject to add.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        Swal.fire({
            title: 'Adding...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: `/classes/${currentClassId}/subjects/add/`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ subject_id: subjectId }),
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
                        // Close modal
                        bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();

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
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while adding subject.';
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
     * Remove subject from class
     */
    function removeSubjectFromClass(classSubjectId, subjectName) {
        const currentClassId = typeof classId !== 'undefined' ? classId : null;

        if (!currentClassId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Class ID not found.',
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        Swal.fire({
            icon: 'warning',
            title: 'Remove Subject?',
            html: `Are you sure you want to remove <strong>${subjectName}</strong> from this class?<br>This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, remove it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Removing...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                $.ajax({
                    url: `/classes/${currentClassId}/subjects/${classSubjectId}/remove/`,
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
                                title: 'Removed!',
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
                                text: response.error || 'Failed to remove subject.',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMsg = xhr.responseJSON?.error || 'An error occurred while removing subject.';
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
        const formFilter = $('#formFilter').val();
        const learningAreaFilter = $('#learningAreaFilter').val();
        const academicYearFilter = $('#academicYearFilter').val();

        // Build URL with filters
        const params = new URLSearchParams();
        if (formFilter) params.append('form', formFilter);
        if (learningAreaFilter) params.append('learning_area', learningAreaFilter);
        if (academicYearFilter) params.append('academic_year', academicYearFilter);

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        // Reload page with filters
        window.location.href = '/classes/?' + params.toString();
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

