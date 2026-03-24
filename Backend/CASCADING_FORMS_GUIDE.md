# Dynamic Cascading Form Guide

## Overview

This system allows you to create complex cascading forms like Jiji's listing forms, where dropdown options change based on previous selections.

## Example: Laptop & Computer Form

### Structure
```
Type (Laptop, Desktop, Server)
  └─ Brand (HP, Dell, Lenovo for Laptop | HP, Dell, Acer for Desktop)
      └─ Model (Specific models per brand)
          └─ RAM, Storage, etc.
```

## How to Build

### Step 1: Create Parent Field (Type)

1. Click "Add Field"
2. Name: `Type`, Label: `Type`
3. Input Type: `single_select`
4. Add options: `Laptop`, `Desktop`, `Server`
5. Save

### Step 2: Create Child Field (Brand)

1. Click "Add Field"
2. Name: `Brand`, Label: `Brand`
3. Input Type: `single_select`
4. **Parent Field**: Select `Type`
5. Save

### Step 3: Manage Dependencies (CRITICAL!)

1. Edit the `Brand` field
2. Click **"🔗 Manage Option Dependencies"**
3. You'll see a matrix:

| Brand Options | Laptop | Desktop | Server |
|--------------|--------|---------|--------|
| HP           | ☑️     | ☑️      | ☐      |
| Dell         | ☑️     | ☑️      | ☐      |
| Lenovo       | ☑️     | ☐       | ☐      |
| Acer         | ☐      | ☑️      | ☐      |
| Apple        | ☑️     | ☐       | ☐      |

4. Check boxes to define which brands appear for each type
5. Click **"Save Dependencies"**

### Step 4: Add More Options

In the dependency manager, you can:
- Add new brand options at the top
- Delete options
- Change dependencies anytime

### Step 5: Create Grandchild Field (Model)

1. Click "Add Field"
2. Name: `Model`, Label: `Model`
3. Input Type: `single_select`
4. **Parent Field**: Select `Brand`
5. Save
6. Click **"🔗 Manage Option Dependencies"**
7. Define which models appear for each brand:

| Model | HP | Dell | Lenovo | Apple |
|-------|-----|------|--------|-------|
| Pavilion 15 | ☑️ | ☐ | ☐ | ☐ |
| EliteBook 840 | ☑️ | ☐ | ☐ | ☐ |
| XPS 13 | ☐ | ☑️ | ☐ | ☐ |
| ThinkPad X1 | ☐ | ☐ | ☑️ | ☐ |
| MacBook Pro | ☐ | ☐ | ☐ | ☑️ |

## How It Works

### Backend Storage

1. **Fields** - Stored with `parent_field_id`
2. **Options** - Stored in `field_options` table
3. **Dependencies** - Stored in `field_option_relations` table:
   ```sql
   parent_field_id | parent_option_id | child_field_id | child_option_id
   ----------------|------------------|----------------|----------------
   1 (Type)        | 1000 (Laptop)    | 2 (Brand)      | 2000 (HP)
   1 (Type)        | 1000 (Laptop)    | 2 (Brand)      | 2001 (Dell)
   1 (Type)        | 1001 (Desktop)   | 2 (Brand)      | 2000 (HP)
   ```

### Runtime Behavior

When user selects "Laptop" in Type:
1. Frontend calls: `GET /api/fields/2/options?parent_value_id=1000`
2. Backend looks up relations for `parent_option_id=1000`
3. Returns only brands checked for Laptop: `[HP, Dell, Lenovo, Apple]`
4. User selects "HP"
5. Frontend calls: `GET /api/fields/3/options?parent_value_id=2000`
6. Returns models for HP: `[Pavilion 15, EliteBook 840]`

## API Endpoints

### Get Filtered Options
```
GET /api/fields/:fieldId/options?parent_value_id=1000
```

### Manage Dependencies
```
POST /api/fields/:fieldId/options/dependencies
Body: {
  "parent_field_id": 1,
  "parent_option_id": 1000,
  "child_option_ids": [2000, 2001, 2002]
}
```

### Get Dependencies
```
GET /api/fields/:fieldId/options/dependencies
Response: {
  "dependencies": {
    "1000": [2000, 2001],  // Laptop → HP, Dell
    "1001": [2000, 2003]   // Desktop → HP, Acer
  }
}
```

## Best Practices

1. **Always create parent fields first** - You can't set dependencies without parent options
2. **Use clear names** - `attr_type`, `attr_brand`, `attr_model`
3. **Test the cascade** - Use preview to verify options filter correctly
4. **Start simple** - Build 2-level cascades before attempting 3+ levels
5. **Document your IDs** - Keep track of option IDs for debugging

## Common Patterns

### Electronics
```
Category → Brand → Model → Condition → Storage/RAM
```

### Vehicles
```
Type → Make → Model → Year → Engine → Transmission
```

### Real Estate
```
Property Type → Location → Bedrooms → Bathrooms → Price Range
```

## Troubleshooting

### "No options showing for child field"
- Check if dependencies are configured
- Verify parent field has options
- Ensure parent_value_id is being sent correctly

### "Wrong options showing"
- Review dependency matrix
- Check for duplicate option IDs
- Clear browser cache

### "Field not appearing in parent dropdown"
- Parent must be `single_select` type
- Parent must have options defined
- Field name must be unique
