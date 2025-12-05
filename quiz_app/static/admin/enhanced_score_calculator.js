// enhanced_score_calculator.js - Handles enhanced score calculation with individual components
function setupEnhancedScoreCalculation() {
    const individualScoreInputs = document.querySelectorAll(".individual-score");
    const classTestScoreInputs = document.querySelectorAll(".class-test-score");
    const projectScoreInputs = document.querySelectorAll(".project-score");
    const groupWorkScoreInputs = document.querySelectorAll(".group-work-score");
    const examScoreInputs = document.querySelectorAll(".exam-score");

    function updateTotalScore(row) {
        const individualScoreInput = row.querySelector(".individual-score");
        const classTestScoreInput = row.querySelector(".class-test-score");
        const projectScoreInput = row.querySelector(".project-score");
        const groupWorkScoreInput = row.querySelector(".group-work-score");
        const examScoreInput = row.querySelector(".exam-score");

        const classScoreInput = row.querySelector(".class-score");
        const totalScoreInput = row.querySelector(".total-score");
        const gradeInput = row.querySelector(".grade");
        const remarksInput = row.querySelector(".remarks");

        if (individualScoreInput && classTestScoreInput && projectScoreInput &&
            groupWorkScoreInput && examScoreInput && totalScoreInput) {

            // Get individual component scores
            const individualScore = parseFloat(individualScoreInput.value) || 0;
            const classTestScore = parseFloat(classTestScoreInput.value) || 0;
            const projectScore = parseFloat(projectScoreInput.value) || 0;
            const groupWorkScore = parseFloat(groupWorkScoreInput.value) || 0;
            const examScore = parseFloat(examScoreInput.value) || 0;

            // Validate score ranges with visual feedback
            let hasError = false;

            // Get the maximum values from the input attributes
            const maxIndividualScore = parseFloat(individualScoreInput.getAttribute('max')) || 15;
            const maxClassTestScore = parseFloat(classTestScoreInput.getAttribute('max')) || 15;
            const maxProjectScore = parseFloat(projectScoreInput.getAttribute('max')) || 15;
            const maxGroupWorkScore = parseFloat(groupWorkScoreInput.getAttribute('max')) || 15;
            const maxExamScore = parseFloat(examScoreInput.getAttribute('max')) || 100;

            // Validation for each component
            const validations = [
                { input: individualScoreInput, score: individualScore, max: maxIndividualScore, name: "Individual" },
                { input: classTestScoreInput, score: classTestScore, max: maxClassTestScore, name: "Class Test" },
                { input: projectScoreInput, score: projectScore, max: maxProjectScore, name: "Project" },
                { input: groupWorkScoreInput, score: groupWorkScore, max: maxGroupWorkScore, name: "Group Work" },
                { input: examScoreInput, score: examScore, max: maxExamScore, name: "Exam" }
            ];

            validations.forEach(({ input, score, max, name }) => {
                if (score > max) {
                    input.classList.add("is-invalid");
                    if (!input.nextElementSibling?.classList.contains("invalid-feedback")) {
                        const feedback = document.createElement("div");
                        feedback.classList.add("invalid-feedback");
                        feedback.textContent = `Maximum ${name.toLowerCase()} score is ${max}`;
                        input.parentNode.appendChild(feedback);
                    }
                    hasError = true;
                } else {
                    input.classList.remove("is-invalid");
                    const feedback = input.nextElementSibling;
                    if (feedback?.classList.contains("invalid-feedback")) {
                        feedback.remove();
                    }
                }
            });

            if (hasError) {
                return;
            }

            // Calculate class score (sum of all component scores)
            const calculatedClassScore = individualScore + classTestScore + projectScore + groupWorkScore;

            // Update the class score display
            if (classScoreInput) {
                classScoreInput.value = calculatedClassScore.toFixed(2);
            }

            // Get scoring configuration from the page (set by Django template)
            const classScorePercentage = parseFloat(window.classScorePercentage) || 30;
            const examScorePercentage = parseFloat(window.examScorePercentage) || 70;
            const maxClassScore = parseFloat(window.maxClassScore) || 60;

            // Calculate scaled scores
            const scaledClassScore = (calculatedClassScore / maxClassScore) * classScorePercentage;
            const scaledExamScore = (examScore / 100) * examScorePercentage;

            // Calculate total score
            const totalScore = scaledClassScore + scaledExamScore;
            totalScoreInput.value = totalScore.toFixed(2);

            // Fetch grade and remarks from grading system configuration via API
            fetch(`/api/get-grading-info/?score=${totalScore}`)
                .then(response => response.json())
                .then(data => {
                    const grade = data.grade || '--';
                    const remarks = data.remarks || '--';

                    // Generate CSS classes based on grade
                    const gradeFirstChar = grade.charAt(0).toLowerCase();
                    const gradeClass = `grade-${gradeFirstChar}`;
                    const remarksClass = `remarks-${remarks.toLowerCase().replace(/\s+/g, "")}`;

                    // Update hidden inputs
                    gradeInput.value = grade;
                    remarksInput.value = remarks;

                    // Update visual representation of grade
                    const gradeCell = row.querySelector("td:nth-child(6)"); // Adjust column index as needed
                    if (gradeCell) {
                        if (grade !== '--') {
                            gradeCell.innerHTML = `<div class="badge-grade ${gradeClass}">${grade}</div>`;
                        } else {
                            gradeCell.innerHTML = '<span>--</span>';
                        }
                    }

                    // Update remarks cell
                    const remarksCell = row.querySelector("td:nth-child(7)"); // Adjust column index as needed
                    if (remarksCell) {
                        if (remarks !== '--') {
                            remarksCell.innerHTML = `<span class="remarks-badge ${remarksClass}">${remarks}</span>`;
                        } else {
                            remarksCell.innerHTML = '<span>--</span>';
                        }
                    }

                    // Trigger position recalculation
                    window.setTimeout(() => {
                        if (window.recalculateAllPositions) {
                            window.recalculateAllPositions();
                        }
                    }, 100);
                })
                .catch(error => {
                    console.error("Error fetching grade from grading system:", error);
                    // Set default values on error
                    gradeInput.value = '';
                    remarksInput.value = '';

                    const gradeCell = row.querySelector("td:nth-child(6)");
                    const remarksCell = row.querySelector("td:nth-child(7)");
                    if (gradeCell) gradeCell.innerHTML = '<span>--</span>';
                    if (remarksCell) remarksCell.innerHTML = '<span>--</span>';
                });
        }
    }

    // Function to recalculate all positions whenever scores change
    function recalculateAllPositions() {
        // Collect all students with scores
        const students = [];
        document.querySelectorAll("tbody tr").forEach((row) => {
            const totalScore = parseFloat(row.querySelector(".total-score").value);
            if (!isNaN(totalScore) && totalScore > 0) {
                students.push({
                    row: row,
                    score: totalScore,
                });
            }
        });

        // Sort by score (descending)
        students.sort((a, b) => b.score - a.score);

        // Assign positions with ties handled
        let currentPosition = 1;
        let currentScore = -1;
        let positionCounter = 0;

        students.forEach((student) => {
            positionCounter++;
            // Handle ties (same score gets same position)
            if (student.score !== currentScore) {
                currentPosition = positionCounter;
                currentScore = student.score;
            }

            const positionCell = student.row.querySelector("td:nth-child(8)"); // Adjust column index as needed
            const positionInput = student.row.querySelector(".position");
            if (positionCell && positionInput) {
                const positionClass =
                    currentPosition <= 3 ? `position-${currentPosition}` : "position-other";

                positionCell.innerHTML = `<div class="position-badge ${positionClass}">${currentPosition}</div>`;
                positionInput.value = currentPosition;
            }
        });
    }

    // Auto-save functionality
    function autoSaveScore(row) {
        if (!document.getElementById('enableAutoSave')?.checked) {
            return;
        }

        const studentId = row.getAttribute('data-student-id');
        const assignmentId = new URLSearchParams(window.location.search).get('assignment_id');

        if (!studentId || !assignmentId) {
            return;
        }

        // Collect all score data
        const scoreData = {
            student_id: studentId,
            assignment_id: assignmentId,
            individual_score: row.querySelector('.individual-score')?.value || null,
            class_test_score: row.querySelector('.class-test-score')?.value || null,
            project_score: row.querySelector('.project-score')?.value || null,
            group_work_score: row.querySelector('.group-work-score')?.value || null,
            exam_score: row.querySelector('.exam-score')?.value || null
        };

        // Only auto-save if at least one score is entered
        if (Object.values(scoreData).some(val => val !== null && val !== '')) {
            fetch('/api/save-individual-student-scores/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(scoreData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Add visual feedback for successful save
                        row.classList.add('saved-row');
                        setTimeout(() => {
                            row.classList.remove('saved-row');
                        }, 1500);

                        // Update calculated values from server response
                        if (data.calculated_values) {
                            const calc = data.calculated_values;
                            if (calc.class_score !== null) {
                                const classScoreInput = row.querySelector('.class-score');
                                if (classScoreInput) classScoreInput.value = calc.class_score.toFixed(2);
                            }
                            if (calc.total_score !== null) {
                                const totalScoreInput = row.querySelector('.total-score');
                                if (totalScoreInput) totalScoreInput.value = calc.total_score.toFixed(2);
                            }
                        }
                    } else {
                        console.error('Auto-save failed:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Auto-save error:', error);
                });
        }
    }

    // Debounce function to improve performance
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Debounced functions
    const debouncedRecalculation = debounce(recalculateAllPositions, 300);
    const debouncedAutoSave = debounce(autoSaveScore, 1000);

    // Attach event listeners to score inputs
    function attachEventListeners() {
        document.querySelectorAll(".individual-score, .class-test-score, .project-score, .group-work-score, .exam-score").forEach((input) => {
            input.addEventListener("input", function () {
                const row = this.closest("tr");

                // Add visual feedback for modified row
                row.classList.add('modified-row');

                updateTotalScore(row);
                debouncedRecalculation();
                debouncedAutoSave(row);
            });

            // Add keyboard navigation
            input.addEventListener("keydown", function (e) {
                const row = this.closest("tr");
                const cells = Array.from(row.querySelectorAll("input.individual-score, input.class-test-score, input.project-score, input.group-work-score, input.exam-score"));
                const currentIndex = cells.indexOf(this);

                if (e.key === "Enter") {
                    e.preventDefault();
                    // Move to next row, same column
                    const nextRow = row.nextElementSibling;
                    if (nextRow) {
                        const nextInput = nextRow.querySelectorAll("input")[currentIndex];
                        if (nextInput) {
                            nextInput.focus();
                            nextInput.select();
                        }
                    }
                } else if (e.key === "Tab" && !e.shiftKey) {
                    // Default tab behavior (move to next input in same row)
                    // Browser handles this automatically
                } else if (e.key === "Tab" && e.shiftKey) {
                    // Default shift+tab behavior (move to previous input)
                    // Browser handles this automatically
                }
            });

            // Remove modified styling when input loses focus
            input.addEventListener("blur", function () {
                setTimeout(() => {
                    const row = this.closest("tr");
                    if (!row.querySelector("input:focus")) {
                        row.classList.remove('modified-row');
                    }
                }, 100);
            });
        });
    }

    // Initial setup
    attachEventListeners();

    // Make functions available globally
    window.refreshEnhancedScoreCalculation = attachEventListeners;
    window.recalculateAllPositions = recalculateAllPositions;
}

// Function to get CSRF token
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

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", setupEnhancedScoreCalculation);
