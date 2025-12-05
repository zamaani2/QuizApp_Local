/**
 * Quiz Assignment Management JavaScript
 * Handles class assignment operations for quizzes
 */
(function ($) {
    'use strict';

    $(document).ready(function () {
        // Initialize DataTables
        if ($('#assignedClassesTable').length) {
            try {
                const table = $('#assignedClassesTable');

                if ($.fn.DataTable.isDataTable('#assignedClassesTable')) {
                    try {
                        table.DataTable().destroy();
                    } catch (e) {
                        table.removeData();
                    }
                }

                const headerRow = table.find('thead tr:first');
                const headerCols = headerRow.find('th').length;

                if (headerCols > 0) {
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
                            } else if (rowCols > headerCols) {
                                $row.find('td').slice(headerCols).remove();
                            }
                        }
                    });

                    const columns = [];
                    for (let i = 0; i < headerCols; i++) {
                        columns.push({ orderable: (i === 0 || i === 5) ? false : true });
                    }

                    table.DataTable({
                        autoWidth: false,
                        columns: columns,
                        pageLength: 25,
                        order: [[1, 'asc']],
                        columnDefs: [
                            { orderable: false, targets: [0, 5] }
                        ],
                        deferRender: true
                    });
                }
            } catch (error) {
                console.error('Error initializing DataTable:', error);
            }
        }

        // Initialize bulk selection
        initializeBulkSelection();

        // Initialize modals
        initializeModals();

        // Initialize event listeners
        initializeEventListeners();
    });

    /**
     * Initialize bulk selection functionality
     */
    function initializeBulkSelection() {
        // Select All checkbox
        $(document).on('change', '#selectAllClasses', function () {
            const isChecked = $(this).is(':checked');
            $('.class-checkbox').prop('checked', isChecked);
            updateBulkUnassignButton();
        });

        // Individual checkbox change
        $(document).on('change', '.class-checkbox', function () {
            updateSelectAllCheckbox();
            updateBulkUnassignButton();
        });
    }

    /**
     * Update select all checkbox state
     */
    function updateSelectAllCheckbox() {
        const totalCheckboxes = $('.class-checkbox').length;
        const checkedCheckboxes = $('.class-checkbox:checked').length;
        const selectAllCheckbox = $('#selectAllClasses');

        if (checkedCheckboxes === 0) {
            selectAllCheckbox.prop('checked', false);
            selectAllCheckbox.prop('indeterminate', false);
        } else if (checkedCheckboxes === totalCheckboxes) {
            selectAllCheckbox.prop('checked', true);
            selectAllCheckbox.prop('indeterminate', false);
        } else {
            selectAllCheckbox.prop('checked', false);
            selectAllCheckbox.prop('indeterminate', true);
        }
    }

    /**
     * Update bulk unassign button state
     */
    function updateBulkUnassignButton() {
        const selectedCount = $('.class-checkbox:checked').length;
        const bulkUnassignBtn = $('#bulkUnassignBtn');

        if (selectedCount > 0) {
            bulkUnassignBtn.prop('disabled', false);
            bulkUnassignBtn.html(`<i class="bi bi-trash me-1"></i>Unassign Selected (${selectedCount})`);
        } else {
            bulkUnassignBtn.prop('disabled', true);
            bulkUnassignBtn.html('<i class="bi bi-trash me-1"></i>Unassign Selected');
        }
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Assign classes button
        $(document).on('click', '#assignClassesBtn, #assignClassesLink', function (e) {
            e.preventDefault();
            const url = $(this).data('modal-url') || $(this).attr('data-modal-url');
            if (url) {
                loadAssignmentModal(url);
            }
        });

        // Bulk unassign button
        $(document).on('click', '#bulkUnassignBtn', function () {
            const url = $(this).data('modal-url');
            if (!url) return;

            const selectedClasses = getSelectedClasses();
            if (selectedClasses.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Selection',
                    text: 'Please select at least one class to unassign.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadBulkUnassignModal(url, selectedClasses);
        });
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Unassign single class
        $(document).on('click', '.unassign-class-btn', function () {
            const quizId = $(this).data('quiz-id');
            const classId = $(this).data('class-id');
            const className = $(this).data('class-name');

            Swal.fire({
                title: 'Unassign Class?',
                text: `Are you sure you want to unassign "${className}" from this quiz?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, unassign it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    unassignClass(quizId, classId, className);
                }
            });
        });
    }

    /**
     * Load assignment modal
     */
    function loadAssignmentModal(url) {
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
                $('#quizAssignmentModal').remove();

                // Add modal to container
                $('#quizAssignmentModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('quizAssignmentModal'));
                modal.show();

                // Handle form submission
                $('#quizAssignmentForm').on('submit', function (e) {
                    e.preventDefault();
                    submitAssignmentForm(url, $(this));
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load assignment form.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit assignment form
     */
    function submitAssignmentForm(url, form) {
        const formData = new FormData(form[0]);

        Swal.fire({
            title: 'Assigning...',
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
                        const modal = bootstrap.Modal.getInstance(document.getElementById('quizAssignmentModal'));
                        if (modal) {
                            modal.hide();
                        }

                        // Reload page
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
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while assigning classes.';
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
     * Unassign a single class
     */
    function unassignClass(quizId, classId, className) {
        Swal.fire({
            title: 'Unassigning...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: `/quizzes/${quizId}/assignments/${classId}/delete/`,
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
                        title: 'Unassigned!',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'Failed to unassign class.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while unassigning.';
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
     * Get selected classes
     */
    function getSelectedClasses() {
        const selected = [];
        $('.class-checkbox:checked').each(function () {
            selected.push({
                id: $(this).data('class-id'),
                name: $(this).data('class-name')
            });
        });
        return selected;
    }

    /**
     * Load bulk unassign modal
     */
    function loadBulkUnassignModal(url, selectedClasses) {
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
                $('#bulkUnassignModal').remove();

                // Add modal to container
                $('#quizAssignmentModalsContainer').html(response.html);

                // Update modal with selected classes
                updateBulkUnassignModalContent(selectedClasses);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('bulkUnassignModal'));
                modal.show();

                // Handle confirmation
                $('#confirmBulkUnassignBtn').on('click', function () {
                    confirmBulkUnassign(url, selectedClasses);
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load unassign confirmation.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Update bulk unassign modal content
     */
    function updateBulkUnassignModalContent(selectedClasses) {
        const count = selectedClasses.length;
        $('#selectedClassesCount').text(count);

        // Update classes list
        const listContainer = $('#selectedClassesList');
        if (count <= 10) {
            let listHtml = '<ul class="list-unstyled mb-0">';
            selectedClasses.forEach(function (classObj) {
                listHtml += `<li><small><i class="bi bi-dot me-1"></i>${classObj.name}</small></li>`;
            });
            listHtml += '</ul>';
            listContainer.html(listHtml);
        } else {
            let listHtml = '<ul class="list-unstyled mb-0">';
            for (let i = 0; i < 10; i++) {
                listHtml += `<li><small><i class="bi bi-dot me-1"></i>${selectedClasses[i].name}</small></li>`;
            }
            listHtml += `</ul><p class="text-muted small mt-2 mb-0"><strong>and ${count - 10} more class(es)...</strong></p>`;
            listContainer.html(listHtml);
        }
    }

    /**
     * Confirm and execute bulk unassign
     */
    function confirmBulkUnassign(url, selectedClasses) {
        const classIds = selectedClasses.map(c => parseInt(c.id)).filter(id => !isNaN(id));

        if (classIds.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No valid class IDs found.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        Swal.fire({
            title: 'Unassigning...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                class_ids: classIds
            }),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkUnassignModal'));
                    if (modal) {
                        modal.hide();
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Unassigned!',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'Failed to unassign classes.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while unassigning.';
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
     * Get CSRF token from cookies
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

