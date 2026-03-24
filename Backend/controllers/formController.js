const { Form, Field, FieldValidation, FieldOption, Category } = require('../models');

// Get form by ID
exports.getForm = async (req, res) => {
  try {
    const formId = req.params.id;
    const form = await Form.findByPk(formId, {
      include: [
        {
          model: Field,
          as: 'Fields',
          order: [['pos', 'ASC']],
          include: [
            { model: FieldValidation, as: 'Validations' },
            { model: FieldOption, as: 'Options' },
            { model: Field, as: 'parentField', attributes: ['id', 'name'] }
          ]
        },
        { model: Category, as: 'categories' }
      ]
    });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    // Build the response structure similar to the example JSON
    const fields = form.Fields.map(field => {
      const possibleValues = field.Options.filter(opt => !opt.is_popular).map(opt => ({
        id: opt.id,
        value: opt.value,
        checked: opt.checked
      }));
      const popularValues = field.Options.filter(opt => opt.is_popular).map(opt => ({
        value: opt.value
      }));
      const validation = field.Validations.map(v => ({
        type: v.type,
        error_message: v.error_message,
        value: v.value
      }));
      return {
        id: field.id,
        name: field.name,
        pos: field.pos,
        label: field.label,
        placeholder: field.placeholder,
        hint: field.hint,
        unit: field.unit,
        errors: [],
        data_type: field.data_type,
        input_type: field.input_type,
        validation,
        possible_values: possibleValues,
        popular_values: popularValues,
        parent_name: field.parentField ? field.parentField.name : null,
        parent_field_id: field.parent_field_id,
        value: possibleValues.find(v => v.checked) || null,
        url: field.url
      };
    });

    res.json({ status: 'ok', fields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Create new form with fields
exports.createForm = async (req, res) => {
  try {
    const { name, description, category_id, fields } = req.body;

    const form = await Form.create({
      name,
      description,
      status: 'draft'
    });

    // Associate with category if provided
    if (category_id) {
      const { FormCategory } = require('../models');
      await FormCategory.create({
        form_id: form.id,
        category_id: category_id
      });
    }

    // Create fields - track created fields to resolve parent references
    const createdFields = []; // Track created fields with their IDs
    
    if (fields && fields.length > 0) {
      for (let i = 0; i < fields.length; i++) {
        const fieldData = fields[i];
        
        // Resolve parent_field_id from parent_name by matching field names
        let parentFieldId = null;
        if (fieldData.parent_name) {
          // Find the parent field in already created fields
          const parentField = createdFields.find(f => {
            // Match by the base name (without attr_ prefix)
            const parentBaseName = fieldData.parent_name.replace(/^attr_\d+_/, '');
            const childBaseName = f.name.replace(/^attr_\d+_/, '');
            return f.name === fieldData.parent_name || childBaseName === parentBaseName;
          });
          
          if (parentField) {
            parentFieldId = parentField.id;
          }
        }
        
        const field = await createField(form.id, { 
          ...fieldData, 
          parent_field_id: parentFieldId 
        }, createdFields);
        
        createdFields.push(field);
      }
    }

    // Return full form data for debugging
    const formWithFields = await Form.findByPk(form.id, {
      include: [{
        model: Field,
        as: 'Fields',
        order: [['pos', 'ASC']],
        include: [
          { model: FieldValidation, as: 'Validations' },
          { model: FieldOption, as: 'Options' },
          { model: Field, as: 'parentField', attributes: ['id', 'name'] }
        ]
      }]
    });

    res.json({ 
      id: form.id, 
      message: 'Form created successfully',
      form: formWithFields,
      fields: createdFields.map(f => ({
        id: f.id,
        name: f.name,
        parent_field_id: f.parent_field_id,
        url: f.url,
        optionsCount: f.Options?.length || 0,
        validationsCount: f.Validations?.length || 0
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Update existing form
exports.updateForm = async (req, res) => {
  try {
    const formId = req.params.id;
    const { name, description, fields } = req.body;

    const form = await Form.findByPk(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await form.update({ name, description });

    // Update fields if provided
    if (fields) {
      // Delete existing fields (and cascading options/validations)
      await Field.destroy({ where: { form_id: formId } });

      // Create new fields with parent resolution
      const createdFields = [];
      for (let i = 0; i < fields.length; i++) {
        const fieldData = fields[i];
        
        // Resolve parent_field_id from parent_name
        let parentFieldId = null;
        if (fieldData.parent_name) {
          const parentField = createdFields.find(f => {
            const parentBaseName = fieldData.parent_name.replace(/^attr_\d+_/, '');
            const childBaseName = f.name.replace(/^attr_\d+_/, '');
            return f.name === fieldData.parent_name || childBaseName === parentBaseName;
          });
          
          if (parentField) {
            parentFieldId = parentField.id;
          }
        }
        
        const field = await createField(formId, { 
          ...fieldData, 
          parent_field_id: parentFieldId 
        }, createdFields);
        
        createdFields.push(field);
      }
    }

    // Return full form data for debugging
    const formWithFields = await Form.findByPk(formId, {
      include: [{
        model: Field,
        as: 'Fields',
        order: [['pos', 'ASC']],
        include: [
          { model: FieldValidation, as: 'Validations' },
          { model: FieldOption, as: 'Options' },
          { model: Field, as: 'parentField', attributes: ['id', 'name'] }
        ]
      }]
    });

    res.json({ 
      message: 'Form updated successfully',
      form: formWithFields,
      fields: formWithFields.Fields.map(f => ({
        id: f.id,
        name: f.name,
        parent_field_id: f.parent_field_id,
        parent_name: f.parentField?.name || null,
        url: f.url,
        optionsCount: f.Options?.length || 0,
        validationsCount: f.Validations?.length || 0
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Helper function to create a field with its validations and options
async function createField(formId, fieldData, allFields = []) {
  // Generate slug from the original field name (remove any existing attr_ prefix)
  const originalName = fieldData.name.replace(/^attr_\d+_/, '');
  const slug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  
  // Resolve parent_field_id from parent_name
  let parentFieldId = fieldData.parent_field_id;
  if (!parentFieldId && fieldData.parent_name && allFields.length > 0) {
    const parentField = allFields.find(f => f.name === fieldData.parent_name);
    if (parentField) {
      parentFieldId = parentField.id || parentField.field_id;
    }
  }

  const field = await Field.create({
    form_id: formId,
    name: fieldData.name, // Keep original name for now
    label: fieldData.label,
    input_type: fieldData.input_type,
    data_type: fieldData.data_type || 'str',
    placeholder: fieldData.placeholder,
    hint: fieldData.hint,
    unit: fieldData.unit,
    pos: fieldData.pos,
    url: fieldData.url,
    parent_field_id: parentFieldId || null
  });

  // Update field name to include ID (attr_{id}_{slug}) - only once
  const properName = `attr_${field.id}_${slug}`;
  await field.update({ name: properName });

  // Generate or update URL for child fields (fields with parent)
  if (parentFieldId) {
    const fieldUrl = `/fields/${field.id}/options`;
    await field.update({ url: fieldUrl });
    field.url = fieldUrl;
  } else if (fieldData.url && fieldData.url.includes('/fields/') && fieldData.url.includes('/options')) {
    const fieldUrl = `/fields/${field.id}/options`;
    await field.update({ url: fieldUrl });
    field.url = fieldUrl;
  }

  // Create validations
  if (fieldData.validation && fieldData.validation.length > 0) {
    for (const validation of fieldData.validation) {
      await FieldValidation.create({
        field_id: field.id,
        type: validation.type,
        error_message: validation.error_message,
        value: validation.value
      });
    }
  }

  // Create options - use database auto-increment ID
  if (fieldData.possible_values && fieldData.possible_values.length > 0) {
    for (let i = 0; i < fieldData.possible_values.length; i++) {
      const opt = fieldData.possible_values[i];
      await FieldOption.create({
        field_id: field.id,
        value: opt.value,
        checked: opt.checked || false,
        is_popular: false
      });
    }
  }

  // Create popular values
  if (fieldData.popular_values && fieldData.popular_values.length > 0) {
    for (let i = 0; i < fieldData.popular_values.length; i++) {
      const opt = fieldData.popular_values[i];
      await FieldOption.create({
        field_id: field.id,
        value: opt.value,
        checked: false,
        is_popular: true
      });
    }
  }

  return field;
}

// Create a single field for a form
exports.createField = async (req, res) => {
  try {
    const { formId } = req.params;
    const { name, label, input_type, parent_name, pos, validation, possible_values, popular_values, placeholder, hint, url } = req.body;

    // Find parent field if specified
    let parentFieldId = null;
    if (parent_name) {
      const parentField = await Field.findOne({
        where: { form_id: formId, name: parent_name }
      });
      if (parentField) {
        parentFieldId = parentField.id;
      }
    }

    // Create the field
    const field = await Field.create({
      form_id: formId,
      name,
      label,
      input_type,
      data_type: 'str',
      placeholder,
      hint,
      unit: null,
      pos,
      url,  // Set URL after field is created
      parent_field_id: parentFieldId
    });

    // Update field name to include ID and set URL
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    await field.update({ 
      name: `attr_${field.id}_${slug}`,
      url: parentFieldId ? `/fields/${field.id}/options` : url
    });

    // Create validations
    if (validation && validation.length > 0) {
      for (const v of validation) {
        await FieldValidation.create({
          field_id: field.id,
          type: v.type,
          error_message: v.error_message,
          value: v.value
        });
      }
    }

    // Create options
    if (possible_values && possible_values.length > 0) {
      for (const opt of possible_values) {
        await FieldOption.create({
          field_id: field.id,
          value: opt.value,
          parent_option_id: opt.parent_option_id || null,
          checked: opt.checked || false,
          is_popular: false
        });
      }
    }

    // Return the created field
    const savedField = await Field.findByPk(field.id, {
      include: [
        { model: FieldValidation, as: 'Validations' },
        { model: FieldOption, as: 'Options' },
        { model: Field, as: 'parentField', attributes: ['id', 'name'] }
      ]
    });

    const possibleValues = savedField.Options.filter(opt => !opt.is_popular).map(opt => ({
      id: opt.id,
      value: opt.value,
      parent_option_id: opt.parent_option_id,
      checked: opt.checked
    }));

    const validationData = savedField.Validations.map(v => ({
      type: v.type,
      error_message: v.error_message,
      value: v.value
    }));

    res.json({
      field: {
        id: savedField.id,
        name: savedField.name,
        pos: savedField.pos,
        label: savedField.label,
        input_type: savedField.input_type,
        validation: validationData,
        possible_values: possibleValues,
        parent_name: savedField.parentField ? savedField.parentField.name : null,
        parent_field_id: savedField.parent_field_id,
        url: savedField.url
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Update a single field
exports.updateField = async (req, res) => {
  try {
    const { formId, fieldId } = req.params;
    const { name, label, input_type, parent_name, pos, validation, possible_values, popular_values, placeholder, hint, url } = req.body;

    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Find parent field if specified
    let parentFieldId = field.parent_field_id;
    if (parent_name && parent_name !== field.parent_name) {
      const parentField = await Field.findOne({
        where: { form_id: formId, name: parent_name }
      });
      if (parentField) {
        parentFieldId = parentField.id;
      }
    }

    // Update field
    await field.update({
      label,
      input_type,
      placeholder,
      hint,
      pos,
      parent_field_id: parentFieldId
    });

    // Update validations (delete and recreate)
    await FieldValidation.destroy({ where: { field_id: fieldId } });
    if (validation && validation.length > 0) {
      for (const v of validation) {
        await FieldValidation.create({
          field_id: fieldId,
          type: v.type,
          error_message: v.error_message,
          value: v.value
        });
      }
    }

    // Update options (delete and recreate) - this preserves parent_option_id
    await FieldOption.destroy({ where: { field_id: fieldId } });
    if (possible_values && possible_values.length > 0) {
      for (const opt of possible_values) {
        await FieldOption.create({
          field_id: fieldId,
          value: opt.value,
          parent_option_id: opt.parent_option_id || null,
          checked: opt.checked || false,
          is_popular: false
        });
      }
    }

    // Return the updated field
    const updatedField = await Field.findByPk(fieldId, {
      include: [
        { model: FieldValidation, as: 'Validations' },
        { model: FieldOption, as: 'Options' },
        { model: Field, as: 'parentField', attributes: ['id', 'name'] }
      ]
    });

    const possibleValues = updatedField.Options.filter(opt => !opt.is_popular).map(opt => ({
      id: opt.id,
      value: opt.value,
      parent_option_id: opt.parent_option_id,
      checked: opt.checked
    }));

    const validationData = updatedField.Validations.map(v => ({
      type: v.type,
      error_message: v.error_message,
      value: v.value
    }));

    res.json({
      field: {
        id: updatedField.id,
        name: updatedField.name,
        pos: updatedField.pos,
        label: updatedField.label,
        input_type: updatedField.input_type,
        validation: validationData,
        possible_values: possibleValues,
        parent_name: updatedField.parentField ? updatedField.parentField.name : null,
        parent_field_id: updatedField.parent_field_id,
        url: updatedField.url
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Delete a single field
exports.deleteField = async (req, res) => {
  try {
    const { formId, fieldId } = req.params;

    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Delete the field (cascades to validations and options)
    await field.destroy();

    res.json({ message: 'Field deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
