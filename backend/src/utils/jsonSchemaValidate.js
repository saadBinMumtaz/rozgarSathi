export const validateJsonSchema = (data, requiredFields = []) => {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Output is not an object' };
  }

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }

  return { valid: true };
};

export default validateJsonSchema;
