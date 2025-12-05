# How to Add a New School to the System

## Overview

The system allows **Super Administrators (superadmins)** to add new schools to the multi-tenant system. Regular school administrators cannot create new schools - they can only manage their own school.

---

## Prerequisites

1. **User Role**: You must be logged in as a **Super Administrator** (`role="superadmin"`)
2. **Access**: Navigate to the School Management page

---

## Step-by-Step Process

### Step 1: Navigate to School Management

1. Log in as a superadmin
2. Go to **School Management** page:
   - URL: `/schools/`
   - Or click on "Schools" in the navigation menu
   - Or use the "Add School" button in the sidebar menu

### Step 2: Open the Add School Form

Click the **"Add School"** button:

- Located in the top-right corner of the School List page
- Button ID: `addSchoolBtn`
- This opens a modal dialog with the school creation form

### Step 3: Fill in School Information

The form is organized into **5 tabs**:

#### Tab 1: Basic Information (Required Fields)

**Required Fields** (marked with red asterisk \*):

- **School Name** (`name`) - Full name of the school
- **Short Name** (`short_name`) - Abbreviation (max 20 characters)
- **Address** (`address`) - Full address of the school
- **Phone Number** (`phone_number`) - Contact phone number

**Optional Fields**:

- **School Code** (`school_code`) - Official school code/ID (max 20 characters)
- **Email** (`email`) - School email address
- **Website** (`website`) - School website URL
- **Postal Code** (`postal_code`) - Postal/ZIP code (max 20 characters)

#### Tab 2: Visual Elements

- **School Logo** (`logo`) - Upload school logo image
- **School Stamp** (`school_stamp`) - Upload school stamp image

#### Tab 3: Vision & Mission

- **Motto** (`motto`) - School motto (max 200 characters)
- **Vision** (`vision`) - School vision statement (text area)
- **Mission** (`mission`) - School mission statement (text area)

#### Tab 4: Report Settings

- **Report Header** (`report_header`) - Custom header text for reports
- **Report Footer** (`report_footer`) - Custom footer text for reports
- **Grading System Description** (`grading_system_description`) - Description of grading system for reports

#### Tab 5: Academic Settings

**Note**: Academic settings can only be configured **after** the school is created. This tab shows an info message during creation.

After school creation, you can:

- Set **Current Academic Year**
- Set **Current Term**

---

## Technical Details

### View Function

**File**: `quiz_app/views/school_management.py`
**Function**: `school_create_view(request)`
**URL**: `/schools/create/`
**URL Name**: `quiz_app:school_create`

### Permission Check

```python
if request.user.role != "superadmin":
    # Permission denied - only superadmins can create schools
    return JsonResponse({'error': 'Permission denied'}, status=403)
```

### Required Fields Validation

The system validates that these fields are filled:

- `name`
- `short_name`
- `address`
- `phone_number`

### Automatic Fields

The system automatically sets:

- **Slug**: Generated from school name using `slugify(name)`
- **Created By**: Set to the current user (`request.user`)
- **Updated By**: Set to the current user (`request.user`)
- **Is Active**: Defaults to `True` (only shown in edit mode)

### School Creation Process

```python
# 1. Validate required fields
if not all([name, short_name, address, phone_number]):
    return error response

# 2. Create SchoolInformation object
school = SchoolInformation(
    name=name,
    short_name=short_name,
    address=address,
    phone_number=phone_number,
    slug=slugify(name),
    # ... other fields
    created_by=request.user,
    updated_by=request.user,
)

# 3. Handle file uploads (logo, stamp)
if 'logo' in request.FILES:
    school.logo = request.FILES['logo']
if 'school_stamp' in request.FILES:
    school.school_stamp = request.FILES['school_stamp']

# 4. Save school
school.save()
```

---

## After Creating a School

Once a school is created, you should:

1. **Create Academic Years** for the school

   - Navigate to Academic Year Management
   - Create academic years and associate them with the school

2. **Create Terms** for each academic year

   - Navigate to Term Management
   - Create terms for the academic years

3. **Set Current Academic Year and Term**

   - Edit the school
   - Go to "Academic Settings" tab
   - Select current academic year and term

