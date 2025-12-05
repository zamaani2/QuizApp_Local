// Place this in a file like static/js/modals.js

document.addEventListener('DOMContentLoaded', function () {
    // Modal handling
    setupModals();

    // Set up event delegation for dynamic content
    document.body.addEventListener('click', function (e) {
        // Modal open buttons
        if (e.target.matches('[data-modal-url]') || e.target.closest('[data-modal-url]')) {
            const button = e.target.matches('[data-modal-url]') ? e.target : e.target.closest('[data-modal-url]');
            e.preventDefault();
            openModal(button.dataset.modalUrl, button.dataset.modalTitle || 'Modal');
        }

        // Set current academic year/term buttons
        if (e.target.matches('.set-current-btn') || e.target.closest('.set-current-btn')) {
            const button = e.target.matches('.set-current-btn') ? e.target : e.target.closest('.set-current-btn');
            e.preventDefault();
            setCurrent(button.href, button.dataset.message || 'Are you sure?');
        }
    });
});

function setupModals() {
    // Close modal when clicking the backdrop or close button
    document.querySelectorAll('.modal .close, .modal .btn-cancel').forEach(button => {
        button.addEventListener('click', function () {
            closeModal();
        });
    });

    // Close modal when clicking outside
    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
    modalBackdrops.forEach(backdrop => {
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) {
                closeModal();
            }
        });
    });

    // Form submission in modals
    document.querySelectorAll('.modal form').forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            submitModalForm(form);
        });
    });
}

function openModal(url, title = 'Modal') {
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => response.json())
        .then(data => {
            // Create modal container if it doesn't exist
            let modalContainer = document.getElementById('dynamicModal');
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = 'dynamicModal';
                document.body.appendChild(modalContainer);
            }

            // Set modal content
            modalContainer.innerHTML = data.html;

            // Show modal
            const modal = document.querySelector('#dynamicModal .modal');
            modal.classList.add('show');
            modal.style.display = 'block';

            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);
            document.body.classList.add('modal-open');

            // Setup event handlers for the new modal content
            setupModals();
        })
        .catch(error => {
            console.error('Error loading modal:', error);
            showAlert('Error', 'Failed to load modal content.', 'error');
        });
}

function closeModal() {
    const modal = document.querySelector('.modal.show');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';

        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }

        document.body.classList.remove('modal-open');
    }
}

function submitModalForm(form) {
    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close modal
                closeModal();

                // Show success message
                showAlert('Success', data.message, 'success', function () {
                    // Redirect after alert is closed if URL provided
                    if (data.redirect_url) {
                        window.location.href = data.redirect_url;
                    }
                });
            } else {
                // Show errors
                if (data.errors) {
                    displayFormErrors(form, data.errors);
                } else {
                    showAlert('Error', data.message || 'An error occurred.', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Form submission error:', error);
            showAlert('Error', 'Failed to submit form.', 'error');
        });
}

function displayFormErrors(form, errors) {
    // Clear previous errors
    form.querySelectorAll('.is-invalid').forEach(field => {
        field.classList.remove('is-invalid');
    });
    form.querySelectorAll('.invalid-feedback').forEach(errorDiv => {
        errorDiv.remove();
    });

    // Display new errors
    for (const [fieldName, fieldErrors] of Object.entries(errors)) {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('is-invalid');

            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            errorDiv.textContent = fieldErrors.join(' ');

            field.parentNode.appendChild(errorDiv);
        }
    }

    // General form error at the top
    if (errors.__all__) {
        showAlert('Form Error', errors.__all__.join(' '), 'error');
    }
}

function setCurrent(url, confirmMessage) {
    Swal.fire({
        title: 'Confirmation',
        text: confirmMessage,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, set as current',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            // Send POST request to set as current
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCSRFToken()
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showAlert('Success', data.message, 'success', function () {
                            if (data.redirect_url) {
                                window.location.href = data.redirect_url;
                            }
                        });
                    } else {
                        showAlert('Error', data.message || 'An error occurred.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error setting current:', error);
                    showAlert('Error', 'Operation failed.', 'error');
                });
        }
    });
}

function showAlert(title, message, type, callback) {
    Swal.fire({
        title: title,
        text: message,
        icon: type,
        confirmButtonText: 'OK'
    }).then((result) => {
        if (callback && typeof callback === 'function') {
            callback(result);
        }
    });
}

function getCSRFToken() {
    // Get CSRF token from cookie
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

    return cookieValue || '';
}