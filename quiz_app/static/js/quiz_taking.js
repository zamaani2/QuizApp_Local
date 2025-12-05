/**
 * Quiz Taking JavaScript
 * Handles timer, navigation, auto-save, and submission for quiz-taking interface
 */

(function () {
    'use strict';

    // Quiz state
    let currentQuestionIndex = 0;
    let questions = [];
    let timeRemainingSeconds = 0;
    let timerInterval = null;
    let autoSaveInterval = null;
    let isSubmitting = false;

    // Initialize on DOM ready
    $(document).ready(function () {
        initializeQuiz();
    });

    /**
     * Initialize quiz interface
     */
    function initializeQuiz() {
        // Get all question cards
        questions = $('.question-card').toArray();

        if (questions.length === 0) {
            return;
        }

        // Initialize timer if time limit exists
        if (quizData.timeRemainingSeconds > 0) {
            timeRemainingSeconds = quizData.timeRemainingSeconds;
            startTimer();
        }

        // Set up event handlers
        setupEventHandlers();

        // Start auto-save
        startAutoSave();

        // Show first question
        showQuestion(0);

        // Update progress
        updateProgress();
    }

    /**
     * Set up event handlers
     */
    function setupEventHandlers() {
        // Navigation buttons
        $('#prevQuestionBtn').on('click', function () {
            navigateQuestion(-1);
        });

        $('#nextQuestionBtn').on('click', function () {
            navigateQuestion(1);
        });

        // Question navigation sidebar
        $('.question-nav-btn').on('click', function () {
            const questionId = $(this).data('question-id');
            const questionIndex = questions.findIndex(q => $(q).data('question-id') == questionId);
            if (questionIndex !== -1) {
                showQuestion(questionIndex);
            }
        });

        // Answer input handlers
        $('.answer-choice').on('change', function () {
            const questionId = $(this).data('question-id');
            const choiceId = $(this).data('choice-id');
            saveAnswer(questionId, { choice_id: choiceId });
        });

        // Text answer handlers (with debounce)
        let textAnswerTimeout;
        $('.answer-text').on('input', function () {
            const questionId = $(this).data('question-id');
            const textAnswer = $(this).val();

            clearTimeout(textAnswerTimeout);
            textAnswerTimeout = setTimeout(function () {
                saveAnswer(questionId, { text_answer: textAnswer });
            }, 1000); // Debounce 1 second
        });

        // Save progress button
        $('#saveProgressBtn').on('click', function () {
            saveAllAnswers();
        });

        // Submit quiz button
        $('#submitQuizBtn').on('click', function () {
            showSubmitConfirmation();
        });

        // Confirm submit button
        $('#confirmSubmitBtn').on('click', function () {
            submitQuiz();
        });

        // Prevent accidental navigation
        window.addEventListener('beforeunload', function (e) {
            if (!isSubmitting) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Start timer countdown
     */
    function startTimer() {
        updateTimerDisplay();

        timerInterval = setInterval(function () {
            timeRemainingSeconds--;
            updateTimerDisplay();

            // Warning when 5 minutes remaining
            if (timeRemainingSeconds === 300) {
                showTimerWarning('5 minutes remaining!');
            }

            // Warning when 1 minute remaining
            if (timeRemainingSeconds === 60) {
                showTimerWarning('1 minute remaining!');
            }

            // Auto-submit when time expires
            if (timeRemainingSeconds <= 0) {
                clearInterval(timerInterval);
                if (autoSaveInterval) {
                    clearInterval(autoSaveInterval);
                }
                // Save all current answers before submitting
                saveAllAnswers();
                showTimerWarning('Time expired! Submitting quiz automatically...');
                // Submit immediately after a brief delay to ensure answers are saved
                setTimeout(function () {
                    submitQuiz(true);
                }, 1500);
            }
        }, 1000);
    }

    /**
     * Update timer display
     */
    function updateTimerDisplay() {
        if (timeRemainingSeconds <= 0) {
            $('#timerDisplay').text('00:00').addClass('text-danger');
            return;
        }

        const minutes = Math.floor(timeRemainingSeconds / 60);
        const seconds = timeRemainingSeconds % 60;
        const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        $('#timerDisplay').text(display);

        // Change color when time is running low
        if (timeRemainingSeconds <= 300) {
            $('#timerDisplay').removeClass('text-white').addClass('text-warning');
        }
        if (timeRemainingSeconds <= 60) {
            $('#timerDisplay').removeClass('text-warning').addClass('text-danger');
        }
    }

    /**
     * Show timer warning
     */
    function showTimerWarning(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'Time Warning',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }

    /**
     * Navigate to next/previous question
     */
    function navigateQuestion(direction) {
        const newIndex = currentQuestionIndex + direction;
        if (newIndex >= 0 && newIndex < questions.length) {
            showQuestion(newIndex);
        }
    }

    /**
     * Show specific question
     */
    function showQuestion(index) {
        if (index < 0 || index >= questions.length) {
            return;
        }

        // Hide all questions
        $('.question-card').hide();

        // Show selected question
        $(questions[index]).show();

        // Update current index
        currentQuestionIndex = index;

        // Update navigation buttons
        $('#prevQuestionBtn').prop('disabled', index === 0);
        $('#nextQuestionBtn').prop('disabled', index === questions.length - 1);

        // Update question number display
        $('#currentQuestionNum').text(index + 1);

        // Update navigation sidebar
        $('.question-nav-btn').removeClass('btn-primary').addClass('btn-outline-secondary');
        $(`#nav_question_${$(questions[index]).data('question-id')}`)
            .removeClass('btn-outline-secondary')
            .addClass('btn-primary');

        // Scroll smoothly to the question card instead of top of page
        const questionCard = $(questions[index]);
        if (questionCard.length) {
            // Use setTimeout to ensure the question is visible before scrolling
            setTimeout(function () {
                const offset = questionCard.offset().top - 100; // 100px offset from top
                $('html, body').animate({
                    scrollTop: offset
                }, 300); // Smooth scroll animation
            }, 50);
        }
    }

    /**
     * Save answer for a question
     */
    function saveAnswer(questionId, answerData) {
        const formData = new FormData();
        formData.append('question_id', questionId);
        formData.append('csrfmiddlewaretoken', $('[name=csrfmiddlewaretoken]').val());

        if (answerData.choice_id) {
            formData.append('choice_id', answerData.choice_id);
        } else if (answerData.text_answer !== undefined) {
            formData.append('text_answer', answerData.text_answer);
        }

        $.ajax({
            url: quizData.saveUrl,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (response) {
                if (response.success) {
                    // Update question status indicator
                    updateQuestionStatus(questionId, true);
                    updateProgress(response.answered_count);
                }
            },
            error: function (xhr) {
                console.error('Error saving answer:', xhr.responseJSON);
            }
        });
    }

    /**
     * Save all answers (manual save)
     */
    function saveAllAnswers() {
        const saveBtn = $('#saveProgressBtn');
        const originalText = saveBtn.html();

        saveBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split me-1"></i>Saving...');

        // Save all visible answers
        $('.question-card:visible').each(function () {
            const questionId = $(this).data('question-id');
            const answerData = {};

            // Check for choice answer
            const selectedChoice = $(this).find('.answer-choice:checked');
            if (selectedChoice.length) {
                answerData.choice_id = selectedChoice.data('choice-id');
            }

            // Check for text answer
            const textAnswer = $(this).find('.answer-text');
            if (textAnswer.length) {
                answerData.text_answer = textAnswer.val();
            }

            if (Object.keys(answerData).length > 0) {
                saveAnswer(questionId, answerData);
            }
        });

        setTimeout(function () {
            saveBtn.prop('disabled', false).html(originalText);
            showSaveStatus('Progress saved successfully!', 'success');
        }, 1000);
    }

    /**
     * Start auto-save interval
     */
    function startAutoSave() {
        autoSaveInterval = setInterval(function () {
            // Auto-save current question
            const currentQuestion = $(questions[currentQuestionIndex]);
            const questionId = currentQuestion.data('question-id');
            const answerData = {};

            const selectedChoice = currentQuestion.find('.answer-choice:checked');
            if (selectedChoice.length) {
                answerData.choice_id = selectedChoice.data('choice-id');
            }

            const textAnswer = currentQuestion.find('.answer-text');
            if (textAnswer.length) {
                answerData.text_answer = textAnswer.val();
            }

            if (Object.keys(answerData).length > 0) {
                saveAnswer(questionId, answerData);
            }
        }, 30000); // Auto-save every 30 seconds
    }

    /**
     * Update question status indicator
     */
    function updateQuestionStatus(questionId, answered) {
        const indicator = $(`.question-status-indicator[data-question-id="${questionId}"]`);
        if (answered) {
            indicator.html('<i class="bi bi-check-circle-fill text-success"></i>');
        } else {
            indicator.html('<i class="bi bi-circle text-muted"></i>');
        }
    }

    /**
     * Update progress display
     */
    function updateProgress(answeredCount) {
        if (answeredCount !== undefined) {
            // Update from response
            $('#progressText').text(`${answeredCount}/${quizData.totalQuestions} answered`);
            const percentage = (answeredCount / quizData.totalQuestions) * 100;
            $('#progressBar').css('width', `${percentage}%`);
            $('#submitAnsweredCount').text(answeredCount);
        } else {
            // Calculate from current state
            const answered = $('.question-status-indicator .bi-check-circle-fill').length;
            $('#progressText').text(`${answered}/${quizData.totalQuestions} answered`);
            const percentage = (answered / quizData.totalQuestions) * 100;
            $('#progressBar').css('width', `${percentage}%`);
            $('#submitAnsweredCount').text(answered);
        }
    }

    /**
     * Show save status message
     */
    function showSaveStatus(message, type) {
        const statusDiv = $('#saveStatus');
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        statusDiv.html(`<div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>`);

        setTimeout(function () {
            statusDiv.fadeOut(function () {
                statusDiv.html('').show();
            });
        }, 3000);
    }

    /**
     * Show submit confirmation modal
     */
    function showSubmitConfirmation() {
        updateProgress(); // Update answered count
        $('#submitConfirmModal').modal('show');
    }

    /**
     * Submit quiz
     */
    function submitQuiz(autoSubmit = false) {
        if (isSubmitting) {
            return;
        }

        isSubmitting = true;

        // Clear intervals
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }

        // Show loading
        if (!autoSubmit) {
            $('#submitConfirmModal').modal('hide');
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Submitting Quiz...',
                text: 'Please wait while we submit your quiz.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        }

        // Create form and submit
        const form = $('<form>', {
            method: 'POST',
            action: quizData.submitUrl
        });

        form.append($('<input>', {
            type: 'hidden',
            name: 'csrfmiddlewaretoken',
            value: $('[name=csrfmiddlewaretoken]').val()
        }));

        $('body').append(form);
        form.submit();
    }

})();

