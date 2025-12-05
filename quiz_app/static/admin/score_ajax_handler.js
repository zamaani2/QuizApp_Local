$(document).ready(function () {
  // Initialize toast functionality if using Bootstrap 5
  var toastElList = [].slice.call(document.querySelectorAll(".toast"));
  var toastList = toastElList.map(function (toastEl) {
    return new bootstrap.Toast(toastEl);
  });

  // Track changes to identify modified records
  const changedRows = new Set();

  // Auto save timer
  let autoSaveTimer = null;
  const AUTO_SAVE_DELAY = 10000; // 10 seconds

  // Enable autosave if checkbox is checked
  $("#enableAutoSave").on("change", function () {
    if ($(this).is(":checked")) {
      setupAutoSave();
      Swal.fire({
        toast: true,
        position: "bottom-end",
        icon: "info",
        title: "Auto-save enabled",
        text: "Changes will be saved automatically",
        showConfirmButton: false,
        timer: 3000,
      });
    } else {
      clearTimeout(autoSaveTimer);
    }
  });

  function setupAutoSave() {
    // Clear any existing timers
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    // Only set up auto-save if there are changed rows
    if (changedRows.size > 0) {
      autoSaveTimer = setTimeout(function () {
        saveScores(true); // true = auto save mode
      }, AUTO_SAVE_DELAY);
    }
  }

  // Handle form submission with AJAX
  $("#scoreForm").on("submit", function (e) {
    e.preventDefault(); // Prevent the default form submission
    saveScores(false); // false = manual save mode
  });

  function saveScores(isAutoSave = false) {
    // If no changes, don't bother saving
    if (changedRows.size === 0) {
      if (!isAutoSave) {
        Swal.fire({
          icon: "info",
          title: "No Changes",
          text: "No changes to save",
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      }
      return;
    }

    // Get the submit button and save its text
    const submitBtn = $("#scoreForm").find('button[type="submit"]');
    const originalBtnText = submitBtn.html();

    // Show loading state
    if (!isAutoSave) {
      submitBtn.html('<i class="bi bi-arrow-repeat me-1"></i> Saving...');
      submitBtn.prop("disabled", true);
    }

    // For auto-save, show a subtle indicator
    if (isAutoSave) {
      Swal.fire({
        toast: true,
        position: "bottom-end",
        icon: "info",
        title: "Auto-saving...",
        showConfirmButton: false,
        timer: 1500,
      });
    } else {
      // For manual save, show a more prominent indicator
      Swal.fire({
        title: "Saving Scores",
        html: `Saving changes for ${changedRows.size} student${changedRows.size !== 1 ? "s" : ""
          }...`,
        didOpen: () => {
          Swal.showLoading();
        },
        allowOutsideClick: false,
        showConfirmButton: false,
      });
    }

    // Clear any existing alerts
    $(".ajax-alert").remove();

    // Get the form data
    const formData = $("#scoreForm").serialize();

    // Add loading indicator to each changed row
    changedRows.forEach((rowId) => {
      const row = $(`tr[data-student-id="${rowId}"]`);
      row.addClass("saving-row");
      row
        .find("td:last-child")
        .append(
          '<div class="saving-indicator"><span class="spinner-border spinner-border-sm text-primary" role="status"></span></div>'
        );
    });

    // Send AJAX request
    $.ajax({
      type: "POST",
      url: window.location.href,
      data: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
      success: function (response) {
        // Remove loading indicators
        $(".saving-indicator").remove();
        $(".saving-row").removeClass("saving-row");

        // Display success or error message
        if (response.success) {
          // Play success sound if available
          if (window.successSound) {
            window.successSound
              .play()
              .catch((e) => console.log("Sound play prevented:", e));
          }

          // For auto-save, show a subtle success message
          if (isAutoSave) {
            Swal.fire({
              toast: true,
              position: "bottom-end",
              icon: "success",
              title: "Auto-saved successfully",
              showConfirmButton: false,
              timer: 3000,
            });
          } else {
            // For manual save, close the loading dialog and show success
            Swal.fire({
              icon: "success",
              title: "Scores Saved",
              text: `Successfully saved scores for ${changedRows.size} student${changedRows.size !== 1 ? "s" : ""
                }.`,
              timer: 3000,
              timerProgressBar: true,
            });
          }

          // Update student data in the table
          response.students.forEach(function (student) {
            const row = $(`tr[data-student-id="${student.id}"]`);
            if (!row.length) return;

            // Update UI with returned values
            row.find(".total-score").val(student.total_score.toFixed(2));

            // Update grade cell
            const gradeClass = student.grade
              ? `grade-${student.grade.toLowerCase()}`
              : "";
            row
              .find("td:nth-child(6)")
              .html(
                `<div class="badge-grade ${gradeClass}">${student.grade}</div>`
              );
            row.find(".grade").val(student.grade);

            // Update remarks cell
            const remarksClass = student.remarks
              ? `remarks-${student.remarks.toLowerCase().replace(/\s+/g, "")}`
              : "";
            row
              .find("td:nth-child(7)")
              .html(
                `<span class="remarks-badge ${remarksClass}">${student.remarks}</span>`
              );
            row.find(".remarks").val(student.remarks);

            // Update position cell
            const positionClass =
              student.position <= 3
                ? `position-${student.position}`
                : "position-other";
            row
              .find("td:nth-child(8)")
              .html(
                `<div class="position-badge ${positionClass}">${student.position}</div>`
              );
            row.find(".position").val(student.position);

            // Mark as saved
            row
              .addClass("saved-row")
              .delay(2000)
              .queue(function () {
                $(this).removeClass("saved-row").dequeue();
              });
          });

          // Clear the tracked changes
          changedRows.clear();
        } else {
          // Play error sound if available
          if (window.errorSound) {
            window.errorSound
              .play()
              .catch((e) => console.log("Sound play prevented:", e));
          }

          // Close any loading dialogs
          Swal.close();

          // Show error details
          let errorHTML = "There was an error saving scores.";

          if (response.error_messages && response.error_messages.length > 0) {
            errorHTML += '<ul class="mt-3 text-start">';
            response.error_messages.forEach(function (msg) {
              errorHTML += `<li>${msg}</li>`;
            });
            errorHTML += "</ul>";
          }

          Swal.fire({
            icon: "error",
            title: "Error Saving Scores",
            html: errorHTML,
            confirmButtonText: "OK",
          });
        }
      },
      error: function (xhr, status, error) {
        // Remove loading indicators
        $(".saving-indicator").remove();
        $(".saving-row").removeClass("saving-row");

        // Close any loading dialogs
        Swal.close();

        // Determine error message
        let errorMsg =
          "An error occurred while saving scores. Please try again.";

        try {
          const response = JSON.parse(xhr.responseText);
          if (response.error) {
            errorMsg = response.error;
          }
        } catch (e) {
          // Log error details to console for debugging
          console.error("AJAX Error:", error);
        }

        // Show error dialog
        Swal.fire({
          icon: "error",
          title: "Connection Error",
          text: errorMsg,
          confirmButtonText: "OK",
        });
      },
      complete: function () {
        // Restore button state
        if (!isAutoSave) {
          submitBtn.html(originalBtnText);
          submitBtn.prop("disabled", false);
        }
      },
    });
  }

  // Track changes to inputs to highlight modified rows
  $(document).on("input", ".class-score, .exam-score", function () {
    const row = $(this).closest("tr");
    const studentId = row.data("student-id");
    if (studentId) {
      changedRows.add(studentId);
      row.addClass("modified-row");

      // Set up auto-save if enabled
      if ($("#enableAutoSave").is(":checked")) {
        setupAutoSave();
      }
    }

    // Update calculations in real-time
    updateRowCalculations(row);
  });

  // Highlight row on focus for better UX
  $(document).on("focus", ".class-score, .exam-score", function () {
    $(this).closest("tr").addClass("active-row");
  });

  $(document).on("blur", ".class-score, .exam-score", function () {
    $(this).closest("tr").removeClass("active-row");
  });

  // Handle row-by-row calculation
  function updateRowCalculations(row) {
    const classScore = parseFloat(row.find(".class-score").val()) || 0;
    const examScore = parseFloat(row.find(".exam-score").val()) || 0;

    // Get the maximum values from the input attributes
    const maxClassScore = parseFloat(row.find(".class-score").attr('max')) || 30;
    const maxExamScore = parseFloat(row.find(".exam-score").attr('max')) || 70;

    // Validate ranges
    let isValid = true;
    if (classScore > maxClassScore) {
      row.find(".class-score").addClass("is-invalid");
      isValid = false;
    } else {
      row.find(".class-score").removeClass("is-invalid");
    }

    if (examScore > maxExamScore) {
      row.find(".exam-score").addClass("is-invalid");
      isValid = false;
    } else {
      row.find(".exam-score").removeClass("is-invalid");
    }

    if (!isValid) return;

    // Calculate total
    const totalScore = classScore + examScore;
    row.find(".total-score").val(totalScore.toFixed(2));

    // Fetch grade from API instead of using hardcoded values
    fetch(`/api/get_grade_for_score/?score=${totalScore}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          const grade = data.grade_letter;
          const remarks = data.remarks;

          // Generate CSS classes - handle different grade formats
          const gradeFirstChar = grade.charAt(0).toLowerCase();
          const gradeClass = `grade-${gradeFirstChar}`;

          // Clean up remarks for CSS class
          const remarksClass = `remarks-${remarks.toLowerCase().replace(/\s+/g, "")}`;

          // Update hidden inputs
          row.find(".grade").val(grade);
          row.find(".remarks").val(remarks);

          // Update visual elements
          row
            .find("td:nth-child(6)")
            .html(`<div class="badge-grade ${gradeClass}">${grade}</div>`);
          row
            .find("td:nth-child(7)")
            .html(`<span class="remarks-badge ${remarksClass}">${remarks}</span>`);
        } else {
          console.error("Error fetching grade:", data.error);
        }
      })
      .catch(error => {
        console.error("Error fetching grade:", error);
      });
  }

  // Batch processing controls
  $("#batchProcess").on("click", function () {
    $("#batchProcessModal").modal("show");
  });

  // Save changes button in fixed footer
  $("#saveChangesBtn").on("click", function () {
    if (changedRows.size > 0) {
      Swal.fire({
        title: "Save Changes?",
        text: `You have unsaved changes for ${changedRows.size} student${changedRows.size !== 1 ? "s" : ""
          }. Save now?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Save",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          saveScores(false);
        }
      });
    } else {
      Swal.fire({
        icon: "info",
        title: "No Changes",
        text: "No changes to save",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  });

  // Add keyboard navigation between cells for easier data entry
  $(".score-input").on("keydown", function (e) {
    const currentRow = $(this).closest("tr");
    const currentIndex = currentRow.index();
    const isClassScore = $(this).hasClass("class-score");

    // Handle tab, enter, and arrow keys
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextRow = currentRow.next("tr");
      if (nextRow.length) {
        if (isClassScore) {
          nextRow.find(".class-score").focus();
        } else {
          nextRow.find(".exam-score").focus();
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = currentRow.prev("tr");
      if (prevRow.length) {
        if (isClassScore) {
          prevRow.find(".class-score").focus();
        } else {
          prevRow.find(".exam-score").focus();
        }
      }
    } else if (e.key === "ArrowRight" && isClassScore) {
      e.preventDefault();
      currentRow.find(".exam-score").focus();
    } else if (e.key === "ArrowLeft" && !isClassScore) {
      e.preventDefault();
      currentRow.find(".class-score").focus();
    } else if (e.key === "s" && e.ctrlKey) {
      // Ctrl+S to save
      e.preventDefault();
      saveScores(false);
    }
  });

  // Detect Ctrl+S anywhere on the page to save
  $(document).on("keydown", function (e) {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      if (changedRows.size > 0) {
        saveScores(false);
      }
    }
  });

  // Show unsaved changes warning when navigating away
  $(window).on("beforeunload", function () {
    if (changedRows.size > 0) {
      return "You have unsaved changes. Are you sure you want to leave?";
    }
  });

  // Initialize DataTable with custom settings for better UX
  if ($.fn.DataTable) {
    const table = $("#scoresTable").DataTable({
      paging: false,
      ordering: true,
      info: false,
      searching: true,
      columnDefs: [{ orderable: false, targets: [2, 3] }],
      order: [[0, "asc"]],
      language: {
        search: "Filter students:",
        zeroRecords: "No matching students found",
      },
      drawCallback: function () {
        // Reattach event handlers to any new DOM elements
        if (window.refreshScoreCalculation) {
          window.refreshScoreCalculation();
        }
      },
    });

    // Add search placeholder
    $(".dataTables_filter input").attr("placeholder", "Type to filter...");
  }

  // Add sound effects for feedback (optional)
  window.successSound = new Audio("/static/sounds/success.mp3");
  window.errorSound = new Audio("/static/sounds/error.mp3");

  // Add custom CSS for better visual feedback
  $("<style>")
    .prop("type", "text/css")
    .html(
      `
            .modified-row { background-color: rgba(255, 243, 205, 0.5) !important; }
            .active-row { background-color: rgba(209, 236, 250, 0.5) !important; }
            .saved-row { animation: highlight-green 1.5s; }
            @keyframes highlight-green {
                0% { background-color: rgba(209, 250, 229, 0.1); }
                50% { background-color: rgba(209, 250, 229, 0.8); }
                100% { background-color: rgba(209, 250, 229, 0); }
            }
            .saving-indicator {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
            }
            .saving-row {
                position: relative;
                opacity: 0.8;
            }
            .fixed-bottom-bar {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(255, 255, 255, 0.95);
                padding: 10px 20px;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                z-index: 999;
                display: none;
            }
            .fixed-bottom-bar.show {
                display: flex;
            }
            #changesCounter {
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                margin-left: 5px;
            }
        `
    )
    .appendTo("head");

  // Add fixed bottom bar for showing unsaved changes
  const bottomBar = $(`
    <div class="fixed-bottom-bar">
      <div>
        <span class="fw-bold">Unsaved Changes</span>
        <span id="changesCounter">0</span>
      </div>
      <div>
        <button id="saveChangesBtn" class="btn btn-success btn-sm">
          <i class="bi bi-save me-1"></i>Save Changes
        </button>
      </div>
    </div>
  `);
  $("body").append(bottomBar);

  // Function to update the changes counter
  function updateChangesCounter() {
    const count = changedRows.size;
    $("#changesCounter").text(count);

    if (count > 0) {
      $(".fixed-bottom-bar").addClass("show");
    } else {
      $(".fixed-bottom-bar").removeClass("show");
    }
  }

  // Monitor changes to update the counter
  setInterval(updateChangesCounter, 500);

  // Add shortcut info with SweetAlert
  $("#keyboardShortcutsBtn").on("click", function () {
    Swal.fire({
      title: "Keyboard Shortcuts",
      html: `
        <div class="text-start">
          <table class="table table-sm">
            <tr>
              <td><kbd>↑</kbd> / <kbd>↓</kbd></td>
              <td>Navigate between students</td>
            </tr>
            <tr>
              <td><kbd>←</kbd> / <kbd>→</kbd></td>
              <td>Navigate between class/exam score fields</td>
            </tr>
            <tr>
              <td><kbd>Enter</kbd></td>
              <td>Move to next student</td>
            </tr>
            <tr>
              <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
              <td>Save all changes</td>
            </tr>
          </table>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Got it!",
    });
  });
});
