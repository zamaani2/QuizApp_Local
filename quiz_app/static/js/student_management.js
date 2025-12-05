/**
 * Student Management JavaScript
 * Handles all interactions for student management including modals, forms, and bulk operations
 */

(function ($) {
    'use strict';

    let selectedStudents = new Set();

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
        // Use a small delay to ensure DOM is fully ready
        setTimeout(function () {
            try {
                initializeDataTable();
            } catch (error) {
                console.error('Error during initialization:', error);
                // Continue with other functionality even if DataTables fails
            }
        }, 100);

        // Debug: Check if buttons exist
        if ($('#addStudentBtn').length === 0) {
            console.warn('Add Student button not found');
        }
        if ($('#importStudentsBtn').length === 0) {
            console.warn('Import Students button not found');
        }
    });

    /**
     * Initialize DataTables for students table
     */
    function initializeDataTable() {
        if (!$.fn.DataTable) {
            console.warn('DataTables plugin not loaded');
            return;
        }

        const table = $('#studentsTable');
        if (table.length === 0) {
            console.warn('Students table not found');
            return;
        }

        // Check if table already has DataTable initialized
        if ($.fn.DataTable.isDataTable('#studentsTable')) {
            console.log('DataTable already initialized, destroying and reinitializing');
            try {
                table.DataTable().destroy();
            } catch (e) {
                console.warn('Error destroying existing DataTable:', e);
                // Force remove DataTable instance
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

            // Remove any rows with colspan (empty message rows) before initializing DataTables
            table.find('tbody tr').each(function () {
                const $row = $(this);
                const hasColspan = $row.find('td[colspan]').length > 0;
                if (hasColspan) {
                    console.log('Removing row with colspan before DataTables initialization');
                    $row.remove();
                }
            });

            // Ensure tbody exists
            let tbody = table.find('tbody');
            if (tbody.length === 0) {
                tbody = $('<tbody></tbody>');
                table.append(tbody);
            }

            // Validate and fix body rows - ensure all rows have correct column count
            const bodyRows = tbody.find('tr');
            let rowsFixed = 0;

            bodyRows.each(function (index) {
                const $row = $(this);
                const rowCols = $row.find('td').length;

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

                // Ensure all cells are proper td elements (not th or other elements)
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
                    orderable: (i === 0 || i === 8) ? false : true  // Checkbox and Actions not sortable
                });
            }

            // Use autoWidth: false to prevent DataTables from trying to calculate widths
            // which can cause issues with malformed tables
            table.DataTable({
                autoWidth: false,
                columns: columns,
                responsive: true,
                pageLength: 25,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                order: [[1, 'asc']],
                columnDefs: [
                    { orderable: false, targets: [0, 8] }  // Checkbox (0) and Actions (8) columns
                ],
                // Disable column reordering to prevent issues
                colReorder: false,
                // Use deferRender for better performance and to avoid cell access issues
                deferRender: true,
                // Handle empty tables gracefully
                emptyTable: "No students found",
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ students",
                    infoEmpty: "No students found",
                    infoFiltered: "(filtered from _TOTAL_ total students)",
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

            // Don't let DataTables error break the rest of the page
            // Try to clean up any partial initialization
            try {
                if ($.fn.DataTable.isDataTable('#studentsTable')) {
                    $('#studentsTable').DataTable().destroy();
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
        // Select all checkbox
        $('#selectAll').on('change', function () {
            const isChecked = $(this).prop('checked');
            $('.student-checkbox').prop('checked', isChecked);
            updateSelectedStudents();
        });

        // Individual student checkbox
        $(document).on('change', '.student-checkbox', function () {
            updateSelectedStudents();
        });

        // Search input
        $('#searchInput').on('keyup', debounce(function () {
            const searchValue = $(this).val();
            if ($.fn.DataTable) {
                $('#studentsTable').DataTable().search(searchValue).draw();
            }
        }, 300));

        // Filter dropdowns
        $('#formFilter, #genderFilter, #classFilter').on('change', function () {
            applyFilters();
        });

        // Clear filters button
        $('#clearFiltersBtn').on('click', function () {
            $('#searchInput').val('');
            $('#formFilter, #genderFilter, #classFilter').val('');
            if ($.fn.DataTable) {
                $('#studentsTable').DataTable().search('').draw();
            }
            applyFilters();
        });

        // Delete student button
        $(document).on('click', '.delete-student-btn', function () {
            const studentId = $(this).data('student-id');
            const studentName = $(this).data('student-name');
            deleteStudent(studentId, studentName);
        });

        // View student button - handled by direct link in template

        // Bulk delete button
        $('#bulkDeleteBtn').on('click', function () {
            if (selectedStudents.size === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Selection',
                    text: 'Please select at least one student to delete.',
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
        // Add/Edit Student Modal - use event delegation
        $(document).on('click', '#addStudentBtn, #addStudentMenuBtn, .edit-student-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Student modal button clicked:', $(this).attr('id') || $(this).attr('class'));

            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Student Form';

            console.log('Modal URL:', url, 'Title:', title);

            if (!url) {
                console.error('No URL found for student modal');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the modal. Please refresh the page.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadStudentModal(url, title);
        });

        // Bulk Import Modal - use event delegation
        $(document).on('click', '#importStudentsBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Import students button clicked');

            const url = $(this).data('modal-url');
            console.log('Import modal URL:', url);

            if (!url) {
                console.error('No URL found for bulk import modal');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the import modal. Please refresh the page.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadBulkImportModal(url);
        });

        // Bulk Delete Modal - handled in initializeEventListeners
    }

    /**
     * Load student form modal
     */
    function loadStudentModal(url, title) {
        console.log('Loading student modal from URL:', url);

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
                console.log('Modal response received:', response);
                Swal.close();

                // Ensure modal container exists
                if ($('#studentModalsContainer').length === 0) {
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
                $('#studentFormModal').remove();

                // Add modal to container
                $('#studentModalsContainer').html(response.html);

                // Show modal
                const modalElement = document.getElementById('studentFormModal');
                if (!modalElement) {
                    console.error('Modal element not found after adding HTML');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to create modal. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                const modal = new bootstrap.Modal(modalElement);
                modal.show();

                // Handle form submission
                $('#studentForm').on('submit', function (e) {
                    e.preventDefault();
                    submitStudentForm(url, $(this));
                });
            },
            error: function (xhr) {
                console.error('AJAX error loading modal:', xhr);
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
     * Submit student form
     */
    function submitStudentForm(url, form) {
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
                        bootstrap.Modal.getInstance(document.getElementById('studentFormModal')).hide();

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
     * Delete a single student
     */
    function deleteStudent(studentId, studentName) {
        Swal.fire({
            icon: 'warning',
            title: 'Delete Student?',
            html: `Are you sure you want to delete <strong>${studentName}</strong>?<br>This action cannot be undone.`,
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
                    url: `/students/${studentId}/delete/`,
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
                                text: response.error || 'Failed to delete student.',
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
        console.log('Loading bulk import modal from URL:', url);

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
                console.log('Bulk import modal response received:', response);
                Swal.close();

                // Ensure modal container exists
                if ($('#studentModalsContainer').length === 0) {
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
                $('#bulkImportModal').remove();

                // Add modal to container
                $('#studentModalsContainer').html(response.html);

                // Show modal
                const modalElement = document.getElementById('bulkImportModal');
                if (!modalElement) {
                    console.error('Bulk import modal element not found after adding HTML');
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to create import modal. Please refresh the page.',
                        confirmButtonColor: '#3085d6'
                    });
                    return;
                }

                const modal = new bootstrap.Modal(modalElement);
                modal.show();

                // Initialize import steps
                initializeImportSteps();
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
     * Initialize import steps and handlers
     */
    function initializeImportSteps() {
        let csvHeaders = [];
        let columnMappings = {};

        // Step 1: Preview headers button
        $(document).off('click', '#previewHeadersBtn').on('click', '#previewHeadersBtn', function (e) {
            e.preventDefault();
            const fileInput = $('#csv_file')[0];

            if (!fileInput.files || fileInput.files.length === 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Please select a CSV file first.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            const formData = new FormData();
            formData.append('csv_file', fileInput.files[0]);

            // Get CSRF token from the form in the modal
            let csrfToken = $('#bulkImportForm [name=csrfmiddlewaretoken]').val();
            if (!csrfToken) {
                csrfToken = $('[name=csrfmiddlewaretoken]').val();
            }
            if (!csrfToken) {
                csrfToken = getCsrfToken();
            }

            console.log('CSRF Token found:', csrfToken ? 'Yes' : 'No');

            if (csrfToken) {
                formData.append('csrfmiddlewaretoken', csrfToken);
            } else {
                console.error('CSRF token not found! Cannot proceed with request.');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'CSRF token not found. Please refresh the page and try again.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            Swal.fire({
                title: 'Reading file...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            $.ajax({
                url: '/students/bulk-import/preview-headers/',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrfToken
                },
                success: function (response) {
                    Swal.close();
                    if (response.success) {
                        csvHeaders = response.headers;
                        showColumnMapping(csvHeaders);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: response.error || 'Failed to read CSV file.',
                            confirmButtonColor: '#3085d6'
                        });
                    }
                },
                error: function (xhr) {
                    Swal.close();
                    let errorMessage = 'Failed to read CSV file.';

                    if (xhr.status === 403) {
                        errorMessage = 'Permission denied. Please ensure you are logged in as an admin.';
                    } else if (xhr.status === 400) {
                        errorMessage = xhr.responseJSON?.error || 'Invalid file format.';
                    } else if (xhr.responseJSON?.error) {
                        errorMessage = xhr.responseJSON.error;
                    }

                    console.error('Preview headers error:', xhr);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: errorMessage,
                        confirmButtonColor: '#3085d6'
                    });
                }
            });
        });

        // Step 2: Back to step 1
        $(document).off('click', '#backToStep1Btn').on('click', '#backToStep1Btn', function (e) {
            e.preventDefault();
            $('#step1').show();
            $('#step2').hide();
            $('#step3').hide();
        });

        // Step 2: Continue to step 3
        $(document).off('click', '#continueToStep3Btn').on('click', '#continueToStep3Btn', function (e) {
            e.preventDefault();
            // Collect column mappings
            columnMappings = {};
            $('#columnMappingTable tr').each(function () {
                const field = $(this).find('td:first').data('field');
                const csvColumn = $(this).find('select').val();
                if (field && csvColumn) {
                    columnMappings[field] = csvColumn;
                }
            });

            // Validate required mappings
            const requiredFields = ['full_name', 'date_of_birth', 'gender', 'parent_contact', 'admission_date'];
            const missingFields = requiredFields.filter(field => !columnMappings[field]);

            if (missingFields.length > 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Missing Required Mappings',
                    text: `Please map the following required fields: ${missingFields.join(', ')}`,
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            $('#step2').hide();
            $('#step3').show();
        });

        // Step 3: Back to step 2
        $(document).off('click', '#backToStep2Btn').on('click', '#backToStep2Btn', function (e) {
            e.preventDefault();
            $('#step2').show();
            $('#step3').hide();
        });

        // Step 3: Form submission
        $(document).off('submit', '#bulkImportForm').on('submit', '#bulkImportForm', function (e) {
            e.preventDefault();
            submitBulkImport($(this), columnMappings);
        });

        /**
         * Show column mapping interface
         */
        function showColumnMapping(headers) {
            const fieldDefinitions = {
                'full_name': { label: 'Full Name', required: true },
                'gender': { label: 'Gender', required: true },
                'admission_number': { label: 'Admission Number (Student ID) - Auto-generated if not provided', required: false },
                'date_of_birth': { label: 'Date of Birth', required: false },
                'parent_contact': { label: 'Parent Contact', required: false },
                'admission_date': { label: 'Admission Date', required: false },
                'email': { label: 'Email', required: false },
            };

            const tbody = $('#columnMappingTable');
            tbody.empty();

            // Auto-detect common column names
            const autoDetectMap = {
                'full_name': ['full_name', 'name', 'full name', 'student name', 'fullname'],
                'gender': ['gender', 'sex'],
                'admission_number': ['admission_number', 'admission number', 'student id', 'student_id', 'id', 'student number'],
                'date_of_birth': ['date_of_birth', 'dob', 'date of birth', 'birthdate', 'birth date'],
                'parent_contact': ['parent_contact', 'parent contact', 'contact', 'phone', 'mobile'],
                'admission_date': ['admission_date', 'admission date', 'admission', 'date'],
                'email': ['email', 'e-mail', 'email address'],
            };

            Object.keys(fieldDefinitions).forEach(function (field) {
                const fieldDef = fieldDefinitions[field];
                const row = $('<tr></tr>');

                const labelCell = $('<td></td>')
                    .text(fieldDef.label + (fieldDef.required ? ' *' : ''))
                    .data('field', field);

                const selectCell = $('<td></td>');
                const select = $('<select class="form-select form-select-sm column-mapping-select"></select>');
                select.append('<option value="">-- Select CSV Column --</option>');

                // Auto-detect matching column
                let autoSelected = false;
                const autoDetectPatterns = autoDetectMap[field] || [];

                headers.forEach(function (header) {
                    const option = $('<option></option>')
                        .attr('value', header)
                        .text(header);

                    // Auto-select if matches pattern
                    if (!autoSelected && autoDetectPatterns.some(pattern =>
                        header.toLowerCase().replace(/\s+/g, '_') === pattern.toLowerCase() ||
                        header.toLowerCase().replace(/\s+/g, ' ') === pattern.toLowerCase()
                    )) {
                        option.prop('selected', true);
                        autoSelected = true;
                        columnMappings[field] = header;
                    }

                    select.append(option);
                });

                selectCell.append(select);
                row.append(labelCell).append(selectCell);
                tbody.append(row);
            });

            $('#step1').hide();
            $('#step2').show();
        }
    }

    /**
     * Submit bulk import form
     */
    function submitBulkImport(form, columnMappings) {
        const formData = new FormData(form[0]);

        // Add column mappings as JSON
        formData.append('column_mappings', JSON.stringify(columnMappings));

        Swal.fire({
            title: 'Importing...',
            html: 'Please wait while we process your file.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/students/bulk-import/',
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
                    if (response.assigned_to_class) {
                        message += `<br>${response.assigned_to_class} student(s) assigned to class.`;
                    }
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
        if (selectedStudents.size === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Selection',
                text: 'Please select at least one student to delete.',
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
                $('#studentModalsContainer').html(response.html || response);

                // Update selected count
                $('#selectedCount').text(selectedStudents.size);

                // List selected students
                const listContainer = $('#selectedStudentsList');
                listContainer.empty();
                selectedStudents.forEach(function (studentId) {
                    const row = $(`tr[data-student-id="${studentId}"]`);
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
        const studentIds = Array.from(selectedStudents);

        Swal.fire({
            icon: 'warning',
            title: 'Confirm Delete',
            html: `Are you sure you want to delete <strong>${studentIds.length}</strong> student(s)?<br>This action cannot be undone.`,
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
                    url: '/students/bulk-delete/',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ student_ids: studentIds }),
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
                                text: response.error || 'Failed to delete students.',
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
     * Update selected students set
     */
    function updateSelectedStudents() {
        selectedStudents.clear();
        $('.student-checkbox:checked').each(function () {
            selectedStudents.add($(this).val());
        });

        // Update bulk delete button state
        $('#bulkDeleteBtn').prop('disabled', selectedStudents.size === 0);

        // Update select all checkbox
        const totalCheckboxes = $('.student-checkbox').length;
        const checkedCheckboxes = $('.student-checkbox:checked').length;
        $('#selectAll').prop('checked', totalCheckboxes > 0 && totalCheckboxes === checkedCheckboxes);
    }

    /**
     * Apply filters
     */
    function applyFilters() {
        const formFilter = $('#formFilter').val();
        const genderFilter = $('#genderFilter').val();
        const classFilter = $('#classFilter').val();

        // Build URL with filters
        const params = new URLSearchParams();
        if (formFilter) params.append('form', formFilter);
        if (genderFilter) params.append('gender', genderFilter);
        if (classFilter) params.append('class', classFilter);

        const searchQuery = $('#searchInput').val();
        if (searchQuery) params.append('search', searchQuery);

        // Reload page with filters
        window.location.href = '/students/?' + params.toString();
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

