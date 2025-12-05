/**
 * Teacher Activity Monitoring - Common JavaScript
 * Handles interactive features and notifications for the teacher activity monitoring system
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize tooltips
    initTooltips();

    // Initialize DataTables if available
    initDataTables();

    // Set up confirmation dialogs for forms
    setupFormConfirmations();

    // Set up date range validation
    setupDateRangeValidation();

    // Initialize schedule reminder modal handlers
    initScheduleReminderModal();

    // Handle Django messages with SweetAlert
    handleDjangoMessages();

    // Set up academic year change handler to update terms
    setupAcademicYearChangeHandler();
});

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize DataTables if the library is available
 */
function initDataTables() {
    if (typeof $.fn.DataTable !== 'undefined') {
        $('.datatable').DataTable({
            responsive: true,
            pageLength: 25,
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search...",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "No entries found",
                infoFiltered: "(filtered from _MAX_ total entries)"
            }
        });

        // Hide the fallback pagination if DataTables is active
        const fallbackPagination = document.getElementById('fallback-pagination');
        if (fallbackPagination) {
            fallbackPagination.classList.add('d-none');
        }
    } else {
        // Show the fallback pagination if DataTables is not available
        const fallbackPagination = document.getElementById('fallback-pagination');
        if (fallbackPagination) {
            fallbackPagination.classList.remove('d-none');
        }
    }
}

/**
 * Set up SweetAlert confirmation dialogs for forms with data-confirm attribute
 */
function setupFormConfirmations() {
    const confirmForms = document.querySelectorAll('form[data-confirm="true"]');

    confirmForms.forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Determine what type of activity is being reminded
            const activityTypeInput = this.querySelector('input[name="activity_type"]');
            let activityType = activityTypeInput ? activityTypeInput.value : 'activity';

            // Format activity type for display
            let activityTypeFormatted = 'activity';
            if (activityType === 'scores') activityTypeFormatted = 'score entry';
            else if (activityType === 'remarks') activityTypeFormatted = 'student remarks';
            else if (activityType === 'report_cards') activityTypeFormatted = 'report cards';

            // Check if this is a bulk reminder
            const isBulkReminder = this.id === 'bulkReminderForm';
            const title = isBulkReminder ? 'Send Bulk Reminders?' : 'Send Reminder?';
            const text = isBulkReminder
                ? `Are you sure you want to send reminders to all teachers matching your criteria for ${activityTypeFormatted}?`
                : `Are you sure you want to send a reminder for ${activityTypeFormatted}?`;

            Swal.fire({
                title: title,
                text: text,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, send reminder',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Show loading state
                    Swal.fire({
                        title: 'Sending...',
                        text: 'Please wait while we send the reminder(s).',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    // Submit the form
                    this.submit();
                }
            });
        });
    });
}

/**
 * Set up date range validation for forms with date inputs
 */
function setupDateRangeValidation() {
    const dateFromInputs = document.querySelectorAll('input[id="date_from"]');
    const dateToInputs = document.querySelectorAll('input[id="date_to"]');

    dateFromInputs.forEach(dateFrom => {
        const form = dateFrom.closest('form');
        const dateTo = form.querySelector('input[id="date_to"]');

        if (dateTo) {
            [dateFrom, dateTo].forEach(input => {
                input.addEventListener('change', function () {
                    validateDateRange(dateFrom, dateTo);
                });
            });
        }
    });
}

/**
 * Validate that date_from is not after date_to
 */
function validateDateRange(dateFromEl, dateToEl) {
    const dateFrom = dateFromEl.value;
    const dateTo = dateToEl.value;

    if (dateFrom && dateTo && dateFrom > dateTo) {
        Swal.fire({
            title: 'Invalid Date Range',
            text: 'The "Date From" cannot be after the "Date To".',
            icon: 'warning',
            confirmButtonColor: '#3085d6'
        });

        // Reset the dates
        dateToEl.value = '';
    }
}

/**
 * Initialize the schedule reminder modal functionality
 */
function initScheduleReminderModal() {
    const scheduleLinks = document.querySelectorAll('.schedule-reminder-link');
    const scheduleForm = document.getElementById('scheduleReminderForm');
    const scheduleActivityType = document.getElementById('schedule_activity_type');

    if (!scheduleForm) return;

    scheduleLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const formAction = this.dataset.formAction;
            const activityType = this.dataset.activityType;

            scheduleForm.action = formAction;
            scheduleActivityType.value = activityType;

            // Set default time to tomorrow at 8:00 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(8, 0, 0, 0);

            // Format for datetime-local input
            const year = tomorrow.getFullYear();
            const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const day = String(tomorrow.getDate()).padStart(2, '0');
            const hours = String(tomorrow.getHours()).padStart(2, '0');
            const minutes = String(tomorrow.getMinutes()).padStart(2, '0');

            document.getElementById('individual_scheduled_date').value =
                `${year}-${month}-${day}T${hours}:${minutes}`;
        });
    });
}

