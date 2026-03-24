const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const Category = require('../models/Category');
const Field = require('../models/Field');
const FieldValidation = require('../models/FieldValidation');
const FieldOption = require('../models/FieldOption');

async function seedLaptopComputerFields() {
  try {
    console.log('Starting Laptop & Computer form fields seeding...');

    // Sync with alter to add new columns
    await sequelize.sync({ alter: true });
    console.log('Database schema synced.');

    // Read and parse LaptopAndComputer.md
    const filePath = path.join(__dirname, '..', 'LaptopAndComputer.md');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    const fields = jsonData.fields;

    console.log(`Found ${fields.length} field definitions.`);

    // Find the "Computers and Laptops" category (id: 16)
    const targetCategory = await Category.findOne({ where: { id: 16 } });
    if (!targetCategory) {
      throw new Error('Category "Computers and Laptops" (id: 16) not found. Please run seed-categories.js first.');
    }
    console.log(`Linking fields to category: ${targetCategory.name} (id: ${targetCategory.id})`);

    // Clear existing fields for this category
    const existingFields = await Field.findAll({ where: { category_id: targetCategory.id } });
    const fieldIds = existingFields.map(f => f.id);
    
    if (fieldIds.length > 0) {
      await FieldValidation.destroy({ where: { field_id: fieldIds } });
      await FieldOption.destroy({ where: { field_id: fieldIds } });
      await Field.destroy({ where: { category_id: targetCategory.id } });
      console.log('Cleared existing fields for this category.');
    }

    // Create a map to store field name -> id mapping
    const fieldMap = new Map();

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
        parent_field_name: fieldData.parent_name || null,
        url: fieldData.url || null,
      });

      fieldMap.set(fieldData.name, field.id);
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
      
      // For Brand field (attr_1179_brand), we need to set up cascading
      // Based on the JSON, when Type = Server, only show specific brands
      const isBrandField = fieldData.name === 'attr_1179_brand';
      const typeFieldId = fieldMap.get('attr_176_type');

      for (const opt of possibleValues) {
        let parentOptionIds = null;
        
        // Special handling for Brand field cascading
        if (isBrandField && typeFieldId) {
          // Server brands (shown only when Type = Server (id: 204185))
          const serverBrands = [273329, 273327, 1072495, 1212737, 279583]; // Dell, HP, Huawei, Lenovo, Other
          
          if (serverBrands.includes(opt.id)) {
            // This brand is only for Server type
            parentOptionIds = [204185]; // Server type ID
          }
          // All other brands are for Laptop and Desktop Computer types
          else {
            parentOptionIds = [202677, 202676]; // Desktop Computer, Laptop IDs
          }
        }

        await FieldOption.create({
          field_id: field.id,
          option_id: opt.id,
          value: opt.value?.toString() || '',
          id_name: opt.id_name,
          position: opt.id || 0,
          is_popular: fieldData.popular_values?.some(pv => pv.id_name === opt.id_name) || false,
          parent_option_ids: parentOptionIds,
        });
      }
      if (possibleValues.length > 0) {
        console.log(`  ✓ Added ${possibleValues.length} options`);
        if (isBrandField) {
          console.log(`    (with cascading rules based on Type field)`);
        }
      }
    }

    console.log('\n✅ Laptop & Computer form fields seeding completed successfully!');

    // Verify the count
    const fieldCount = await Field.count({ where: { category_id: targetCategory.id } });
    const validationCount = await FieldValidation.count();
    const optionCount = await FieldOption.count();
    
    console.log(`\nSummary:`);
    console.log(`  - Fields created: ${fieldCount}`);
    console.log(`  - Validation rules: ${validationCount}`);
    console.log(`  - Field options: ${optionCount}`);

    // Show field mapping
    console.log('\nField mapping:');
    for (const [name, id] of fieldMap.entries()) {
      console.log(`  ${name} -> ${id}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Laptop & Computer fields:', error);
    process.exit(1);
  }
}

seedLaptopComputerFields();
