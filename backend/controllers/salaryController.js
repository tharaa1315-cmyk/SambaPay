import mongoose from 'mongoose';
import SalaryRule from '../models/SalaryRule.js';
import SalaryStructure from '../models/SalaryStructure.js';
import { logAudit } from '../utils/audit.js';

const isValidId = (value) => mongoose.isValidObjectId(value);

const handleError = (res, err) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A salary record with that code already exists' });
  }
  return res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
};

export const listSalaryRules = async (req, res) => {
  try {
    const rules = await SalaryRule.find().sort({ sequence: 1, name: 1 });
    res.json(rules);
  } catch (err) {
    handleError(res, err);
  }
};

export const createSalaryRule = async (req, res) => {
  try {
    const rule = await SalaryRule.create({
      name: req.body.name,
      code: req.body.code,
      category: req.body.category,
      sequence: req.body.sequence,
      calculationMethod: req.body.calculationMethod,
      fixedAmount: req.body.fixedAmount,
      percentage: req.body.percentage,
      formula: req.body.formula,
      active: req.body.active
    });
    await logAudit({ user: req.user, action: 'Created salary rule', module: 'payroll', newValues: rule });
    res.status(201).json(rule);
  } catch (err) {
    handleError(res, err);
  }
};

export const updateSalaryRule = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid salary rule ID' });
    const oldRule = await SalaryRule.findById(req.params.id);
    if (!oldRule) return res.status(404).json({ message: 'Salary rule not found' });

    const updates = {};
    ['name', 'code', 'category', 'sequence', 'calculationMethod', 'fixedAmount', 'percentage', 'formula', 'active']
      .forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
      });
    const rule = await SalaryRule.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    await logAudit({ user: req.user, action: 'Updated salary rule', module: 'payroll', oldValues: oldRule, newValues: rule });
    res.json(rule);
  } catch (err) {
    handleError(res, err);
  }
};

export const listSalaryStructures = async (req, res) => {
  try {
    const structures = await SalaryStructure.find().populate('rules').sort({ name: 1 });
    res.json(structures);
  } catch (err) {
    handleError(res, err);
  }
};

export const createSalaryStructure = async (req, res) => {
  try {
    const rules = Array.isArray(req.body.rules) ? req.body.rules : [];
    if (rules.some((ruleId) => !isValidId(ruleId))) {
      return res.status(400).json({ message: 'Salary structure contains an invalid rule ID' });
    }
    const structure = await SalaryStructure.create({
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      rules,
      active: req.body.active
    });
    const populated = await structure.populate('rules');
    await logAudit({ user: req.user, action: 'Created salary structure', module: 'payroll', newValues: structure });
    res.status(201).json(populated);
  } catch (err) {
    handleError(res, err);
  }
};

export const updateSalaryStructure = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid salary structure ID' });
    const oldStructure = await SalaryStructure.findById(req.params.id);
    if (!oldStructure) return res.status(404).json({ message: 'Salary structure not found' });

    const updates = {};
    ['name', 'code', 'description', 'active'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
    });
    if (Array.isArray(req.body.rules)) {
      if (req.body.rules.some((ruleId) => !isValidId(ruleId))) {
        return res.status(400).json({ message: 'Salary structure contains an invalid rule ID' });
      }
      updates.rules = req.body.rules;
    }
    const structure = await SalaryStructure.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('rules');
    await logAudit({ user: req.user, action: 'Updated salary structure', module: 'payroll', oldValues: oldStructure, newValues: structure });
    res.json(structure);
  } catch (err) {
    handleError(res, err);
  }
};
