# Teacher Functionality Requirements

Based on the models.py file, here's a comprehensive list of functionality, templates, URLs, and views needed for teachers:

## ✅ ALREADY IMPLEMENTED

1. **Quiz Management**
   - Quiz list view
   - Quiz create/edit/delete
   - Quiz detail view
   - Quiz status update

## ❌ MISSING FUNCTIONALITY

### 1. **Question Management** (CRITICAL - Highest Priority)

Teachers need to create, edit, and manage questions for their quizzes.

**Views Needed:**

- `question_list_view` - List all questions for a quiz
- `question_create_view` - Create new question (GET: modal form, POST: save)
- `question_edit_view` - Edit existing question
- `question_delete_view` - Delete question
- `question_reorder_view` - Reorder questions (drag & drop or up/down buttons)
- `question_bulk_import_view` - Import questions from CSV/Excel
- `question_duplicate_view` - Duplicate a question

**Templates Needed:**

- `quiz/question/question_list.html` - Question management page (can be part of quiz detail)
- `quiz/question/partials/question_form.html` - Question create/edit form modal
- `quiz/question/partials/question_preview.html` - Preview question
- `quiz/question/partials/bulk_import_modal.html` - Bulk import modal

**URLs Needed:**

```
quizzes/<int:quiz_id>/questions/ - List questions
quizzes/<int:quiz_id>/questions/create/ - Create question
quizzes/<int:quiz_id>/questions/<int:question_id>/edit/ - Edit question
quizzes/<int:quiz_id>/questions/<int:question_id>/delete/ - Delete question
quizzes/<int:quiz_id>/questions/<int:question_id>/duplicate/ - Duplicate question
quizzes/<int:quiz_id>/questions/reorder/ - Reorder questions
quizzes/<int:quiz_id>/questions/bulk-import/ - Bulk import
```

**JavaScript Needed:**

- `static/js/question_management.js` - Handle question CRUD operations
- Question type switching (multiple choice, true/false, short answer, essay, etc.)
- Dynamic answer choice management
- Question reordering functionality

---

### 2. **Answer Choice Management** (CRITICAL - For Multiple Choice Questions)

Teachers need to manage answer choices for multiple choice and true/false questions.

**Views Needed:**

- `answer_choice_create_view` - Add answer choice to question
- `answer_choice_edit_view` - Edit answer choice
- `answer_choice_delete_view` - Delete answer choice
- `answer_choice_reorder_view` - Reorder answer choices

**Templates Needed:**

- `quiz/question/partials/answer_choice_form.html` - Answer choice form
- Answer choices can be managed inline in question form

**URLs Needed:**

```
questions/<int:question_id>/choices/create/ - Add choice
questions/<int:question_id>/choices/<int:choice_id>/edit/ - Edit choice
questions/<int:question_id>/choices/<int:choice_id>/delete/ - Delete choice
questions/<int:question_id>/choices/reorder/ - Reorder choices
```

---

### 3. **Quiz Attempts/Results Management** (HIGH Priority)

Teachers need to view and manage student quiz attempts.

**Views Needed:**

- `quiz_attempts_list_view` - List all attempts for a quiz
- `quiz_attempt_detail_view` - View detailed attempt with responses
- `quiz_attempt_delete_view` - Delete attempt (if needed)
- `quiz_attempts_export_view` - Export attempts to CSV/Excel
- `quiz_attempts_bulk_delete_view` - Bulk delete attempts

**Templates Needed:**

- `quiz/attempts/attempt_list.html` - List of all attempts
- `quiz/attempts/attempt_detail.html` - Detailed attempt view
- `quiz/attempts/partials/attempt_filters.html` - Filter attempts
- `quiz/attempts/partials/export_modal.html` - Export modal

**URLs Needed:**

```
quizzes/<int:quiz_id>/attempts/ - List attempts
quizzes/<int:quiz_id>/attempts/<int:attempt_id>/ - View attempt detail
quizzes/<int:quiz_id>/attempts/<int:attempt_id>/delete/ - Delete attempt
quizzes/<int:quiz_id>/attempts/export/ - Export attempts
quizzes/<int:quiz_id>/attempts/bulk-delete/ - Bulk delete
```

---

### 4. **Grading Interface** (HIGH Priority)

Teachers need to grade essay questions and review student responses.

**Views Needed:**

- `grading_list_view` - List all responses needing grading
- `grading_detail_view` - Grade individual response
- `grading_bulk_view` - Grade multiple responses at once
- `response_grade_view` - Grade a specific response (AJAX)

**Templates Needed:**

- `quiz/grading/grading_list.html` - List of ungraded responses
- `quiz/grading/grading_detail.html` - Grading interface
- `quiz/grading/partials/grade_form.html` - Grade form modal

