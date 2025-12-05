// users/static/js/user_management.js
document.addEventListener('DOMContentLoaded', function() {
    // Select all checkbox functionality
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const userCheckboxes = document.querySelectorAll('.user-checkbox');
            userCheckboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
            });
        });
    }

    // Create user form submission
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear previous errors
            clearFormErrors(createUserForm);
            
            const formData = new FormData(createUserForm);
            
            fetch(createUserForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // If send credentials is checked, send them
                    if (document.getElementById('sendCredentials').checked) {
                        sendUserCredentials(data.user_id);
                    }
                    
                    // Add new row to table
                    const tableBody = document.getElementById('usersTableBody');
                    
                    // Check if "No users found" row exists and remove it
                    const emptyRow = tableBody.querySelector('tr td[colspan="8"]');
                    if (emptyRow) {
                        tableBody.innerHTML = '';
                    }
                    
                    tableBody.insertAdjacentHTML('afterbegin', data.html);
                    
                    // Reset form and close modal
                    createUserForm.reset();
                    const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
                    modal.hide();
                    
                    // Show toast notification
                    showToast('Success', data.message, 'success');
                } else {
                    // Display validation errors
                    const errors = JSON.parse(data.errors);
                    for (const [field, errorList] of Object.entries(errors)) {
                        const errorElement = document.getElementById(`${field}-error`);
                        if (errorElement) {
                            errorElement.textContent = errorList[0];
                            const inputElement = document.querySelector(`[name="${field}"]`);
                            if (inputElement) {
                                inputElement.classList.add('is-invalid');
                            }
                        }
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while creating the user.', 'error');
            });
        });
    }

    // Edit user functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-user')) {
            const button = e.target.closest('.edit-user');
            const userId = button.dataset.id;
            
            fetch(`/users/get/${userId}/`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('editUserContent').innerHTML = data.html;
                
                // Set up form submission for the dynamically loaded form
                const updateUserForm = document.getElementById('updateUserForm');
                if (updateUserForm) {
                    updateUserForm.addEventListener('submit', function(e) {
                        e.preventDefault();
                        
                        // Clear previous errors
                        clearFormErrors(updateUserForm);
                        
                        const formData = new FormData(updateUserForm);
                        
                        fetch(updateUserForm.action, {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'success') {
                                // Update the row in table
                                const userRow = document.getElementById(`user-row-${userId}`);
                                if (userRow) {
                                    userRow.outerHTML = data.html;
                                }
                                
                                // Close modal
                                const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                                modal.hide();
                                
                                // Show toast notification
                                showToast('Success', data.message, 'success');
                            } else {
                                // Display validation errors
                                const errors = JSON.parse(data.errors);
                                for (const [field, errorList] of Object.entries(errors)) {
                                    const errorElement = document.getElementById(`edit-${field}-error`);
                                    if (errorElement) {
                                        errorElement.textContent = errorList[0];
                                        const inputElement = updateUserForm.querySelector(`[name="${field}"]`);
                                        if (inputElement) {
                                            inputElement.classList.add('is-invalid');
                                        }
                                    }
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            showToast('Error', 'An error occurred while updating the user.', 'error');
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while loading user details.', 'error');
            });
        }
    });

    // Send credentials functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.send-credentials')) {
            const button = e.target.closest('.send-credentials');
            const userId = button.dataset.id;
            const userEmail = button.dataset.email;
            
            document.getElementById('credentialsUserId').value = userId;
            document.getElementById('credentialsUserEmail').textContent = userEmail;
            
            const sendCredentialsForm = document.getElementById('sendCredentialsForm');
            sendCredentialsForm.action = `/users/send-credentials/${userId}/`;
        }
    });

    // Send credentials form submission
    const sendCredentialsForm = document.getElementById('sendCredentialsForm');
    if (sendCredentialsForm) {
        sendCredentialsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(sendCredentialsForm);
            
            fetch(sendCredentialsForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('sendCredentialsModal'));
                    modal.hide();
                    
                    // Show toast notification
                    showToast('Success', data.message, 'success');
                } else {
                    // Show toast notification
                    showToast('Error', data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while sending credentials.', 'error');
            });
        });
    }

    // Delete user functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-user')) {
            const button = e.target.closest('.delete-user');
            const userId = button.dataset.id;
            const userName = button.dataset.name;
            
            document.getElementById('deleteUserName').textContent = userName;
            
            const deleteUserForm = document.getElementById('deleteUserForm');
            deleteUserForm.action = `/users/delete/${userId}/`;
        }
    });

    // Delete user form submission
    const deleteUserForm = document.getElementById('deleteUserForm');
    if (deleteUserForm) {
        deleteUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(deleteUserForm);
            
            fetch(deleteUserForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Remove row from table
                    const userId = deleteUserForm.action.split('/').slice(-2)[0];
                    const userRow = document.getElementById(`user-row-${userId}`);
                    if (userRow) {
                        userRow.remove();
                    }
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUserModal'));
                    modal.hide();
                    
                    // Show toast notification
                    showToast('Success', data.message, 'success');
                } else {
                    // Show toast notification
                    showToast('Error', data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while deleting the user.', 'error');
            });
        });
    }

    // Bulk Delete button
    const bulkDeleteBtn = document.getElementById('bulkDelete');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', function() {
            // Check if any users are selected
            const selectedUsers = document.querySelectorAll('.user-checkbox:checked');
            if (selectedUsers.length === 0) {
                showToast('Warning', 'Please select at least one user to delete.', 'warning');
                return;
            }
            
            // Show confirmation modal
            const bulkDeleteModal = new bootstrap.Modal(document.getElementById('bulkDeleteModal'));
            bulkDeleteModal.show();
        });
    }

    // Confirm Bulk Delete button
    const confirmBulkDeleteBtn = document.getElementById('confirmBulkDelete');
    if (confirmBulkDeleteBtn) {
        confirmBulkDeleteBtn.addEventListener('click', function() {
            const bulkActionForm = document.getElementById('bulkActionForm');
            document.getElementById('bulkAction').value = 'delete';
            
            const formData = new FormData(bulkActionForm);
            
            fetch('/users/bulk-action/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Remove selected rows from table
                    document.querySelectorAll('.user-checkbox:checked').forEach(checkbox => {
                        const userRow = checkbox.closest('tr');
                        if (userRow) {
                            userRow.remove();
                        }
                    });
                    
                    // Uncheck select all checkbox
                    document.getElementById('selectAll').checked = false;
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkDeleteModal'));
                    modal.hide();
                    
                    // Show toast notification
                    showToast('Success', data.message, 'success');
                } else {
                    // Show toast notification
                    showToast('Error', data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while deleting users.', 'error');
            });
        });
    }

    // Bulk Send Credentials button
    const bulkSendCredentialsBtn = document.getElementById('bulkSendCredentials');
    if (bulkSendCredentialsBtn) {
        bulkSendCredentialsBtn.addEventListener('click', function() {
            // Check if any users are selected
            const selectedUsers = document.querySelectorAll('.user-checkbox:checked');
            if (selectedUsers.length === 0) {
                showToast('Warning', 'Please select at least one user to send credentials.', 'warning');
                return;
            }
            
            // Show confirmation modal
            const bulkSendCredentialsModal = new bootstrap.Modal(document.getElementById('bulkSendCredentialsModal'));
            bulkSendCredentialsModal.show();
        });
    }

    // Confirm Bulk Send Credentials button
    const confirmBulkSendCredentialsBtn = document.getElementById('confirmBulkSendCredentials');
    if (confirmBulkSendCredentialsBtn) {
        confirmBulkSendCredentialsBtn.addEventListener('click', function() {
            const bulkActionForm = document.getElementById('bulkActionForm');
            
            const formData = new FormData(bulkActionForm);
            formData.append('reset_password', document.getElementById('bulkResetPassword').checked);
            
            fetch('/users/send-credentials/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkSendCredentialsModal'));
                    modal.hide();
                    
                    // Show toast notification
                    showToast('Success', data.message, 'success');
                } else {
                    // Show toast notification
                    showToast('Error', data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while sending credentials.', 'error');
            });
        });
    }

    // Helper function to send credentials to a user
    function sendUserCredentials(userId) {
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', document.querySelector('[name=csrfmiddlewaretoken]').value);
        
        fetch(`/users/send-credentials/${userId}/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showToast('Success', data.message, 'success');
            } else {
                showToast('Error', data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    // Helper function to clear form errors
    function clearFormErrors(form) {
        form.querySelectorAll('.is-invalid').forEach(input => {
            input.classList.remove('is-invalid');
        });
        form.querySelectorAll('.invalid-feedback').forEach(feedback => {
            feedback.textContent = '';
        });
    }

    // Helper function to show toast notifications
    function showToast(title, message, type = 'success') {
        const toastEl = document.getElementById('notificationToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        // Set content
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Set color based on type
        toastEl.className = 'toast';
        if (type === 'success') {
            toastEl.classList.add('bg-success', 'text-white');
        } else if (type === 'error') {
            toastEl.classList.add('bg-danger', 'text-white');
        } else if (type === 'warning') {
            toastEl.classList.add('bg-warning');
        }
        
        // Show toast
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
});