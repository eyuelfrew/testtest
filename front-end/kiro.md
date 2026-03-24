You are tasked with building a React page for managing and previewing a dynamic form. The page must allow an admin to edit a form schema (fields, options, validation, dependencies) and instantly see a live preview of how the form will behave for end users.

Tech Stack
React (functional components, hooks)

Tailwind CSS (or your preferred styling, but keep it clean)

Axios for API calls

React Hook Form (optional but recommended for preview)

Context & Data
The backend (already built) provides a form schema in the following structure (similar to the example):

json
{
  "status": "ok",
  "fields": [
    {
      "name": "attr_176_type",
      "pos": 1,
      "label": "Type",
      "input_type": "single_select",
      "validation": [ { "type": "DataRequired", "error_message": "This field is required." } ],
      "possible_values": [ { "id": 202677, "value": "Desktop Computer" }, ... ],
      "popular_values": [ ... ],
      "parent_name": null,
      "url": null,
      "value": null,
      ...
    },
    {
      "name": "attr_1179_brand",
      "label": "Brand",
      "input_type": "single_select",
      "parent_name": "attr_176_type",
      "url": "/get_attribute_choices/1179",
      ...
    }
  ]
}
Backend API Endpoints (already implemented)
GET /api/forms/:id – fetch full form schema

PUT /api/forms/:id – update schema (save changes)

POST /api/forms – create new form

GET /api/fields/:fieldId/options?parent_value_id=... – fetch dependent options (for cascading selects)

Page Requirements
The page should have two main sections:

1. Form Manager (Left Panel)
List all fields in order (use pos to sort)

Each field shows: label, input_type, brief summary

Buttons: Edit (opens modal), Delete, Move Up/Down (adjust pos)

An Add Field button opens a modal to define a new field

2. Live Preview (Right Panel)
Renders the dynamic form based on the current schema (exactly as an end‑user would see it)

Implements cascading selects:

When a parent field changes, fetch child options using url + parent_value_id

Display loading states

Implements validation (e.g., required fields)

Shows error messages under fields when validation fails

Includes a Submit button that shows the submitted data (or sends it to a mock endpoint for testing)

Field Editor Modal (for Add/Edit)
Allow editing:

Field name (read‑only for edit)

Label

Input type (single_select, text, textarea, etc.)

Is it required? (adds DataRequired validation)

Possible values (for select fields) – a dynamic list with ability to add/remove items

Popular values (subset)

Parent field (dropdown of existing field names, for cascading)

URL (for fetching dependent options, auto‑filled when parent selected)

Position (or just use move buttons)

Validation rules (initially just required, but can be extended)

Data Management
Use useState to hold the current schema (fields array)

Provide Save button that sends PUT /api/forms/:id with the updated schema

On load, fetch schema from GET /api/forms/:id (use a URL param or a selectable form list)

Preview Implementation (Key Logic)
Create a reusable <DynamicForm /> component that receives fields and onSubmit prop

It should:

Manage form values state ({ fieldName: value })

For each field, render appropriate control:

single_select → <select> populated with options from possible_values or dynamically fetched options (stored in separate state)

Handle cascading:

If a field has parent_name, watch the parent value; when it changes, fetch options using its url and parent_value_id

Cache fetched options per field to avoid refetching

Validate on submit (or on blur) using the validation array

Show errors

For the preview in the management page, pass the current editable schema and an onSubmit that simply logs or shows a success message

UI/UX
Use a two‑column layout (left 40%, right 60%) that is responsive (stack on small screens)

Provide clear feedback (loading spinners, success/error toasts)

Allow the user to test the form in the preview area without saving first

Deliverables
Provide the full code for the main page (FormManagementPage.jsx), the reusable DynamicForm, the field editor modal, and any supporting components/hooks.

Ensure the code is clean, well‑commented, and handles edge cases (e.g., missing url, failed fetches, parent not selected).