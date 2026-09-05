import { validationResult } from 'express-validator';

const validate = (validations) => {
  return async (req, res, next) => {
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.path || err.param, message: err.msg }))
    });
  };
};

export default validate;
