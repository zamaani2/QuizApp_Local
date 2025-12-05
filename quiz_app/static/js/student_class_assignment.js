/**
 * Student Class Assignment JavaScript
 * Provides enhanced functionality for student class assignment management
 */

// Global variables
let selectedStudents = [];
let assignmentModal = null;
let bulkAssignmentModal = null;
let currentStudentId = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initializeModals();
    initializeEventListeners();
    updateSelectedCount();
});

/**
 * Initialize Bootstrap modals
 */
function initializeModals() {
    assignmentModal = new bootstrap.Modal(document.getElementById('assignmentModal'));
    bulkAssignmentModal = new bootstrap.Modal(document.getElementById('bulkAssignmentModal'));
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Form submission
    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', function (e) {
            // Add loading state
            const submitBtn = filterForm.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        });
    }

    // Real-time search
    const searchInput = document.getElementById('search');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterForm.submit();
            }, 500);
        });
    }

    // Auto-submit on filter change
    const filterSelects = document.querySelectorAll('#filterForm select');
    filterSelects.forEach(select => {
        select.addEventListener('change', function () {
            filterForm.submit();
        });
    });
}

/**
 * Select all students
 */
function selectAll() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedCount();
    updateBulkActionButtons();
}

/**
 * Select none
 */
function selectNone() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedCount();
    updateBulkActionButtons();
}

/**
 * Toggle select all checkbox
 */
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.student-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateSelectedCount();
    updateBulkActionButtons();
}

/**
 * Update selected count display
 */
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    const count = checkboxes.length;
    const countElement = document.getElementById('selectedCount');

    if (countElement) {
        countElement.textContent = count;
    }

    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const allCheckboxes = document.querySelectorAll('.student-checkbox');

    if (selectAllCheckbox && allCheckboxes.length > 0) {
        if (count === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (count === allCheckboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
        }
    }

    updateBulkActionButtons();
}

/**
 * Update bulk action buttons state
 */
function updateBulkActionButtons() {
    const selectedCount = document.querySelectorAll('.student-checkbox:checked').length;
    const bulkAssignBtn = document.getElementById('bulkAssignBtn');
    const bulkUnassignBtn = document.getElementById('bulkUnassignBtn');

    if (bulkAssignBtn) {
        bulkAssignBtn.disabled = selectedCount === 0;
    }

    if (bulkUnassignBtn) {
        bulkUnassignBtn.disabled = selectedCount === 0;
    }
}

/**
 * Initialize assignment modal functionality
 */
function initializeAssignmentModal() {
    console.log("Initializing assignment modal...");

    const assignBtn = document.getElementById("assignStudentBtn");
    const assignForm = document.getElementById("assignStudentForm");
    const classSelect = document.getElementById("id_assigned_class");
    const classInfoPreview = document.getElementById("classInfoPreview");
    const classInfoContent = document.getElementById("classInfoContent");

    console.log("Modal elements found:", {
        assignBtn: !!assignBtn,
        assignForm: !!assignForm,
        classSelect: !!classSelect,
        classInfoPreview: !!classInfoPreview,
        classInfoContent: !!classInfoContent
    });

    if (!assignBtn || !assignForm || !classSelect) {
        console.error("Required elements not found in modal");
        return false;
    }

    // Remove any existing event listeners to prevent duplicates
    const newAssignBtn = assignBtn.cloneNode(true);
    assignBtn.parentNode.replaceChild(newAssignBtn, assignBtn);

    const newClassSelect = classSelect.cloneNode(true);
    classSelect.parentNode.replaceChild(newClassSelect, classSelect);

    // Show class information when a class is selected
    newClassSelect.addEventListener("change", function () {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.value) {
            classInfoPreview.style.display = "block";
            classInfoContent.innerHTML = `
                <p><strong>Class:</strong> ${selectedOption.text}</p>
                <p><strong>Academic Year:</strong> Current Year</p>
            `;
        } else {
            classInfoPreview.style.display = "none";
        }
    });

    // Handle form submission
    newAssignBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Assign button clicked!");

        const currentClassSelect = document.getElementById("id_assigned_class");
        if (!currentClassSelect.value) {
            alert("Please select a class to assign the student to.");
            return;
        }

        // Show loading state
        newAssignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
        newAssignBtn.disabled = true;

        // Submit form via AJAX
        const formData = new FormData(assignForm);

        // Use the stored student ID
        const studentId = currentStudentId;

        fetch(`/student/${studentId}/assign-class-new/`, {
            method: "POST",
            body: formData,
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("Assignment response:", data);
                if (data.success) {
                    // Show success message
                    showAlert(data.message, 'success');

                    // Close modal
                    if (assignmentModal) {
                        assignmentModal.hide();
                    }

                    // Refresh the page or update the UI
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                } else {
                    // Show error message
                    showAlert(data.message, 'danger');

                    // Reset button
                    newAssignBtn.innerHTML = '<i class="fas fa-user-plus"></i> Assign Student';
                    newAssignBtn.disabled = false;
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                showAlert("An error occurred while assigning the student.", 'danger');

                // Reset button
                newAssignBtn.innerHTML = '<i class="fas fa-user-plus"></i> Assign Student';
                newAssignBtn.disabled = false;
            });
    });

    return true;
}

/**
 * Get student ID from modal content
 */
