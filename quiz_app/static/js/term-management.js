/**
 * Term Management JavaScript
 * Handles all CRUD operations for terms using AJAX
 */

document.addEventListener('DOMContentLoaded', function () {
    // Setup CSRF token for AJAX requests
    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    // Show loading spinner inside a button
    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
            button.disabled = true;
        } else {
            // Restore original button text and enable
            button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
            button.disabled = false;
        }
    }

    // Save original button texts for all submit buttons
    document.querySelectorAll('button[type="submit"]').forEach(button => {
        button.setAttribute('data-original-text', button.innerHTML);
    });

    // Function to display validation errors
    function displayErrors(form, errors) {
        // Clear previous errors
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        form.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

        // Display new errors
        for (const [field, messages] of Object.entries(errors)) {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('is-invalid');

                // Create error message element
                const errorDiv = document.createElement('div');
                errorDiv.className = 'invalid-feedback';
                errorDiv.textContent = Array.isArray(messages) ? messages[0] : messages;

                // Insert after the input
                input.parentNode.insertBefore(errorDiv, input.nextSibling);
            }
        }
    }

    // Basic client-side validation
    function validateTermForm(form) {
        const startDate = new Date(form.querySelector('[name="start_date"]').value);
        const endDate = new Date(form.querySelector('[name="end_date"]').value);
        const errors = {};

        if (startDate >= endDate) {
            errors.end_date = "End date must be after start date";
        }

        return errors;
    }

    // Create Term Modal
    const createTermModal = document.getElementById('createTermModal');
    if (createTermModal) {
        createTermModal.addEventListener('show.bs.modal', function (event) {
            // Get values from data attributes
            const academicYearStart = new Date(createTermModal.getAttribute('data-academic-year-start'));
            const academicYearEnd = new Date(createTermModal.getAttribute('data-academic-year-end'));
            const termLength = Math.floor((academicYearEnd - academicYearStart) / (3 * 86400000)); // in days

            // Check if the term_number select exists and has options
            const termSelect = document.getElementById('id_term_number');

            // Set default dates based on selected term number
            const setDefaultDates = function () {
                const termNumber = parseInt(termSelect.value);
                let startDate, endDate;

                if (termNumber === 1) {
                    startDate = new Date(academicYearStart);
                    endDate = new Date(academicYearStart);
                    endDate.setDate(endDate.getDate() + termLength);
                } else if (termNumber === 2) {
                    startDate = new Date(academicYearStart);
                    startDate.setDate(startDate.getDate() + termLength + 1);
                    endDate = new Date(academicYearStart);
                    endDate.setDate(endDate.getDate() + (termLength * 2));
                } else if (termNumber === 3) {
                    startDate = new Date(academicYearStart);
                    startDate.setDate(startDate.getDate() + (termLength * 2) + 1);
                    endDate = new Date(academicYearEnd);
                }

                if (startDate && endDate) {
                    document.getElementById('id_start_date').value = startDate.toISOString().split('T')[0];
                    document.getElementById('id_end_date').value = endDate.toISOString().split('T')[0];
                }
            };

            // If term select exists and we need to add default options (empty select)
            if (termSelect && termSelect.options.length === 0) {
                // Get existing term numbers from data attribute
                let existingTermNumbers = [];
                try {
                    existingTermNumbers = JSON.parse(createTermModal.getAttribute('data-existing-term-numbers') || '[]');
                } catch (e) {
                    console.error('Error parsing existing term numbers:', e);
                }

                // Add options for terms that don't exist yet
                const termOptions = [
                    { value: 1, text: 'First Term' },
                    { value: 2, text: 'Second Term' },
                    { value: 3, text: 'Third Term' }
                ];

                let hasOptions = false;
                termOptions.forEach(opt => {
                    if (!existingTermNumbers.includes(opt.value)) {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        termSelect.appendChild(option);
                        hasOptions = true;
                    }
                });

                // If all terms are already created, show a message
                if (!hasOptions) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'All terms have been created';
                    option.disabled = true;
                    option.selected = true;
                    termSelect.appendChild(option);

                    // Disable the submit button
                    const submitBtn = createTermModal.querySelector('button[type="submit"]');
                    if (submitBtn) submitBtn.disabled = true;
                }
            }

            // Set initial dates
            setDefaultDates();

            // Update dates when term number changes
            termSelect.addEventListener('change', setDefaultDates);
        });

        // Handle form submission via AJAX
        const createTermForm = createTermModal.querySelector('form');
        createTermForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Client-side validation
            const errors = validateTermForm(this);
            if (Object.keys(errors).length > 0) {
                displayErrors(this, errors);
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const formData = new FormData(this);

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest', // For Django to detect AJAX
                    'X-CSRFToken': getCSRFToken()
                }
            })
                .then(response => response.json())
                .then(data => {
                    setButtonLoading(submitBtn, false);

                    if (data.success) {
                        // Close modal and show success message
                        const modal = bootstrap.Modal.getInstance(createTermModal);
                        modal.hide();

                        Swal.fire({
                            title: 'Success!',
                            text: data.message || 'Term created successfully',
                            icon: 'success'
                        }).then(() => {
                            // Reload the page to show the new term
                            window.location.reload();
                        });
                    } else {
                        // Display validation errors
                        if (data.errors) {
                            displayErrors(this, data.errors);
                        } else {
                            Swal.fire({
                                title: 'Error',
                                text: data.message || 'An error occurred',
                                icon: 'error'
                            });
                        }
                    }
                })
                .catch(error => {
                    setButtonLoading(submitBtn, false);
                    Swal.fire({
                        title: 'Error',
                        text: 'An unexpected error occurred',
                        icon: 'error'
                    });
                    console.error('Error:', error);
                });
        });
    }

    // View Term Modal
    const viewTermModal = document.getElementById('viewTermModal');
    if (viewTermModal) {
        viewTermModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');
            const termNumber = button.getAttribute('data-term-number');
            const startDate = new Date(button.getAttribute('data-start')).toLocaleDateString();
            const endDate = new Date(button.getAttribute('data-end')).toLocaleDateString();
            const isCurrent = button.getAttribute('data-is-current') === 'True';

            // Update the modal content
            document.getElementById('view-term-name').textContent = name;
            document.getElementById('view-term-number').textContent =
                termNumber == 1 ? "First Term" : termNumber == 2 ? "Second Term" : "Third Term";
            document.getElementById('view-term-start-date').textContent = startDate;
            document.getElementById('view-term-end-date').textContent = endDate;
            document.getElementById('view-term-status').innerHTML = isCurrent ?
                '<span class="badge bg-success">Current</span>' :
                '<span class="badge bg-secondary">Inactive</span>';

            // Update view details link
            const detailLink = document.getElementById('view-term-detail-link');
            const detailUrl = detailLink.getAttribute('data-url-template').replace('0', id);
            detailLink.href = detailUrl;
        });
    }

    // Edit Term Modal
    const editTermModal = document.getElementById('editTermModal');
    if (editTermModal) {
        editTermModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const id = button.getAttribute('data-id');
            const termNumber = button.getAttribute('data-term-number');
            const startDate = button.getAttribute('data-start');
            const endDate = button.getAttribute('data-end');
            const isCurrent = button.getAttribute('data-is-current') === 'True';

            // Update form fields
            const termSelect = document.getElementById('edit_term_number');
            termSelect.value = termNumber; // This sets the correct term number
            document.getElementById('edit_term_start_date').value = startDate;
            document.getElementById('edit_term_end_date').value = endDate;
            document.getElementById('edit_term_is_current').checked = isCurrent;

            // Update form action
            const form = document.getElementById('editTermForm');
            const actionUrl = form.getAttribute('data-url-template').replace('0', id);
            form.action = actionUrl;
        });

        // Handle form submission via AJAX
        const editTermForm = editTermModal.querySelector('form');
        editTermForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Client-side validation
            const errors = validateTermForm(this);
            if (Object.keys(errors).length > 0) {
                displayErrors(this, errors);
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const formData = new FormData(this);

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest', // For Django to detect AJAX
                    'X-CSRFToken': getCSRFToken()
                }
            })
                .then(response => response.json())
                .then(data => {
                    setButtonLoading(submitBtn, false);

                    if (data.success) {
                        // Close modal and show success message
                        const modal = bootstrap.Modal.getInstance(editTermModal);
                        modal.hide();

                        Swal.fire({
                            title: 'Success!',
                            text: data.message || 'Term updated successfully',
                            icon: 'success'
                        }).then(() => {
                            // Reload the page to show the updated term
                            window.location.reload();
                        });
                    } else {
                        // Display validation errors
                        if (data.errors) {
                            displayErrors(this, data.errors);
                        } else {
                            Swal.fire({
                                title: 'Error',
                                text: data.message || 'An error occurred',
                                icon: 'error'
                            });
                        }
                    }
                })
                .catch(error => {
                    setButtonLoading(submitBtn, false);
                    Swal.fire({
                        title: 'Error',
                        text: 'An unexpected error occurred',
                        icon: 'error'
                    });
                    console.error('Error:', error);
                });
        });
    }

    // Delete Term Modal
    const deleteTermModal = document.getElementById('deleteTermModal');
    if (deleteTermModal) {
        deleteTermModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const id = button.getAttribute('data-id');
            const name = button.getAttribute('data-name');

            // Update modal content
            document.getElementById('delete-term-name').textContent = name;

            // Update form action
            const form = document.getElementById('deleteTermForm');
            const actionUrl = form.getAttribute('data-url-template').replace('0', id);
            form.action = actionUrl;
        });

        // Handle form submission via AJAX
        const deleteTermForm = deleteTermModal.querySelector('form');
        deleteTermForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const formData = new FormData(this);

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest', // For Django to detect AJAX
                    'X-CSRFToken': getCSRFToken()
                }
            })
                .then(response => response.json())
                .then(data => {
                    setButtonLoading(submitBtn, false);

                    if (data.success) {
                        // Close modal and show success message
                        const modal = bootstrap.Modal.getInstance(deleteTermModal);
                        modal.hide();

                        Swal.fire({
                            title: 'Success!',
                            text: data.message || 'Term deleted successfully',
                            icon: 'success'
                        }).then(() => {
                            // Reload the page
                            window.location.reload();
                        });
                    } else {
                        Swal.fire({
                            title: 'Error',
                            text: data.message || 'An error occurred',
                            icon: 'error'
                        });
                    }
                })
                .catch(error => {
                    setButtonLoading(submitBtn, false);
                    Swal.fire({
                        title: 'Error',
                        text: 'An unexpected error occurred',
                        icon: 'error'
                    });
                    console.error('Error:', error);
                });
        });
    }

    // Set Current Academic Year button
    const setCurrentAcademicYearBtn = document.querySelector('.set-current-btn');
    if (setCurrentAcademicYearBtn) {
        setCurrentAcademicYearBtn.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const url = this.getAttribute('data-url-template').replace('0', id);

            Swal.fire({
                title: 'Confirm Change',
                text: `Set "${name}" as the current academic year?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, set as current',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    const originalText = this.innerHTML;
                    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
                    this.disabled = true;

                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRFToken': getCSRFToken()
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            this.innerHTML = originalText;
                            this.disabled = false;

                            if (data.success) {
                                Swal.fire({
                                    title: 'Success!',
                                    text: data.message || 'Academic year updated successfully',
                                    icon: 'success'
                                }).then(() => {
                                    window.location.reload();
                                });
                            } else {
                                Swal.fire({
                                    title: 'Error',
                                    text: data.message || 'An error occurred',
                                    icon: 'error'
                                });
                            }
                        })
                        .catch(error => {
                            this.innerHTML = originalText;
                            this.disabled = false;

                            Swal.fire({
                                title: 'Error',
                                text: 'An unexpected error occurred',
                                icon: 'error'
                            });
                            console.error('Error:', error);
                        });
                }
            });
        });
    }

    // Set Current Term buttons
    const setCurrentTermButtons = document.querySelectorAll('.set-current-term-btn');
    setCurrentTermButtons.forEach(button => {
        button.addEventListener('click', function () {
            const id = this.getAttribute('data-id');
            const name = this.getAttribute('data-name');
            const url = this.getAttribute('data-url-template').replace('0', id);

            Swal.fire({
                title: 'Confirm Change',
                text: `Set "${name}" as the current term?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, set as current',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    const originalText = this.innerHTML;
                    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...';
                    this.disabled = true;

                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-CSRFToken': getCSRFToken()
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            this.innerHTML = originalText;
                            this.disabled = false;

                            if (data.success) {
                                Swal.fire({
                                    title: 'Success!',
                                    text: data.message || 'Term updated successfully',
                                    icon: 'success'
                                }).then(() => {
                                    window.location.reload();
                                });
                            } else {
                                Swal.fire({
                                    title: 'Error',
                                    text: data.message || 'An error occurred',
                                    icon: 'error'
                                });
                            }
                        })
                        .catch(error => {
                            this.innerHTML = originalText;
                            this.disabled = false;

                            Swal.fire({
                                title: 'Error',
                                text: 'An unexpected error occurred',
                                icon: 'error'
                            });
                            console.error('Error:', error);
                        });
                }
            });
        });
    });
}); 