**URLs Needed:**

```
quizzes/<int:quiz_id>/grading/ - List ungraded responses
quizzes/<int:quiz_id>/grading/<int:response_id>/ - Grade response
quizzes/<int:quiz_id>/grading/bulk/ - Bulk grading
responses/<int:response_id>/grade/ - Grade response (AJAX)
```

---

### 5. **Quiz Analytics Dashboard** (MEDIUM Priority)

Teachers need to view analytics and statistics for their quizzes.

**Views Needed:**

- `quiz_analytics_view` - View comprehensive analytics
- `quiz_analytics_refresh_view` - Refresh/calculate analytics (AJAX)
- `quiz_performance_view` - Performance breakdown by question/student

**Templates Needed:**

- `quiz/analytics/analytics_dashboard.html` - Analytics dashboard
- `quiz/analytics/partials/analytics_charts.html` - Charts component
- `quiz/analytics/partials/performance_table.html` - Performance table

**URLs Needed:**

```
quizzes/<int:quiz_id>/analytics/ - View analytics
quizzes/<int:quiz_id>/analytics/refresh/ - Refresh analytics
quizzes/<int:quiz_id>/performance/ - Performance breakdown
```

---

### 6. **Quiz Preview** (MEDIUM Priority)

Teachers should be able to preview their quiz before publishing.

**Views Needed:**

- `quiz_preview_view` - Preview quiz as students would see it
- `quiz_preview_attempt_view` - Preview with attempt simulation

**Templates Needed:**

- `quiz/preview/quiz_preview.html` - Preview interface
- `quiz/preview/partials/question_preview.html` - Question preview

**URLs Needed:**

```
quizzes/<int:quiz_id>/preview/ - Preview quiz
quizzes/<int:quiz_id>/preview/attempt/ - Preview with attempt
```

---

### 7. **Quiz Category Management** (LOW Priority - Can be admin only)

If teachers should manage their own categories:

**Views Needed:**

- `quiz_category_list_view` - List categories
- `quiz_category_create_view` - Create category
- `quiz_category_edit_view` - Edit category
- `quiz_category_delete_view` - Delete category

**Templates Needed:**

- `quiz/category/category_list.html`
- `quiz/category/partials/category_form.html`

**URLs Needed:**

```
quiz-categories/ - List categories
quiz-categories/create/ - Create category
quiz-categories/<int:category_id>/edit/ - Edit category
quiz-categories/<int:category_id>/delete/ - Delete category
```

---

### 8. **Enhanced Teacher Dashboard** (MEDIUM Priority)

Update teacher dashboard with quiz-related statistics.

**Views Needed:**

- Update `teacher_dashboard_view` to include:
  - Total quizzes created
  - Published vs Draft quizzes
  - Total attempts received
  - Quizzes needing grading
  - Recent quiz activity

**Templates Needed:**

- Update `dashboard/teacher_dashboard.html` with statistics cards

---

## IMPLEMENTATION PRIORITY ORDER

### Phase 1 (CRITICAL - Must Have)

1. ✅ Quiz Management (DONE)
2. ❌ Question Management (NEXT)
3. ❌ Answer Choice Management

### Phase 2 (HIGH - Important)

4. ❌ Quiz Attempts/Results Viewing
5. ❌ Grading Interface

### Phase 3 (MEDIUM - Nice to Have)

6. ❌ Quiz Analytics Dashboard
7. ❌ Quiz Preview
8. ❌ Enhanced Teacher Dashboard

### Phase 4 (LOW - Optional)

9. ❌ Quiz Category Management (if teachers need it)

---

## ADDITIONAL FEATURES TO CONSIDER

1. **Question Bank** - Reusable questions that can be added to multiple quizzes
2. **Question Templates** - Pre-made question templates
3. **Bulk Question Operations** - Copy/move questions between quizzes
4. **Quiz Duplication** - Duplicate entire quiz with or without questions
5. **Quiz Sharing** - Share quiz with other teachers
6. **Student Feedback** - View and respond to student feedback on quizzes
7. **Quiz Reports** - Generate PDF reports of quiz results
8. **Email Notifications** - Notify students when quiz is published
9. **Quiz Scheduling** - Schedule quizzes to be published automatically
10. **Question Randomization Preview** - Preview how randomized quiz looks

---

## NOTES

- All views should check `request.user.role == "teacher"` and verify ownership
- Use modal forms for create/edit operations (consistent with existing design)
- Implement DataTables for list views (consistent with existing design)
- Use AJAX for dynamic operations (answer choices, reordering, etc.)
- Follow the same design patterns as existing teacher assignment management