4. **Create School Administrator**

   - Navigate to User Management
   - Create a user with `role="admin"`
   - Assign the new school to this user

5. **Set Up School Structure**

   - Create Forms (e.g., Form 1, Form 2, etc.)
   - Create Learning Areas
   - Create Departments
   - Create Subjects

6. **Create Classes**
   - Set up classes for the school
   - Assign subjects to classes

---

## Form Submission

### GET Request

- Returns the form HTML in a modal dialog
- Template: `quiz_app/templates/school/partials/school_form.html`

### POST Request

- Validates and creates the school
- Returns JSON response:
  ```json
  {
    "success": true,
    "message": "School [School Name] created successfully.",
    "school_id": 123
  }
  ```

### Error Handling

If validation fails:

```json
{
  "success": false,
  "error": "Please fill in all required fields."
}
```

If creation fails:

```json
{
  "success": false,
  "error": "Error creating school: [error message]"
}
```

---

## Access Control

| User Role      | Can Create Schools? | Can View Schools?  | Can Edit Schools?  |
| -------------- | ------------------- | ------------------ | ------------------ |
| **Superadmin** | ✅ Yes              | ✅ All schools     | ✅ All schools     |
| **Admin**      | ❌ No               | ✅ Own school only | ✅ Own school only |
| **Teacher**    | ❌ No               | ❌ No              | ❌ No              |
| **Student**    | ❌ No               | ❌ No              | ❌ No              |

---

## UI Components

### School List Page

- **Template**: `quiz_app/templates/school/school_list.html`
- **JavaScript**: `quiz_app/static/js/school_management.js`
- **Features**:
  - Search functionality
  - Filter by active status
  - DataTables integration
  - Modal-based form

### School Form Modal

- **Template**: `quiz_app/templates/school/partials/school_form.html`
- **Features**:
  - Tabbed interface (5 tabs)
  - File upload support
  - Form validation
  - AJAX submission

---

## Database Model

**Model**: `SchoolInformation`
**File**: `quiz_app/models.py` (lines 1072-1270)

**Key Fields**:

- `name` - CharField (max 100)
- `short_name` - CharField (max 20)
- `slug` - SlugField (unique, auto-generated)
- `address` - TextField
- `phone_number` - CharField (max 20)
- `school_code` - CharField (max 20, optional)
- `logo` - ImageField (optional)
- `school_stamp` - ImageField (optional)
- `is_active` - BooleanField (default=True)
- `created_by` - ForeignKey to User
- `updated_by` - ForeignKey to User

---

## Troubleshooting

### Issue: "Permission denied" error

**Solution**: Ensure you are logged in as a superadmin user.

### Issue: "Please fill in all required fields"

**Solution**: Check that all required fields (name, short_name, address, phone_number) are filled.

### Issue: Slug already exists

**Solution**: The system auto-generates slug from name. If duplicate, the school name might be too similar to an existing one. Try a more unique name.

### Issue: File upload fails

**Solution**:

- Check file size limits
- Ensure file is an image (for logo/stamp)
- Check media directory permissions

---

## Related Files

- **View**: `quiz_app/views/school_management.py` (line 290-364)
- **URL**: `quiz_app/urls.py` (line 238)
- **Template**: `quiz_app/templates/school/partials/school_form.html`
- **List Template**: `quiz_app/templates/school/school_list.html`
- **JavaScript**: `quiz_app/static/js/school_management.js`
- **Model**: `quiz_app/models.py` (SchoolInformation class)

---

## Summary

To add a new school:

1. ✅ Be logged in as **superadmin**
2. ✅ Navigate to `/schools/`
3. ✅ Click **"Add School"** button
4. ✅ Fill in required fields (name, short_name, address, phone_number)
5. ✅ Optionally fill in other tabs (visual, vision, reports)
6. ✅ Click **"Create School"**
7. ✅ Configure academic settings after creation
8. ✅ Create admin user for the new school

---

_Last Updated: Based on codebase analysis_
_System: Django Quiz Application - Multi-Tenant Architecture_
