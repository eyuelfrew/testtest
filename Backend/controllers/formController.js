const { Form, Field, FieldValidation, FieldOption, Category, SubField } = require('../models');

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
            { model: Field, as: 'parentField', attributes: ['id', 'name'] },
            { model: SubField, as: 'SubFields', order: [['pos', 'ASC']] }
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
        trigger_option_id: field.trigger_option_id,
        value: possibleValues.find(v => v.checked) || null,
        url: field.url,
        sub_fields: field.SubFields || []
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
          parent_field_id: parentFieldId,
          trigger_option_id: fieldData.trigger_option_id || null
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
    parent_field_id: parentFieldId || null,
    trigger_option_id: fieldData.trigger_option_id || null
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

    // Validate formId
    if (!formId || formId === 'null' || isNaN(parseInt(formId))) {
      return res.status(400).json({ error: 'Valid formId is required' });
    }

    const { name, label, input_type, parent_name, trigger_option_id, pos, validation, possible_values, popular_values, placeholder, hint, url } = req.body;

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
      parent_field_id: parentFieldId,
      trigger_option_id: trigger_option_id || null
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
        trigger_option_id: savedField.trigger_option_id,
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
    const { name, label, input_type, parent_name, trigger_option_id, pos, validation, possible_values, popular_values, placeholder, hint, url } = req.body;

    const field = await Field.findByPk(fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    // Find parent field if specified
    let parentFieldId = field.parent_field_id;
    if (parent_name !== undefined) {
      if (parent_name) {
        const parentField = await Field.findOne({
          where: { form_id: formId, name: parent_name }
        });
        if (parentField) {
          parentFieldId = parentField.id;
        }
      } else {
        parentFieldId = null;
      }
    }

    // Update field basic properties
    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (input_type !== undefined) updateData.input_type = input_type;
    if (placeholder !== undefined) updateData.placeholder = placeholder;
    if (hint !== undefined) updateData.hint = hint;
    if (pos !== undefined) updateData.pos = pos;
    if (parentFieldId !== undefined) updateData.parent_field_id = parentFieldId;
    if (trigger_option_id !== undefined) updateData.trigger_option_id = trigger_option_id;
    
    await field.update(updateData);

    // Update validations ONLY if provided in request
    if (validation !== undefined) {
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
    }

    // Update options ONLY if provided in request
    // IMPORTANT: Preserve parent_option_id for existing options
    if (possible_values !== undefined) {
      // Only update if options are explicitly provided
      if (possible_values && possible_values.length > 0) {
        // Get existing options to preserve parent_option_id
        const existingOptions = await FieldOption.findAll({
          where: { field_id: fieldId }
        });
        
        // Create a map of existing option values to their parent_option_id
        const existingOptionsMap = {};
        existingOptions.forEach(opt => {
          existingOptionsMap[opt.value] = opt.parent_option_id;
        });
        
        // Delete old options
        await FieldOption.destroy({ where: { field_id: fieldId } });
        
        // Recreate options, preserving parent_option_id where possible
        for (const opt of possible_values) {
          await FieldOption.create({
            field_id: fieldId,
            value: opt.value,
            parent_option_id: opt.parent_option_id || existingOptionsMap[opt.value] || null,
            checked: opt.checked || false,
            is_popular: false
          });
        }
      } else {
        // If empty array provided, delete all options
        await FieldOption.destroy({ where: { field_id: fieldId } });
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
        trigger_option_id: updatedField.trigger_option_id,
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

// Get sub-fields for a field
exports.getSubFields = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { trigger_option_id } = req.query;

    const where = { parent_field_id: fieldId };
    if (trigger_option_id) {
      where.trigger_option_id = trigger_option_id;
    }

    const subFields = await SubField.findAll({
      where,
      order: [['pos', 'ASC']]
    });

    res.json({ status: 'ok', subFields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Create a sub-field
exports.createSubField = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { trigger_option_id, name, label, input_type, pos, required } = req.body;

    const subField = await SubField.create({
      parent_field_id: fieldId,
      trigger_option_id,
      name,
      label,
      input_type,
      pos: pos || 0,
      required: required || false
    });

    res.json({ status: 'ok', subField });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Delete a sub-field
exports.deleteSubField = async (req, res) => {
  try {
    const { fieldId, subFieldId } = req.params;

    const subField = await SubField.findByPk(subFieldId);
    if (!subField || subField.parent_field_id != fieldId) {
      return res.status(404).json({ error: 'Sub-field not found' });
    }

    await subField.destroy();
    res.json({ message: 'Sub-field deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