function getStudentIdFromModal() {
    // Try to get student ID from the form action or data attribute
    const form = document.getElementById("assignStudentForm");
    if (form) {
        const action = form.action;
        if (action) {
            const match = action.match(/\/student\/(\d+)\//);
            if (match) {
                return match[1];
            }
        }
    }

    // Fallback: try to get from URL or other sources
    const currentUrl = window.location.href;
    const urlMatch = currentUrl.match(/\/student\/(\d+)\//);
    if (urlMatch) {
        return urlMatch[1];
    }

    console.error("Could not determine student ID");
    return null;
}

/**
 * Assign a single student to a class
 */
function assignStudent(studentId) {
    // Store student ID globally
    currentStudentId = studentId;

    // Show loading state
    showLoading('Loading assignment form...');

    // Fetch assignment form via AJAX
    fetch(`/student/${studentId}/assign-class-new/`, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
        }
    })
        .then(response => response.text())
        .then(html => {
            // Replace the modal body content
            const modalBody = document.getElementById('assignmentModalBody');
            if (modalBody) {
                modalBody.innerHTML = html;

                // Initialize modal content after loading
                setTimeout(() => {
                    console.log('Attempting to initialize modal content...');
                    initializeAssignmentModal();
                }, 100);

                assignmentModal.show();
            } else {
                console.error('Modal body not found');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading assignment form:', error);
            showAlert('Error loading assignment form', 'danger');
            hideLoading();
        });
}

/**
 * Submit student assignment
 */
function submitAssignment(studentId) {
    const form = document.getElementById('assignStudentForm');
    if (!form) {
        console.error('Assignment form not found');
        return;
    }

    const formData = new FormData(form);

    // Show loading state
    showLoading('Assigning student...');

    fetch(`/student/${studentId}/assign-class-new/`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                if (assignmentModal) {
                    assignmentModal.hide();
                }
                // Reload the page to show updated data
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showAlert(data.message, 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error assigning student:', error);
            showAlert('Error assigning student', 'danger');
            hideLoading();
        });
}

/**
 * Unassign a student from their current class
 */
function unassignStudent(studentId) {
    if (!confirm('Are you sure you want to unassign this student from their current class?')) {
        return;
    }

    // Show loading state
    showLoading('Unassigning student...');

    fetch(`/student/${studentId}/unassign-class/`, {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json',
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                // Reload the page to show updated data
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showAlert(data.message, 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error unassigning student:', error);
            showAlert('Error unassigning student', 'danger');
            hideLoading();
        });
}

/**
 * Show bulk assignment modal
 */
function bulkAssign() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
        showAlert('Please select at least one student', 'warning');
        return;
    }

    // Update modal content
    document.getElementById('bulkSelectedCount').textContent = selectedIds.length;

    // Build selected students list
    const studentsList = document.getElementById('selectedStudentsList');
    let html = '';

    selectedIds.forEach(id => {
        const row = document.querySelector(`tr input[value="${id}"]`).closest('tr');
        const name = row.querySelector('strong').textContent;
        const admission = row.querySelector('.badge').textContent;
        html += `<div class="d-flex justify-content-between align-items-center mb-2">
            <span>${name} (${admission})</span>
        </div>`;
    });

    studentsList.innerHTML = html;
    bulkAssignmentModal.show();
}

/**
 * Submit bulk assignment
 */
function submitBulkAssignment() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    const assignedClass = document.getElementById('bulkAssignedClass').value;

    if (selectedIds.length === 0) {
        showAlert('Please select at least one student', 'warning');
        return;
    }

    if (!assignedClass) {
        showAlert('Please select a class', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to assign ${selectedIds.length} students to the selected class?`)) {
        return;
    }

    // Show loading state
    showLoading('Assigning students...');

    const formData = new FormData();
    formData.append('assigned_class', assignedClass);
    selectedIds.forEach(id => {
        formData.append('students', id);
    });

    fetch('/student/class-assignment/bulk-assign/', {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                bulkAssignmentModal.hide();
                // Reload the page to show updated data
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showAlert(data.message, 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error in bulk assignment:', error);
            showAlert('Error in bulk assignment', 'danger');
            hideLoading();
        });
}

/**
 * Bulk unassign students
 */
function bulkUnassign() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
        showAlert('Please select at least one student', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to unassign ${selectedIds.length} students from their current classes?`)) {
        return;
    }

    // Show loading state
    showLoading('Unassigning students...');

    fetch('/student/class-assignment/bulk-unassign/', {
        method: 'POST',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            student_ids: selectedIds
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                // Reload the page to show updated data
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showAlert(data.message, 'danger');
            }
            hideLoading();
        })
        .catch(error => {
            console.error('Error in bulk unassignment:', error);
            showAlert('Error in bulk unassignment', 'danger');
            hideLoading();
        });
}

/**
 * Get CSRF token from cookies
 */
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

/**
 * Show loading state
 */
function showLoading(message = 'Loading...') {
    // Create or update loading overlay
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        loadingOverlay.querySelector('p').textContent = message;
    }
    loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-auto-dismiss');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show alert-auto-dismiss position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

/**
 * Export students data
 */
function exportStudents(format = 'csv') {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
        showAlert('Please select at least one student to export', 'warning');
        return;
    }

    // Build export URL
    const params = new URLSearchParams();
    params.append('format', format);
    selectedIds.forEach(id => {
        params.append('student_ids', id);
    });

    // Trigger download
    window.open(`/student/export/?${params.toString()}`, '_blank');
}

/**
 * Print student list
 */
function printStudentList() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    if (selectedIds.length === 0) {
        showAlert('Please select at least one student to print', 'warning');
        return;
    }

    // Build print URL
    const params = new URLSearchParams();
    selectedIds.forEach(id => {
        params.append('student_ids', id);
    });

    // Open print window
    window.open(`/student/print/?${params.toString()}`, '_blank');
}

// Add CSS for loading overlay
const style = document.createElement('style');
style.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }
    
    .loading-content {
        background: white;
        padding: 2rem;
        border-radius: 0.5rem;
        text-align: center;
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    }
    
    .loading-content p {
        margin: 0;
        color: #6c757d;
    }
`;
document.head.appendChild(style);
