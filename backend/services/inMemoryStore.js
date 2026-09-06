/**
 * inMemoryStore.js — A seeded in-memory data layer used when MongoDB is not
 * reachable. It monkey-patches the Mongoose model statics so ALL existing
 * controllers work unchanged against ephemeral collections. When MongoDB comes
 * online, removeInMemoryStore() restores the native statics seamlessly.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Contract from '../models/Contract.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Payroll from '../models/Payroll.js';
import Payslip from '../models/Payslip.js';
import SalaryRule from '../models/SalaryRule.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Setting from '../models/Setting.js';
import TimeOffType from '../models/TimeOffType.js';
import TimeOffAllocation from '../models/TimeOffAllocation.js';
import WorkingSchedule from '../models/WorkingSchedule.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Organization from '../models/Organization.js';
import JoinRequest from '../models/JoinRequest.js';
import { executeSalaryRules } from '../utils/salaryEngine.js';

const ALL_MODELS = { User, Employee, Department, Contract, Attendance, Leave, Payroll, Payslip, SalaryRule, SalaryStructure, Setting, TimeOffType, TimeOffAllocation, WorkingSchedule, Notification, AuditLog, Organization, JoinRequest };

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const createId = () => new mongoose.Types.ObjectId();

const cloneValue = (value, seen = new Map()) => {
  if (value === null || value === undefined) return value;
  if (value instanceof mongoose.Types.ObjectId) return new mongoose.Types.ObjectId(value.toString());
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const copy = [];
    seen.set(value, copy);
    value.forEach((item) => copy.push(cloneValue(item, seen)));
    return copy;
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return seen.get(value);
    const copy = {};
    seen.set(value, copy);
    for (const [key, item] of Object.entries(value)) copy[key] = cloneValue(item, seen);
    return copy;
  }
  return value;
};

const stripId = (value) => (value instanceof mongoose.Types.ObjectId ? value.toString() : value);

const compareValues = (a, b) => {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date || b instanceof Date) {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    return Number.isNaN(ta) || Number.isNaN(tb) ? false : ta === tb;
  }
  if (a === null || a === undefined) return b === null || b === undefined || b === '';
  if (b === null || b === undefined) return a === null || a === undefined || a === '';
  return stripId(a) === stripId(b) || String(a) === String(b);
};

const compareOrder = (a, b) => {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (a instanceof Date || b instanceof Date) {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return String(a).localeCompare(String(b));
};
/** Mongo-style matcher: flat comparisons, operators, and dotted paths. */
const matches = (record, filter = {}) => {
  return Object.entries(filter).every(([field, expected]) => {
    if (field === '$or' && Array.isArray(expected)) return expected.some((sub) => matches(record, sub));
    if (field === '$and' && Array.isArray(expected)) return expected.every((sub) => matches(record, sub));
    if (field === '$nor' && Array.isArray(expected)) return !expected.some((sub) => matches(record, sub));
    if (field === '$not') return !matches(record, expected);
    return matchFieldWithOptions(record, field, expected);
  });
};

const matchFieldWithOptions = (record, field, expected) => {
  const actual = field.split('.').reduce((acc, key) => (acc === null || acc === undefined ? acc : acc[key]), record);
  if (expected && typeof expected === 'object' && !(expected instanceof Date) && !(expected instanceof mongoose.Types.ObjectId)) {
    const operatorEntries = Object.entries(expected);
    if (operatorEntries.some(([key]) => key.startsWith('$'))) {
      const options = {};
      operatorEntries.forEach(([key, value]) => { if (key === '$options') options.options = value; });
      return operatorEntries.every(([operator, value]) => matchOperator(actual, operator, value, options));
    }
  }
  return compareValues(actual, expected);
};

const matchOperator = (actual, operator, value, options = {}) => {
  switch (operator) {
    case '$eq': return compareValues(actual, value);
    case '$ne': return !compareValues(actual, value);
    case '$gt': return actual !== null && actual !== undefined && compareOrder(actual, value) > 0;
    case '$gte': return actual !== null && actual !== undefined && compareOrder(actual, value) >= 0;
    case '$lt': return actual !== null && actual !== undefined && compareOrder(actual, value) < 0;
    case '$lte': return actual !== null && actual !== undefined && compareOrder(actual, value) <= 0;
    case '$in': return Array.isArray(value) && value.some((item) => compareValues(actual, item));
    case '$nin': return Array.isArray(value) && !value.some((item) => compareValues(actual, item));
    case '$exists': return value ? actual !== undefined && actual !== null : actual === undefined || actual === null;
    case '$regex': {
      if (actual === null || actual === undefined) return false;
      return new RegExp(value, options.options || '').test(String(actual));
    }
    case '$options': return true;
    default: return false;
  }
};

const applySort = (records, sortSpec) => {
  if (!sortSpec) return records;
  const sortKeys = Object.entries(sortSpec);
  return [...records].sort((a, b) => {
    for (const [key, direction] of sortKeys) {
      const result = compareOrder(a[key], b[key]);
      if (result !== 0) return direction === -1 || direction === 'desc' ? -result : result;
    }
    return 0;
  });
};

