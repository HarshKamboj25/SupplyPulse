import { AppError } from "../utils/AppError.js";

function validateValue(value, rules, field, errors) {
  if (value === undefined) {
    if (rules.required) errors.push(`${field} is required`);
    return;
  }

  if (value === null) {
    errors.push(`${field} cannot be null`);
    return;
  }

  if (rules.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${field} must be a string`);
      return;
    }

    const normalized = value.trim();

    if (rules.required && !normalized) {
      errors.push(`${field} cannot be empty`);
      return;
    }

    if (rules.minLength && normalized.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }

    if (rules.maxLength && normalized.length > rules.maxLength) {
      errors.push(`${field} cannot exceed ${rules.maxLength} characters`);
    }

    if (rules.pattern && !rules.pattern.test(normalized)) {
      errors.push(`${field} has an invalid format`);
    }
  }

  if (rules.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(`${field} must be a valid number`);
      return;
    }

    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${field} must be at least ${rules.min}`);
    }

    if (rules.integer && !Number.isInteger(value)) {
      errors.push(`${field} must be an integer`);
    }
  }

  if (rules.type === "boolean" && typeof value !== "boolean") {
    errors.push(`${field} must be a boolean`);
  }

  if (rules.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${field} must be an array`);
      return;
    }

    if (rules.minItems && value.length < rules.minItems) {
      errors.push(`${field} must contain at least ${rules.minItems} item(s)`);
    }

    if (rules.items) {
      value.forEach((item, index) => {
        const itemField = `${field}[${index}]`;

        if (!item || typeof item !== "object" || Array.isArray(item)) {
          errors.push(`${itemField} must be an object`);
          return;
        }

        const allowed = Object.keys(rules.items);
        const unknown = Object.keys(item).filter(
          (key) => !allowed.includes(key)
        );

        if (unknown.length) {
          errors.push(`${itemField} contains unknown fields: ${unknown.join(", ")}`);
        }

        for (const [key, itemRules] of Object.entries(rules.items)) {
          validateValue(item[key], itemRules, `${itemField}.${key}`, errors);
        }
      });
    }
  }
}

export function validateBody(schema, { requireAtLeastOne = false } = {}) {
  return (req, _res, next) => {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return next(new AppError("Request body must be a valid JSON object", 400));
    }

    const allowedFields = Object.keys(schema);
    const receivedFields = Object.keys(body);

    const unknownFields = receivedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (unknownFields.length) {
      return next(
        new AppError(`Unknown fields: ${unknownFields.join(", ")}`, 400)
      );
    }

    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      validateValue(body[field], rules, field, errors);
    }

    if (requireAtLeastOne && receivedFields.length === 0) {
      errors.push("At least one field must be provided");
    }

    if (errors.length) {
      return next(new AppError(errors.join(", "), 400));
    }

    for (const [field, rules] of Object.entries(schema)) {
      if (rules.type === "string" && typeof body[field] === "string") {
        body[field] = body[field].trim();
      }
    }

    next();
  };
}
