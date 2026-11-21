const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const objectIdPattern = /^[a-fA-F0-9]{24}$/;

export const registerSchema = {
  name: { type: "string", required: true, minLength: 2, maxLength: 80 },
  email: { type: "string", required: true, pattern: emailPattern, maxLength: 254 },
  password: { type: "string", required: true, minLength: 8, maxLength: 128 }
};

export const loginSchema = {
  email: { type: "string", required: true, pattern: emailPattern, maxLength: 254 },
  password: { type: "string", required: true, minLength: 1, maxLength: 128 }
};

export const productSchema = {
  sku: { type: "string", required: true, minLength: 1, maxLength: 50 },
  name: { type: "string", required: true, minLength: 1, maxLength: 120 },
  category: { type: "string", required: true, minLength: 1, maxLength: 80 },
  unitPrice: { type: "number", required: true, min: 0 },
  reorderThreshold: { type: "number", min: 0 },
  stockByWarehouse: {
    type: "array",
    items: {
      warehouse: { type: "string", required: true, pattern: objectIdPattern },
      quantity: { type: "number", min: 0 },
      binLocation: { type: "string", maxLength: 50 }
    }
  },
  isActive: { type: "boolean" }
};

export const warehouseSchema = {
  code: { type: "string", required: true, minLength: 1, maxLength: 30 },
  name: { type: "string", required: true, minLength: 1, maxLength: 120 },
  city: { type: "string", required: true, minLength: 1, maxLength: 80 },
  capacityUnits: { type: "number", min: 0 },
  isActive: { type: "boolean" }
};

export const supplierSchema = {
  name: { type: "string", required: true, minLength: 1, maxLength: 120 },
  email: { type: "string", pattern: emailPattern, maxLength: 254 },
  phone: { type: "string", maxLength: 25 },
  maxLeadDays: { type: "number", min: 0, integer: true },
  isActive: { type: "boolean" }
};

export const purchaseOrderSchema = {
  supplier: { type: "string", required: true, pattern: objectIdPattern },
  warehouse: { type: "string", required: true, pattern: objectIdPattern },
  items: {
    type: "array",
    required: true,
    minItems: 1,
    items: {
      product: { type: "string", required: true, pattern: objectIdPattern },
      quantity: { type: "number", required: true, min: 1 },
      unitPrice: { type: "number", required: true, min: 0 }
    }
  }
};

export function optionalFields(schema) {
  return Object.fromEntries(
    Object.entries(schema).map(([field, rules]) => [
      field,
      { ...rules, required: false }
    ])
  );
}
