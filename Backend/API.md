# Dynamic Form Builder API Documentation

**Base URL:** `http://localhost:3000/api`

---

## Endpoints

### Categories

#### 1. Get All Categories (Tree Structure)

Retrieves all categories with their hierarchical structure.

**Endpoint:** `GET /categories`

**Response:** `200 OK`
```json
{
  "status": "ok",
  "data": {
    "categories": [
      {
        "id": 6,
        "parent_id": null,
        "slug": "vehicles",
        "name": "Vehicles",
        "image": "vehicles",
        "image_v2": "https://...",
        "position": 100,
        "children": [
          {
            "id": 29,
            "parent_id": 6,
            "slug": "cars",
            "name": "Cars",
            "forms": []
          }
        ]
      }
    ]
  }
}
```

---

#### 2. Get Category by ID

Retrieves a single category with its assigned form.

**Endpoint:** `GET /categories/:id`

**Response:** `200 OK`
```json
{
  "status": "ok",
  "data": {
    "category": {
      "id": 29,
      "name": "Cars",
      "slug": "cars",
      "forms": [
        {
          "id": 1,
          "name": "Car Listing Form",
          "status": "published"
        }
      ]
    }
  }
}
```

---

#### 3. Assign Form to Category

Assigns an existing form to a category.

**Endpoint:** `POST /categories/:id/assign-form`

**Body:**
```json
{
  "form_id": 1
}
```

**Response:** `200 OK`
```json
{
  "message": "Form assigned to category successfully"
}
```

---

#### 4. Remove Form from Category

Removes the form assignment from a category.

**Endpoint:** `DELETE /categories/:id/form`

**Response:** `200 OK`
```json
{
  "message": "Form removed from category successfully"
}
```

---

#### 5. Seed Categories

Bulk import categories from JSON data.

**Endpoint:** `POST /categories/seed`

**Body:**
```json
{
  "categories": [
    {
      "id": 6,
      "parent_id": null,
      "slug": "vehicles",
      "name": "Vehicles",
      "position": 100,
      "childes": [...]
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Categories seeded successfully"
}
```

---

### Forms

#### 6. Get Form Schema

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
        }
      ],
      "popular_values": [],
      "parent_name": null,
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

#### 7. Create New Form

Creates a new form with optional fields.

**Endpoint:** `POST /forms`

**Body:**
```json
{
  "name": "Car Listing Form",
  "description": "Form for car listings",
  "category_id": 29,
  "fields": [
    {
      "name": "attr_176_type",
      "label": "Type",
      "input_type": "single_select",
      "pos": 1,
      "validation": [...],
      "possible_values": [...]
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "message": "Form created successfully"
}
```

---

#### 8. Update Form

Updates an existing form and its fields.

**Endpoint:** `PUT /forms/:id`

**Body:**
```json
{
  "name": "Updated Form Name",
  "description": "Updated description",
  "fields": [
    {
      "name": "attr_176_type",
      "label": "Type",
      "input_type": "single_select",
      "pos": 1
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Form updated successfully"
}
```

---

### Field Options

#### 9. Get Dependent Field Options

Retrieves filtered options for a field based on a parent field's selected value.

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
  }
]
```

---

### Submissions

#### 10. Submit Form Data

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

---

## Quick Start

### 1. Seed Categories
```bash
node seedCategories.js
```

### 2. Build Form for a Category
1. Open the frontend at `http://localhost:5173`
2. Find your category (e.g., "Cars" under "Vehicles")
3. Click **"📝 Build Form"**
4. Add fields and click **"Create Form"**

### 3. Preview Form
- Click **"👁 Preview"** on any category with a form

---

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 404 | Resource not found |
| 500 | Server error |
