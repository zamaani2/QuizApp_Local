    // Class Subject Dashboard Scripts
    $(document).ready(function() {
        // Initialize dataTables
        $('#classesTable').DataTable({
            "pageLength": 10,
            "order": [[2, "asc"], [1, "asc"]], // Order by form then name
            "responsive": true,
            "language": {
                "emptyTable": "No classes found"
            }
        });
        
        $('#subjectsTable').DataTable({
            "pageLength": 10,
            "order": [[1, "asc"]], // Order by subject name
            "responsive": true,
            "language": {
                "emptyTable": "No subjects found"
            }
        });
        
        // Class Form handling
        $('#addClassBtn').click(function() {
            resetForm('#classForm');
            $('#classModalLabel').text('Add New Class');
            $('#classModal').modal('show');
            $('#classForm').attr('action', $('#classForm').data('add-url'));
        });
        
        // Subject Form handling
        $('#addSubjectBtn').click(function() {
            resetForm('#subjectForm');
            $('#subjectModalLabel').text('Add New Subject');
            $('#subjectModal').modal('show');
            $('#subjectForm').attr('action', $('#subjectForm').data('add-url'));
        });
        
        // Assignment Form handling
        $('#addAssignmentBtn').click(function() {
            resetForm('#assignmentForm');
            $('#assignmentModalLabel').text('Assign Teacher to Subject');
            $('#assignmentModal').modal('show');
            $('#assignmentForm').attr('action', $('#assignmentForm').data('add-url'));
        });
        
        // Edit Class
        $(document).on('click', '.edit-class-btn', function() {
            const classId = $(this).data('class-id');
            const url = $(this).data('url');
            
            $.ajax({
                url: url,
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#classModalContent').html(response.html);
                        $('#classModalLabel').text('Edit Class');
                        $('#classModal').modal('show');
                        $('#classForm').attr('action', $('#classForm').data('edit-url'));
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to load class data.');
                }
            });
        });
        
        // Edit Subject
        $(document).on('click', '.edit-subject-btn', function() {
            const subjectId = $(this).data('subject-id');
            const url = $(this).data('url');
            
            $.ajax({
                url: url,
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#subjectModalContent').html(response.html);
                        $('#subjectModalLabel').text('Edit Subject');
                        $('#subjectModal').modal('show');
                        $('#subjectForm').attr('action', $('#subjectForm').data('edit-url'));
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to load subject data.');
                }
            });
        });
        
        // Edit Assignment
        $(document).on('click', '.edit-assignment-btn', function() {
            const assignmentId = $(this).data('assignment-id');
            const url = $(this).data('url');
            
            $.ajax({
                url: url,
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#assignmentModalContent').html(response.html);
                        $('#assignmentModalLabel').text('Edit Teacher Assignment');
                        $('#assignmentModal').modal('show');
                        $('#assignmentForm').attr('action', $('#assignmentForm').data('edit-url'));
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to load assignment data.');
                }
            });
        });
        
        // Form submission for Class
        $(document).on('submit', '#classForm', function(e) {
            e.preventDefault();
            const url = $(this).attr('action');
            const formData = $(this).serialize();
            
            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        $('#classModal').modal('hide');
                        showSuccessAlert('Class saved successfully!');
                        setTimeout(function() {
                            window.location.href = response.redirect_url;
                        }, 1000);
                    } else {
                        displayFormErrors('#classForm', response.errors);
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to save class.');
                }
            });
        });
        
        // Form submission for Subject
        $(document).on('submit', '#subjectForm', function(e) {
            e.preventDefault();
            const url = $(this).attr('action');
            const formData = $(this).serialize();
            
            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        $('#subjectModal').modal('hide');
                        showSuccessAlert('Subject saved successfully!');
                        setTimeout(function() {
                            window.location.href = response.redirect_url;
                        }, 1000);
                    } else {
                        displayFormErrors('#subjectForm', response.errors);
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to save subject.');
                }
            });
        });
        
        // Form submission for Assignment
        $(document).on('submit', '#assignmentForm', function(e) {
            e.preventDefault();
            const url = $(this).attr('action');
            const formData = $(this).serialize();
            
            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                success: function(response) {
                    if (response.success) {
                        $('#assignmentModal').modal('hide');
                        showSuccessAlert('Teacher assignment saved successfully!');
                        setTimeout(function() {
                            window.location.href = response.redirect_url;
                        }, 1000);
                    } else {
                        displayFormErrors('#assignmentForm', response.errors);
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to save teacher assignment.');
                }
            });
        });
        
        // Delete Class
        $(document).on('click', '.delete-class-btn', function() {
            const classId = $(this).data('class-id');
            const url = $(this).data('url');
            const className = $(this).data('class-name');
            
            Swal.fire({
                title: 'Delete Class?',
                text: `Are you sure you want to delete ${className}? This cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: url,
                        type: 'POST',
                        data: {
                            'csrfmiddlewaretoken': $('input[name=csrfmiddlewaretoken]').val()
                        },
                        success: function(response) {
                            if (response.success) {
                                showSuccessAlert('Class deleted successfully!');
                                $(`#class-row-${classId}`).remove();
                            } else {
                                showErrorAlert(response.message || 'Failed to delete class.');
                            }
                        },
                        error: function(xhr) {
                            showErrorAlert('Failed to delete class.');
                        }
                    });
                }
            });
        });
        
        // Delete Subject
        $(document).on('click', '.delete-subject-btn', function() {
            const subjectId = $(this).data('subject-id');
            const url = $(this).data('url');
            const subjectName = $(this).data('subject-name');
            
            Swal.fire({
                title: 'Delete Subject?',
                text: `Are you sure you want to delete ${subjectName}? This cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: url,
                        type: 'POST',
                        data: {
                            'csrfmiddlewaretoken': $('input[name=csrfmiddlewaretoken]').val()
                        },
                        success: function(response) {
                            if (response.success) {
                                showSuccessAlert('Subject deleted successfully!');
                                $(`#subject-row-${subjectId}`).remove();
                            } else {
                                showErrorAlert(response.message || 'Failed to delete subject.');
                            }
                        },
                        error: function(xhr) {
                            showErrorAlert('Failed to delete subject.');
                        }
                    });
                }
            });
        });
        
        // Delete Assignment
        $(document).on('click', '.delete-assignment-btn', function() {
            const assignmentId = $(this).data('assignment-id');
            const url = $(this).data('url');
            
            Swal.fire({
                title: 'Remove Assignment?',
                text: 'Are you sure you want to remove this teacher assignment?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, remove it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: url,
                        type: 'POST',
                        data: {
                            'csrfmiddlewaretoken': $('input[name=csrfmiddlewaretoken]').val()
                        },
                        success: function(response) {
                            if (response.success) {
                                showSuccessAlert('Assignment removed successfully!');
                                $(`#assignment-row-${assignmentId}`).remove();
                            } else {
                                showErrorAlert(response.message || 'Failed to remove assignment.');
                            }
                        },
                        error: function(xhr) {
                            showErrorAlert('Failed to remove assignment.');
                        }
                    });
                }
            });
        });
        
        // View Class info
        $(document).on('click', '.view-class-btn', function() {
            const classId = $(this).data('class-id');
            const url = $(this).data('url');
            
            $.ajax({
                url: url,
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        const classData = response.class;
                        
                        // Populate modal with class data
                        $('#viewClassTitle').text(classData.name);
                        $('#viewClassId').text(classData.class_id);
                        $('#viewClassForm').text(classData.form);
                        $('#viewClassLearningArea').text(classData.learning_area);
                        $('#viewClassTeacher').text(classData.class_teacher);
                        $('#viewClassYear').text(classData.academic_year);
                        $('#viewClassStudents').text(`${classData.student_count} / ${classData.maximum_students}`);
                        $('#viewClassSubjects').text(classData.subject_count);
                        
                        // Set links for views and actions
                        $('#viewClassSubjectsLink').attr('href', `/classes/${classData.id}/subjects/`);
                        $('#viewClassStudentsLink').attr('href', `/classes/${classData.id}/students/`);
                        
                        $('#viewClassModal').modal('show');
                    }
                },
                error: function(xhr) {
                    showErrorAlert('Failed to load class information.');
                }
            });
        });
        
        // Helper functions
        function resetForm(formSelector) {
            $(formSelector)[0].reset();
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').remove();
        }
        
        function displayFormErrors(formSelector, errors) {
            // Clear previous errors
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').remove();
            
            // Display new errors
            $.each(errors, function(field, messages) {
                const inputField = $(formSelector + ' [name="' + field + '"]');
                inputField.addClass('is-invalid');
                
                if (Array.isArray(messages)) {
                    inputField.after('<div class="invalid-feedback">' + messages.join('<br>') + '</div>');
                } else {
                    inputField.after('<div class="invalid-feedback">' + messages + '</div>');
                }
            });
        }
        
        function showSuccessAlert(message) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: message,
                timer: 2000,
                showConfirmButton: false
            });
        }
        
        function showErrorAlert(message) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message
            });
        }
    });
    