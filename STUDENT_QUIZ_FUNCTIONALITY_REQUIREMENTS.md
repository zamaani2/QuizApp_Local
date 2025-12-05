# Student Quiz Functionality Requirements

## Overview

This document outlines all the quiz-related functionalities that need to be implemented for students in the Quiz Management System.

---

## 1. **Available Quizzes List** 📋

**Purpose**: Display all quizzes assigned to the student's class that are available for taking.

### Features:

- List quizzes assigned to student's current class
- Filter by:
  - Subject
  - Academic Year
  - Term
  - Status (Available, Completed, Expired)
- Show quiz information:
  - Title, Subject, Teacher
  - Total Questions, Total Marks
  - Time Limit (if any)
  - Available From/Until dates
  - Max Attempts allowed
  - Current attempt count
  - Status badges (Available, In Progress, Completed, Expired)
- Search functionality
- Quick actions:
  - Start Quiz (if available)
  - View Details
  - View Previous Attempts

### Views Needed:

- `student_quiz_list_view` - Main list page

### Templates:

- `quiz/student/quiz_list.html`
- `quiz/student/partials/quiz_card.html` (optional)

### URLs:

- `quizzes/available/` → `student_quiz_list_view`

---

## 2. **Quiz Detail/Preview** 👁️

**Purpose**: Show detailed information about a quiz before starting.

### Features:

- Display quiz information:
  - Title, Description, Instructions
  - Subject, Teacher, Category
  - Total Questions, Total Marks
  - Time Limit
  - Available From/Until
  - Max Attempts
  - Difficulty Level
  - Password requirement (if any)
- Show student's attempt history:
  - Previous attempts with scores
  - Best score achieved
  - Remaining attempts
- Action buttons:
  - Start Quiz (if available)
  - View Previous Attempts
  - Back to List

### Views Needed:

- `student_quiz_detail_view` - Preview quiz details

### Templates:

- `quiz/student/quiz_detail.html`

### URLs:

- `quizzes/<int:quiz_id>/preview/` → `student_quiz_detail_view`

---

## 3. **Start Quiz** 🚀

**Purpose**: Initialize a quiz attempt and redirect to the quiz-taking interface.

### Features:

- Validate quiz availability:
  - Check if quiz is published and active
  - Check availability dates
  - Check max attempts limit
  - Check if student is in assigned class
  - Verify password (if required)
- Create QuizAttempt record:
  - Set attempt_number
  - Set started_at timestamp
  - Set academic_year and term
  - Set total_questions
  - Initialize score to 0
- Redirect to quiz-taking interface

### Views Needed:

- `student_quiz_start_view` - Handle quiz start (POST)

### Templates:

- None (redirects to take quiz page)

### URLs:

- `quizzes/<int:quiz_id>/start/` → `student_quiz_start_view`

---

## 4. **Take Quiz** ✍️

**Purpose**: The main interface where students answer quiz questions.

### Features:

- Display quiz information header:
  - Quiz title
  - Timer (if time limit exists)
  - Progress indicator (X of Y questions answered)
  - Save/Submit buttons
- Question navigation:
  - Question list/sidebar with status indicators:
    - Answered (green)
    - Unanswered (gray)
    - Current (highlighted)
  - Previous/Next buttons
  - Jump to question by number
- Question display:
  - Show question text, marks, question type
  - Display appropriate input based on question type:
    - **Multiple Choice**: Radio buttons
    - **True/False**: Radio buttons (True/False)
    - **Short Answer**: Text input
    - **Fill in the Blank**: Text input with blanks
    - **Essay**: Large textarea
  - Show question number and total
- Auto-save functionality:
  - Periodically save answers (every 30 seconds or on answer change)
  - Show "Saving..." indicator
  - Handle network errors gracefully
- Manual save:
  - "Save Progress" button
  - Confirmation message
- Timer functionality:
  - Countdown timer (if time limit exists)
  - Warning when time is running low
  - Auto-submit when time expires
  - Prevent submission after time expires
- Form validation:
  - Ensure all required questions are answered (if required)
  - Show validation errors
- Submit quiz:
  - Confirmation dialog
  - Final validation
  - Submit and redirect to results

### Views Needed:

- `student_quiz_take_view` - Display quiz-taking interface (GET)
- `student_quiz_save_view` - Save quiz progress (POST/AJAX)
- `student_quiz_submit_view` - Submit quiz attempt (POST)

### Templates:

- `quiz/student/quiz_take.html`
- `quiz/student/partials/question_form.html` (for each question type)

### URLs:

- `quizzes/attempts/<int:attempt_id>/take/` → `student_quiz_take_view`
- `quizzes/attempts/<int:attempt_id>/save/` → `student_quiz_save_view`
- `quizzes/attempts/<int:attempt_id>/submit/` → `student_quiz_submit_view`

### JavaScript:

- `quiz_taking.js` - Handle timer, auto-save, navigation, form submission

---

## 5. **Quiz Results/My Attempts** 📊

**Purpose**: Display all quiz attempts made by the student.

### Features:

- List all quiz attempts:
  - Quiz title, Subject, Teacher
  - Attempt number
  - Score and Percentage
  - Status (Completed, In Progress, Grading Pending)
  - Submitted date
  - Time taken
- Filter by:
  - Quiz
  - Subject
  - Academic Year
  - Term
  - Status
- Search functionality
- Show best attempt indicator
- Statistics:
  - Total attempts
  - Average score
  - Best score
- Actions:
  - View Details
  - Print Result
  - Retake Quiz (if allowed)

### Views Needed:

- `student_quiz_attempts_view` - List all attempts

### Templates:

- `quiz/student/attempts_list.html`

### URLs:

