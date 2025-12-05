/**
 * Question Management JavaScript
 * Handles all interactions for question management including modals, forms, and operations
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        // Ensure jQuery is loaded
        if (typeof $ === 'undefined') {
            console.error('jQuery is not loaded!');
            return;
        }

        // Ensure Bootstrap is loaded
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded!');
            return;
        }

        // Initialize question type selector
        initializeQuestionTypeSelector();

        // Initialize modals
        initializeModals();

        // Initialize event listeners
        initializeEventListeners();

        // Initialize choice management
        initializeChoiceManagement();

        // Initialize bulk delete functionality
        initializeBulkDelete();
    });

    /**
     * Initialize question type selector
     */
    function initializeQuestionTypeSelector() {
        const questionTypeOptions = document.querySelectorAll('.question-type-option, .question-type-option-small');
        const questionTypeInput = document.getElementById('questionType');

        if (!questionTypeOptions.length || !questionTypeInput) {
            return; // Not on question create/edit page
        }

        questionTypeOptions.forEach(option => {
            option.addEventListener('click', function () {
                const questionType = this.dataset.type;
                selectQuestionType(questionType);
            });
        });

        // Set initial type
        const activeOption = document.querySelector('.question-type-option.active, .question-type-option-small.active');
        if (activeOption) {
            selectQuestionType(activeOption.dataset.type);
        }
    }

    /**
     * Select question type and show/hide relevant sections
     */
    function selectQuestionType(questionType) {
        console.log('Selecting question type:', questionType);

        const questionTypeInput = document.getElementById('questionType');
        if (questionTypeInput) {
            questionTypeInput.value = questionType;
        }

        // Update active state
        document.querySelectorAll('.question-type-option, .question-type-option-small').forEach(opt => {
            opt.classList.remove('active');
        });
        document.querySelectorAll(`[data-type="${questionType}"]`).forEach(opt => {
            opt.classList.add('active');
        });

        // Show/hide sections
        showQuestionTypeSection(questionType);
    }

    /**
     * Show the correct question type section and hide others
     */
    function showQuestionTypeSection(questionType) {
        const sections = {
            multiple_choice: document.getElementById('multipleChoiceSection'),
            true_false: document.getElementById('trueFalseSection'),
            short_answer: document.getElementById('shortAnswerSection'),
            fill_blank: document.getElementById('fillBlankSection'),
            essay: document.getElementById('essaySection')
        };

        Object.keys(sections).forEach(key => {
            if (sections[key]) {
                if (key === questionType) {
                    sections[key].style.display = 'block';
                    // Restore required attributes
                    const fields = sections[key].querySelectorAll('[data-was-required="true"]');
                    fields.forEach(field => {
                        field.setAttribute('required', '');
                        field.removeAttribute('data-was-required');
                    });
                } else {
                    sections[key].style.display = 'none';
                    // Remove required attributes from hidden fields
                    const requiredFields = sections[key].querySelectorAll('[required]');
                    requiredFields.forEach(field => {
                        field.removeAttribute('required');
                        field.setAttribute('data-was-required', 'true');
                    });
                }
            }
        });
    }

    /**
     * Initialize question type for edit mode
     */
    function initializeQuestionTypeForEdit(questionType) {
        console.log('Initializing question type for edit:', questionType);

        // Ensure all sections are properly shown/hidden based on question type
        showQuestionTypeSection(questionType);

        // Double-check: hide multiple choice section if it's not multiple choice
        // This is defensive programming in case template didn't set it correctly
        const multipleChoiceSection = document.getElementById('multipleChoiceSection');
        if (multipleChoiceSection && questionType !== 'multiple_choice') {
            multipleChoiceSection.style.display = 'none';
        }

        // Ensure the correct section is visible
        const sections = {
            multiple_choice: document.getElementById('multipleChoiceSection'),
            true_false: document.getElementById('trueFalseSection'),
            short_answer: document.getElementById('shortAnswerSection'),
            fill_blank: document.getElementById('fillBlankSection'),
            essay: document.getElementById('essaySection')
        };

        if (sections[questionType]) {
            sections[questionType].style.display = 'block';
        }
    }

    /**
     * Initialize modals
     */
    function initializeModals() {
        // Add Question Modal
        $(document).on('click', '#addQuestionBtn, #addQuestionMenuBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Create New Question';

            if (!url) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the question modal.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadQuestionModal(url, title);
        });

        // Edit Question Modal
        $(document).on('click', '.edit-question-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url = $(this).data('modal-url') || $(this).attr('href');
            const title = $(this).data('modal-title') || 'Edit Question';

            if (!url) return;

            loadQuestionModal(url, title);
        });

        // Bulk Import Modal
        $(document).on('click', '#importQuestionsBtn, #importQuestionsMenuBtn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url = $(this).data('modal-url') || $(this).attr('href');

            if (!url) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No URL found for the import modal.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadImportModal(url);
        });
    }

    /**
     * Load question form modal
     */
    function loadQuestionModal(url, title) {
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
                $('#questionFormModal').remove();

                // Add modal to container
                $('#questionModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('questionFormModal'));
                modal.show();

                // Check if this is edit mode
                // Edit mode has an input with id="existingQuestionType"
                // Create mode has an input with id="questionType"
                const existingQuestionTypeInput = document.getElementById('existingQuestionType');
                const questionTypeInput = document.getElementById('questionType');

                if (existingQuestionTypeInput) {
                    // Edit mode - initialize based on existing question type
                    const questionType = existingQuestionTypeInput.value;
                    console.log('Edit mode detected, question type:', questionType);
                    initializeQuestionTypeForEdit(questionType);
                } else if (questionTypeInput) {
                    // Create mode - initialize question type selector
                    initializeQuestionTypeSelector();
                }

                // Handle form submission
                $('#questionForm').on('submit', function (e) {
                    e.preventDefault();
                    submitQuestionForm(url, $(this));
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load form.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Load import modal
     */
    function loadImportModal(url) {
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
                $('#bulkImportModal').remove();

                // Add modal to container
                $('#questionModalsContainer').html(response.html);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('bulkImportModal'));
                modal.show();

                // Handle form submission
                $('#importForm').on('submit', function (e) {
                    e.preventDefault();
                    submitImportForm(url, $(this));
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load import form.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Submit question form
     */
    function submitQuestionForm(url, form) {
        const formElement = form[0];
        const isEdit = url.includes('/edit/');

        // Get question type
        const questionTypeInput = formElement.querySelector('input[name="question_type"]') ||
            formElement.querySelector('#existingQuestionType');
        const questionType = questionTypeInput ? questionTypeInput.value : null;

        // Ensure required fields are included based on question type BEFORE creating FormData
        if (questionType === 'true_false') {
            const tfCorrect = formElement.querySelector('input[name="tf_correct"]:checked');

            if (!tfCorrect) {
                // If no radio button is selected, select the first one (True) as default
                const tfTrue = formElement.querySelector('#tfTrue');
                if (tfTrue) {
                    tfTrue.checked = true;
                } else {
                    console.error('Could not find #tfTrue radio button');
                }
            }
        }

        // Create FormData after ensuring form is properly set up
        const formData = new FormData(formElement);

        // Debug: Log form data for troubleshooting
        console.log('Submitting question form:', {
            url: url,
            isEdit: isEdit,
            questionType: questionType,
            tf_correct: formData.get('tf_correct'),
            choice_ids: formData.getAll('choice_id'),
            choice_texts: formData.getAll('choice_text'),
            is_correct: formData.getAll('is_correct')
        });

        Swal.fire({
            title: isEdit ? 'Updating...' : 'Creating...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('questionFormModal'));
                        if (modal) {
                            modal.hide();
                        }

                        // Redirect or reload
                        if (response.redirect) {
                            window.location.href = response.redirect;
                        } else {
                            window.location.reload();
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while saving.';
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
     * Submit import form
     */
    function submitImportForm(url, form) {
        const formData = new FormData(form[0]);

        Swal.fire({
            title: 'Importing...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    let message = response.message || `Successfully imported ${response.imported} question(s).`;
                    if (response.errors && response.errors.length > 0) {
                        message += `\n\n${response.errors.length} error(s) occurred.`;
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Import Complete',
                        html: message,
                        confirmButtonColor: '#3085d6'
                    }).then(() => {
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('bulkImportModal'));
                        if (modal) {
                            modal.hide();
                        }

                        // Reload page
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'An error occurred during import.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred during import.';
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
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Delete question button
        $(document).on('click', '.delete-question-btn', function () {
            const questionId = $(this).data('question-id');
            const questionText = $(this).data('question-text') || 'this question';
            const quizId = $(this).data('quiz-id');
            deleteQuestion(quizId, questionId, questionText);
        });

        // Duplicate question button
        $(document).on('click', '.duplicate-question-btn', function () {
            const questionId = $(this).data('question-id');
            const quizId = $(this).data('quiz-id');
            duplicateQuestion(quizId, questionId);
        });
    }

    /**
     * Initialize choice management
     */
    function initializeChoiceManagement() {
        // This will be handled by global functions
    }

    /**
     * Delete question
     */
    function deleteQuestion(quizId, questionId, questionText) {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete "${questionText}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Deleting...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                $.ajax({
                    url: `/quizzes/${quizId}/questions/${questionId}/delete/`,
                    type: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        Swal.close();

                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: '#3085d6',
                                timer: 2000,
                                timerProgressBar: true
                            }).then(() => {
                                window.location.reload();
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.error || 'Failed to delete question.',
                                confirmButtonColor: '#3085d6'
                            });
                        }
                    },
                    error: function (xhr) {
                        Swal.close();
                        const errorMessage = xhr.responseJSON?.error || 'An error occurred while deleting.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMessage,
                            confirmButtonColor: '#3085d6'
                        });
                    }
                });
            }
        });
    }

    /**
     * Duplicate question
     */
    function duplicateQuestion(quizId, questionId) {
        Swal.fire({
            title: 'Duplicating...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: `/quizzes/${quizId}/questions/${questionId}/duplicate/`,
            type: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Duplicated!',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'Failed to duplicate question.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while duplicating.';
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
     * Get CSRF token from cookie
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

    // Global functions for choice management
    window.addChoice = function () {
        const choicesContainer = document.getElementById('choicesContainer');
        if (!choicesContainer) return;

        const choiceCount = choicesContainer.children.length;
        const choiceItem = document.createElement('div');
        choiceItem.className = 'choice-item mb-2';
        choiceItem.innerHTML = `
          <div class="input-group input-group-sm">
            <div class="input-group-text">
              <input type="checkbox" name="is_correct" value="${choiceCount}" class="form-check-input">
            </div>
            <input type="text" name="choice_text" class="form-control" placeholder="Enter choice text" required>
            <button type="button" class="btn btn-outline-danger remove-choice" onclick="removeChoice(this)">
              <i class="bi bi-x"></i>
            </button>
          </div>
        `;

        choicesContainer.appendChild(choiceItem);
    };

    window.removeChoice = function (button) {
        const choicesContainer = document.getElementById('choicesContainer');
        if (!choicesContainer) return;

        if (choicesContainer.children.length > 2) {
            button.closest('.choice-item').remove();
            updateChoiceValues();
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Minimum Required',
                text: 'You must have at least 2 choices.',
                confirmButtonColor: '#3085d6'
            });
        }
    };

    function updateChoiceValues() {
        const choices = document.querySelectorAll('input[name="is_correct"]');
        choices.forEach((choice, index) => {
            choice.value = index;
        });
    }

    /**
     * Initialize bulk delete functionality
     */
    function initializeBulkDelete() {
        // Select All checkbox
        $(document).on('change', '#selectAllQuestions', function () {
            const isChecked = $(this).is(':checked');
            $('.question-checkbox').prop('checked', isChecked);
            updateBulkDeleteButton();
        });

        // Individual checkbox change
        $(document).on('change', '.question-checkbox', function () {
            updateSelectAllCheckbox();
            updateBulkDeleteButton();
        });

        // Bulk delete button click
        $(document).on('click', '#bulkDeleteQuestionsBtn', function () {
            const url = $(this).data('modal-url');
            if (!url) return;

            const selectedQuestions = getSelectedQuestions();
            if (selectedQuestions.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Selection',
                    text: 'Please select at least one question to delete.',
                    confirmButtonColor: '#3085d6'
                });
                return;
            }

            loadBulkDeleteModal(url, selectedQuestions);
        });
    }

    /**
     * Get selected questions
     */
    function getSelectedQuestions() {
        const selected = [];
        $('.question-checkbox:checked').each(function () {
            // Get ID from value attribute or data attribute
            const questionId = $(this).val() || $(this).data('question-id');
            const questionText = $(this).data('question-text') || $(this).closest('.list-group-item').find('h6').text();
            if (questionId) {
                selected.push({
                    id: questionId,
                    text: questionText
                });
            }
        });
        return selected;
    }

    /**
     * Update select all checkbox state
     */
    function updateSelectAllCheckbox() {
        const totalCheckboxes = $('.question-checkbox').length;
        const checkedCheckboxes = $('.question-checkbox:checked').length;
        const selectAllCheckbox = $('#selectAllQuestions');

        if (checkedCheckboxes === 0) {
            selectAllCheckbox.prop('checked', false);
            selectAllCheckbox.prop('indeterminate', false);
        } else if (checkedCheckboxes === totalCheckboxes) {
            selectAllCheckbox.prop('checked', true);
            selectAllCheckbox.prop('indeterminate', false);
        } else {
            selectAllCheckbox.prop('checked', false);
            selectAllCheckbox.prop('indeterminate', true);
        }
    }

    /**
     * Update bulk delete button state
     */
    function updateBulkDeleteButton() {
        const selectedCount = $('.question-checkbox:checked').length;
        const bulkDeleteBtn = $('#bulkDeleteQuestionsBtn');

        if (selectedCount > 0) {
            bulkDeleteBtn.prop('disabled', false);
            bulkDeleteBtn.html(`<i class="bi bi-trash me-1"></i>Delete Selected (${selectedCount})`);
        } else {
            bulkDeleteBtn.prop('disabled', true);
            bulkDeleteBtn.html('<i class="bi bi-trash me-1"></i>Delete Selected');
        }
    }

    /**
     * Load bulk delete modal
     */
    function loadBulkDeleteModal(url, selectedQuestions) {
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
                $('#bulkDeleteQuestionsModal').remove();

                // Add modal to container
                $('#questionModalsContainer').html(response.html);

                // Update modal with selected questions
                updateBulkDeleteModalContent(selectedQuestions);

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('bulkDeleteQuestionsModal'));
                modal.show();

                // Handle confirmation
                $('#confirmBulkDeleteQuestionsBtn').on('click', function () {
                    confirmBulkDelete(url, selectedQuestions);
                });
            },
            error: function (xhr) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: xhr.responseJSON?.error || 'Failed to load delete confirmation.',
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    /**
     * Update bulk delete modal content
     */
    function updateBulkDeleteModalContent(selectedQuestions) {
        const count = selectedQuestions.length;
        $('#selectedQuestionsCount').text(count);

        // Update questions list
        const listContainer = $('#selectedQuestionsList');
        if (count <= 10) {
            // Show all questions if 10 or fewer
            let listHtml = '<ul class="list-unstyled mb-0">';
            selectedQuestions.forEach(function (question) {
                listHtml += `<li><small><i class="bi bi-dot me-1"></i>${question.text}</small></li>`;
            });
            listHtml += '</ul>';
            listContainer.html(listHtml);
        } else {
            // Show first 10 and count of remaining
            let listHtml = '<ul class="list-unstyled mb-0">';
            for (let i = 0; i < 10; i++) {
                listHtml += `<li><small><i class="bi bi-dot me-1"></i>${selectedQuestions[i].text}</small></li>`;
            }
            listHtml += `</ul><p class="text-muted small mt-2 mb-0"><strong>and ${count - 10} more question(s)...</strong></p>`;
            listContainer.html(listHtml);
        }
    }

    /**
     * Confirm and execute bulk delete
     */
    function confirmBulkDelete(url, selectedQuestions) {
        // Convert IDs to integers
        const questionIds = selectedQuestions.map(q => parseInt(q.id)).filter(id => !isNaN(id));

        if (questionIds.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No valid question IDs found.',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        Swal.fire({
            title: 'Deleting...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                question_ids: questionIds
            }),
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function (response) {
                Swal.close();

                if (response.success) {
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('bulkDeleteQuestionsModal'));
                    if (modal) {
                        modal.hide();
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: response.message,
                        confirmButtonColor: '#3085d6',
                        timer: 2000,
                        timerProgressBar: true
                    }).then(() => {
                        // Reload page to reflect changes
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.error || 'Failed to delete questions.',
                        confirmButtonColor: '#3085d6'
                    });
                }
            },
            error: function (xhr) {
                Swal.close();
                const errorMessage = xhr.responseJSON?.error || 'An error occurred while deleting.';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonColor: '#3085d6'
                });
            }
        });
    }

    // Export for use in other scripts
    window.initializeQuestionForm = function (questionType) {
        selectQuestionType(questionType);
    };

})(jQuery);

