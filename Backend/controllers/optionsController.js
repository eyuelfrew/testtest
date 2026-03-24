const { FieldOption, Field } = require('../models');

// Get options for a field filtered by parent option
exports.getFieldOptions = async (req, res) => {
    try {
        const fieldId = req.params.fieldId;
        const parentValueId = req.query.parent_value_id;

        const field = await Field.findByPk(fieldId, {
            include: [{ model: FieldOption, as: 'Options' }]
        });

        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }

        let options = field.Options || [];

        // Filter by parent_option_id if provided
        if (parentValueId && parentValueId !== 'undefined' && parentValueId !== 'null') {
            options = options.filter(opt => opt.parent_option_id == parentValueId);
        }

        const result = options.map(opt => ({
            id: opt.id,
            value: opt.value,
            parent_option_id: opt.parent_option_id
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Get all options for a field (for management)
exports.getFieldOptionsManagement = async (req, res) => {
    try {
        const field = await Field.findByPk(req.params.fieldId, {
            include: [{ model: FieldOption, as: 'Options' }]
        });

        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }

        res.json({ status: 'ok', options: field.Options || [] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Add option to field
exports.addFieldOption = async (req, res) => {
    try {
        const { value, parent_option_id } = req.body;
        const field = await Field.findByPk(req.params.fieldId);

        if (!field) {
            return res.status(404).json({ error: 'Field not found' });
        }

        const option = await FieldOption.create({
            field_id: field.id,
            value,
            parent_option_id: parent_option_id || null
        });

        // Return updated field options
        const allOptions = await FieldOption.findAll({
            where: { field_id: field.id }
        });

        res.json({
            status: 'ok',
            option: { id: option.id, value: option.value, parent_option_id: option.parent_option_id },
            allOptions,
            field: {
                id: field.id,
                name: field.name
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

// Delete option from field
exports.deleteFieldOption = async (req, res) => {
    try {
        const option = await FieldOption.findOne({
            where: {
                field_id: req.params.fieldId,
                id: req.params.optionId
            }
        });

        if (!option) {
            return res.status(404).json({ error: 'Option not found' });
        }

        await option.destroy();
        res.json({ message: 'Option deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};
