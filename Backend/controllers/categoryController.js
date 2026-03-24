const { Category, Form } = require('../models');

// Get all categories (tree structure)
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({
            where: { parent_id: null },
            include: [
                {
                    model: Category,
                    as: 'children',
                    include: [
                        {
                            model: Category,
                            as: 'children',
                            include: [{ model: Form, as: 'forms' }]
                        },
                        { model: Form, as: 'forms' }
                    ]
                },
                { model: Form, as: 'forms' }
            ],
            order: [['position', 'ASC']]
        });
        res.json({ status: 'ok', data: { categories } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name, slug, parent_id, image, image_v2, position } = req.body;
        
        const category = await Category.create({
            name,
            slug,
            parent_id: parent_id || null,
            image: image || null,
            image_v2: image_v2 || null,
            position: position || 0
        });
        
        res.json({ 
            status: 'ok', 
            category,
            message: 'Category created successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    try {
        const { name, slug, image, image_v2, position } = req.body;
        const category = await Category.findByPk(req.params.id);
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        await category.update({
            name: name || category.name,
            slug: slug || category.slug,
            image: image !== undefined ? image : category.image,
            image_v2: image_v2 !== undefined ? image_v2 : category.image_v2,
            position: position !== undefined ? position : category.position
        });
        
        res.json({ 
            status: 'ok', 
            category,
            message: 'Category updated successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        // Check if category has children
        const children = await Category.findAll({ where: { parent_id: category.id } });
        if (children.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete category with subcategories. Delete subcategories first.' 
            });
        }
        
        await category.destroy();
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get category by ID with its form
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id, {
            include: [{ model: Form, as: 'forms' }]
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ status: 'ok', data: { category } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Assign a form to a category
exports.assignFormToCategory = async (req, res) => {
    try {
        const { form_id } = req.body;
        const category = await Category.findByPk(req.params.id);
        
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const form = await Form.findByPk(form_id);
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        await category.addForm(form);
        res.json({ message: 'Form assigned to category successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Remove form from category
exports.removeFormFromCategory = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await category.setForms(null);
        res.json({ message: 'Form removed from category successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Seed categories from JSON
exports.seedCategories = async (req, res) => {
    try {
        const categoriesData = req.body.categories;
        
        // Clear existing categories
        await Category.destroy({ truncate: true });
        
        // Helper function to create category and children
        const createCategory = async (catData, parentId = null) => {
            const category = await Category.create({
                id: catData.id,
                parent_id: parentId,
                slug: catData.slug,
                name: catData.name,
                image: catData.image,
                image_v2: catData.image_v2,
                position: catData.position,
                listing_on_top_lvl: catData.listing_on_top_lvl || false
            });
            
            if (catData.childes && catData.childes.length > 0) {
                for (const child of catData.childes) {
                    await createCategory(child, category.id);
                }
            }
            return category;
        };
        
        for (const cat of categoriesData) {
            await createCategory(cat);
        }
        
        res.json({ message: 'Categories seeded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
