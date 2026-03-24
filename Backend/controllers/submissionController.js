const { Submission, Form, Field, FieldValidation } = require('../models');

exports.submit = async (req, res) => {
    try {
        const { form_id, data } = req.body;
        const form = await Form.findByPk(form_id, {
            include: [{ model: Field, include: [FieldValidation] }]
        });
        if (!form) return res.status(404).json({ error: 'Form not found' });

        // Validate each field
        const errors = [];
        for (const field of form.Fields) {
            const value = data[field.name];
            for (const validation of field.Validations) {
                if (validation.type === 'DataRequired' && (value === undefined || value === null || value === '')) {
                    errors.push({ field: field.name, message: validation.error_message });
                }
                // Add other validations as needed
            }
        }
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // Save submission
        const submission = await Submission.create({
            form_id: form.id,
            data: data
        });
        res.status(201).json({ message: 'Submission saved', id: submission.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};