/**
 * Handle Django messages and display them using SweetAlert
 */
function handleDjangoMessages() {
    // Look for Django messages in the page
    const djangoMessages = document.querySelectorAll('.django-message');

    if (djangoMessages.length > 0) {
        // Process each message
        djangoMessages.forEach(messageElement => {
            const messageText = messageElement.textContent.trim();
            const messageType = messageElement.dataset.messageType || 'info';

            // Map Django message types to SweetAlert icons
            let icon = 'info';
            if (messageType === 'success') icon = 'success';
            else if (messageType === 'error') icon = 'error';
            else if (messageType === 'warning') icon = 'warning';

            // Check if this is a reminder confirmation message
            if (messageText.includes('Reminder sent to')) {
                // Extract teacher name and activity type for a better title
                let title = 'Reminder Sent';

                Swal.fire({
                    title: title,
                    text: messageText,
                    icon: icon,
                    confirmButtonColor: '#3085d6'
                });
            } else {
                // For other types of messages
                Swal.fire({
                    title: messageType.charAt(0).toUpperCase() + messageType.slice(1),
                    text: messageText,
                    icon: icon,
                    confirmButtonColor: '#3085d6'
                });
            }

            // Remove the original message element to prevent duplicate notifications
            messageElement.remove();
        });
    }
}

/**
 * Show a success notification
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 */
function showSuccessNotification(title, message) {
    Swal.fire({
        title: title,
        text: message,
        icon: 'success',
        confirmButtonColor: '#3085d6'
    });
}

/**
 * Show an error notification
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 */
function showErrorNotification(title, message) {
    Swal.fire({
        title: title,
        text: message,
        icon: 'error',
        confirmButtonColor: '#3085d6'
    });
}

/**
 * Show a warning notification
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 */
function showWarningNotification(title, message) {
    Swal.fire({
        title: title,
        text: message,
        icon: 'warning',
        confirmButtonColor: '#3085d6'
    });
}

/**
 * Helper function to get school ID from the page context
 */
function getSchoolId() {
    const schoolIdElement = document.getElementById('school_id');
    if (schoolIdElement) {
        return schoolIdElement.value;
    }
    return '';
}

/**
 * Set up event handler to update terms when academic year changes
 */
function setupAcademicYearChangeHandler() {
    // Try different selector approaches to ensure we find the academic year dropdown
    const academicYearSelect = document.getElementById('id_academic_year') ||
        document.querySelector('select[name="academic_year"]');

    if (academicYearSelect) {
        console.log('Academic year select found:', academicYearSelect);

        // Add the change event listener
        academicYearSelect.addEventListener('change', function () {
            console.log('Academic year changed to:', this.value);
            updateTermsForAcademicYear(this.value);
        });

        // If there's already a value selected, update terms on page load
        if (academicYearSelect.value) {
            console.log('Initial academic year value:', academicYearSelect.value);
            updateTermsForAcademicYear(academicYearSelect.value);
        }
    } else {
        console.error('Academic year select element not found');
    }
}

/**
 * Update the terms dropdown based on selected academic year
 * @param {string} academicYearId - The selected academic year ID
 */
function updateTermsForAcademicYear(academicYearId) {
    if (!academicYearId) {
        console.log('No academic year ID provided');
        return;
    }

    // Try different selector approaches to ensure we find the term dropdown
    const termSelect = document.getElementById('id_term') ||
        document.querySelector('select[name="term"]');

    if (!termSelect) {
        console.error('Term select element not found');
        return;
    }

    const schoolId = getSchoolId();
    console.log('Fetching terms for academic year:', academicYearId, 'school:', schoolId);

    // Show loading state
    termSelect.disabled = true;

    // Make AJAX request to get terms for this academic year
    const url = `/api/terms/?academic_year=${academicYearId}&school=${schoolId}`;
    console.log('API URL:', url);

    fetch(url)
        .then(response => {
            if (!response.ok) {
                console.error('API response not OK:', response.status);
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Terms data received:', data);

            // Clear existing options
            while (termSelect.options.length > 0) {
                termSelect.remove(0);
            }

            // Add an empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '---------';
            termSelect.appendChild(emptyOption);

            // Add new options
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(term => {
                    const option = document.createElement('option');
                    option.value = term.id;
                    option.textContent = term.name || `Term ${term.term_number}`;
                    termSelect.appendChild(option);
                });
                console.log(`Added ${data.length} term options`);
            } else {
                console.log('No terms found for this academic year');
            }
        })
        .catch(error => {
            console.error('Error fetching terms:', error);
            showErrorNotification('Error', 'Failed to load terms for the selected academic year');
        })
        .finally(() => {
            termSelect.disabled = false;
        });
} 