const projectRecord = (record, spec) => {
  const entries = Object.entries(spec || {});
  const hasInclusion = entries.some(([, value]) => value === 1 || value === true);
  const hasExclusion = entries.some(([, value]) => value === 0 || value === false);
  const hasComputed = entries.some(([, value]) => typeof value === 'string' && value.startsWith('$'));

  if (!hasInclusion && !hasExclusion && !hasComputed) return record;
  if (hasExclusion && !hasInclusion && !hasComputed) {
    const full = { ...record };
    entries.forEach(([key]) => delete full[key]);
    return full;
  }

  const out = { _id: cloneValue(record._id) };
  for (const [key, value] of entries) {
    if (value === 0 || value === false) continue;
    if (value === 1 || value === true) {
      out[key] = cloneValue(record[key]);
      continue;
    }
    if (typeof value === 'string' && value.startsWith('$')) {
      out[key] = cloneValue(record[value.slice(1)]);
    }
  }
  return out;
};

const applyUpdate = (raw, update) => {
  if (!update || typeof update !== 'object') return raw;
  const operators = ['$set', '$inc', '$push', '$pull', '$unset', '$addToSet'];
  if (Object.keys(update).every((key) => operators.includes(key))) {
    if (update.$set) Object.assign(raw, cloneValue(update.$set));
    if (update.$inc) {
      Object.entries(update.$inc).forEach(([key, amount]) => {
        raw[key] = (Number(raw[key]) || 0) + Number(amount);
      });
    }
    if (update.$push) {
      Object.entries(update.$push).forEach(([key, value]) => {
        if (!Array.isArray(raw[key])) raw[key] = [];
        raw[key].push(cloneValue(value));
      });
    }
    if (update.$addToSet) {
      Object.entries(update.$addToSet).forEach(([key, value]) => {
        if (!Array.isArray(raw[key])) raw[key] = [];
        if (!raw[key].some((item) => compareValues(item, value))) raw[key].push(cloneValue(value));
      });
    }
    if (update.$pull) {
      Object.entries(update.$pull).forEach(([key, value]) => {
        if (Array.isArray(raw[key])) raw[key] = raw[key].filter((item) => !compareValues(item, value));
      });
    }
    if (update.$unset) {
      Object.entries(update.$unset).forEach(([key]) => delete raw[key]);
    }
    return raw;
  }
  Object.entries(update).forEach(([key, value]) => {
    raw[key] = cloneValue(value);
  });
  return raw;
};
// ---------------------------------------------------------------------------
// Store & collection helpers
// ---------------------------------------------------------------------------

const store = {
  collections: Object.fromEntries(Object.keys(ALL_MODELS).map((name) => [name, []])),
  seeded: false
};

const collectionFor = (modelName) => store.collections[modelName] || [];

const pushRecord = (modelName, raw) => {
  raw.createdAt = raw.createdAt || new Date();
  raw.updatedAt = raw.updatedAt || new Date();
  store.collections[modelName].push(raw);
  return raw;
};

// ---------------------------------------------------------------------------
// Document wrapper
// ---------------------------------------------------------------------------

const getRaw = (wrapper) => (wrapper && wrapper._raw ? wrapper._raw : wrapper);

