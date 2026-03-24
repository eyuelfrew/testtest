const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const formController = require('../controllers/formController');
const optionsController = require('../controllers/optionsController');
const submissionController = require('../controllers/submissionController');

// Category routes
router.get('/categories', categoryController.getCategories);
router.get('/categories/:id', categoryController.getCategoryById);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);
router.post('/categories/:id/assign-form', categoryController.assignFormToCategory);
router.delete('/categories/:id/form', categoryController.removeFormFromCategory);
router.post('/categories/seed', categoryController.seedCategories);

// Form routes
router.get('/forms/:id', formController.getForm);
router.post('/forms', formController.createForm);
router.put('/forms/:id', formController.updateForm);
router.post('/forms/:formId/fields', formController.createField);
router.put('/forms/:formId/fields/:fieldId', formController.updateField);
router.delete('/forms/:formId/fields/:fieldId', formController.deleteField);

// Field options routes
router.get('/fields/:fieldId/options', optionsController.getFieldOptions);
router.get('/fields/:fieldId/options/manage', optionsController.getFieldOptionsManagement);
router.post('/fields/:fieldId/options', optionsController.addFieldOption);
router.delete('/fields/:fieldId/options/:optionId', optionsController.deleteFieldOption);

// Debug endpoint - check field data
router.get('/fields/:fieldId/debug', async (req, res) => {
    try {
        const { Field, FieldOption, FieldOptionRelation } = require('../models');
        const field = await Field.findByPk(req.params.fieldId, {
            include: [
                { model: FieldOption, as: 'Options' },
                { model: Field, as: 'parentField' }
            ]
        });
        
        if (!field) {
            return res.json({ error: 'Field not found' });
        }
        
        const relations = await FieldOptionRelation.findAll({
            where: { child_field_id: field.id }
        });
        
        res.json({
            field: {
                id: field.id,
                name: field.name,
                parent_field_id: field.parent_field_id,
                parent_name: field.parentField?.name,
                url: field.url
            },
            options: field.Options,
            relations: relations,
            optionCount: field.Options?.length || 0,
            relationCount: relations.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/submissions', submissionController.submit);

module.exports = router;
