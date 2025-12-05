// User Management JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // Initialize DataTable with validation
    let usersTable;
    try {
        const table = $('#usersTable');
        if (table.length > 0) {
            if ($.fn.DataTable && $.fn.DataTable.isDataTable('#usersTable')) {
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
                    columns.push({ orderable: true });
                }

                usersTable = table.DataTable({
                    'paging': true,
                    'lengthChange': true,
                    'searching': true,
                    'ordering': true,
                    'info': true,
                    'autoWidth': false,
                    'responsive': true,
                    'pageLength': 25,
                    'order': [[2, 'asc']], // Sort by full name
                    'columns': columns,
                    'deferRender': true
                });
            }
        }
    } catch (error) {
        console.error('Error initializing DataTable:', error);
    }

    // Select all checkbox functionality
    const selectAllCheckbox = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');
    const bulkPasswordResetBtn = document.getElementById('bulkPasswordResetBtn');

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            userCheckboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
            });
            updateBulkButtonState();
        });
    }

    // Update bulk button state based on selected checkboxes
    function updateBulkButtonState() {
        const selectedCount = document.querySelectorAll('.user-checkbox:checked').length;
        if (bulkPasswordResetBtn) {
            bulkPasswordResetBtn.disabled = selectedCount === 0;
        }
    }

    // Individual checkbox change
    userCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            // Update select all checkbox state
            const allChecked = Array.from(userCheckboxes).every(cb => cb.checked);
            const someChecked = Array.from(userCheckboxes).some(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
            updateBulkButtonState();
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', function () {
            usersTable.search(this.value).draw();
        });
    }

    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', function () {
            const roleValue = this.value;
            if (roleValue) {
                usersTable.column(4).search(roleValue).draw();
            } else {
                usersTable.column(4).search('').draw();
            }
        });
    }

    // Clear filters
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function () {
            if (searchInput) searchInput.value = '';
            if (roleFilter) roleFilter.value = '';
            usersTable.search('').columns().search('').draw();
        });
    }

    // Add User button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function () {
            const modalUrl = this.getAttribute('data-modal-url');
            const modalTitle = this.getAttribute('data-modal-title');
            loadUserModal(modalUrl, modalTitle);
        });
    }

    // Edit User buttons
    document.addEventListener('click', function (e) {
        if (e.target.closest('.edit-user-btn')) {
            const btn = e.target.closest('.edit-user-btn');
            const modalUrl = btn.getAttribute('data-modal-url');
            const modalTitle = btn.getAttribute('data-modal-title');
            loadUserModal(modalUrl, modalTitle);
        }
    });

    // Delete User buttons
    document.addEventListener('click', function (e) {
        if (e.target.closest('.delete-user-btn')) {
            const btn = e.target.closest('.delete-user-btn');
            const userId = btn.getAttribute('data-user-id');
            const userName = btn.getAttribute('data-user-name');

            if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
                deleteUser(userId);
            }
        }
    });

    // Bulk Password Reset button
    if (bulkPasswordResetBtn) {
        bulkPasswordResetBtn.addEventListener('click', function () {
            const selectedUsers = document.querySelectorAll('.user-checkbox:checked');
            if (selectedUsers.length === 0) {
                showToast('Warning', 'Please select at least one user to reset password.', 'warning');
                return;
            }

            const modalUrl = this.getAttribute('data-modal-url');
            loadBulkPasswordResetModal(modalUrl, selectedUsers);
        });
    }

    // Load user form modal
    function loadUserModal(url, title) {
        fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.html) {
                    const container = document.getElementById('userModalsContainer');
                    container.innerHTML = data.html;
                    const modal = new bootstrap.Modal(document.getElementById('userFormModal'));
                    modal.show();

                    // Setup form submission
                    const userForm = document.getElementById('userForm');
                    if (userForm) {
                        userForm.addEventListener('submit', handleUserFormSubmit);
                    }
                } else if (data.error) {
                    showToast('Error', data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while loading the form.', 'error');
            });
    }

    // Handle user form submission
    function handleUserFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
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
                    showToast('Success', data.message, 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('userFormModal'));
                    modal.hide();
                    // Reload page to refresh table
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    showToast('Error', data.error || 'An error occurred.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while saving the user.', 'error');
            });
    }

    // Delete user
    function deleteUser(userId) {
        fetch(`/users/${userId}/delete/`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Success', data.message, 'success');
                    // Remove row from table
                    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
                    if (row) {
                        row.remove();
                    }
                } else {
                    showToast('Error', data.error || 'An error occurred.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while deleting the user.', 'error');
            });
    }

    // Load bulk password reset modal
    function loadBulkPasswordResetModal(url, selectedUsers) {
        fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.html) {
                    const container = document.getElementById('userModalsContainer');
                    container.innerHTML = data.html;
                    const modal = new bootstrap.Modal(document.getElementById('bulkPasswordResetModal'));

                    // Update selected count
                    const selectedCount = selectedUsers.length;
                    document.getElementById('selectedCount').textContent = selectedCount;

                    // List selected users
                    const usersList = document.getElementById('selectedUsersList');
                    if (usersList) {
                        let listHtml = '<ul class="list-group">';
                        selectedUsers.forEach(checkbox => {
                            const row = checkbox.closest('tr');
                            const username = row.cells[1].textContent.trim();
                            const fullName = row.cells[2].textContent.trim();
                            listHtml += `<li class="list-group-item">${fullName} (${username})</li>`;
                        });
                        listHtml += '</ul>';
                        usersList.innerHTML = listHtml;
                    }

                    modal.show();

                    // Setup confirm button
                    const confirmBtn = document.getElementById('confirmBulkPasswordResetBtn');
                    if (confirmBtn) {
                        confirmBtn.onclick = function () {
                            confirmBulkPasswordReset(selectedUsers);
                        };
                    }
                } else if (data.error) {
                    showToast('Error', data.error, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while loading the modal.', 'error');
            });
    }

    // Confirm bulk password reset
    function confirmBulkPasswordReset(selectedUsers) {
        const userIds = Array.from(selectedUsers).map(cb => cb.value);
        const defaultPassword = document.getElementById('defaultPassword').value || '0000';

        fetch('/users/bulk-password-reset/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                user_ids: userIds,
                default_password: defaultPassword
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Success', data.message, 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkPasswordResetModal'));
                    modal.hide();
                    // Uncheck all checkboxes
                    selectedUsers.forEach(cb => cb.checked = false);
                    selectAllCheckbox.checked = false;
                    updateBulkButtonState();
                } else {
                    showToast('Error', data.error || 'An error occurred.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error', 'An error occurred while resetting passwords.', 'error');
            });
    }

    // Helper function to get CSRF token
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

    // Helper function to show toast notifications
    function showToast(title, message, type = 'success') {
        // Use SweetAlert2 if available, otherwise use alert
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning',
                title: title,
                text: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(`${title}: ${message}`);
        }
    }
});