const wrapDoc = (modelName, raw) => {
  // Add toJSON as a non-enumerable own property so JSON.stringify can find it
  Object.defineProperty(raw, 'toJSON', {
    value: function toJSON() {
      const result = {};
      for (const key of Object.keys(this)) {
        if (key === '_raw' || key === '_modelName') continue;
        result[key] = this[key];
      }
      return result;
    },
    enumerable: false,
    configurable: true,
    writable: true
  });

  // Proxy-based wrapper: property reads/writes hit the raw record directly, so
  // controller mutations (doc.status = 'X'; await doc.save()) actually persist.
  // `overlay` only exists to support in-memory populate() without corrupting
  // stored reference fields in the underlying collections.
  let overlay = null;

  const projectPopulated = (item, select) => {
    const base = { ...item };
    if (select) {
      const fields = String(select).split(/\s+/).filter(Boolean);
      if (fields.some((f) => f.startsWith('-'))) {
        fields.forEach((f) => delete base[f.slice(1)]);
      } else {
        Object.keys(base).forEach((key) => { if (!fields.includes(key) && key !== '_id') delete base[key]; });
      }
    }
    return base;
  };

  const handler = {
    get(target, prop) {
      if (prop === '_raw') return target;
      if (prop === '_modelName') return modelName;
      if (prop === 'save') {
        return async function save() {
          target.updatedAt = new Date();
          return doc;
        };
      }
      if (prop === 'toObject' || prop === 'toJSON') {
        return function toObject() {
          return cloneValue({ ...target, ...(overlay || {}) });
        };
      }
      if (prop === 'populate') {
        return function populate(fieldPath, select) {
          const value = target[fieldPath];
          let relatedModel = null;
          if (fieldPath === 'employeeId') relatedModel = 'Employee';
          else if (fieldPath === 'timeOffTypeId') relatedModel = 'TimeOffType';
          else if (fieldPath === 'rules') relatedModel = 'SalaryRule';
          if (!relatedModel) return doc;
          const source = collectionFor(relatedModel);
          const refs = Array.isArray(value) ? value : [value];
          const filled = refs.map((ref) => {
            const item = source.find((candidate) => compareValues(candidate._id, ref));
            return item ? projectPopulated(item, select) : ref;
          });
          overlay = { ...(overlay || {}), [fieldPath]: Array.isArray(value) ? filled : (filled[0] || value) };
          return doc;
        };
      }
      if (modelName === 'User' && prop === 'comparePassword') {
        return async function comparePassword(candidatePassword) {
          if (!target.password) return false;
          if (String(target.password).startsWith('$2')) return bcrypt.compare(candidatePassword, target.password);
          return candidatePassword === target.password;
        };
      }
      if (overlay && Object.prototype.hasOwnProperty.call(overlay, prop)) return overlay[prop];
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
      target[prop] = value;
      if (overlay) delete overlay[prop];
      return true;
    },
    deleteProperty(target, prop) {
      delete target[prop];
      if (overlay) delete overlay[prop];
      return true;
    },
    // This trap is required so JSON.stringify can find and call toJSON/toObject/save
    getOwnPropertyDescriptor(target, prop) {
      if (prop === 'toJSON' || prop === 'toObject' || prop === 'save' || prop === '_raw' || prop === '_modelName' || (modelName === 'User' && prop === 'comparePassword')) {
        return { configurable: true, enumerable: false, writable: true, value: handler.get(target, prop) };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  };

  const doc = new Proxy(raw, handler);

  return doc;
};

const wrapMany = (modelName, raws) => raws.map((raw) => wrapDoc(modelName, raw));
// ---------------------------------------------------------------------------
// Query object (thenable, chainable: sort/limit/select/populate)
// ---------------------------------------------------------------------------

const createQuery = (modelName, filter, isOne = false) => {
  const state = { filter, sort: null, limit: isOne ? 1 : null, select: null, populates: [] };

  const resolve = () => {
    let records = collectionFor(modelName).filter((raw) => matches(raw, state.filter));
    records = applySort(records, state.sort);
    if (state.limit) records = records.slice(0, state.limit);

    let docs = wrapMany(modelName, records);
    state.populates.forEach(({ path, select }) => {
      docs.forEach((doc) => doc.populate(path, select));
    });

    return isOne ? docs[0] || null : docs;
  };

  const applyFieldSelection = (result) => {
    const fields = String(state.select).split(/\s+/).filter(Boolean);
    if (!fields.length) return result;
    const exclusions = fields.filter((f) => f.startsWith('-'));
    const inclusions = fields.filter((f) => !f.startsWith('-'));
    const transform = (doc) => {
      if (!doc || typeof doc !== 'object' || !doc._raw) return doc;
      // IMPORTANT: operate on a CLONE so we never mutate the stored record
      // (e.g. .select('-password') must not delete password from the store).
      const clonedRaw = cloneValue(doc._raw);
      if (exclusions.length) {
        exclusions.forEach((f) => delete clonedRaw[f.slice(1)]);
      } else if (inclusions.length) {
        Object.keys(clonedRaw).forEach((key) => {
          if (!inclusions.includes(key) && key !== '_id') delete clonedRaw[key];
        });
      }
      return wrapDoc(doc._modelName, clonedRaw);
    };
    return Array.isArray(result) ? result.map(transform) : result ? transform(result) : result;
  };

  const query = {
    sort(spec) {
      state.sort = { ...(state.sort || {}), ...spec };
      return query;
    },
    limit(value) {
      state.limit = value;
      return query;
    },
    select(fields) {
      state.select = fields;
      return query;
    },
    populate(path, select) {
      state.populates.push({ path, select });
      return query;
    },
    lean() {
      return query;
    },
    then(resolveFn, rejectFn) {
      try {
        let result = resolve();
        if (state.select) result = applyFieldSelection(result);
        return Promise.resolve(result).then(resolveFn, rejectFn);
      } catch (err) {
        return Promise.reject(err).then(resolveFn, rejectFn);
      }
    },
    catch(rejectFn) {
      return query.then((value) => value, rejectFn);
    },
    finally(callback) {
      return query.then(
        (value) => { callback(); return value; },
        (err) => { callback(); throw err; }
      );
    }
  };
  return query;
};
// ---------------------------------------------------------------------------
// Model statics (patch / unpatch)
// ---------------------------------------------------------------------------

const originalStatics = new Map();

const patchModel = (modelName, model) => {
  if (originalStatics.has(modelName)) return;

  const statics = {
    find: (filter = {}) => createQuery(modelName, filter, false),
    findOne: (filter = {}) => createQuery(modelName, filter, true),
    findById: (id) => createQuery(modelName, { _id: id }, true),

    countDocuments: async (filter = {}) => collectionFor(modelName).filter((raw) => matches(raw, filter)).length,

    exists: async (filter = {}) => {
      const found = collectionFor(modelName).find((item) => matches(item, filter));
      // Return a detached clone (truthy doc) — never expose the mutable raw record.
      return found ? wrapDoc(modelName, cloneValue(found)) : null;
    },

    create: async (docs) => {
      const input = Array.isArray(docs) ? docs : [docs];
      const created = input.map((data) => {
        const raw = cloneValue(data);
        if (!raw._id) raw._id = createId();
        // Apply schema defaults for top-level fields not already set
        if (model.schema && model.schema.paths) {
          for (const [path, schemaType] of Object.entries(model.schema.paths)) {
            if (path.includes('.') || path === '_id') continue;
            if (raw[path] === undefined && schemaType.defaultValue !== undefined) {
              raw[path] = typeof schemaType.defaultValue === 'function'
                ? schemaType.defaultValue()
                : cloneValue(schemaType.defaultValue);
            }
          }
        }
        if (modelName === 'User') {
          const plain = raw.password;
          if (plain && !String(plain).startsWith('$2')) raw.password = bcrypt.hashSync(plain, 10);
        }
        pushRecord(modelName, raw);
        return wrapDoc(modelName, raw);
      });
      return input.length > 1 ? created : created[0];
    },

    insertMany: async (docs) => {
      const created = await statics.create(docs);
      return Array.isArray(created) ? created : [created];
    },

    findByIdAndUpdate: async (id, update, options = {}) => {
      const raw = collectionFor(modelName).find((item) => compareValues(item._id, id));
      if (!raw) return null;
      const before = cloneValue(raw);
      applyUpdate(raw, update);
      raw.updatedAt = new Date();
      return options.new ? wrapDoc(modelName, raw) : wrapDoc(modelName, before);
    },

    findByIdAndDelete: async (id) => {
      const index = collectionFor(modelName).findIndex((item) => compareValues(item._id, id));
      if (index === -1) return null;
      const [removed] = store.collections[modelName].splice(index, 1);
      return wrapDoc(modelName, removed);
    },

    findOneAndUpdate: async (filter, update, options = {}) => {
      const index = collectionFor(modelName).findIndex((item) => matches(item, filter));
      let raw;
      if (index === -1) {
        if (!options.upsert) return null;
        raw = { ...cloneValue(filter) };
        Object.keys(raw).forEach((key) => {
          if (raw[key] && typeof raw[key] === 'object' && Object.keys(raw[key]).some((k) => k.startsWith('$'))) delete raw[key];
        });
        applyUpdate(raw, update);
        if (!raw._id) raw._id = createId();
        pushRecord(modelName, raw);
      } else {
        raw = collectionFor(modelName)[index];
        applyUpdate(raw, update);
        raw.updatedAt = new Date();
      }
      return options.new ? wrapDoc(modelName, raw) : wrapDoc(modelName, cloneValue(raw));
    },

    findOneAndDelete: async (filter) => {
      const index = collectionFor(modelName).findIndex((item) => matches(item, filter));
      if (index === -1) return null;
      const [removed] = store.collections[modelName].splice(index, 1);
      return wrapDoc(modelName, removed);
    },

    deleteMany: async (filter = {}) => {
      const before = store.collections[modelName].length;
      store.collections[modelName] = store.collections[modelName].filter((item) => !matches(item, filter));
      return { deletedCount: before - store.collections[modelName].length };
    },

    updateMany: async (filter = {}, update = {}) => {
      let modifiedCount = 0;
      store.collections[modelName].forEach((item) => {
        if (matches(item, filter)) {
          applyUpdate(item, update);
          item.updatedAt = new Date();
          modifiedCount += 1;
        }
      });
      return { modifiedCount, matchedCount: modifiedCount };
    },

    aggregate: async (pipeline = []) => {
      let records = [...collectionFor(modelName)];
      for (const stage of pipeline) {
        if (stage.$match) records = records.filter((raw) => matches(raw, stage.$match));
        else if (stage.$sort) records = applySort(records, stage.$sort);
        else if (stage.$limit) records = records.slice(0, stage.$limit);
        else if (stage.$skip) records = records.slice(stage.$skip);
        else if (stage.$project) records = records.map((raw) => projectRecord(raw, stage.$project));
        else if (stage.$group) records = groupRecords(records, stage.$group);
      }
      return records;
    }
  };

  originalStatics.set(modelName, Object.fromEntries(
    Object.keys(statics)
      .filter((name) => typeof model[name] === 'function')
      .map((name) => [name, model[name]])
  ));

  Object.entries(statics).forEach(([name, fn]) => { model[name] = fn; });
};
const groupRecords = (records, groupSpec) => {
  const groups = new Map();
  records.forEach((raw) => {
    let key;
    if (groupSpec._id && typeof groupSpec._id === 'string' && groupSpec._id.startsWith('$')) {
      key = String(raw[groupSpec._id.slice(1)] ?? '');
    } else {
      key = groupSpec._id === null || groupSpec._id === undefined ? '__all__' : String(groupSpec._id);
    }
    if (!groups.has(key)) groups.set(key, { _id: groupSpec._id === null ? null : key });
    const group = groups.get(key);
    Object.entries(groupSpec).forEach(([field, spec]) => {
      if (field === '_id' || !spec || typeof spec !== 'object') return;
      if (spec.$sum) {
        const sourceField = typeof spec.$sum === 'string' && spec.$sum.startsWith('$') ? spec.$sum.slice(1) : null;
        const value = sourceField ? Number(raw[sourceField]) || 0 : Number(spec.$sum) || 0;
        group[field] = (Number(group[field]) || 0) + value;
      } else if (spec.$count) {
        group[field] = (Number(group[field]) || 0) + 1;
      } else if (spec.$avg) {
        const sourceField = typeof spec.$avg === 'string' && spec.$avg.startsWith('$') ? spec.$avg.slice(1) : null;
        const value = sourceField ? Number(raw[sourceField]) || 0 : Number(spec.$avg) || 0;
        group[`__sum_${field}`] = (Number(group[`__sum_${field}`]) || 0) + value;
        group[`__cnt_${field}`] = (Number(group[`__cnt_${field}`]) || 0) + 1;
      }
    });
  });
  return [...groups.values()].map((group) => {
    Object.keys(group).forEach((key) => {
      if (key.startsWith('__sum_')) {
        const field = key.replace('__sum_', '');
        group[field] = Number(group[key]) / Math.max(1, Number(group[`__cnt_${field}`]));
        delete group[key];
        delete group[`__cnt_${field}`];
      }
    });
    return group;
  });
};

const unpatchModel = (modelName, model) => {
  const saved = originalStatics.get(modelName);
  if (!saved) return;
  Object.entries(saved).forEach(([name, fn]) => { model[name] = fn; });
  originalStatics.delete(modelName);
};

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

const dateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const isoDaysAgo = (days) => dateDaysAgo(days).toISOString().split('T')[0];

const futureDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};
const seed = () => {
  if (store.seeded) return;
  store.seeded = true;
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const currentMonth = todayIso.substring(0, 7);

  // ---------------- Employees ----------------
  const employeeRows = [
    ['Sarah Connor', 'sarah.connor@company.com', 'Management', 'CEO', '', 'Full-time', '2018-01-01', 200000],
    ['Alice Smith', 'alice.smith@company.com', 'Engineering', 'Frontend Developer', 'Bob Jones', 'Full-time', '2023-01-15', 95000],
    ['Bob Jones', 'bob.jones@company.com', 'Engineering', 'Engineering Manager', 'Sarah Connor', 'Full-time', '2021-11-01', 135000],
    ['Charlie Davis', 'charlie.davis@company.com', 'Marketing', 'Marketing Specialist', 'Diana Prince', 'Contract', '2023-06-20', 75000],
    ['Diana Prince', 'diana.prince@company.com', 'Marketing', 'Marketing Director', 'Sarah Connor', 'Full-time', '2020-03-10', 145000],
    ['Evan Wright', 'evan.wright@company.com', 'HR', 'HR Manager', 'Sarah Connor', 'Full-time', '2022-08-05', 110000],
    ['Fiona Gallagher', 'fiona.gallagher@company.com', 'Finance', 'Payroll Specialist', 'George Bluth', 'Full-time', '2024-01-10', 80000],
    ['George Bluth', 'george.bluth@company.com', 'Finance', 'Finance Director', 'Sarah Connor', 'Full-time', '2019-05-15', 160000],
    ['Hannah Baker', 'hannah.baker@company.com', 'Engineering', 'QA Engineer', 'Bob Jones', 'Full-time', '2024-06-01', 82000],
    ['Ian Turner', 'ian.turner@company.com', 'Marketing', 'Content Strategist', 'Diana Prince', 'Part-time', '2025-02-10', 46000]
  ];
  const rawEmployees = employeeRows.map(([name, email, department, position, manager, employmentType, joiningDate, salary], index) => ({
    _id: createId(),
    name,
    email,
    phone: `+1 (555) 000-${String(1000 + index)}`,
    address: `${100 + index} Sample St, New York, NY`,
    department,
    position,
    manager,
    employmentType,
    joiningDate,
    status: 'Active',
    salary,
    bonus: index % 3 === 0 ? 10 : 0,
    bankName: 'First Trust Bank',
    accountName: name,
    accountNumber: `0000${4000 + index}`,
    routingNumber: '021000021',
    timeZone: 'America/New_York',
    schedule: 'standard',
    workingScheduleId: null
  }));
  rawEmployees.forEach((raw) => pushRecord('Employee', raw));

  // ---------------- Departments ----------------
  [
    ['Engineering', 'Software development and technical operations', 'Bob Jones'],
    ['Marketing', 'Brand, growth and communications', 'Diana Prince'],
    ['HR', 'Human resources and people operations', 'Evan Wright'],
    ['Finance', 'Finance, payroll and accounting', 'George Bluth'],
    ['Management', 'Executive leadership', 'Sarah Connor']
  ].forEach(([name, description, head]) => pushRecord('Department', {
    _id: createId(), name, description, head, isActive: true
  }));

  // ---------------- Users ----------------
  const roleByEmail = {
    'sarah.connor@company.com': 'ADMIN',
    'evan.wright@company.com': 'HR_MANAGER',
    'fiona.gallagher@company.com': 'HR_PAYROLL_MANAGER',
    'hannah.baker@company.com': 'HR_PAYROLL_USER'
  };
  const rawUsers = rawEmployees.map((employee) => ({
    _id: createId(),
    name: employee.name,
    email: employee.email,
    password: bcrypt.hashSync('password123', 10),
    role: roleByEmail[employee.email] || 'EMPLOYEE',
    employeeId: employee._id,
    isActive: true,
    resetPasswordToken: null,
    resetPasswordExpire: null
  }));
  rawUsers.forEach((raw) => pushRecord('User', raw));
  const userByEmail = Object.fromEntries(rawUsers.map((u) => [u.email, u]));
// ---------------- Working schedules ----------------
  const scheduleDefs = [
    ['Standard 9-5', 'FIXED', 40, [['Monday', '09:00', '17:00'], ['Tuesday', '09:00', '17:00'], ['Wednesday', '09:00', '17:00'], ['Thursday', '09:00', '17:00'], ['Friday', '09:00', '17:00']]],
    ['Flexible Core Hours', 'FLEXIBLE', 35, [['Monday', '08:00', '16:00'], ['Tuesday', '08:00', '16:00'], ['Wednesday', '08:00', '16:00'], ['Thursday', '08:00', '16:00'], ['Friday', '08:00', '15:00']]],
    ['Shift B', 'SHIFT', 35, [['Monday', '12:00', '20:00'], ['Tuesday', '12:00', '20:00'], ['Wednesday', '12:00', '20:00'], ['Thursday', '12:00', '20:00'], ['Friday', '12:00', '20:00']]]
  ];
  scheduleDefs.forEach(([name, type, weeklyHours, pattern]) => pushRecord('WorkingSchedule', {
    _id: createId(),
    name,
    type,
    weeklyPattern: pattern.map(([day, startTime, endTime]) => ({ day, startTime, endTime, breakDuration: 0 })),
    weeklyHours,
    active: true
  }));

  // ---------------- Contracts ----------------
  const fourMonthsFromNow = new Date();
  fourMonthsFromNow.setMonth(fourMonthsFromNow.getMonth() + 3);
  rawEmployees.forEach((employee) => {
    const isFixed = employee.employmentType === 'Contract';
    const start = new Date(employee.joiningDate);
    const end = isFixed ? new Date(start.getTime() + 4 * 365 * 86400000) : null;
    pushRecord('Contract', {
      _id: createId(),
      employeeId: employee._id,
      employeeName: employee.name,
      contractType: isFixed ? 'Fixed Term' : 'Indefinite',
      startDate: employee.joiningDate,
      endDate: end ? end.toISOString().split('T')[0] : null,
      salary: employee.salary,
      wage: Math.round((employee.salary / 12) * 100) / 100,
      department: employee.department,
      position: employee.position,
      salaryStructureId: null,
      workingScheduleId: null,
      status: isFixed && end < fourMonthsFromNow ? 'Expiring' : 'Active',
      renewalStatus: isFixed ? 'Pending' : 'Not Applicable'
    });
  });

  // ---------------- Time-off types & allocations ----------------
  const timeOffTypes = [
    ['Annual Leave', 'AL', true],
    ['Sick Leave', 'SL', true],
    ['Unpaid Leave', 'UL', false],
    ['Maternity / Paternity', 'MPL', true]
  ].map(([name, code, allocationRequired]) => pushRecord('TimeOffType', {
    _id: createId(), name, code, unit: 'DAYS', allocationRequired, approvalWorkflow: true, payrollIntegration: false, active: true
  }));
  const timeOffTypeByName = Object.fromEntries(timeOffTypes.map((t) => [t.name, t]));

  rawEmployees.slice(1).forEach((employee, index) => {
    const allocated = employee.employmentType === 'Part-time' ? 12 : 20;
    const taken = index % 4;
    pushRecord('TimeOffAllocation', {
      _id: createId(),
      employeeId: employee._id,
      timeOffTypeId: timeOffTypeByName['Annual Leave']._id,
      allocatedAmount: allocated,
      takenAmount: taken,
      remainingAmount: allocated - taken,
      validityStart: new Date(`${today.getFullYear()}-01-01T00:00:00.000Z`),
      validityEnd: new Date(`${today.getFullYear()}-12-31T00:00:00.000Z`),
      status: 'AVAILABLE',
      approvedBy: userByEmail['sarah.connor@company.com']._id,
      approvedAt: new Date()
    });
  });
// ---------------- Attendance history ----------------
  const attendanceSeed = [];
  for (let daysBack = 12; daysBack >= 1; daysBack -= 1) {
    const day = dateDaysAgo(daysBack);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateString = day.toISOString().split('T')[0];
    rawEmployees.slice(1).forEach((employee, index) => {
      const isLate = (index + daysBack) % 6 === 0;
      const isAbsent = (index + daysBack) % 9 === 0 && daysBack > 2;
      attendanceSeed.push({
        _id: createId(),
        employeeId: employee._id,
        employeeName: employee.name,
        date: dateString,
        checkIn: isAbsent ? null : isLate ? '09:14' : '08:58',
        checkOut: isAbsent ? null : '17:02',
        status: isAbsent ? 'Absent' : isLate ? 'Late' : 'Present',
        workingHours: isAbsent ? 0 : 8
      });
    });
  }
  // Today is always recorded so the dashboard and the employee clock-in widget
  // have live data even on weekends. Alice stays "clocked in" for the demo.
  const alice = rawEmployees.find((e) => e.email === 'alice.smith@company.com');
  rawEmployees.slice(1).forEach((employee, index) => {
    attendanceSeed.push({
      _id: createId(),
      employeeId: employee._id,
      employeeName: employee.name,
      date: todayIso,
      checkIn: index % 5 === 0 ? '09:14' : '08:56',
      checkOut: null,
      status: index % 5 === 0 ? 'Late' : 'Present',
      workingHours: 0
    });
  });
  attendanceSeed
    .filter((raw) => raw.date === todayIso && String(raw.employeeId) === String(alice._id))
    .forEach((raw) => {
      raw.checkOut = null;
      raw.workingHours = 0;
    });
  attendanceSeed.forEach((raw) => pushRecord('Attendance', raw));

  // ---------------- Leave requests ----------------
  const bob = rawEmployees.find((e) => e.name === 'Bob Jones');
  const charlie = rawEmployees.find((e) => e.name === 'Charlie Davis');
  const diana = rawEmployees.find((e) => e.name === 'Diana Prince');
  const sarah = userByEmail['sarah.connor@company.com'];
  const leaveDefs = [
    [bob, 'Annual Leave', 'Annual Leave', 5, false, futureDate(7), futureDate(11), 'Pending', 'Family vacation', null, null],
    [charlie, 'Sick Leave', 'Sick Leave', 2, false, isoDaysAgo(2), isoDaysAgo(1), 'Approved', 'Medical appointment', sarah._id, dateDaysAgo(3)],
    [diana, 'Annual Leave', 'Annual Leave', 3, false, isoDaysAgo(12), isoDaysAgo(10), 'Approved', 'Conference', sarah._id, dateDaysAgo(14)],
    [alice, 'Annual Leave', 'Annual Leave', 1, false, futureDate(20), futureDate(20), 'Pending', 'Personal day', null, null]
  ];
  leaveDefs.forEach(([employee, type, typeName, duration, balanceDeducted, startDate, endDate, status, reason, reviewedBy, reviewedAt]) => {
    pushRecord('Leave', {
      _id: createId(),
      employeeId: employee._id,
      employeeName: employee.name,
      type,
      timeOffTypeId: timeOffTypeByName[typeName]._id,
      duration,
      balanceDeducted,
      startDate,
      endDate,
      status,
      reason,
      reviewedBy,
      reviewedAt
    });
  });
// ---------------- Salary rules & structure ----------------
  const ruleDefs = [
    ['Basic Salary', 'BASIC', 'BASIC', 1, 'FIXED', 0, 0, ''],
    ['Housing Allowance', 'HOUSING', 'ALLOWANCE', 2, 'PERCENTAGE', 0, 15, ''],
    ['Transport Allowance', 'TRANSPORT', 'ALLOWANCE', 3, 'FIXED', 200, 0, ''],
    ['Gross Salary', 'GROSS', 'GROSS', 4, 'FORMULA', 0, 0, 'BASIC+HOUSING+TRANSPORT'],
    ['Income Tax', 'TAX', 'DEDUCTION', 5, 'PERCENTAGE', 0, 20, ''],
    ['Pension', 'PENSION', 'CONTRIBUTION', 6, 'PERCENTAGE', 0, 5, ''],
    ['Net Salary', 'NET', 'NET', 7, 'FORMULA', 0, 0, 'GROSS-TAX-PENSION']
  ];
  const rules = ruleDefs.map(([name, code, category, sequence, calculationMethod, fixedAmount, percentage, formula]) => {
    return pushRecord('SalaryRule', {
      _id: createId(), name, code, category, sequence, calculationMethod, fixedAmount, percentage, formula, active: true
    });
  });
  const structure = pushRecord('SalaryStructure', {
    _id: createId(),
    name: 'Standard Monthly Structure',
    code: 'STANDARD_MONTHLY',
    description: 'Basic salary + housing & transport allowances, income tax, and pension.',
    rules: rules.map((r) => r._id),
    active: true
  });

  const monthlyBasic = (employee) => {
    const contract = store.collections.Contract.find((c) => String(c.employeeId) === String(employee._id));
    return Math.round((contract?.wage || employee.salary / 12) * 100) / 100;
  };

  rawEmployees.forEach((employee) => {
    const contract = store.collections.Contract.find((c) => String(c.employeeId) === String(employee._id));
    if (contract) contract.salaryStructureId = structure._id;
  });

  const buildCalc = (employeeList) => {
    const populatedRules = wrapMany('SalaryRule', rules);
    return employeeList.map((employee) => {
      const basic = monthlyBasic(employee);
      const calc = executeSalaryRules(populatedRules, basic);
      return {
        employeeId: employee._id,
        employeeName: employee.name,
        basicSalary: calc.basicSalary,
        allowances: calc.allowances,
        grossSalary: calc.grossSalary,
        deductions: calc.deductions,
        taxes: calc.taxes,
        netSalary: calc.netSalary
      };
    });
  };
// ---------------- Payroll (6 historical paid runs + current month draft) ----------------
  const fiona = userByEmail['fiona.gallagher@company.com'];
  const historicalRuns = [];
  for (let monthOffset = 6; monthOffset >= 1; monthOffset -= 1) {
    const runStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const runEnd = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0);
    const period = `${runStart.getFullYear()}-${String(runStart.getMonth() + 1).padStart(2, '0')}`;
    const factor = 1 + (6 - monthOffset) * 0.01;
    const employeesCalc = buildCalc(rawEmployees).map((emp) => ({
      ...emp,
      grossSalary: Math.round(emp.grossSalary * factor * 100) / 100,
      netSalary: Math.round(emp.netSalary * factor * 100) / 100
    }));
    const totals = employeesCalc.reduce((acc, e) => ({
      gross: acc.gross + e.grossSalary,
      ded: acc.ded + e.deductions,
      net: acc.net + e.netSalary
    }), { gross: 0, ded: 0, net: 0 });
    const created = runEnd;
    const run = pushRecord('Payroll', {
      _id: createId(),
      period,
      name: `Payroll ${period}`,
      periodStart: runStart,
      periodEnd: runEnd,
      salaryStructureId: structure._id,
      status: 'Paid',
      employees: employeesCalc,
      totalGross: Math.round(totals.gross * 100) / 100,
      totalDeductions: Math.round(totals.ded * 100) / 100,
      totalNet: Math.round(totals.net * 100) / 100,
      approvedBy: fiona._id,
      approvedAt: created,
      processedBy: fiona._id,
      processedAt: created,
      createdAt: created,
      updatedAt: created
    });
    historicalRuns.push(run);
  }

  // Latest paid run -> payslips
  const latestRun = historicalRuns[historicalRuns.length - 1];
  latestRun.employees.forEach((emp) => {
    pushRecord('Payslip', {
      _id: createId(),
      payrunId: latestRun._id,
      period: latestRun.period,
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      basicSalary: emp.basicSalary,
      allowances: emp.allowances,
      grossSalary: emp.grossSalary,
      deductions: emp.deductions,
      taxes: emp.taxes,
      netSalary: emp.netSalary,
      salaryStructureId: structure._id,
      ruleResults: [],
      paymentStatus: 'PAID',
      generatedAt: latestRun.processedAt
    });
  });

  // Current month -> Draft payrun
  const draftStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const draftEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  pushRecord('Payroll', {
    _id: createId(),
    period: currentMonth,
    name: `Payroll ${currentMonth}`,
    periodStart: draftStart,
    periodEnd: draftEnd,
    salaryStructureId: structure._id,
    status: 'Draft',
    employees: rawEmployees.map((employee) => {
      const basic = monthlyBasic(employee);
      return {
        employeeId: employee._id,
        employeeName: employee.name,
        basicSalary: basic,
        allowances: 0,
        grossSalary: 0,
        deductions: 0,
        taxes: 0,
        netSalary: 0
      };
    }),
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    approvedBy: null,
    approvedAt: null,
    processedBy: null,
    processedAt: null
  });
// ---------------- Settings ----------------
  const settingDefs = [
    ['company', 'name', 'SambaPay Inc.', 'text'],
    ['company', 'address', '123 Business Ave, Suite 100', 'text'],
    ['company', 'contactEmail', 'hr@company.com', 'text'],
    ['company', 'currency', 'USD', 'text'],
    ['company', 'taxId', 'US-00-1234567', 'text'],
    ['hr', 'leaveTypes', ['Annual Leave', 'Sick Leave', 'Unpaid Leave', 'Maternity / Paternity'], 'json'],
    ['hr', 'probationPeriod', 90, 'number'],
    ['payroll', 'schedule', 'Monthly', 'text'],
    ['payroll', 'taxRate', 0.2, 'number'],
    ['security', 'passwordMinLength', 6, 'number']
  ];
  settingDefs.forEach(([category, key, value, type]) => pushRecord('Setting', {
    _id: createId(), category, key, value, type, isSensitive: false
  }));

  // ---------------- Notifications ----------------
  const notifDefs = [
    [userByEmail['sarah.connor@company.com']._id, 'September payroll is ready for review.', false],
    [userByEmail['sarah.connor@company.com']._id, 'Bob Jones submitted a time-off request.', false],
    [userByEmail['evan.wright@company.com']._id, 'Employee contracts are up for renewal review next month.', false],
    [userByEmail['fiona.gallagher@company.com']._id, 'The current payroll draft has 10 employees ready to calculate.', true],
    [userByEmail['alice.smith@company.com']._id, 'Your leave request was approved by HR.', true]
  ];
  notifDefs.forEach(([userId, message, read], index) => pushRecord('Notification', {
    _id: createId(),
    userId: String(userId),
    message,
    read,
    createdAt: dateDaysAgo(index),
    updatedAt: dateDaysAgo(index)
  }));
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let installed = false;
let originalStartSession;

export const isStoreInstalled = () => installed;

export const getStore = () => store;

export const installInMemoryStore = () => {
  if (installed) return;
  seed();
  Object.entries(ALL_MODELS).forEach(([name, model]) => patchModel(name, model));

  // processPayroll opens a transaction via mongoose.startSession(). With no DB
  // we substitute a no-op session so the same controller code path works.
  originalStartSession = mongoose.startSession;
  mongoose.startSession = () => ({
    startTransaction() {},
    commitTransaction: async () => {},
    abortTransaction: async () => {},
    endSession() {}
  });

  installed = true;
};

export const removeInMemoryStore = () => {
  if (!installed) return;
  Object.entries(ALL_MODELS).forEach(([name, model]) => unpatchModel(name, model));
  if (originalStartSession === undefined) delete mongoose.startSession;
  else mongoose.startSession = originalStartSession;
  installed = false;
};

export default { isStoreInstalled, getStore, installInMemoryStore, removeInMemoryStore };