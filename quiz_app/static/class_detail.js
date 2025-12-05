document.addEventListener('DOMContentLoaded', function() {
    // Update Class Modal Functionality
    const updateClassModal = document.getElementById('updateClassModal');
    if (updateClassModal) {
        updateClassModal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const url = button.getAttribute('href');
            const modalBody = this.querySelector('.modal-body');

            modalBody.innerHTML = '<div class="text-center p-4"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading form...</p></div>';

            fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                modalBody.innerHTML = data.html;
                const form = modalBody.querySelector('form');
                if (form) {
                    initializeAjaxForm(form);
                }
            })
            .catch(error => {
                console.error('Error loading class update form:', error);
                modalBody.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Error loading the form. Please try refreshing the page.</div>';
            });
        });

        updateClassModal.addEventListener('hidden.bs.modal', function() {
            this.querySelector('.modal-body').innerHTML = '';
        });
    }

    // Add Student Modal Form Submission
    const addStudentModal = document.getElementById('addStudentModal');
    if (addStudentModal) {
        const form = addStudentModal.querySelector('form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                const submitButton = this.querySelector('button[type="submit"]');

                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

                fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.location.reload();
                    } else {
                        const modalBody = addStudentModal.querySelector('.modal-body');
                        modalBody.innerHTML = data.html;
                        initializeAjaxForm(modalBody.querySelector('form'));
                    }
                })
                .catch(error => {
                    console.error('Error submitting form:', error);
                    const errorAlert = document.createElement('div');
                    errorAlert.className = 'alert alert-danger mt-3';
                    errorAlert.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>An error occurred while saving. Please try again.';
                    form.insertAdjacentElement('beforeend', errorAlert);
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="bi bi-check-circle me-1"></i>Add Student';
                });
            });
        }
    }

    // Delete Student Functionality
    document.querySelectorAll('.btn-outline-danger').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to remove this student from the class?')) {
                const studentRow = this.closest('tr');
                const studentId = this.getAttribute('data-student-id');
                const classId = window.location.pathname.split('/')[2];

                fetch(`/classes/${classId}/remove-student/${studentId}/`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        studentRow.remove();
                        // Update student count
                        const countElement = document.querySelector('h3.mb-0');
                        const currentCount = parseInt(countElement.textContent.match(/\d+/)[0]) - 1;
                        countElement.textContent = `Students (${currentCount})`;
                    } else {
                        alert('Error removing student: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while removing the student.');
                });
            }
        });
    });

    // Initialize AJAX form submission
    function initializeAjaxForm(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect_url;
                } else {
                    const modalBody = form.closest('.modal-body');
                    modalBody.innerHTML = data.html;
                    initializeAjaxForm(modalBody.querySelector('form'));
                }
            })
            .catch(error => {
                console.error('Error submitting form:', error);
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger mt-3';
                errorAlert.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>An error occurred while saving. Please try again.';
                form.insertAdjacentElement('beforeend', errorAlert);
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="bi bi-save me-1"></i>Save Changes';
            });
        });
    }
}));