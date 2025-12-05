// score_calculator.js
function setupScoreCalculation() {
  const classScoreInputs = document.querySelectorAll(".class-score");
  const examScoreInputs = document.querySelectorAll(".exam-score");

  function updateTotalScore(row) {
    const classScoreInput = row.querySelector(".class-score");
    const examScoreInput = row.querySelector(".exam-score");
    const totalScoreInput = row.querySelector(".total-score");
    const gradeInput = row.querySelector(".grade");
    const remarksInput = row.querySelector(".remarks");

    if (classScoreInput && examScoreInput && totalScoreInput) {
      const classScore = parseFloat(classScoreInput.value) || 0;
      const examScore = parseFloat(examScoreInput.value) || 0;

      // Validate score ranges with visual feedback
      let hasError = false;

      // Get the maximum values from the input attributes
      const maxClassScore = parseFloat(classScoreInput.getAttribute('max')) || 30;
      const maxExamScore = parseFloat(examScoreInput.getAttribute('max')) || 70;

      if (classScore > maxClassScore) {
        classScoreInput.classList.add("is-invalid");
        if (
          !classScoreInput.nextElementSibling?.classList.contains(
            "invalid-feedback"
          )
        ) {
          const feedback = document.createElement("div");
          feedback.classList.add("invalid-feedback");
          feedback.textContent = `Maximum class score is ${maxClassScore}`;
          classScoreInput.parentNode.appendChild(feedback);
        }
        hasError = true;
      } else {
        classScoreInput.classList.remove("is-invalid");
        const feedback = classScoreInput.nextElementSibling;
        if (feedback?.classList.contains("invalid-feedback")) {
          feedback.remove();
        }
      }

      if (examScore > maxExamScore) {
        examScoreInput.classList.add("is-invalid");
        if (
          !examScoreInput.nextElementSibling?.classList.contains(
            "invalid-feedback"
          )
        ) {
          const feedback = document.createElement("div");
          feedback.classList.add("invalid-feedback");
          feedback.textContent = `Maximum exam score is ${maxExamScore}`;
          examScoreInput.parentNode.appendChild(feedback);
        }
        hasError = true;
      } else {
        examScoreInput.classList.remove("is-invalid");
        const feedback = examScoreInput.nextElementSibling;
        if (feedback?.classList.contains("invalid-feedback")) {
          feedback.remove();
        }
      }

      if (hasError) {
        return;
      }

      // Calculate total and update UI
      const totalScore = classScore + examScore;
      totalScoreInput.value = totalScore.toFixed(2);

      // Instead of hardcoded grade calculation, fetch grade from API
      fetch(`/api/get_grade_for_score/?score=${totalScore}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            const grade = data.grade_letter;
            const remarks = data.remarks;

            // Generate CSS classes - handle different grade formats
            // Extract the first character of the grade (A1 -> A, B2 -> B, etc.)
            const gradeFirstChar = grade.charAt(0).toLowerCase();
            const gradeClass = `grade-${gradeFirstChar}`;

            // Clean up remarks for CSS class (remove spaces, convert to lowercase)
            const remarksClass = `remarks-${remarks.toLowerCase().replace(/\s+/g, "")}`;

            // Update hidden inputs
            gradeInput.value = grade;
            remarksInput.value = remarks;

            // Update visual representation of grade
            const gradeCell = row.querySelector("td:nth-child(6)");
            gradeCell.innerHTML = `<div class="badge-grade ${gradeClass}">${grade}</div>`;

            // Update remarks cell
            const remarksCell = row.querySelector("td:nth-child(7)");
            remarksCell.innerHTML = `<span class="remarks-badge ${remarksClass}">${remarks}</span>`;

            // Trigger position recalculation
            window.setTimeout(() => {
              if (window.recalculateAllPositions) {
                window.recalculateAllPositions();
              }
            }, 100);
          } else {
            console.error("Error fetching grade:", data.error);
          }
        })
        .catch(error => {
          console.error("Error fetching grade:", error);
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

      const positionCell = student.row.querySelector("td:nth-child(8)");
      const positionInput = student.row.querySelector(".position");
      const positionClass =
        currentPosition <= 3 ? `position-${currentPosition}` : "position-other";

      positionCell.innerHTML = `<div class="position-badge ${positionClass}">${currentPosition}</div>`;
      positionInput.value = currentPosition;
    });
  }

  // Debounce function to improve performance
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Debounced position recalculation
  const debouncedRecalculation = debounce(recalculateAllPositions, 300);

  // Attach event listeners to score inputs with improved event handling
  function attachEventListeners() {
    document.querySelectorAll(".class-score, .exam-score").forEach((input) => {
      input.addEventListener("input", function () {
        updateTotalScore(this.closest("tr"));
        debouncedRecalculation();
      });
    });
  }

  // Initial setup
  attachEventListeners();

  // Make the setup function available globally for dynamic content
  window.refreshScoreCalculation = attachEventListeners;
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", setupScoreCalculation);
