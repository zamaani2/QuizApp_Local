// score_export_import.js - Handles score export/import functionality

document.addEventListener("DOMContentLoaded", function () {
  // Setup Export Button Event Handler
  const exportBtn = document.getElementById("exportScores");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      const assignmentId = new URLSearchParams(window.location.search).get(
        "assignment_id"
      );

      if (assignmentId) {
        // Single class export
        handleSingleExport(assignmentId);
      } else {
        // Show multi-class export options
        showMultiExportDialog();
      }
    });
  }

  function handleSingleExport(assignmentId) {
    // Show loading state with SweetAlert
    Swal.fire({
      title: "Preparing Export",
      html: "Creating Excel file...",
      timer: 2000,
      timerProgressBar: true,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();

        // Use a more robust approach for file download
        setTimeout(() => {
          // Create an iframe for download to avoid browser popup blockers
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = `/export-scores/?assignment_id=${assignmentId}`;
          document.body.appendChild(iframe);

          // Set a timeout to remove the iframe after download starts
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 5000);
        }, 500);
      },
      didClose: () => {
        // Show success message after timer
        Swal.fire({
          icon: "success",
          title: "Export Complete",
          text: "Your file should begin downloading. If not, please check your browser settings.",
          timer: 3000,
          timerProgressBar: true,
        });
      }
    });
  }

  function showMultiExportDialog() {
    // Show loading state while fetching data
    Swal.fire({
      title: "Loading Classes",
      html: "Fetching your class assignments...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Fetch the teacher's assignments
    fetch("/api/teacher-assignments/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": getCookie("csrftoken"),
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        Swal.close();

        // Debug logging
        console.log("API Response:", data);

        // Check if the API returned an error
        if (!data.success) {
          console.error("API Error:", data.error);
          Swal.fire({
            icon: "error",
            title: "Error Loading Classes",
            text: data.error || "Could not load your class assignments. Please try again or contact support if the problem persists.",
          });
          return;
        }

        if (!data.assignments || data.assignments.length === 0) {
          console.log("No assignments found");
          Swal.fire({
            icon: "info",
            title: "No Classes Found",
            text: "You don't have any classes assigned to you for the current academic year.",
          });
          return;
        }

        console.log("Assignments found:", data.assignments.length);
        console.log("First assignment:", data.assignments[0]);

        // Group assignments by class
        const classesByForm = {};
        data.assignments.forEach((assignment) => {
          console.log("Processing assignment:", assignment);
          const className = assignment.class_name;
          if (!classesByForm[className]) {
            classesByForm[className] = [];
          }
          classesByForm[className].push(assignment);
        });

        // Create HTML for the multi-select dialog
        let html = `<div class="text-start">
          <p>Select the classes you want to export:</p>
          <div style="max-height: 300px; overflow-y: auto;">`;

        // Add classes grouped by class name
        Object.keys(classesByForm).forEach((className) => {
          html += `<h6 class="mt-3">${className}</h6>`;
          classesByForm[className].forEach((assignment) => {
            html += `
              <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${assignment.id}" id="assignment_${assignment.id}">
                <label class="form-check-label" for="assignment_${assignment.id}">
                  ${assignment.class_name} - ${assignment.subject}
                </label>
              </div>`;
          });
        });

        html += `</div></div>`;

        // Show the multi-select dialog
        Swal.fire({
          title: "Export Multiple Classes",
          html: html,
          showCancelButton: true,
          confirmButtonText: "Export Selected",
          cancelButtonText: "Cancel",
          preConfirm: () => {
            const selectedIds = [];
            document.querySelectorAll(".form-check-input:checked").forEach((checkbox) => {
              selectedIds.push(checkbox.value);
            });

            if (selectedIds.length === 0) {
              Swal.showValidationMessage("Please select at least one class");
              return false;
            }

            return selectedIds;
          },
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            // Show loading state
            Swal.fire({
              title: "Preparing Multi-Class Export",
              html: "Creating Excel file with multiple sheets...",
              timer: 3000,
              timerProgressBar: true,
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();

                // Use iframe for more reliable download
                setTimeout(() => {
                  // Create an iframe for download to avoid browser popup blockers
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  iframe.src = `/export-scores-batch/?assignment_ids=${result.value.join(",")}`;
                  document.body.appendChild(iframe);

                  // Set a timeout to remove the iframe after download starts
                  setTimeout(() => {
                    document.body.removeChild(iframe);
                  }, 5000);
                }, 500);
              },
              didClose: () => {
                // Show success message after timer
                Swal.fire({
                  icon: "success",
                  title: "Export Complete",
                  text: "Your file should begin downloading. If not, please check your browser settings.",
                  timer: 3000,
                  timerProgressBar: true,
                });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("Error fetching assignments:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        Swal.fire({
          icon: "error",
          title: "Error Loading Classes",
          text: "Could not load your class assignments. Please try again or contact support if the problem persists.",
        });
      });
  }

  // Setup Import Button and File Input
  const importBtn = document.getElementById("importScores");
  const fileInput = document.getElementById("scoreFile");
  const uploadForm = document.getElementById("uploadForm");

  if (importBtn && fileInput && uploadForm) {
    // Ensure the import button is visible
    importBtn.style.display = "inline-block";

    // Clear previous click handlers
    const clonedImportBtn = importBtn.cloneNode(true);
    importBtn.parentNode.replaceChild(clonedImportBtn, importBtn);

    // Show upload form when import button is clicked
    clonedImportBtn.addEventListener("click", function (e) {
      e.preventDefault();

      const assignmentId = new URLSearchParams(window.location.search).get(
        "assignment_id"
      );

      // Check if a class is selected to determine the default import mode
      if (assignmentId) {
        // If class is selected, default to single class import
        Swal.fire({
          title: "Import Scores",
          html: "Choose import type:",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Single Class",
          cancelButtonText: "Multiple Classes",
          showCloseButton: true,
          cancelButtonColor: "#3085d6",
        }).then((result) => {
          if (result.isConfirmed) {
            // Single class import
            Swal.fire({
              title: 'Import Scores for This Class',
              html: `
                <div class="text-start mb-3">
                  <p>Upload an Excel file with scores for this class.</p>
                  <p class="text-muted small">The file should be in the same format as the exported file.</p>
                  <div class="mb-3">
                    <input type="file" class="form-control" id="singleImportFile" accept=".xlsx,.xls">
                  </div>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: "Upload",
              cancelButtonText: "Cancel",
              preConfirm: () => {
                const file = document.getElementById("singleImportFile").files[0];
                if (!file) {
                  Swal.showValidationMessage("Please select a file");
                  return false;
                }
                return file;
              },
            }).then((result) => {
              if (result.isConfirmed && result.value) {
                const file = result.value;
                uploadSingleFile(file, assignmentId);
              }
            });
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Multiple class import
            showBatchImportDialog();
          }
        });
      } else {
        // If no class is selected, go straight to batch import
        showBatchImportDialog();
      }
    });

    function showBatchImportDialog() {
      Swal.fire({
        title: "Import Multiple Classes",
        html: `
          <div class="text-start mb-3">
            <p>Upload a batch file containing scores for multiple classes.</p>
            <p class="text-muted small">The file should be an Excel workbook with separate sheets for each class.</p>
            <div class="mb-3">
              <input type="file" class="form-control" id="batchImportFile" accept=".xlsx,.xls">
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Upload",
        cancelButtonText: "Cancel",
        preConfirm: () => {
          const file = document.getElementById("batchImportFile").files[0];
          if (!file) {
            Swal.showValidationMessage("Please select a file");
            return false;
          }
          return file;
        },
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          const file = result.value;
          uploadBatchFile(file);
        }
      });
    }

    // Handle file upload for batch import
    function uploadBatchFile(file) {
      // Show progress
      Swal.fire({
        title: "Uploading...",
        html: `
          <div class="progress mb-3">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
          </div>
          <div id="upload-status">Preparing upload...</div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          const progressBar = Swal.getPopup().querySelector(".progress-bar");
          const statusText = Swal.getPopup().querySelector("#upload-status");

          // Create FormData
          const formData = new FormData();
          formData.append("batchFile", file);
          formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

          // Create XHR
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              progressBar.style.width = percentComplete + "%";
              statusText.textContent = `Uploading: ${Math.round(percentComplete)}%`;
            }
          });

          xhr.addEventListener("load", () => {
            progressBar.style.width = "100%";
            statusText.textContent = "Processing...";

            try {
              const response = JSON.parse(xhr.responseText);

              if (response.success) {
                Swal.fire({
                  icon: "success",
                  title: "Import Successful",
                  html: `
                    <div class="text-start">
                      <p>Successfully imported scores for ${response.results.length} classes:</p>
                      <ul>
                        ${response.results.map(r => `<li>${r.class_name} - ${r.subject_name}: ${r.processed} students</li>`).join('')}
                      </ul>
                      ${response.errors && response.errors.length ?
                      `<p class="text-warning">With ${response.errors.length} warnings:</p>
                        <ul class="text-warning">
                          ${response.errors.slice(0, 5).map(err => `<li>${err}</li>`).join('')}
                          ${response.errors.length > 5 ? `<li>...and ${response.errors.length - 5} more</li>` : ''}
                        </ul>` : ''}
                    </div>
                  `,
                }).then(() => {
                  // Reload the page if a class is selected
                  const assignmentId = new URLSearchParams(window.location.search).get("assignment_id");
                  if (assignmentId) {
                    window.location.reload();
                  }
                });
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Import Failed",
                  html: `
                    <div class="text-start">
                      <p>${response.error || "An error occurred during import."}</p>
                      ${response.errors && response.errors.length ?
                      `<p>Details:</p>
                        <ul class="text-danger">
                          ${response.errors.map(err => `<li>${err}</li>`).join('')}
                        </ul>` : ''}
                    </div>
                  `,
                });
              }
            } catch (e) {
              console.error("Error parsing response:", e);
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Could not process server response. Please try again.",
              });
            }
          });

          xhr.addEventListener("error", () => {
            Swal.fire({
              icon: "error",
              title: "Upload Failed",
              text: "A network error occurred. Please try again.",
            });
          });

          xhr.open("POST", "/import-scores-batch/", true);
          xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
          xhr.send(formData);
        }
      });
    }

    // Handle file upload for single class import
    function uploadSingleFile(file, assignmentId) {
      // Show progress
      Swal.fire({
        title: "Uploading...",
        html: `
          <div class="progress mb-3">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
          </div>
          <div id="upload-status">Preparing upload...</div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          const progressBar = Swal.getPopup().querySelector(".progress-bar");
          const statusText = Swal.getPopup().querySelector("#upload-status");

          // Create FormData
          const formData = new FormData();
          formData.append("file", file);
          formData.append("assignment_id", assignmentId);
          formData.append("csrfmiddlewaretoken", getCookie("csrftoken"));

          // Create XHR
          const xhr = new XMLHttpRequest();

          // Track upload progress
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              progressBar.style.width = percentComplete + "%";
              statusText.textContent = `Uploading: ${Math.round(percentComplete)}%`;
            }
          });

          xhr.addEventListener("load", () => {
            progressBar.style.width = "100%";
            statusText.textContent = "Processing...";

            try {
              // Try to parse JSON response
              let response;
              try {
                response = JSON.parse(xhr.responseText);
              } catch (e) {
                // If not JSON, it might be an HTML response (e.g., redirect)
                if (xhr.status >= 200 && xhr.status < 300) {
                  Swal.fire({
                    icon: "success",
                    title: "Import Successful",
                    text: "Scores were imported successfully.",
                  }).then(() => {
                    window.location.reload();
                  });
                  return;
                } else {
                  throw new Error("Unexpected response format");
                }
              }

              // Handle JSON response
              if (response.success) {
                Swal.fire({
                  icon: "success",
                  title: "Import Successful",
                  html: `Successfully processed ${response.updated || 'all'} student records`,
                }).then(() => {
                  window.location.reload();
                });
              } else {
                // Show error details
                let errorDetails = "";
                if (response.error_messages && response.error_messages.length) {
                  errorDetails = `
                    <div class="mt-3 text-start">
                      <strong>Details:</strong>
                      <ul class="text-danger">
                        ${response.error_messages.map((err) => `<li>${err}</li>`).join("")}
                      </ul>
                    </div>
                  `;
                }

                Swal.fire({
                  icon: "error",
                  title: "Import Failed",
                  html: `${response.message || "Error importing file"}${errorDetails}`,
                });
              }
            } catch (e) {
              console.error("Error handling response:", e);
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Could not process server response. Please try again.",
              });
            }
          });

          xhr.addEventListener("error", () => {
            Swal.fire({
              icon: "error",
              title: "Upload Failed",
              text: "A network error occurred. Please try again.",
            });
          });

          xhr.open("POST", "/import-scores/", true);
          xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
          xhr.send(formData);
        }
      });
    }
  }

  // Add export template instructions
  const exportInstructions = document.getElementById("exportInstructions");
  if (exportInstructions) {
    exportInstructions.innerHTML = `
      <div class="alert alert-info mt-3">
        <h6 class="mb-2"><i class="bi bi-info-circle me-2"></i>How to use exported files</h6>
        <ol class="mb-0 ps-3">
          <li>Open the Excel file and enter/edit scores in the <strong>Class Score</strong> and <strong>Exam Score</strong> columns.</li>
          <li>The total score, grade, and remarks will be calculated automatically.</li>
          <li>Save the file without changing its structure or format.</li>
          <li>Use the Import button to upload the updated file.</li>
        </ol>
      </div>
    `;
  }

  // Handle form submission for individual file upload
  if (uploadForm) {
    uploadForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const assignmentId = new URLSearchParams(window.location.search).get(
        "assignment_id"
      );

      if (!assignmentId) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No class selected. Please select a class first.",
        });
        return;
      }

      if (!fileInput.files.length) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Please select a file to upload.",
        });
        return;
      }

      uploadSingleFile(fileInput.files[0], assignmentId);
    });
  }

  // Tooltip for batch actions
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});

// Function to get CSRF token
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
