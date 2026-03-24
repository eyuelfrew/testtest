Backend Prompt – Dynamic Form Builder (MySQL + Express)
Objective
Build a backend for a dynamic form system that stores form schemas (like the JSON example) and serves them to a React frontend. The backend must support:

Form schema definition – store field configurations, validation rules, possible values, and parent/child relationships.

Cascading select options – provide endpoints that return filtered options based on parent selections.

Form submissions – store user responses.

Tech Stack
MySQL (via Sequelize or raw queries)

Express.js

Node.js

Database Models (Tables)
forms
id INT (PK)

name VARCHAR

description TEXT

status ENUM('draft','published')

created_at, updated_at

fields
id INT (PK)

form_id INT (FK -> forms.id)

name VARCHAR (unique per form, e.g., attr_176_type)

label VARCHAR

data_type VARCHAR (e.g., str, int)

input_type VARCHAR (e.g., single_select, text, textarea)

placeholder VARCHAR (nullable)

hint VARCHAR (nullable)

unit VARCHAR (nullable)

pos INT (order)

parent_field_id INT (nullable, FK -> fields.id, for cascading)

url VARCHAR (nullable, endpoint to fetch options dynamically)

created_at, updated_at

field_validations
id INT (PK)

field_id INT (FK -> fields.id)

type VARCHAR (e.g., DataRequired, MinLength, Pattern)

error_message VARCHAR

value TEXT (JSON or string, e.g., "true", "5")

field_options
id INT (PK)

field_id INT (FK -> fields.id)

option_id INT (the id from the original JSON, e.g., 202677)

value VARCHAR (display text)

id_name VARCHAR (optional, e.g., 202677)

checked BOOLEAN (default false, for pre-selected)

is_popular BOOLEAN (default false, to indicate popular values)

parent_option_id INT (nullable, for cascading options – this allows storing hierarchical options, though the JSON uses separate fields; optional)

submissions
id INT (PK)

form_id INT (FK -> forms.id)

data JSON (stores key-value pairs: field name -> selected value)

created_at, updated_at

API Endpoints
1. Get Form Schema
GET /api/forms/:formId

Fetch the form with its fields, validations, options, and dependencies.

Return a structure matching the provided JSON example (status, fields array).

For each field, include possible_values and popular_values (based on field_options and is_popular flag).

Include parent_name (field name of parent, derived from parent_field_id).

Include validation array (mapped from field_validations).

Include url if the field uses dynamic fetching.

2. Get Dependent Options
GET /api/fields/:fieldId/options?parent_value_id=...

Used when a field has a url and a parent.

Return a list of possible values for the child field based on the selected parent option.

Query logic: find field_options for the child field that are linked to the given parent option ID. (If you store hierarchical options in field_options.parent_option_id, use that; otherwise, you may need to join based on business rules.)

Response format:

json
[
  { "id": 267045, "value": "Toshiba", "id_name": 267045 },
  ...
]
3. Submit Form Data
POST /api/submissions

Accept JSON payload: { form_id, data: { field_name: value, ... } }

Validate against the form's field validations.

Store the submission in the submissions table (as JSON).

Return success/error.

4. Optional: Admin Endpoints (if you want to manage forms)
POST /api/forms – create a new form definition.

PUT /api/forms/:formId – update form structure.

DELETE /api/forms/:formId – delete form.

Controllers & Logic
Form Controller: handle retrieval of full form schema. Use Sequelize associations to load fields, validations, options in one query.

Options Controller: for dependent options, accept parent_value_id and return filtered options. If the child field has a url, this controller is the endpoint.

Submission Controller: validate incoming data against the field validations (e.g., required fields, patterns). If validation passes, store as JSON.

Additional Considerations
Caching: For performance, cache form schemas in Redis or memory, as they don’t change often.

Validation: Use a validation library (e.g., Joi, express-validator) to ensure incoming requests are well-formed.

Security: Sanitize inputs, especially for dynamic option fetching. Ensure that the parent_value_id is a valid integer and that the user is authorized to access the field.

Seeding: Write seed scripts to populate forms, fields, options based on the provided JSON example.

Sample Implementation Steps (if coding manually)
Set up Sequelize models with associations.

Write a migration script to create tables.

Implement the GET /forms/:id controller:

Find the form.

Load all fields (ordered by pos).

For each field, load its validations and options.

Build the nested JSON structure.

Implement the GET /fields/:id/options controller:

Verify field exists.

Query field_options for that field. If parent_value_id is provided, filter options that are valid for that parent (using a join table or a parent_option_id column).

Return array.

Implement submission endpoint with validation.