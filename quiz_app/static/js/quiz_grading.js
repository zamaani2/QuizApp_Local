/**
 * Quiz Grading JavaScript
 * Handles grading interactions for quiz attempts
 */
(function ($) {
    'use strict';

    $(document).ready(function () {
        initializeGrading();
    });

    /**
     * Initialize grading functionality
     */
    function initializeGrading() {
        // Grade response button
        $(document).on('click', '.grade-response-btn', function (e) {
            e.preventDefault();
            const url = $(this).data('modal-url');
            const responseId = $(this).data('response-id');

            if (url) {
                loadGradeResponseModal(url, responseId);
            }
        });
    }

    /**
     * Load grade response modal
     */
    function loadGradeResponseModal(url, responseId) {
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
                Swal.close();

                // Remove existing modal
                $('#gradeResponseModal').remove();

                // Add modal to container
                $('#gradingModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('gradeResponseModal'));
                modal.show();

                // Handle form submission
                $('#gradeResponseForm').on('submit', function (e) {
                    e.preventDefault();
                    submitGradeResponse(url, $(this), responseId);
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load grading form.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit grade response form
     */
    function submitGradeResponse(url, form, responseId) {
        const formData = {
            marks_awarded: $('#marks_awarded').val(),
            grading_notes: $('#grading_notes').val()
        };

        Swal.fire({
            title: 'Grading...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Graded!',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('gradeResponseModal'));
                        if (modal) {
                            modal.hide();
                        }

                        // Reload page to show updated grades
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred while grading.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while grading.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Get CSRF token from cookies
     */
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

})(jQuery);

