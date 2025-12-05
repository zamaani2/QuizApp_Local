/**
 * School Structure Management JavaScript
 * Handles all interactions for Form, Learning Area, and Department management
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
     * Initialize DataTables
     */
    function initializeDataTables() {
        // Forms Table
        if ($('#formsTable').length) {
            initializeDataTableForTable('#formsTable', 0, 'asc', {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ forms",
                infoEmpty: "No forms found",
                infoFiltered: "(filtered from _TOTAL_ total forms)",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            });
        }

        // Learning Areas Table
        if ($('#learningAreasTable').length) {
            initializeDataTableForTable('#learningAreasTable', 1, 'asc', {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ learning areas",
                infoEmpty: "No learning areas found",
                infoFiltered: "(filtered from _TOTAL_ total learning areas)",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            });
        }

        // Departments Table
        if ($('#departmentsTable').length) {
            initializeDataTableForTable('#departmentsTable', 1, 'asc', {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ departments",
                infoEmpty: "No departments found",
                infoFiltered: "(filtered from _TOTAL_ total departments)",
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
        // Search input
        $('#searchInput').on('keyup', debounce(function () {
            const searchValue = $(this).val();
            if ($.fn.DataTable) {
                let tableId = '';
                if ($('#formsTable').length) tableId = '#formsTable';
                else if ($('#learningAreasTable').length) tableId = '#learningAreasTable';
                else if ($('#departmentsTable').length) tableId = '#departmentsTable';

                if (tableId) {
                    $(tableId).DataTable().search(searchValue).draw();
                }
            }
        }, 300));

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            if ($.fn.DataTable) {
                let tableId = '';
                if ($('#formsTable').length) tableId = '#formsTable';
                else if ($('#learningAreasTable').length) tableId = '#learningAreasTable';
                else if ($('#departmentsTable').length) tableId = '#departmentsTable';

                if (tableId) {
                    $(tableId).DataTable().search('').draw();
                }
            }
        });

        // Delete form button
        $(document).on('click', '.delete-form-btn', function () {
            const formId = $(this).data('form-id');
            const formName = $(this).data('form-name');
            deleteForm(formId, formName);
        });

        // Delete learning area button
        $(document).on('click', '.delete-learning-area-btn', function () {
            const learningAreaId = $(this).data('learning-area-id');
            const learningAreaName = $(this).data('learning-area-name');
            deleteLearningArea(learningAreaId, learningAreaName);
        });

        // Delete department button
        $(document).on('click', '.delete-department-btn', function () {
            const departmentId = $(this).data('department-id');
            const departmentName = $(this).data('department-name');
            deleteDepartment(departmentId, departmentName);
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add/Edit Form Modal
        $(document).on('click', '#addFormBtn, .edit-form-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Form Form';

            if (!url) return;

            loadFormModal(url, title);
        });

        // Add/Edit Learning Area Modal
        $(document).on('click', '#addLearningAreaBtn, .edit-learning-area-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Learning Area Form';

            if (!url) return;

            loadLearningAreaModal(url, title);
        });

        // Add/Edit Department Modal
        $(document).on('click', '#addDepartmentBtn, .edit-department-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Department Form';

            if (!url) return;

            loadDepartmentModal(url, title);
        });
    }

    /**
     * Load form modal
     */
    function loadFormModal(url, title) {
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

                $('#formFormModal').remove();
                $('#schoolStructureModalsContainer').html(response.html);

                const modal = new bootstrap.Modal(document.getElementById('formFormModal'));
                modal.show();

                $('#formForm').on('submit', function (e) {
                    e.preventDefault();
                    submitFormForm(url, $(this));
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
     * Submit form form
     */
    function submitFormForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('formFormModal')).hide();
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
     * Load learning area modal
     */
    function loadLearningAreaModal(url, title) {
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

                $('#learningAreaFormModal').remove();
                $('#schoolStructureModalsContainer').html(response.html);

                const modal = new bootstrap.Modal(document.getElementById('learningAreaFormModal'));
                modal.show();

                $('#learningAreaForm').on('submit', function (e) {
                    e.preventDefault();
                    submitLearningAreaForm(url, $(this));
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
     * Submit learning area form
     */
    function submitLearningAreaForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('learningAreaFormModal')).hide();
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
     * Load department modal
     */
    function loadDepartmentModal(url, title) {
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

                $('#departmentFormModal').remove();
                $('#schoolStructureModalsContainer').html(response.html);

                const modal = new bootstrap.Modal(document.getElementById('departmentFormModal'));
                modal.show();

                $('#departmentForm').on('submit', function (e) {
                    e.preventDefault();
                    submitDepartmentForm(url, $(this));
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
     * Submit department form
     */
    function submitDepartmentForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('departmentFormModal')).hide();
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
     * Delete a form
     */
    function deleteForm(formId, formName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Form?',
            html: `Are you sure you want to delete <strong>${formName}</strong>?<br>This action cannot be undone.`,
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
                    url: `/forms/${formId}/delete/`,
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
                                text: response.error || 'Failed to delete form.',
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
     * Delete a learning area
     */
    function deleteLearningArea(learningAreaId, learningAreaName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Learning Area?',
            html: `Are you sure you want to delete <strong>${learningAreaName}</strong>?<br>This action cannot be undone.`,
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
                    url: `/learning-areas/${learningAreaId}/delete/`,
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
                                text: response.error || 'Failed to delete learning area.',
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
     * Delete a department
     */
    function deleteDepartment(departmentId, departmentName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Department?',
            html: `Are you sure you want to delete <strong>${departmentName}</strong>?<br>This action cannot be undone.`,
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
                    url: `/departments/${departmentId}/delete/`,
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
                                text: response.error || 'Failed to delete department.',
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

