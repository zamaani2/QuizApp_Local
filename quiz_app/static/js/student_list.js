/**
 * Student List Management JavaScript
 * Handles all student list functionality including DataTables, modals, bulk operations, and image uploads
 */

$(document).ready(function () {
    // Global variables
    let studentTable;
    let selectedFiles = [];
    let uploadedFiles = [];

    // Initialize the student list functionality
    initializeStudentList();

    /**
     * Initialize all student list functionality
     */
    function initializeStudentList() {
        initializeProfilePicturePreviews();
        initializeDataTable();
        initializeBulkOperations();
        initializeModals();
        initializeImageUpload();
        initializeFilters();
    }

    /**
     * Initialize profile picture previews for forms
     */
    function initializeProfilePicturePreviews() {
        // Profile picture preview for add student form
        $('#id_profile_picture').on('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Check file size (300KB limit)
                if (file.size > 300 * 1024) {
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'Please select an image smaller than 300KB.',
                        confirmButtonColor: '#3085d6'
                    });
                    // Clear the file input
                    this.value = '';
                    return;
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please select a valid image file (JPG, PNG, GIF, WebP).',
                        confirmButtonColor: '#3085d6'
                    });
                    // Clear the file input
                    this.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    // Replace the placeholder with actual image
                    const imgHtml = `<img src="${e.target.result}" alt="Profile Preview" class="rounded-circle">`;
                    $('#profilePicturePreview .profile-placeholder').parent().html(imgHtml);
                };
                reader.readAsDataURL(file);
            }
        });

        // Profile picture preview for edit student forms (using event delegation for dynamically loaded content)
        $(document).on('change', 'input[id="id_profile_picture"]', function (e) {
            const file = e.target.files[0];
            if (file) {
                // Check file size (300KB limit)
                if (file.size > 300 * 1024) {
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'Please select an image smaller than 300KB.',
                        confirmButtonColor: '#3085d6'
                    });
                    // Clear the file input
                    this.value = '';
                    return;
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please select a valid image file (JPG, PNG, GIF, WebP).',
                        confirmButtonColor: '#3085d6'
                    });
                    // Clear the file input
                    this.value = '';
                    return;
                }

                const reader = new FileReader();
                const modalId = $(this).closest('.modal').attr('id');

                reader.onload = function (e) {
                    // Update the image in this specific modal
                    $(`#${modalId} .profile-picture-container img.rounded-circle`).attr('src', e.target.result);

                    // If there's a placeholder div instead of an image, replace it
                    if ($(`#${modalId} .profile-picture-container .profile-placeholder`).length) {
                        const imgHtml = `<img src="${e.target.result}" alt="Profile Preview" class="rounded-circle">`;
                        $(`#${modalId} .profile-picture-container .profile-placeholder`).replaceWith(imgHtml);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    /**
     * Initialize DataTables with server-side processing
     */
    function initializeDataTable() {
        studentTable = $('#studentTable').DataTable({
            processing: true,
            serverSide: true,
            ajax: {
                url: window.studentListAjaxUrl || '/student/list-ajax/',
                type: 'GET',
                data: function (d) {
                    // Add filter parameters to the request
                    d.form = $('#formFilter').val();
                    d.learning_area = $('#learningAreaFilter').val();
                    d.gender = $('#genderFilter').val();
                    d.status = $('#statusFilter').val();
                    d.class_id = $('#classFilter').val();
                },
                error: function (xhr, error, code) {
                    console.log('DataTables AJAX error:', error, code);
                    alert('Error loading student data. Please refresh the page.');
                }
            },
            responsive: true,
            pageLength: 25,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            columnDefs: [
                { targets: 0, orderable: false, searchable: false }, // Checkbox column
                { targets: 8, orderable: false, searchable: false }, // Actions column
                { responsivePriority: 1, targets: [2, 8] }, // Full name and actions are most important
                { responsivePriority: 2, targets: [1, 6] }, // Admission number and class
                { responsivePriority: 3, targets: [7] } // Status
            ],
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search students...",
                lengthMenu: "_MENU_ students per page",
                info: "Showing _START_ to _END_ of _TOTAL_ students",
                emptyTable: "No students found with the current filters",
                infoEmpty: "No students available",
                infoFiltered: "(filtered from _MAX_ total students)",
                processing: "Loading students...",
                loadingRecords: "Loading...",
                zeroRecords: "No matching students found"
            },
            dom: '<"top"lf>rt<"bottom"ip><"clear">',
            order: [[2, 'asc']], // Sort by full name by default
            drawCallback: function (settings) {
                // Reattach event handlers after each draw
                attachEventHandlers();
                updateBulkControls();
            }
        });
    }

    /**
     * Initialize bulk operations functionality
     */
    function initializeBulkOperations() {
        // Bulk operations functionality
        function updateBulkControls() {
            const checkedBoxes = $('.student-checkbox:checked');
            const count = checkedBoxes.length;

            if (count > 0) {
                $('#selectAllContainer').show();
                $('#selectedCount').show().text(count + ' selected');
                $('#bulkDeleteBtn').show();
            } else {
                $('#selectAllContainer').hide();
                $('#selectedCount').hide();
                $('#bulkDeleteBtn').hide();
            }

            // Update select all checkbox state
            const totalBoxes = $('.student-checkbox').length;
            if (count === totalBoxes && totalBoxes > 0) {
                $('#selectAllStudents').prop('checked', true).prop('indeterminate', false);
                $('#selectAllHeader').prop('checked', true).prop('indeterminate', false);
            } else if (count > 0) {
                $('#selectAllStudents').prop('checked', false).prop('indeterminate', true);
                $('#selectAllHeader').prop('checked', false).prop('indeterminate', true);
            } else {
                $('#selectAllStudents').prop('checked', false).prop('indeterminate', false);
                $('#selectAllHeader').prop('checked', false).prop('indeterminate', false);
            }
        }

        // Handle individual checkbox changes using delegated events
        $(document).on('change', '.student-checkbox', function () {
            // Highlight selected rows
            if ($(this).is(':checked')) {
                $(this).closest('tr').addClass('table-info');
            } else {
                $(this).closest('tr').removeClass('table-info');
            }
            updateBulkControls();
        });

        // Handle select all checkboxes using delegated events
        $(document).on('change', '#selectAllStudents, #selectAllHeader', function () {
            const isChecked = $(this).prop('checked');
            $('.student-checkbox').prop('checked', isChecked);

            // Highlight all rows based on selection
            if (isChecked) {
                $('.student-checkbox').closest('tr').addClass('table-info');
            } else {
                $('.student-checkbox').closest('tr').removeClass('table-info');
            }

            // Sync both select all checkboxes
            $('#selectAllStudents, #selectAllHeader').prop('checked', isChecked);
            updateBulkControls();
        });

        // Bulk delete functionality
        $(document).on('click', '#bulkDeleteBtn', function () {
            console.log('=== BULK DELETE CLICKED ===');

            const checkedBoxes = $('.student-checkbox:checked');
            const studentNames = [];
            const studentIds = [];

            checkedBoxes.each(function () {
                studentIds.push($(this).val());
                studentNames.push($(this).data('student-name'));
            });

            if (studentIds.length === 0) {
                Swal.fire({
                    title: 'No Selection',
                    html: 'Please select students to delete.<br><br><small>If you have selected students but still see this message, please refresh the page and try again.</small>',
                    icon: 'warning'
                });
                return;
            }

            const namesDisplay = studentNames.length > 5
                ? studentNames.slice(0, 5).join(', ') + ` and ${studentNames.length - 5} more`
                : studentNames.join(', ');

            Swal.fire({
                title: 'Delete Selected Students?',
                html: `Are you sure you want to delete <strong>${studentIds.length}</strong> student(s)?<br><br>` +
                    `<strong>Students:</strong> ${namesDisplay}<br><br>` +
                    `<small class="text-danger">This will also delete their user accounts!</small>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete them!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    performBulkDelete(studentIds);
                }
            });
        });

        // Make updateBulkControls available globally
        window.updateBulkControls = updateBulkControls;
    }

    /**
     * Perform bulk delete operation
     */
    function performBulkDelete(studentIds) {
        // Show loading with progress
        Swal.fire({
            title: 'Deleting Students...',
            html: `
              <div class="progress mb-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%" id="deleteProgress">
                  0%
                </div>
              </div>
              <div id="deleteStatus">Preparing to delete ${studentIds.length} students...</div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                // Start simulated progress
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 20;
                    if (progress > 90) progress = 90;
                    const progressBar = document.getElementById('deleteProgress');
                    if (progressBar) {
                        progressBar.style.width = progress + '%';
                        progressBar.textContent = Math.round(progress) + '%';
                    }
                }, 500);

                window.deleteProgressInterval = progressInterval;
            }
        });

        // Prepare FormData
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());

        // Add each student ID individually
        studentIds.forEach(function (id) {
            formData.append('student_ids', id);
        });

        $.ajax({
            url: window.bulkDeleteUrl || '/student/bulk-delete/',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                // Clear progress interval
                if (window.deleteProgressInterval) {
                    clearInterval(window.deleteProgressInterval);
                }

                // Complete progress bar
                const progressBar = document.getElementById('deleteProgress');
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                }

                // Update status
                const statusDiv = document.getElementById('deleteStatus');
                if (statusDiv) {
                    statusDiv.textContent = 'Deletion completed successfully!';
                }

                // Show success after brief delay
                setTimeout(() => {
                    Swal.fire({
                        title: 'Success!',
                        text: response.message,
                        icon: 'success',
                        timer: 2000
                    }).then(() => {
                        window.location.reload();
                    });
                }, 1000);
            },
            error: function (xhr) {
                // Clear progress interval
                if (window.deleteProgressInterval) {
                    clearInterval(window.deleteProgressInterval);
                }

                let errorMessage = 'Failed to delete students.';
                let errorDetails = '';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;

                    if (xhr.responseJSON.failed_deletions && xhr.responseJSON.failed_deletions.length > 0) {
                        errorDetails = '<br><br><strong>Failed Deletions:</strong><br>' +
                            xhr.responseJSON.failed_deletions.slice(0, 5).map(error => '• ' + error).join('<br>');
                        if (xhr.responseJSON.failed_deletions.length > 5) {
                            errorDetails += `<br>... and ${xhr.responseJSON.failed_deletions.length - 5} more`;
                        }
                    }
                } else if (xhr.responseText) {
                    errorMessage = `Server error: ${xhr.responseText}`;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Delete Failed!',
                    html: errorMessage + errorDetails + '<br><br><small>Check the browser console for more details.</small>',
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal-wide'
                    }
                });
            }
        });
    }

    /**
     * Initialize modal functionality
     */
    function initializeModals() {
        // CSV Upload and Import functionality
        $('#csvUploadForm').submit(function (e) {
            e.preventDefault();

            const formData = new FormData(this);

            // Show loading
            Swal.fire({
                title: 'Processing CSV...',
                text: 'Please wait while we process your file',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            $.ajax({
                url: window.bulkImportPreviewUrl || '/student/bulk-import/preview/',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (response) {
                    Swal.close();
                    if (response.success) {
                        // Show preview step
                        $('#step1-upload').hide();
                        $('#step2-preview').show();
                        $('#previewContent').html(response.preview_html);
                        $('#confirmImport').show();

                        // Store import data for later use
                        window.importData = response.import_data;
                    } else {
                        Swal.fire('Error', response.message, 'error');
                    }
                },
                error: function (xhr) {
                    Swal.close();
                    let errorMessage = 'Failed to process CSV file.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    Swal.fire('Error!', errorMessage, 'error');
                }
            });
        });

        // Back to upload step
        $('#backToUpload').click(function () {
            $('#step2-preview').hide();
            $('#step1-upload').show();
            $('#confirmImport').hide();
            $('#csvUploadForm')[0].reset();
        });

        // Confirm import
        $('#confirmImport').click(function () {
            if (!window.importData) {
                Swal.fire('Error', 'No import data available', 'error');
                return;
            }

            performBulkImport();
        });

        // Reset bulk import modal when closed
        $('#bulkImportModal').on('hidden.bs.modal', function () {
            $('#step1-upload').show();
            $('#step2-preview').hide();
            $('#confirmImport').hide();
            $('#csvUploadForm')[0].reset();
            $('#previewContent').empty();
            $('.column-mapping').val('');
            window.importData = null;
        });
    }

    /**
     * Perform bulk import operation
     */
    function performBulkImport() {
        // Get column mappings
        const columnMappings = {};
        $('.column-mapping').each(function () {
            const csvColumn = $(this).data('csv-column');
            const modelField = $(this).val();
            if (modelField && modelField.trim() !== '') {
                columnMappings[csvColumn] = modelField;
            }
        });

        // Get class assignment
        const assignClass = $('#bulkImportClass').val();

        // Show loading with progress
        Swal.fire({
            title: 'Importing Students...',
            html: `
              <div class="progress mb-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 0%" id="importProgress">
                  0%
                </div>
              </div>
              <div id="importStatus">Preparing to import students...</div>
              <div id="importDetails" class="small text-muted mt-2"></div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                // Start simulated progress
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress > 85) progress = 85;
                    const progressBar = document.getElementById('importProgress');
                    const statusDiv = document.getElementById('importStatus');
                    if (progressBar) {
                        progressBar.style.width = progress + '%';
                        progressBar.textContent = Math.round(progress) + '%';
                    }
                    if (statusDiv && progress > 20) {
                        statusDiv.textContent = 'Processing student data...';
                    }
                }, 800);

                window.importProgressInterval = progressInterval;
            }
        });

        $.ajax({
            url: window.bulkImportUrl || '/student/bulk-import/import/',
            type: 'POST',
            data: {
                'import_data': JSON.stringify(window.importData),
                'column_mappings': JSON.stringify(columnMappings),
                'assign_class': assignClass,
                'csrfmiddlewaretoken': $('[name=csrfmiddlewaretoken]').val()
            },
            success: function (response) {
                // Clear progress interval
                if (window.importProgressInterval) {
                    clearInterval(window.importProgressInterval);
                }

                // Complete progress bar
                const progressBar = document.getElementById('importProgress');
                const statusDiv = document.getElementById('importStatus');
                const detailsDiv = document.getElementById('importDetails');

                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                }

                if (response.success) {
                    if (statusDiv) {
                        statusDiv.textContent = 'Import completed successfully!';
                    }
                    if (detailsDiv) {
                        detailsDiv.textContent = `${response.imported_count} students imported` +
                            (response.failed_count > 0 ? `, ${response.failed_count} failed` : '');
                    }

                    // Show success after brief delay
                    setTimeout(() => {
                        $('#bulkImportModal').modal('hide');
                        Swal.fire({
                            title: 'Import Complete!',
                            html: `<strong>${response.imported_count}</strong> students imported successfully.<br>` +
                                `${response.failed_count > 0 ? `<span class="text-warning">${response.failed_count} students failed to import.</span>` : ''}`,
                            icon: 'success',
                            timer: 3000
                        }).then(() => {
                            window.location.reload();
                        });
                    }, 1500);
                } else {
                    let errorDetails = '';
                    if (response.errors && response.errors.length > 0) {
                        errorDetails = '<br><br><strong>Error Details:</strong><br>' +
                            response.errors.map(error => '• ' + error).join('<br>');
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'Import Failed',
                        html: response.message + errorDetails,
                        confirmButtonText: 'OK',
                        customClass: {
                            popup: 'swal-wide'
                        }
                    });
                }
            },
            error: function (xhr) {
                // Clear progress interval
                if (window.importProgressInterval) {
                    clearInterval(window.importProgressInterval);
                }

                let errorMessage = 'Failed to import students.';
                let errorDetails = '';

                if (xhr.responseJSON) {
                    if (xhr.responseJSON.message) {
                        errorMessage = xhr.responseJSON.message;
                    }
                    if (xhr.responseJSON.errors && xhr.responseJSON.errors.length > 0) {
                        errorDetails = '<br><br><strong>Error Details:</strong><br>' +
                            xhr.responseJSON.errors.slice(0, 10).map(error => '• ' + error).join('<br>');
                        if (xhr.responseJSON.errors.length > 10) {
                            errorDetails += `<br>... and ${xhr.responseJSON.errors.length - 10} more errors`;
                        }
                    }
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Import Error!',
                    html: errorMessage + errorDetails + '<br><br><small>For large imports, try breaking your file into smaller batches (100-500 records each).</small>',
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'swal-wide'
                    }
                });
            }
        });
    }

    /**
     * Initialize image upload functionality
     */
    function initializeImageUpload() {
        // Auto-filter based on learning area selection in the form
        $('#new_student_form #id_learning_area').change(function () {
            let learningArea = $(this).val();
            if (learningArea) {
                // Filter available classes based on learning area
                $('#class_id option').hide();
                $('#class_id option[value=""]').show();
                $('#class_id option').each(function () {
                    let classText = $(this).text();
                    if (classText.toLowerCase().includes(learningArea.toLowerCase())) {
                        $(this).show();
                    }
                });
            } else {
                // Show all classes
                $('#class_id option').show();
            }
        });

        // Form submission with SweetAlert
        $('#addStudentForm').submit(function (e) {
            e.preventDefault();

            // Validate profile picture file size before submission
            const profilePictureInput = $('#id_profile_picture')[0];
            if (profilePictureInput && profilePictureInput.files.length > 0) {
                const file = profilePictureInput.files[0];

                // Check file size (300KB limit)
                if (file.size > 300 * 1024) {
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'Please select an image smaller than 300KB.',
                        confirmButtonColor: '#3085d6'
                    });
                    return false;
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please select a valid image file (JPG, PNG, GIF, WebP).',
                        confirmButtonColor: '#3085d6'
                    });
                    return false;
                }
            }

            submitFormWithAjax(this);
        });

        // Initialize bulk image upload functionality
        initializeBulkImageUpload();
    }

    /**
     * Initialize bulk image upload functionality
     */
    function initializeBulkImageUpload() {
        // Drag and drop functionality
        const uploadZone = document.getElementById('imageUploadZone');
        const fileInput = document.getElementById('bulkImageFiles');

        if (uploadZone && fileInput) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadZone.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false);
            });

            // Highlight drop area when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                uploadZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadZone.addEventListener(eventName, unhighlight, false);
            });

            // Handle dropped files
            uploadZone.addEventListener('drop', handleDrop, false);

            // Handle file input change
            fileInput.addEventListener('change', handleFiles, false);

            // Start image upload
            $('#startImageUpload').click(function () {
                if (selectedFiles.length === 0) {
                    Swal.fire('No Files', 'Please select some images to upload.', 'warning');
                    return;
                }

                // Validate file sizes (max 300KB each)
                const oversizedFiles = selectedFiles.filter(file => file.size > 300 * 1024);
                if (oversizedFiles.length > 0) {
                    Swal.fire('File Too Large', `Some files are larger than 300KB. Please reduce their size and try again.`, 'error');
                    return;
                }

                uploadImages();
            });

            // Back to upload step
            $('#backToImageUpload').click(function () {
                $('#imageUploadStep2').hide();
                $('#imageUploadStep1').show();
                $('#confirmImageUpload').hide();
                $('#uploadProgress').hide();
                $('#startImageUpload').show();
            });

            // Confirm image upload
            $('#confirmImageUpload').click(function () {
                if (uploadedFiles.length === 0) {
                    Swal.fire('No Images', 'No images to apply to students.', 'warning');
                    return;
                }

                Swal.fire({
                    title: 'Apply Images to Students?',
                    html: `This will update profile pictures for <strong>${uploadedFiles.length}</strong> students.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#198754',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, apply images!',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        applyImagesToStudents();
                    }
                });
            });

            // Reset bulk image upload modal when closed
            $('#bulkImageUploadModal').on('hidden.bs.modal', function () {
                $('#imageUploadStep1').show();
                $('#imageUploadStep2').hide();
                $('#confirmImageUpload').hide();
                $('#uploadProgress').hide();
                $('#selectedFilesPreview').hide();
                $('#startImageUpload').hide();
                $('#filesList').empty();
                $('#matchingResults').empty();
                selectedFiles = [];
                uploadedFiles = [];
                fileInput.value = '';
            });
        }
    }

    /**
     * Initialize filter functionality
     */
    function initializeFilters() {
        // Apply filters button click handler
        $('#applyFilters').click(function () {
            studentTable.ajax.reload();
        });

        // Reset filters button
        $('#resetFilters').click(function () {
            // Clear all filter select values
            $('#classFilter, #formFilter, #learningAreaFilter, #genderFilter, #statusFilter').val('');

            // Reload DataTable with cleared filters
            studentTable.ajax.reload();
        });

        // Auto-filter when any filter control changes
        $('.filter-control').change(function () {
            studentTable.ajax.reload();
        });
    }

    /**
     * Function to attach event handlers
     */
    function attachEventHandlers() {
        // Handle edit student modal
        $('.edit-student-btn').off('click').on('click', function () {
            const studentId = $(this).data('id');
            loadStudentModal('edit', studentId);
        });

        // Handle delete student with SweetAlert confirmation
        $('.delete-student').off('click').on('click', function () {
            const studentId = $(this).data('id');
            const studentName = $(this).data('name');

            Swal.fire({
                title: 'Delete Student?',
                html: `Are you sure you want to delete <strong>${studentName}</strong>?<br><small class="text-danger">This will also delete the student's user account!</small>`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteStudent(studentId, studentName);
                }
            });
        });

        // Handle quick image upload
        $('.quick-image-upload-btn').off('click').on('click', function () {
            const studentId = $(this).data('id');
            const studentName = $(this).data('name');

            // Create file input dynamically
            const fileInput = $('<input type="file" accept="image/*" style="display: none;">');
            $('body').append(fileInput);

            // Trigger file selection
            fileInput.trigger('click');

            fileInput.on('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                // Validate file size (max 300KB)
                if (file.size > 300 * 1024) {
                    Swal.fire({
                        title: 'File Too Large',
                        text: 'Please select an image smaller than 300KB.',
                        icon: 'error'
                    });
                    fileInput.remove();
                    return;
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Swal.fire({
                        title: 'Invalid File Type',
                        text: 'Please select a valid image file (JPG, PNG, GIF, WebP).',
                        icon: 'error'
                    });
                    fileInput.remove();
                    return;
                }

                // Show confirmation dialog
                Swal.fire({
                    title: 'Upload Image?',
                    html: `Upload this image for <strong>${studentName}</strong>?<br><br><small class="text-muted">File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</small>`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#198754',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, upload!',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        uploadStudentImage(studentId, file, studentName);
                    }
                    fileInput.remove();
                });
            });
        });

        // Handle edit student forms
        $('.edit-student-form').off('submit').on('submit', function (e) {
            e.preventDefault();

            // Validate profile picture file size before submission
            const profilePictureInput = $(this).find('input[id="id_profile_picture"]')[0];
            if (profilePictureInput && profilePictureInput.files.length > 0) {
                const file = profilePictureInput.files[0];

                // Check file size (300KB limit)
                if (file.size > 300 * 1024) {
                    Swal.fire({
                        icon: 'error',
                        title: 'File Too Large',
                        text: 'Please select an image smaller than 300KB.',
                        confirmButtonColor: '#3085d6'
                    });
                    return false;
                }

                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid File Type',
                        text: 'Please select a valid image file (JPG, PNG, GIF, WebP).',
                        confirmButtonColor: '#3085d6'
                    });
                    return false;
                }
            }

            submitFormWithAjax(this);
        });
    }

    /**
     * Function to handle form submission with AJAX
     */
    function submitFormWithAjax(form) {
        const formElement = $(form);
        const formAction = formElement.attr('action');
        const formData = new FormData(form);

        // Add flag to prevent Django message display
        formData.append('ajax_submit', '1');

        // Show loading state
        const submitBtn = formElement.find('button[type="submit"]');
        const originalText = submitBtn.html();
        submitBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...');
        submitBtn.attr('disabled', true);

        $.ajax({
            url: formAction,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (data) {
                // Reset button state
                submitBtn.html(originalText);
                submitBtn.attr('disabled', false);

                if (data.success) {
                    // Close the modal
                    formElement.closest('.modal').modal('hide');

                    // Show success message
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: data.message || 'Operation completed successfully',
                        timer: 1500
                    }).then(() => {
                        if (data.redirect) {
                            window.location.href = data.redirect;
                        } else {
                            window.location.reload();
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Warning',
                        text: data.message || 'Operation completed with warnings'
                    });
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);

                // Reset button state
                submitBtn.html(originalText);
                submitBtn.attr('disabled', false);

                let errorMessage = 'There was a problem with your request. Please try again.';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: errorMessage
                });
            }
        });
    }

    /**
     * Function to load student modals dynamically
     */
    function loadStudentModal(modalType, studentId) {
        let url = '';
        let modalId = '';

        switch (modalType) {
            case 'edit':
                url = window.getStudentEditModalUrl || '/student/edit-modal/';
                modalId = '#editStudentModal';
                break;
            case 'assign':
                url = window.getStudentAssignModalUrl || '/student/assign-modal/';
                modalId = '#assignClassModal';
                break;
            default:
                console.error('Unknown modal type:', modalType);
                return;
        }

        // Show loading indicator
        Swal.fire({
            title: 'Loading...',
            text: 'Please wait while we load the student information',
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // Load modal content via AJAX
        $.ajax({
            url: url,
            type: 'GET',
            data: { student_id: studentId },
            success: function (response) {
                Swal.close();

                // Remove existing modal if any
                $(modalId).remove();

                // Add new modal to container
                $('#studentModalsContainer').html(response.html);

                // Show the modal
                $(modalId).modal('show');

                // Reattach event handlers for buttons in the modal
                $(modalId).find('.edit-student-btn').on('click', function () {
                    $(modalId).modal('hide');
                    loadStudentModal('edit', $(this).data('id'));
                });

                // Handle form submissions
                $(modalId).find('form').on('submit', function (e) {
                    e.preventDefault();

                    const form = $(this);
                    const formData = new FormData(this);

                    // Show loading
                    Swal.fire({
                        title: 'Saving...',
                        text: 'Please wait while we save the changes',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    $.ajax({
                        url: form.attr('action'),
                        type: 'POST',
                        data: formData,
                        processData: false,
                        contentType: false,
                        success: function (response) {
                            Swal.close();
                            $(modalId).modal('hide');

                            // Show success message
                            Swal.fire({
                                icon: 'success',
                                title: 'Success!',
                                text: modalType === 'edit' ? 'Student updated successfully!' : 'Class assigned successfully!',
                                timer: 2000,
                                showConfirmButton: false
                            });

                            // Reload the table
                            studentTable.ajax.reload();
                        },
                        error: function (xhr) {
                            Swal.close();
                            let errorMessage = 'An error occurred. Please try again.';

                            if (xhr.responseJSON && xhr.responseJSON.error) {
                                errorMessage = xhr.responseJSON.error;
                            }

                            Swal.fire({
                                icon: 'error',
                                title: 'Error!',
                                text: errorMessage
                            });
                        }
                    });
                });
            },
            error: function (xhr) {
                Swal.close();
                let errorMessage = 'Failed to load student information. Please try again.';

                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMessage = xhr.responseJSON.error;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: errorMessage
                });
            }
        });
    }

    /**
     * Delete a single student
     */
    function deleteStudent(studentId, studentName) {
        // Get CSRF token
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        // Create form data
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', csrfToken);
        formData.append('ajax_submit', '1');

        // Show loading state
        Swal.fire({
            title: 'Deleting...',
            text: 'Please wait while we delete the student record',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Use standard AJAX call for better browser compatibility
        $.ajax({
            url: `/student/${studentId}/delete/`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (data) {
                Swal.fire({
                    title: 'Deleted!',
                    text: data.message || 'Student has been deleted successfully.',
                    icon: 'success',
                    timer: 1500
                }).then(() => {
                    window.location.reload();
                });
            },
            error: function (xhr) {
                console.error('Error:', xhr);
                let errorMessage = 'There was a problem deleting the student.';

                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    title: 'Error!',
                    text: errorMessage,
                    icon: 'error'
                });
            }
        });
    }

    /**
     * Function to upload student image
     */
    function uploadStudentImage(studentId, file, studentName) {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());
        formData.append('image', file);

        // Show loading state
        Swal.fire({
            title: 'Uploading Image...',
            html: `
              <div class="progress mb-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 0%" id="uploadProgress">
                  0%
                </div>
              </div>
              <div id="uploadStatus">Uploading image for ${studentName}...</div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                // Simulate progress for better UX
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 20;
                    if (progress > 90) progress = 90;
                    $('#uploadProgress').css('width', progress + '%').text(Math.round(progress) + '%');
                }, 200);
                window.uploadProgressInterval = progressInterval;
            }
        });

        $.ajax({
            url: `/student/${studentId}/quick-upload-image/`,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                // Clear progress interval
                if (window.uploadProgressInterval) {
                    clearInterval(window.uploadProgressInterval);
                }

                // Complete progress bar
                $('#uploadProgress').css('width', '100%').text('100%');
                $('#uploadStatus').text('Image uploaded successfully!');

                setTimeout(() => {
                    Swal.fire({
                        title: 'Success!',
                        text: response.message,
                        icon: 'success',
                        timer: 2000
                    }).then(() => {
                        // Update the profile picture in the table without page reload
                        updateStudentProfilePicture(studentId, response.image_url);
                    });
                }, 1000);
            },
            error: function (xhr) {
                // Clear progress interval
                if (window.uploadProgressInterval) {
                    clearInterval(window.uploadProgressInterval);
                }

                let errorMessage = 'Failed to upload image.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Upload Failed!',
                    text: errorMessage
                });
            }
        });
    }

    /**
     * Function to update student profile picture in the table
     */
    function updateStudentProfilePicture(studentId, imageUrl) {
        // Find the row containing this student
        const studentRow = $(`.student-checkbox[value="${studentId}"]`).closest('tr');

        if (studentRow.length) {
            // Update the profile picture in the name column
            const nameColumn = studentRow.find('td').eq(2); // Name column is index 2
            const currentContent = nameColumn.html();

            // Replace the profile picture part
            const updatedContent = currentContent.replace(
                /<div class="d-flex align-items-center">.*?<\/div>/,
                `<div class="d-flex align-items-center"><img src="${imageUrl}" alt="Profile Picture" class="rounded-circle me-2" width="40" height="40"><span>${studentRow.find('.student-checkbox').data('student-name')}</span></div>`
            );

            nameColumn.html(updatedContent);
        }
    }

    // Bulk image upload helper functions
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        document.getElementById('imageUploadZone').classList.add('dragover');
    }

    function unhighlight(e) {
        document.getElementById('imageUploadZone').classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files: files } });
    }

    function handleFiles(e) {
        const files = Array.from(e.target.files);
        selectedFiles = files;

        if (files.length > 0) {
            displayFilePreviews(files);
            $('#selectedFilesPreview').show();
            $('#startImageUpload').show();
        }
    }

    function displayFilePreviews(files) {
        const filesList = document.getElementById('filesList');
        filesList.innerHTML = '';

        files.forEach((file, index) => {
            const filePreview = document.createElement('div');
            filePreview.className = 'col-md-3 col-sm-4 col-6';

            const reader = new FileReader();
            reader.onload = function (e) {
                filePreview.innerHTML = `
                    <div class="file-preview">
                        <img src="${e.target.result}" alt="${file.name}">
                        <div class="file-info">
                            <div class="file-name" title="${file.name}">${file.name}</div>
                            <div class="file-size">${formatFileSize(file.size)}</div>
                        </div>
                    </div>
                `;
            };
            reader.readAsDataURL(file);

            filesList.appendChild(filePreview);
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function uploadImages() {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());

        selectedFiles.forEach(file => {
            formData.append('images', file);
        });

        // Show progress
        $('#uploadProgress').show();
        $('#startImageUpload').hide();

        // Simulate progress for better UX
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            updateProgress(progress);
        }, 200);

        $.ajax({
            url: window.bulkUploadImagesUrl || '/student/bulk-upload-images/',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                clearInterval(progressInterval);
                updateProgress(100);

                setTimeout(() => {
                    if (response.success) {
                        uploadedFiles = response.uploaded_files;
                        showMatchingResults(response.matches);
                    } else {
                        Swal.fire('Upload Failed', response.message, 'error');
                        $('#uploadProgress').hide();
                        $('#startImageUpload').show();
                    }
                }, 500);
            },
            error: function (xhr) {
                clearInterval(progressInterval);
                let errorMessage = 'Failed to upload images.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                Swal.fire('Upload Error', errorMessage, 'error');
                $('#uploadProgress').hide();
                $('#startImageUpload').show();
            }
        });
    }

    function updateProgress(percent) {
        $('#uploadProgressBar').css('width', percent + '%');
        $('#uploadProgressText').text(Math.round(percent) + '%');
    }

    function showMatchingResults(matches) {
        const resultsHtml = generateMatchingResultsHtml(matches);
        $('#matchingResults').html(resultsHtml);
        $('#imageUploadStep1').hide();
        $('#imageUploadStep2').show();
        $('#confirmImageUpload').show();
    }

    function generateMatchingResultsHtml(matches) {
        let html = '<div class="row">';

        // Summary
        html += `
            <div class="col-12 mb-3">
                <div class="alert alert-info">
                    <h6 class="alert-heading">Upload Summary</h6>
                    <p class="mb-0">
                        <strong>${matches.matched.length}</strong> images matched to students, 
                        <strong>${matches.unmatched.length}</strong> images could not be matched.
                    </p>
                </div>
            </div>
        `;

        // Matched images
        if (matches.matched.length > 0) {
            html += '<div class="col-12"><h6 class="text-success mb-3"><i class="bi bi-check-circle me-1"></i>Matched Images</h6></div>';
            matches.matched.forEach(match => {
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="match-result matched">
                            <div class="student-info">
                                <img src="${match.image_url}" alt="Uploaded image" class="student-avatar">
                                <div class="student-details">
                                    <h6>${match.student.full_name}</h6>
                                    <small>Admission: ${match.student.admission_number}</small><br>
                                    <small>Class: ${match.student.current_class || 'Not assigned'}</small>
                                </div>
                                <div class="match-status">
                                    <span class="badge bg-success">Matched</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // Unmatched images
        if (matches.unmatched.length > 0) {
            html += '<div class="col-12"><h6 class="text-danger mb-3"><i class="bi bi-exclamation-triangle me-1"></i>Unmatched Images</h6></div>';
            matches.unmatched.forEach(file => {
                html += `
                    <div class="col-md-6 mb-3">
                        <div class="match-result unmatched">
                            <div class="student-info">
                                <img src="${file.url}" alt="Uploaded image" class="student-avatar">
                                <div class="student-details">
                                    <h6>${file.name}</h6>
                                    <small>Could not match to any student</small><br>
                                    <small class="text-muted">Check the file name format</small>
                                </div>
                                <div class="match-status">
                                    <span class="badge bg-danger">Unmatched</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        return html;
    }

    function applyImagesToStudents() {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());
        formData.append('uploaded_files', JSON.stringify(uploadedFiles));

        Swal.fire({
            title: 'Applying Images...',
            html: `
              <div class="progress mb-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 0%" id="applyProgress">
                  0%
                </div>
              </div>
              <div id="applyStatus">Updating student profile pictures...</div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 20;
                    if (progress > 90) progress = 90;
                    $('#applyProgress').css('width', progress + '%').text(Math.round(progress) + '%');
                }, 300);
                window.applyProgressInterval = progressInterval;
            }
        });

        $.ajax({
            url: window.applyBulkImagesUrl || '/student/apply-bulk-images/',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (window.applyProgressInterval) {
                    clearInterval(window.applyProgressInterval);
                }

                $('#applyProgress').css('width', '100%').text('100%');
                $('#applyStatus').text('Images applied successfully!');

                setTimeout(() => {
                    Swal.fire({
                        title: 'Success!',
                        text: `Profile pictures updated for ${response.updated_count} students.`,
                        icon: 'success',
                        timer: 2000
                    }).then(() => {
                        $('#bulkImageUploadModal').modal('hide');
                        window.location.reload();
                    });
                }, 1000);
            },
            error: function (xhr) {
                if (window.applyProgressInterval) {
                    clearInterval(window.applyProgressInterval);
                }

                let errorMessage = 'Failed to apply images to students.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: errorMessage
                });
            }
        });
    }

    // Initial attachment of event handlers
    attachEventHandlers();

    // Remove the click handler for view-student if it exists
    $('.view-student').off('click');
});
