const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const Category = require('../models/Category');

async function seedCategories() {
  try {
    console.log('Starting category seeding...');

    // Sync database to ensure schema is up to date
    await sequelize.sync({ alter: true });
    console.log('Database schema synced.');

    // Read and parse categories.md
    const categoriesPath = path.join(__dirname, '..', 'categories.md');
    const fileContent = fs.readFileSync(categoriesPath, 'utf-8');
    
    // Parse JSON from the file
    const jsonData = JSON.parse(fileContent);
    const categories = jsonData.data.categories;

    console.log(`Found ${categories.length} top-level categories.`);

    // Clear existing categories (disable FK checks first)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await Category.destroy({ truncate: true, cascade: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Cleared existing categories.');

    // Insert categories recursively
    async function insertCategory(category, parentId = null) {
      const created = await Category.create({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        image_v2: category.image_v2,
        position: category.position,
        parent_id: parentId,
      });

      console.log(`  Created: ${created.name} (id: ${created.id})`);

      // Insert children recursively
      if (category.childes && category.childes.length > 0) {
        for (const child of category.childes) {
          await insertCategory(child, created.id);
        }
      }
    }

    // Insert all top-level categories and their children
    for (const category of categories) {
      await insertCategory(category);
    }

    console.log('\n✅ Seeding completed successfully!');
    
    // Verify the count
    const count = await Category.count();
    console.log(`Total categories in database: ${count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
