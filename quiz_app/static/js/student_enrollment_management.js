/**
 * Student Enrollment Management JavaScript
 * Handles all interactions for student class enrollment management including modals, forms, and bulk operations
 */

(function ($) {
    'use strict';

    let selectedEnrollments = new Set();

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
     * Initialize DataTables for enrollments table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#enrollmentsTable');
        if (table.length === 0) {
            console.warn('Enrollments table not found');
            return;
        }

        // Check if table already has DataTable initialized
        if ($.fn.DataTable.isDataTable('#enrollmentsTable')) {
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

            console.log('Initializing DataTable with', headerCols, 'columns');

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
                order: [[4, 'desc']],
                deferRender: true,
                // Handle empty tables gracefully
                emptyTable: "No enrollments found",
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ enrollments",
                    infoEmpty: "No enrollments found",
                    infoFiltered: "(filtered from _TOTAL_ total enrollments)",
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

            try {
                if ($.fn.DataTable.isDataTable('#enrollmentsTable')) {
                    $('#enrollmentsTable').DataTable().destroy();
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
        // Select all checkbox
        $(document).on('change', '#selectAll', function () {
            const isChecked = $(this).is(':checked');
            $('.enrollment-checkbox').prop('checked', isChecked);
            updateSelectedEnrollments();
        });

        // Individual checkbox
        $(document).on('change', '.enrollment-checkbox', function () {
            updateSelectedEnrollments();
        });

        // Clear filters
        $(document).on('click', '#clearFiltersBtn', function () {
            $('#searchInput').val('');
            $('#studentFilter').val('');
            $('#classFilter').val('');
            $('#activeFilter').val('');
            applyFilters();
        });

        // Apply filters on change
        $('#studentFilter, #classFilter, #activeFilter').on('change', function () {
            applyFilters();
        });

        // Search input with debounce
        let searchTimeout;
        $('#searchInput').on('keyup', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(function () {
                applyFilters();
            }, 500);
        });
    }

    /**
     * Update selected enrollments set
     */
    function updateSelectedEnrollments() {
        selectedEnrollments.clear();
        $('.enrollment-checkbox:checked').each(function () {
            selectedEnrollments.add($(this).val());
        });

        // Update select all checkbox
        const totalCheckboxes = $('.enrollment-checkbox').length;
        const checkedCheckboxes = $('.enrollment-checkbox:checked').length;
        $('#selectAll').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);

        // Update bulk unassign button
        $('#bulkUnassignBtn').prop('disabled', selectedEnrollments.size === 0);
    }

    /**
     * Apply filters
     */
    function applyFilters() {
        const params = new URLSearchParams();

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        const studentFilter = $('#studentFilter').val();
        if (studentFilter) params.append('student', studentFilter);

        const classFilter = $('#classFilter').val();
        if (classFilter) params.append('class', classFilter);

        const activeFilter = $('#activeFilter').val();
        if (activeFilter) params.append('is_active', activeFilter);

        // Reload page with filters
        window.location.href = '/enrollments/?' + params.toString();
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add Enrollment Modal
        $(document).on('click', '#addEnrollmentBtn, #addEnrollmentMenuBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Add enrollment button clicked');

            const url = $(this).data('modal-url');
            const title = $(this).data('modal-title') || 'Assign Student to Class';

            console.log('Enrollment modal URL:', url, 'Title:', title);

            if (!url) {
                console.error('No URL found for enrollment modal');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the enrollment modal. Please refresh the page.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadEnrollmentModal(url, title);
        });

        // Bulk Assign Modal
        $(document).on('click', '#bulkAssignBtn, #bulkAssignMenuBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Bulk assign button clicked');

            const url = $(this).data('modal-url');
            console.log('Bulk assign modal URL:', url);

            if (!url) {
                console.error('No URL found for bulk assign modal');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the bulk assign modal. Please refresh the page.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadBulkEnrollmentModal(url);
        });

        // Bulk Unassign Modal
        $(document).on('click', '#bulkUnassignBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (selectedEnrollments.size === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Selection',
                    text: 'Please select at least one enrollment to unassign.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadBulkUnassignModal();
        });

        // Edit Enrollment Modal
        $(document).on('click', '.edit-enrollment-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Edit Enrollment';

            if (!url) return;

            loadEnrollmentModal(url, title);
        });

        // Delete Enrollment
        $(document).on('click', '.delete-enrollment-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const enrollmentId = $(this).data('enrollment-id');
            const enrollmentInfo = $(this).data('enrollment-info');

            deleteEnrollment(enrollmentId, enrollmentInfo);
        });
    }

    /**
     * Load enrollment form modal
     */
    function loadEnrollmentModal(url, title) {
        console.log('Loading enrollment modal from URL:', url);

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
                console.log('Enrollment modal response received:', response);
                Swal.close();

                // Ensure modal container exists
                if ($('#enrollmentModalsContainer').length === 0) {
                    console.error('Modal container not found!');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Modal container not found. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                // Remove existing modal
                $('#enrollmentFormModal').remove();

                // Add modal to container
                $('#enrollmentModalsContainer').html(response.html);

                // Show modal
                const modalElement = document.getElementById('enrollmentFormModal');
                if (!modalElement) {
                    console.error('Enrollment modal element not found after adding HTML');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to create enrollment modal. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                const modal = new bootstrap.Modal(modalElement);
                modal.show();

                // Handle form submission
                $('#enrollmentForm').on('submit', function (e) {
                    e.preventDefault();
                    submitEnrollmentForm(url, $(this));
                });
            },
            error: function (xhr) {
                console.error('AJAX error loading enrollment modal:', xhr);
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load form. Please check the console for details.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit enrollment form
     */
    function submitEnrollmentForm(url, form) {
        const formData = new FormData(form[0]);
        const isEdit = url.includes('/edit/');

        Swal.fire({
            title: isEdit ? 'Updating...' : 'Assigning...',
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
                        bootstrap.Modal.getInstance(document.getElementById('enrollmentFormModal')).hide();

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
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while processing your request.';
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
     * Load bulk enrollment modal
     */
    function loadBulkEnrollmentModal(url) {
        console.log('Loading bulk enrollment modal from URL:', url);

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
                console.log('Bulk enrollment modal response received:', response);
                Swal.close();

                // Handle different response formats
                let htmlContent = null;
                if (typeof response === 'string') {
                    // Response is HTML string directly
                    htmlContent = response;
                } else if (response && response.html) {
                    // Response is object with html property
                    htmlContent = response.html;
                } else {
                    console.error('Invalid response format:', response);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Invalid response from server. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                if (!htmlContent || htmlContent.trim() === '') {
                    console.error('Empty HTML content in response');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Empty response from server. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                // Ensure modal container exists
                const container = $('#enrollmentModalsContainer');
                if (container.length === 0) {
                    console.error('Modal container not found!');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Modal container not found. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                // Remove existing modal
                $('#bulkEnrollmentFormModal').remove();

                // Add modal to container
                container.html(htmlContent);

                // Wait a moment for DOM to update, then check for modal
                setTimeout(function () {
                    // Try multiple ways to find the modal
                    let modalElement = document.getElementById('bulkEnrollmentFormModal');

                    // If not found by ID, try finding by class within container
                    if (!modalElement) {
                        const modalByClass = container.find('.modal[id="bulkEnrollmentFormModal"]');
                        if (modalByClass.length > 0) {
                            modalElement = modalByClass[0];
                        } else {
                            // Try finding any modal in container
                            const anyModal = container.find('.modal').first();
                            if (anyModal.length > 0) {
                                console.warn('Found modal but with different ID, using it anyway');
                                modalElement = anyModal[0];
                            }
                        }
                    }

                    if (!modalElement) {
                        console.error('Bulk enrollment modal element not found after adding HTML');
                        console.error('Container HTML length:', container.html().length);
                        console.error('Container HTML preview:', container.html().substring(0, 500));
                        console.error('Looking for element with ID: bulkEnrollmentFormModal');
                        console.error('Container children:', container.children().length);
                        console.error('Modals in container:', container.find('.modal').length);

                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Failed to create bulk enrollment modal. Please refresh the page.',
                            confirmButtonColor: '#3085d6'
                        });
                        return;
                    }

                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();

                    // Handle form submission
                    $('#bulkEnrollmentForm').on('submit', function (e) {
                        e.preventDefault();
                        submitBulkEnrollmentForm($(this));
                    });
                }, 100); // Small delay to ensure DOM is updated
            },
            error: function (xhr) {
                console.error('AJAX error loading bulk enrollment modal:', xhr);
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load bulk enrollment form. Please check the console for details.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit bulk enrollment form
     */
    function submitBulkEnrollmentForm(form) {
        const classId = $('#bulk_class').val();
        const studentIds = Array.from($('#bulk_students').val() || []);

        if (!classId || studentIds.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please select a class and at least one student.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        Swal.fire({
            title: 'Assigning Students...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/enrollments/bulk-create/',
            type: 'POST',
            data: JSON.stringify({
                class_id: classId,
                student_ids: studentIds
            }),
            contentType: 'application/json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
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
                        icon: 'success',
                        title: 'Success!',
                        html: message,
                        confirmButtonColor: '#28a745',
                        timer: 3000,
                        timerProgressBar: true,
                        showConfirmButton: true
                    }).then(() => {
                        // Close modal
                        bootstrap.Modal.getInstance(document.getElementById('bulkEnrollmentFormModal')).hide();

                        // Reload page to show updated data
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred during bulk assignment.',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while assigning students.';
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
     * Load bulk unassign modal
     */
    function loadBulkUnassignModal() {
        if (selectedEnrollments.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Selection',
                text: 'Please select at least one enrollment to unassign.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        // Get enrollment details for display
        const enrollmentIds = Array.from(selectedEnrollments);
        const enrollmentDetails = [];

        $('.enrollment-checkbox:checked').each(function () {
            const row = $(this).closest('tr');
            const studentName = row.find('td:eq(1)').text().trim();
            const className = row.find('td:eq(3)').text().trim();
            enrollmentDetails.push(`${studentName} - ${className}`);
        });

        // Remove existing modal
        $('#bulkUnassignModal').remove();

        // Load modal template
        const modalHtml = `
            <div class="modal fade" id="bulkUnassignModal" tabindex="-1" aria-labelledby="bulkUnassignModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="bulkUnassignModalLabel">Bulk Unassign Students</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-warning">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                <strong>Warning:</strong> Are you sure you want to unassign the selected students from their classes?
                                This action will deactivate their current class assignments.
                            </div>
                            <p><strong>${enrollmentIds.length}</strong> enrollment(s) will be unassigned.</p>
                            <div class="mt-3" style="max-height: 200px; overflow-y: auto;">
                                <ul class="list-group">
                                    ${enrollmentDetails.map(detail => `<li class="list-group-item">${detail}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" id="confirmBulkUnassignBtn">
                                <i class="bi bi-trash me-1"></i>Unassign Selected
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to container
        $('#enrollmentModalsContainer').html(modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('bulkUnassignModal'));
        modal.show();

        // Handle confirmation
        $(document).off('click', '#confirmBulkUnassignBtn').on('click', '#confirmBulkUnassignBtn', function () {
            performBulkUnassign(enrollmentIds);
        });
    }

    /**
     * Perform bulk unassign
     */
    function performBulkUnassign(enrollmentIds) {
        Swal.fire({
            title: 'Unassigning...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/enrollments/bulk-delete/',
            type: 'POST',
            data: JSON.stringify({
                enrollment_ids: enrollmentIds
            }),
            contentType: 'application/json',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken()
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
                        bootstrap.Modal.getInstance(document.getElementById('bulkUnassignModal')).hide();

                        // Reload page to show updated data
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred during bulk unassign.',
                        confirmButtonColor: '#dc3545'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while unassigning students.';
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
     * Delete enrollment
     */
    function deleteEnrollment(enrollmentId, enrollmentInfo) {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to unassign ${enrollmentInfo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, unassign!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Unassigning...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                $.ajax({
                    url: `/enrollments/${enrollmentId}/delete/`,
                    type: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': getCsrfToken()
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Unassigned!',
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
                                text: response.error || 'An error occurred.',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMsg = xhr.responseJSON?.error || 'An error occurred while unassigning.';
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

