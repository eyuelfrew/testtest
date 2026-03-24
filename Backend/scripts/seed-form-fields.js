const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const Category = require('../models/Category');
const Field = require('../models/Field');
const FieldValidation = require('../models/FieldValidation');
const FieldOption = require('../models/FieldOption');

async function seedFormFields() {
  try {
    console.log('Starting form fields seeding...');

    // Sync database to ensure schema is up to date (without altering existing tables)
    await sequelize.sync();
    console.log('Database schema synced.');

    // Read and parse form_fields.json
    const formFieldsPath = path.join(__dirname, '..', 'form_fields.json');
    const fileContent = fs.readFileSync(formFieldsPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    const fields = jsonData.fields;

    console.log(`Found ${fields.length} field definitions.`);

    // Find the "Houses & Apartments for Sale" category (id: 43)
    const targetCategory = await Category.findOne({ where: { id: 43 } });
    if (!targetCategory) {
      throw new Error('Category "Houses & Apartments for Sale" (id: 43) not found. Please run seed-categories.js first.');
    }
    console.log(`Linking fields to category: ${targetCategory.name} (id: ${targetCategory.id})`);

    // Clear existing fields for this category (if any)
    const categoryFields = await Field.findAll({ where: { category_id: targetCategory.id } });
    const fieldIds = categoryFields.map(f => f.id);
    
    if (fieldIds.length > 0) {
      await FieldValidation.destroy({ where: { field_id: fieldIds } });
      await FieldOption.destroy({ where: { field_id: fieldIds } });
      await Field.destroy({ where: { category_id: targetCategory.id } });
      console.log('Cleared existing fields for this category.');
    }

    // Process each field
    for (const fieldData of fields) {
      console.log(`\nProcessing: ${fieldData.label} (${fieldData.name})`);

      // Create the field
      const field = await Field.create({
        name: fieldData.name,
        label: fieldData.label,
        data_type: fieldData.data_type || 'str',
        input_type: fieldData.input_type || fieldData.type || 'input',
        placeholder: fieldData.placeholder,
        hint: fieldData.hint,
        unit: fieldData.unit || '',
        pos: fieldData.pos || 0,
        char_counter: fieldData.char_counter || false,
        disabled: fieldData.disabled || false,
        price_type: fieldData.price_type || null,
        currency: fieldData.currency || null,
        category_id: targetCategory.id,
      });

      console.log(`  ✓ Created field (id: ${field.id})`);

      // Create validations
      const validations = fieldData.validation || fieldData.validators_list || [];
      for (const validation of validations) {
        await FieldValidation.create({
          field_id: field.id,
          type: validation.type,
          error_message: validation.error_message,
          value: validation.value?.toString() || null,
        });
      }
      if (validations.length > 0) {
        console.log(`  ✓ Added ${validations.length} validation rules`);
      }

      // Create options (possible_values)
      const possibleValues = fieldData.possible_values || [];
      for (const opt of possibleValues) {
        await FieldOption.create({
          field_id: field.id,
          option_id: opt.id,
          value: opt.value?.toString() || '',
          id_name: opt.id_name,
          position: opt.id || 0,
        });
      }
      if (possibleValues.length > 0) {
        console.log(`  ✓ Added ${possibleValues.length} options`);
      }

      // Mark popular values if present
      const popularValues = fieldData.popular_values || [];
      for (const popular of popularValues) {
        await FieldOption.update(
          { is_popular: true },
          { where: { field_id: field.id, id_name: popular.id_name } }
        );
      }
      if (popularValues.length > 0) {
        console.log(`  ✓ Marked ${popularValues.length} popular values`);
      }
    }

    console.log('\n✅ Form fields seeding completed successfully!');

    // Verify the count
    const fieldCount = await Field.count({ where: { category_id: targetCategory.id } });
    const validationCount = await FieldValidation.count();
    const optionCount = await FieldOption.count();
    
    console.log(`\nSummary:`);
    console.log(`  - Fields created: ${fieldCount}`);
    console.log(`  - Validation rules: ${validationCount}`);
    console.log(`  - Field options: ${optionCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding form fields:', error);
    process.exit(1);
  }
}

seedFormFields();
