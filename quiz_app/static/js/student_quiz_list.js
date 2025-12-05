/**
 * Student Quiz List JavaScript
 * Handles filtering, searching, and interactions for the available quizzes list
 */

document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const subjectFilter = document.getElementById('subjectFilter');
    const academicYearFilter = document.getElementById('academicYearFilter');
    const termFilter = document.getElementById('termFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const quizzesContainer = document.getElementById('quizzesContainer');
    const quizCards = document.querySelectorAll('.quiz-card-item');

    // Get current URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const baseUrl = window.location.pathname;

    // Function to filter cards
    function filterCards() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const subjectValue = subjectFilter.value;
        const academicYearValue = academicYearFilter.value;
        const termValue = termFilter.value;
        const statusValue = statusFilter.value;

        let visibleCount = 0;

        quizCards.forEach(card => {
            let show = true;

            // Search filter - search in quiz title
            if (searchTerm) {
                const quizTitle = card.querySelector('.card-header h6').textContent.toLowerCase();
                if (!quizTitle.includes(searchTerm)) {
                    show = false;
                }
            }

            // Subject filter
            if (subjectValue && card.dataset.subjectId !== subjectValue) {
                show = false;
            }

            // Academic year filter
            if (academicYearValue) {
                const cardAcademicYear = card.dataset.academicYearId || '';
                if (cardAcademicYear !== academicYearValue) {
                    show = false;
                }
            }

            // Term filter
            if (termValue) {
                const cardTerm = card.dataset.termId || '';
                if (cardTerm !== termValue) {
                    show = false;
                }
            }

            // Status filter
            if (statusValue && card.dataset.status !== statusValue) {
                show = false;
            }

            // Show/hide card
            if (show) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show empty message if no cards visible
        let emptyMessage = quizzesContainer.querySelector('.no-results-message');
        if (visibleCount === 0 && quizCards.length > 0) {
            if (!emptyMessage) {
                emptyMessage = document.createElement('div');
                emptyMessage.className = 'col-12 no-results-message';
                emptyMessage.innerHTML = `
                    <div class="card">
                        <div class="card-body text-center text-muted py-5">
                            <i class="bi bi-search display-4 d-block mb-3"></i>
                            <p class="mb-0">No quizzes match your filters.</p>
                        </div>
                    </div>
                `;
                quizzesContainer.appendChild(emptyMessage);
            }
        } else if (emptyMessage) {
            emptyMessage.remove();
        }
    }

    // Function to update URL and reload (for server-side filtering if needed)
    function updateFilters() {
        const params = new URLSearchParams();

        if (searchInput.value.trim()) {
            params.set('search', searchInput.value.trim());
        }
        if (subjectFilter.value) {
            params.set('subject', subjectFilter.value);
        }
        if (academicYearFilter.value) {
            params.set('academic_year', academicYearFilter.value);
        }
        if (termFilter.value) {
            params.set('term', termFilter.value);
        }
        if (statusFilter.value) {
            params.set('status', statusFilter.value);
        }

        // Use client-side filtering for better UX
        filterCards();

        // Update URL without reloading
        const queryString = params.toString();
        const newUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
        window.history.pushState({}, '', newUrl);
    }

    // Debounce function for search
    let searchTimeout;
    function debounceSearch(func, delay) {
        return function (...args) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Search input handler
    if (searchInput) {
        searchInput.addEventListener('input', debounceSearch(function () {
            filterCards();
        }, 300));
    }

    // Filter change handlers
    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterCards);
    }
    if (academicYearFilter) {
        academicYearFilter.addEventListener('change', filterCards);
    }
    if (termFilter) {
        termFilter.addEventListener('change', filterCards);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterCards);
    }

    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function () {
            searchInput.value = '';
            subjectFilter.value = '';
            academicYearFilter.value = '';
            termFilter.value = '';
            statusFilter.value = '';
            window.location.href = baseUrl;
        });
    }

    // Add hover effect to cards
    quizCards.forEach(card => {
        const quizCard = card.querySelector('.quiz-card');
        card.addEventListener('mouseenter', function () {
            quizCard.style.transform = 'translateY(-5px)';
            quizCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        });
        card.addEventListener('mouseleave', function () {
            quizCard.style.transform = 'translateY(0)';
            quizCard.style.boxShadow = '';
        });
    });

    // Button handlers
    $(document).on('click', '.start-quiz-btn', function () {
        const quizId = $(this).data('quiz-id');
        // Redirect to start quiz page
        window.location.href = `/quizzes/${quizId}/start/`;
    });

    $(document).on('click', '.resume-quiz-btn', function () {
        const quizId = $(this).data('quiz-id');
        // Redirect to resume quiz page
        window.location.href = `/quizzes/${quizId}/resume/`;
    });

    $(document).on('click', '.view-details-btn', function () {
        const quizId = $(this).data('quiz-id');
        // Redirect to quiz detail page
        window.location.href = `/quizzes/${quizId}/preview/`;
    });

    $(document).on('click', '.view-results-btn', function () {
        const quizId = $(this).data('quiz-id');
        // TODO: Implement view results functionality
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Coming Soon',
                text: 'View results functionality will be available soon.',
            });
        } else {
            alert('View results functionality will be available soon.');
        }
    });
});

