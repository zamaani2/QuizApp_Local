# Superadmin Administrator Management Guide

## Overview

Superadmins can now manage school administrators across all schools. This allows superadmins to create, view, edit, and delete school administrators for any school in the system.

---

## Features

### 1. List All School Administrators

- **URL**: `/superadmin/admins/`
- **URL Name**: `superadmin_admin_list`
- **Access**: Superadmin only
- **Features**:
  - View all school administrators across all schools
  - Search by name, username, email, or school
  - Filter by school
  - Filter by active/inactive status
  - See which school each admin belongs to

### 2. Create New School Administrator

- **URL**: `/superadmin/admins/create/`
- **URL Name**: `superadmin_admin_create`
- **Access**: Superadmin only
- **Features**:
  - Create new administrator for any school
  - Assign administrator to specific school
  - Set username, email, full name
  - Set password (default: 0000 if blank)
  - All fields validated

### 3. Edit School Administrator

- **URL**: `/superadmin/admins/<admin_id>/edit/`
- **URL Name**: `superadmin_admin_edit`
- **Access**: Superadmin only
- **Features**:
  - Edit administrator details
  - Change assigned school
  - Update email and full name
  - Change password (optional)
  - Activate/deactivate account
  - Username cannot be changed

### 4. View Administrator Details

- **URL**: `/superadmin/admins/<admin_id>/`
- **URL Name**: `superadmin_admin_detail`
- **Access**: Superadmin only
- **Features**:
  - View complete administrator information
  - See assigned school details
  - View login activity
  - Last login information

### 5. Delete School Administrator

- **URL**: `/superadmin/admins/<admin_id>/delete/`
- **URL Name**: `superadmin_admin_delete`
- **Access**: Superadmin only
- **Features**:
  - Delete administrator account
  - Cannot delete own account
  - Confirmation required

---

## Usage Instructions

### Accessing Administrator Management

1. **From Dashboard**: Click "Manage Administrators" button
2. **Direct URL**: Navigate to `/superadmin/admins/`
3. **From Schools**: When viewing a school, you can see its administrators

### Creating a New Administrator

1. Go to `/superadmin/admins/`
2. Click "Add Administrator" button
3. Fill in the form:
   - **Username**: Unique username (required)
   - **Email**: Valid email address (required)
   - **Full Name**: Administrator's full name (required)
   - **School**: Select school from dropdown (required)
   - **Password**: Leave blank for default "0000" or enter custom password
4. Click "Create Administrator"
5. Administrator will be created and can immediately login

### Editing an Administrator

1. Go to `/superadmin/admins/`
2. Click the edit icon (pencil) next to the administrator
3. Update any fields:
   - Email
   - Full Name
   - School assignment
   - Password (optional - leave blank to keep current)
   - Active status
4. Click "Update Administrator"

### Viewing Administrator Details

1. Go to `/superadmin/admins/`
2. Click the view icon (eye) next to the administrator
3. See complete information including:
   - Basic information
   - School assignment
   - Login activity
   - Account status

### Deleting an Administrator

1. Go to `/superadmin/admins/`
2. Click the delete icon (trash) next to the administrator
3. Confirm deletion
4. Administrator account will be permanently deleted

---

## URL Reference

| URL                               | Name                      | Purpose                        |
| --------------------------------- | ------------------------- | ------------------------------ |
| `/superadmin/admins/`             | `superadmin_admin_list`   | List all school administrators |
| `/superadmin/admins/create/`      | `superadmin_admin_create` | Create new administrator       |
| `/superadmin/admins/<id>/`        | `superadmin_admin_detail` | View administrator details     |
| `/superadmin/admins/<id>/edit/`   | `superadmin_admin_edit`   | Edit administrator             |
| `/superadmin/admins/<id>/delete/` | `superadmin_admin_delete` | Delete administrator           |

---

## Form Fields

### Create/Edit Form

- **Username** (required, cannot change on edit)
  - Must be unique
  - Used for login
- **Email** (required)
  - Must be unique
  - Used for login and notifications
- **Full Name** (required)
  - Display name for the administrator
- **School** (required)
  - Select from active schools
  - Determines which school the admin manages
- **Password** (required on create, optional on edit)
  - Default: "0000" if left blank on create
  - Leave blank on edit to keep current password
- **Active Status** (edit only)
  - Checkbox to activate/deactivate account
  - Inactive admins cannot login

---

## Security Features

1. **Permission Checks**: All views check for superadmin role
2. **Self-Protection**: Cannot delete your own account
3. **School Validation**: Only active schools can be assigned
4. **Unique Constraints**: Username and email must be unique
5. **Password Security**: Passwords are hashed before storage

---

## Integration with Schools

### When Creating a School

After creating a school, you should:

1. Create at least one administrator for the school
2. Assign the administrator to the new school
3. Provide credentials to the administrator

### School-Admin Relationship

- Each administrator belongs to one school
- Administrators can only manage their assigned school
- Superadmins can reassign administrators to different schools
- Deleting a school does NOT delete its administrators (they become unassigned)

---

## Workflow Example

### Setting Up a New School

1. **Create School**: `/superadmin/schools/create/`

   - Fill in school information
   - Save school

2. **Create Administrator**: `/superadmin/admins/create/`

   - Enter admin details
   - Select the newly created school
   - Set password
   - Save administrator

3. **Provide Credentials**:

   - Share username and password with the administrator
   - Administrator can login at `/login/`

4. **Administrator Setup**:
   - Administrator logs in
   - Sets up academic years, terms
   - Creates teachers, students, classes
   - Manages their school

---

## Dashboard Integration

The superadmin dashboard shows:

- Total administrators count
- Link to manage administrators
- Quick access button

---

## Filtering and Search

### Search Functionality

Search by:

- Administrator full name
- Username
- Email address
- School name

### Filters

- **School Filter**: Show admins from specific school
- **Status Filter**: Show active/inactive admins
- **Combined**: Use search + filters together

---

## Error Handling

### Common Errors

1. **Username Already Exists**

   - Solution: Choose a different username

2. **Email Already Exists**

   - Solution: Use a different email address

3. **Invalid School Selected**

   - Solution: Ensure school is active

4. **Cannot Delete Own Account**
   - Solution: Have another superadmin delete it

---

## Best Practices

1. **Create Admin First**: Create administrator when creating a new school
2. **Strong Passwords**: Encourage administrators to change default password
3. **Regular Review**: Periodically review administrator list
4. **Deactivate Instead of Delete**: Deactivate inactive admins instead of deleting
5. **Document Changes**: Keep track of administrator assignments

---

## Related Features

- **School Management**: `/superadmin/schools/`
- **User Management**: Regular admins manage users within their school
- **Dashboard**: System-wide statistics

---

_Last Updated: After superadmin admin management implementation_
_System: Django Quiz Application - Multi-Tenant Architecture_