- `quizzes/my-attempts/` → `student_quiz_attempts_view`

---

## 6. **Quiz Result Detail** 📄

**Purpose**: Show detailed results of a specific quiz attempt.

### Features:

- Display attempt information:
  - Quiz title, Subject, Teacher
  - Student name, Admission number
  - Attempt number
  - Score breakdown (X/Y marks, Z%)
  - Time taken
  - Submitted date
  - Status (Completed, Grading Pending)
- Show all questions with:
  - Question text, type, marks
  - Student's answer
  - Correct answer (if applicable)
  - Marks awarded
  - Feedback/Notes (if provided by teacher)
  - Visual indicators:
    - ✅ Correct answer
    - ❌ Wrong answer
    - ⏳ Pending grading (for essay questions)
- Statistics:
  - Total questions
  - Correct answers
  - Wrong answers
  - Unanswered
  - Percentage score
- Actions:
  - Print Result
  - Back to My Attempts
  - Retake Quiz (if allowed)

### Views Needed:

- `student_quiz_result_detail_view` - Show detailed results

### Templates:

- `quiz/student/result_detail.html`

### URLs:

- `quizzes/attempts/<int:attempt_id>/result/` → `student_quiz_result_detail_view`

---

## 7. **Print Result** 🖨️

**Purpose**: Print-friendly version of quiz results.

### Features:

- Same information as result detail
- Optimized for printing:
  - No navigation elements
  - Clean layout
  - School branding/header
  - Footer with print date
- Print-specific CSS

### Views Needed:

- `student_quiz_result_print_view` - Print-friendly results

### Templates:

- `quiz/student/result_print.html`

### URLs:

- `quizzes/attempts/<int:attempt_id>/print/` → `student_quiz_result_print_view`

---

## 8. **Resume Quiz** 🔄

**Purpose**: Allow students to resume an in-progress quiz attempt.

### Features:

- Detect in-progress attempts
- Show resume option in quiz list
- Restore previous answers
- Continue from where they left off
- Respect time limits (if applicable)

### Views Needed:

- Reuse `student_quiz_take_view` - Check for existing attempt

### Templates:

- Reuse `quiz/student/quiz_take.html`

### URLs:

- Reuse `quizzes/attempts/<int:attempt_id>/take/`

---

## 9. **Student Dashboard Updates** 🏠

**Purpose**: Enhance student dashboard with quiz-related information.

### Features:

- Statistics cards:
  - Total Quizzes Available
  - Quizzes Completed
  - Quizzes In Progress
  - Average Score
  - Best Score
- Recent activity:
  - Recent quiz attempts
  - Upcoming quizzes (available soon)
  - Quizzes due soon
- Quick links:
  - View Available Quizzes
  - View My Results
  - Continue In-Progress Quiz

### Views Needed:

- Update `student_dashboard_view` - Add quiz statistics

### Templates:

- Update `dashboard/student_dashboard.html`

---

## 10. **Menu Integration** 📱

**Purpose**: Add quiz-related links to student sidebar menu.

### Menu Items:

- **Available Quizzes** → `student_quiz_list_view`
- **My Results** → `student_quiz_attempts_view`

### Files to Update:

- `templates/partials/_menu_items.html`

---

## Technical Requirements

### Models Used:

- `Quiz` - Quiz information
- `Question` - Quiz questions
- `AnswerChoice` - Answer options
- `QuizAttempt` - Student attempts
- `QuizResponse` - Individual answers
- `Student` - Student information
- `Class` - Class assignments
- `ClassSubject` - Subject-class relationships

### Key Validations:

1. **Quiz Availability**:

   - Quiz must be published and active
   - Current time must be within available_from and available_until
   - Student must not exceed max_attempts
   - Student must be in assigned class

2. **Time Limits**:

   - Enforce time limits on frontend and backend
   - Auto-submit when time expires
   - Prevent submission after expiration

3. **Answer Validation**:

   - Validate answer format based on question type
   - Ensure required questions are answered (if applicable)

4. **Security**:
   - Ensure students can only access their own attempts
   - Prevent tampering with quiz data
   - Validate attempt ownership

### JavaScript Requirements:

- Timer countdown functionality
- Auto-save with debouncing
- Form validation
- Question navigation
- Progress tracking
- AJAX for saving/submitting

### CSS Requirements:

- Responsive design for mobile devices
- Print-friendly styles
- Timer warning styles
- Progress indicators
- Question status indicators

---

## Implementation Priority

### Phase 1 (Core Functionality):

1. Available Quizzes List
2. Start Quiz
3. Take Quiz (basic)
4. Submit Quiz
5. My Results/Attempts List

### Phase 2 (Enhanced Features):

6. Quiz Detail/Preview
7. Quiz Result Detail
8. Resume Quiz
9. Auto-save functionality

### Phase 3 (Polish):

10. Print Result
11. Student Dashboard Updates
12. Advanced filtering and search
13. Statistics and analytics

---

## File Structure

```
quiz_app/
├── views/
│   └── student_quiz_management.py  # All student quiz views
├── templates/
│   └── quiz/
│       └── student/
│           ├── quiz_list.html
│           ├── quiz_detail.html
│           ├── quiz_take.html
│           ├── attempts_list.html
│           ├── result_detail.html
│           ├── result_print.html
│           └── partials/
│               └── question_form.html
└── static/
    └── js/
        └── quiz_taking.js
```

---

## Notes

- All views must check `request.user.role == 'student'`
- Filter all data by `request.user.school` for multi-tenancy
- Use `request.user.student_profile` to get student instance
- Ensure consistent design with existing system
- Use Bootstrap 5 components
- Use SweetAlert2 for confirmations
- Use DataTables for list views (optional)
- Implement proper error handling and user feedback
