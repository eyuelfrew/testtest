# Dynamic Form Builder API Documentation

**Base URL:** `http://localhost:3000/api`

---

## Endpoints

### 1. Get Form Schema

Retrieves a complete form definition including fields, validations, and options.

**Endpoint:** `GET /forms/:id`

**Parameters:**
| Name | Type | Location | Required | Description |
|------|------|----------|----------|-------------|
| id | integer | path | Yes | Form ID |

**Response:** `200 OK`
```json
{
  "status": "ok",
  "fields": [
    {
      "name": "attr_176_type",
      "pos": 1,
      "label": "Type",
      "placeholder": null,
      "hint": null,
      "unit": null,
      "errors": [],
      "data_type": "str",
      "input_type": "single_select",
      "validation": [
        {
          "type": "DataRequired",
          "error_message": "This field is required.",
          "value": "true"
        }
      ],
      "possible_values": [
        {
          "id": 202677,
          "value": "Desktop Computer",
          "id_name": "202677",
          "checked": false
        },
        {
          "id": 202676,
          "value": "Laptop",
          "id_name": "202676",
          "checked": true
        }
      ],
      "popular_values": [
        {
          "id_name": "267067",
          "value": "HP"
        }
      ],
      "parent_name": null,
      "value": {
        "id": 202676,
        "value": "Laptop",
        "id_name": "202676",
        "checked": true
      },
      "url": null
    }
  ]
}
```

**Response:** `404 Not Found`
```json
{
  "error": "Form not found"
}
```

---

### 2. Get Dependent Field Options

Retrieves filtered options for a field based on a parent field's selected value. Used for cascading selects.

**Endpoint:** `GET /fields/:fieldId/options`

**Parameters:**
| Name | Type | Location | Required | Description |
|------|------|----------|----------|-------------|
| fieldId | integer | path | Yes | Field ID |
| parent_value_id | integer | query | No | Parent option ID to filter by |

**Example:**
```
GET /fields/2/options?parent_value_id=202676
```

**Response:** `200 OK`
```json
[
  {
    "id": 267045,
    "value": "Toshiba",
    "id_name": "267045"
  },
  {
    "id": 267046,
    "value": "Touchmate",
    "id_name": "267046"
  },
  {
    "id": 267067,
    "value": "HP",
    "id_name": "267067"
  }
]
```

**Response:** `404 Not Found`
```json
{
  "error": "Field not found"
}
```

---

### 3. Submit Form Data

Submits form data with validation.

**Endpoint:** `POST /submissions`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "form_id": 1,
  "data": {
    "attr_176_type": 202676,
    "attr_1179_brand": 267067
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "Submission saved",
  "id": 1
}
```

**Response:** `400 Bad Request` (Validation Failed)
```json
{
  "errors": [
    {
      "field": "attr_176_type",
      "message": "This field is required."
    }
  ]
}
```

**Response:** `404 Not Found`
```json
{
  "error": "Form not found"
}
```

---

## Data Models

### Form
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | string | Form name |
| description | text | Form description |
| status | enum | `draft` or `published` |

### Field
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| form_id | integer | Foreign key to Form |
| name | string | Unique field identifier (e.g., `attr_176_type`) |
| label | string | Display label |
| input_type | string | `single_select`, `text`, `textarea`, etc. |
| data_type | string | `str`, `int`, etc. |
| pos | integer | Display order |
| parent_field_id | integer | Parent field for cascading |
| url | string | Endpoint for dynamic options |

### FieldValidation
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| field_id | integer | Foreign key to Field |
| type | string | `DataRequired`, `MinLength`, `Pattern`, etc. |
| error_message | string | Error message on validation failure |
| value | text | Validation value (e.g., `"true"`, `"5"`) |

### FieldOption
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| field_id | integer | Foreign key to Field |
| option_id | integer | Original option ID from source data |
| value | string | Display text |
| checked | boolean | Pre-selected default |
| is_popular | boolean | Marked as popular/common value |
| parent_option_id | integer | Parent option for cascading |

### Submission
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| form_id | integer | Foreign key to Form |
| data | JSON | Field responses as key-value pairs |

---

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created (submission saved) |
| 400 | Validation error |
| 404 | Resource not found |
| 500 | Server error |

---

## Usage Example (JavaScript)

```javascript
// Get form schema
const formResponse = await fetch('http://localhost:3000/api/forms/1');
const form = await formResponse.json();

// Get dependent options (e.g., brands for selected laptop type)
const optionsResponse = await fetch(
  'http://localhost:3000/api/fields/2/options?parent_value_id=202676'
);
const options = await optionsResponse.json();

// Submit form
const submitResponse = await fetch('http://localhost:3000/api/submissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    form_id: 1,
    data: { attr_176_type: 202676, attr_1179_brand: 267067 }
  });
});
```
