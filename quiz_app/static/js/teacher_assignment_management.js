/**
 * Teacher Subject Assignment Management JavaScript
 * Handles all interactions for assignment management including modals, forms, and bulk operations
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
     * Initialize DataTables for assignments table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#assignmentsTable');
        if (table.length === 0) {
            console.warn('Assignments table not found');
            return;
        }

        // Check if table already has DataTable initialized
        if ($.fn.DataTable.isDataTable('#assignmentsTable')) {
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
                order: [[5, 'desc']],
                deferRender: true,
                // Handle empty tables gracefully
                emptyTable: "No assignments found",
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ assignments",
                    infoEmpty: "No assignments found",
                    infoFiltered: "(filtered from _TOTAL_ total assignments)",
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
            console.error('Error details:', error.message, error.stack);

            try {
                if ($.fn.DataTable.isDataTable('#assignmentsTable')) {
                    $('#assignmentsTable').DataTable().destroy();
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
                $('#assignmentsTable').DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#teacherFilter, #subjectFilter, #classFilter, #academicYearFilter, #activeFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#teacherFilter, #subjectFilter, #classFilter, #academicYearFilter, #activeFilter').val('');
            if ($.fn.DataTable) {
                $('#assignmentsTable').DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete assignment button
        $(document).on('click', '.delete-assignment-btn', function () {
            const assignmentId = $(this).data('assignment-id');
            const assignmentInfo = $(this).data('assignment-info');
            deleteAssignment(assignmentId, assignmentInfo);
        });
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add Assignment Modal
        $(document).on('click', '#addAssignmentBtn, #addAssignmentMenuBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Add assignment button clicked');

            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Assignment Form';

            console.log('Assignment modal URL:', url, 'Title:', title);

            if (!url) {
                console.error('No URL found for assignment modal');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the assignment modal. Please refresh the page.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadAssignmentModal(url, title);
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

            loadBulkAssignmentModal(url);
        });

        // Edit Assignment Modal
        $(document).on('click', '.edit-assignment-btn', function () {
            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Edit Assignment';

            if (!url) return;

            loadAssignmentModal(url, title);
        });
    }

    /**
     * Load assignment form modal
     */
    function loadAssignmentModal(url, title) {
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
                $('#assignmentFormModal').remove();

                // Add modal to container
                $('#assignmentModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('assignmentFormModal'));
                modal.show();

                // Handle form submission
                $('#assignmentForm').on('submit', function (e) {
                    e.preventDefault();
                    submitAssignmentForm(url, $(this));
                });

                // Load subjects when class and academic year are selected
                setupClassSubjectLoader();
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
     * Submit assignment form
     */
    function submitAssignmentForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('assignmentFormModal')).hide();

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
     * Load bulk assignment modal
     */
    function loadBulkAssignmentModal(url) {
        console.log('Loading bulk assignment modal from URL:', url);

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
                console.log('Bulk assignment modal response received:', response);
                Swal.close();

                // Ensure modal container exists
                if ($('#assignmentModalsContainer').length === 0) {
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
                $('#bulkAssignmentFormModal').remove();

                // Add modal to container
                $('#assignmentModalsContainer').html(response.html);

                // Show modal
                const modalElement = document.getElementById('bulkAssignmentFormModal');
                if (!modalElement) {
                    console.error('Bulk assignment modal element not found after adding HTML');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to create bulk assignment modal. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                const modal = new bootstrap.Modal(modalElement);
                modal.show();

                // Handle form submission
                $('#bulkAssignmentForm').on('submit', function (e) {
                    e.preventDefault();
                    submitBulkAssignmentForm($(this));
                });

                // Load subjects when classes and academic year are selected
                setupBulkClassSubjectLoader();
            },
            error: function (xhr) {
                console.error('AJAX error loading bulk assignment modal:', xhr);
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load bulk assignment form. Please check the console for details.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit bulk assignment form
     */
    function submitBulkAssignmentForm(form) {
        const teacherId = $('#bulk_teacher').val();
        const academicYearId = $('#bulk_academic_year').val();
        const subjectIds = Array.from($('#bulk_subjects').val() || []);
        const classIds = Array.from($('#bulk_classes').val() || []);

        // Validation
        if (!teacherId || !academicYearId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Please select a teacher and academic year.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        if (subjectIds.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Subjects Selected',
                text: 'Please select at least one subject.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        if (classIds.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Classes Selected',
                text: 'Please select at least one class.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        Swal.fire({
            title: 'Creating Assignments...',
            html: 'Please wait while we create the assignments.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/assignments/bulk-create/',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                teacher_id: teacherId,
                subject_ids: subjectIds,
                class_ids: classIds,
                academic_year_id: academicYearId
            }),
            headers: {
                'X-CSRFToken': getCsrfToken(),
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
                        icon: response.created > 0 ? 'success' : 'warning',
                        title: response.created > 0 ? 'Assignments Created!' : 'No Assignments Created',
                        html: message,
                        confirmButtonColor: response.created > 0 ? '#28a745' : '#ffc107'
                    }).then(() => {
                        if (response.created > 0) {
                            bootstrap.Modal.getInstance(document.getElementById('bulkAssignmentFormModal')).hide();
                            location.reload();
                        }
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
                const errorMsg = xhr.responseJSON?.error || 'An error occurred while creating assignments.';
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
     * Delete an assignment
     */
    function deleteAssignment(assignmentId, assignmentInfo) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Assignment?',
            html: `Are you sure you want to delete the assignment:<br><strong>${assignmentInfo}</strong>?<br>This action cannot be undone.`,
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
                    url: `/assignments/${assignmentId}/delete/`,
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
                                text: response.error || 'Failed to delete assignment.',
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
        const teacherFilter = $('#teacherFilter').val();
        const subjectFilter = $('#subjectFilter').val();
        const classFilter = $('#classFilter').val();
        const academicYearFilter = $('#academicYearFilter').val();
        const activeFilter = $('#activeFilter').val();

        // Build URL with filters
        const params = new URLSearchParams();
        if (teacherFilter) params.append('teacher', teacherFilter);
        if (subjectFilter) params.append('subject', subjectFilter);
        if (classFilter) params.append('class', classFilter);
        if (academicYearFilter) params.append('academic_year', academicYearFilter);
        if (activeFilter) params.append('is_active', activeFilter);

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        // Reload page with filters
        window.location.href = '/assignments/?' + params.toString();
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
     * Setup class subject loader for single assignment form
     */
    function setupClassSubjectLoader() {
        const classSelect = $('#class_assigned');
        const academicYearSelect = $('#academic_year');
        const subjectSelect = $('#subject');

        function loadSubjects(callback) {
            const classId = classSelect.val();
            const academicYearId = academicYearSelect.val();

            // Clear and disable subject select
            subjectSelect.empty().append('<option value="">Loading subjects...</option>').prop('disabled', true);

            if (!classId || !academicYearId) {
                subjectSelect.empty().append('<option value="">Select Class and Academic Year first</option>').prop('disabled', true);
                if (callback) callback();
                return;
            }

            // Load subjects via AJAX
            $.ajax({
                url: '/assignments/get-class-subjects/',
                type: 'GET',
                data: {
                    class_id: classId,
                    academic_year_id: academicYearId
                },
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                success: function (response) {
                    subjectSelect.empty();

                    if (response.success && response.subjects && response.subjects.length > 0) {
                        subjectSelect.append('<option value="">Select Subject</option>');
                        response.subjects.forEach(function (subject) {
                            subjectSelect.append(
                                $('<option></option>')
                                    .attr('value', subject.id)
                                    .text(subject.name + ' (' + subject.code + ')')
                            );
                        });
                        subjectSelect.prop('disabled', false);
                    } else {
                        subjectSelect.append('<option value="">No subjects assigned to this class</option>').prop('disabled', true);
                    }

                    if (callback) callback();
                },
                error: function (xhr) {
                    console.error('Error loading subjects:', xhr);
                    subjectSelect.empty().append('<option value="">Error loading subjects</option>').prop('disabled', true);
                    if (callback) callback();
                }
            });
        }

        // Store original subject value for edit mode
        const originalSubjectId = subjectSelect.val();

        // Load subjects when class or academic year changes
        classSelect.on('change', function () {
            loadSubjects(function () {
                // After loading, try to restore original selection if it exists
                if (originalSubjectId && subjectSelect.find('option[value="' + originalSubjectId + '"]').length) {
                    subjectSelect.val(originalSubjectId);
                }
            });
        });
        academicYearSelect.on('change', function () {
            loadSubjects(function () {
                // After loading, try to restore original selection if it exists
                if (originalSubjectId && subjectSelect.find('option[value="' + originalSubjectId + '"]').length) {
                    subjectSelect.val(originalSubjectId);
                }
            });
        });

        // Load subjects if both are already selected (for edit mode)
        if (classSelect.val() && academicYearSelect.val()) {
            loadSubjects(function () {
                // After loading, try to restore original selection if it exists
                if (originalSubjectId && subjectSelect.find('option[value="' + originalSubjectId + '"]').length) {
                    subjectSelect.val(originalSubjectId);
                }
            });
        }
    }

    /**
     * Setup class subject loader for bulk assignment form
     */
    function setupBulkClassSubjectLoader() {
        const classSelect = $('#bulk_classes');
        const academicYearSelect = $('#bulk_academic_year');
        const subjectSelect = $('#bulk_subjects');

        function loadSubjects() {
            const classIds = Array.from(classSelect.val() || []);
            const academicYearId = academicYearSelect.val();

            // Clear and disable subject select
            subjectSelect.empty().append('<option value="">Loading subjects...</option>').prop('disabled', true);

            if (classIds.length === 0 || !academicYearId) {
                subjectSelect.empty().append('<option value="">Select classes and academic year first</option>').prop('disabled', true);
                return;
            }

            // Load subjects for all selected classes
            const allSubjects = new Map(); // Use Map to avoid duplicates

            let requestsCompleted = 0;
            const totalRequests = classIds.length;

            if (totalRequests === 0) {
                subjectSelect.empty().append('<option value="">Select classes first</option>').prop('disabled', true);
                return;
            }

            classIds.forEach(function (classId) {
                $.ajax({
                    url: '/assignments/get-class-subjects/',
                    type: 'GET',
                    data: {
                        class_id: classId,
                        academic_year_id: academicYearId
                    },
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        if (response.success && response.subjects) {
                            response.subjects.forEach(function (subject) {
                                // Use subject id as key to avoid duplicates
                                if (!allSubjects.has(subject.id)) {
                                    allSubjects.set(subject.id, subject);
                                }
                            });
                        }

                        requestsCompleted++;

                        // When all requests are complete, populate the select
                        if (requestsCompleted === totalRequests) {
                            subjectSelect.empty();

                            if (allSubjects.size > 0) {
                                const sortedSubjects = Array.from(allSubjects.values()).sort((a, b) =>
                                    a.name.localeCompare(b.name)
                                );

                                sortedSubjects.forEach(function (subject) {
                                    subjectSelect.append(
                                        $('<option></option>')
                                            .attr('value', subject.id)
                                            .text(subject.name + ' (' + subject.code + ')')
                                    );
                                });
                                subjectSelect.prop('disabled', false);
                            } else {
                                subjectSelect.append('<option value="">No subjects assigned to selected classes</option>').prop('disabled', true);
                            }
                        }
                    },
                    error: function (xhr) {
                        console.error('Error loading subjects for class:', classId, xhr);
                        requestsCompleted++;

                        if (requestsCompleted === totalRequests) {
                            subjectSelect.empty().append('<option value="">Error loading subjects</option>').prop('disabled', true);
                        }
                    }
                });
            });
        }

        // Load subjects when classes or academic year changes
        classSelect.on('change', loadSubjects);
        academicYearSelect.on('change', loadSubjects);
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

