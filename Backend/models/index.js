const Form = require('./Form');
const Field = require('./Field');
const FieldValidation = require('./FieldValidation');
const FieldOption = require('./FieldOption');
const FieldOptionRelation = require('./FieldOptionRelation');
const Submission = require('./Submission');
const Category = require('./Category');
const FormCategory = require('./FormCategory');
const SubField = require('./SubField');

// Category self-reference (tree structure)
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });

// Form -> Fields (One-to-Many)
Form.hasMany(Field, { foreignKey: 'form_id', as: 'Fields' });
Field.belongsTo(Form, { foreignKey: 'form_id', as: 'Form' });

// Field self-reference for cascading/parent fields
Field.belongsTo(Field, { as: 'parentField', foreignKey: 'parent_field_id' });
Field.hasMany(Field, { as: 'childFields', foreignKey: 'parent_field_id' });

// Field -> SubFields (One-to-Many)
Field.hasMany(SubField, { foreignKey: 'parent_field_id', as: 'SubFields' });
SubField.belongsTo(Field, { foreignKey: 'parent_field_id', as: 'parentField' });

// Field -> FieldValidations (One-to-Many)
Field.hasMany(FieldValidation, { foreignKey: 'field_id', as: 'Validations' });
FieldValidation.belongsTo(Field, { foreignKey: 'field_id', as: 'field' });

// Field -> FieldOptions (One-to-Many)
Field.hasMany(FieldOption, { foreignKey: 'field_id', as: 'Options' });
FieldOption.belongsTo(Field, { foreignKey: 'field_id', as: 'field' });

// FieldOption self-reference for cascading options
FieldOption.belongsTo(FieldOption, { foreignKey: 'parent_option_id', as: 'parentOption' });
FieldOption.hasMany(FieldOption, { foreignKey: 'parent_option_id', as: 'childOptions' });

// Submission -> Form
Submission.belongsTo(Form, { foreignKey: 'form_id', as: 'Form' });
Form.hasMany(Submission, { foreignKey: 'form_id', as: 'Submissions' });

// Form <-> Category (Many-to-Many)
Form.belongsToMany(Category, {
    through: FormCategory,
    foreignKey: 'form_id',
    otherKey: 'category_id',
    as: 'categories'
});
Category.belongsToMany(Form, {
    through: FormCategory,
    foreignKey: 'category_id',
    otherKey: 'form_id',
    as: 'forms'
});

module.exports = {
  Form,
  Field,
  FieldValidation,
  FieldOption,
  FieldOptionRelation,
  Submission,
  Category,
  FormCategory,
  SubField,
};
