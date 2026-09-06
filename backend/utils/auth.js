import jwt from 'jsonwebtoken';

const generateToken = (id, role, email, name, employeeId, organizationId = null) => {
  return jwt.sign({ id, role, email, name, employeeId, organizationId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export { generateToken };
