/**
 * Student Quiz Detail JavaScript
 * Handles interactions on the quiz detail/preview page
 */

document.addEventListener('DOMContentLoaded', function () {
    // Start quiz button handler
    $(document).on('click', '.start-quiz-btn', function () {
        const quizId = $(this).data('quiz-id');
        // Redirect to start quiz page
        window.location.href = `/quizzes/${quizId}/start/`;
    });

    // Resume quiz button handler (now handled by direct link)
    // No JavaScript needed as resume button is now a direct link

    // View attempts button handler
    $(document).on('click', '.view-attempts-btn', function () {
        const quizId = $(this).data('quiz-id');

        // TODO: Implement view attempts functionality
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Coming Soon',
                text: 'View attempts functionality will be available soon.',
            });
        } else {
            alert('View attempts functionality will be available soon.');
        }
    });

    // View result button handler
    $(document).on('click', '.view-result-btn', function () {
        const attemptId = $(this).data('attempt-id');

        // TODO: Implement view result functionality
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Coming Soon',
                text: 'View result functionality will be available soon.',
            });
        } else {
            alert('View result functionality will be available soon.');
        }
    });
});

