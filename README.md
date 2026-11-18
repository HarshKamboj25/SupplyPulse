# SupplyPulse

**SupplyPulse** is a compact, backend-first capstone: a multi-warehouse inventory management REST API built with Node.js, Express, MongoDB Atlas and Mongoose.

It is intentionally scoped for a short academic sprint. It is not a full ERP, payment platform, or microservices system.

## Included

- MVC-style structure: routes, controllers, models and middleware
- Register/login with bcrypt password hashing and JWT
- Role-based access: `ADMIN`, `WAREHOUSE_MANAGER`, `PROCUREMENT_OFFICER`
- CRUD for products, warehouses and suppliers
- Purchase order creation and receiving
- Stock receiving updates warehouse stock
- Low-stock analytics endpoint
- Request validation and centralized error handling
- EventEmitter audit event example
- Seed script, Jest/Supertest starter test, Postman collection
- Dockerfile and compose file (optional)

## Requirements

- Node.js 20+
- npm
- MongoDB Atlas account (or local MongoDB)
- Postman (recommended)

## PowerShell setup (terminal-based)

Open PowerShell in the extracted `SupplyPulse` folder.

```powershell
Copy-Item .env.example .env
npm install
```

Open `.env` in VS Code and set `MONGODB_URI` and a long random `JWT_SECRET`.
Do not commit `.env` or share your connection string.

In MongoDB Atlas:
1. Create a free cluster.
2. Create a database user under Database Access.
3. Add your current IP under Network Access.
4. Choose Connect > Drivers > Node.js and copy the URI.
5. Replace the placeholder URI in `.env`. URL-encode special characters in the database password.

Run:

```powershell
npm run dev
```

Expected startup message:
`SupplyPulse API running on http://localhost:5000`

Check:
- `http://localhost:5000/`
- `http://localhost:5000/api/v1/health`

## Seed sample data

In a second terminal, from this folder:

```powershell
npm run seed
```

Seed creates a demo admin user and sample warehouse, supplier and product records. Do not publish or reuse default demo credentials. Configure a secure password for local testing.

**Important:** The seed script clears existing collections before inserting sample data. Run it only against a disposable development database. Never run it against a database containing data you need to preserve.

## Main API routes

All routes are prefixed with `/api/v1`.

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public (new users become procurement officers) |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Authenticated |
| GET/POST | `/warehouses` | Authenticated / Admin |
| GET/PATCH/DELETE | `/warehouses/:id` | Authenticated / Admin |
| GET/POST | `/suppliers` | Authenticated / Admin or Procurement |
| GET/PATCH/DELETE | `/suppliers/:id` | Authenticated / Admin or Procurement |
| GET/POST | `/products` | Authenticated / Admin or Warehouse Manager |
| GET/PATCH/DELETE | `/products/:id` | Authenticated / Admin or Warehouse Manager |
| GET | `/analytics/low-stock` | Authenticated |
| GET/POST | `/purchase-orders` | Authenticated / Procurement or Admin |
| GET | `/purchase-orders/:id` | Authenticated |
| PATCH | `/purchase-orders/:id/approve` | Admin |
| PATCH | `/purchase-orders/:id/receive` | Admin or Warehouse Manager |

### Example login

```json
{
  "email": "YOUR_REGISTERED_EMAIL",
  "password": "YOUR_PASSWORD"
}
```

Send the returned token as:

`Authorization: Bearer YOUR_TOKEN`

### Example product

```json
{
  "sku": "KB-001",
  "name": "Mechanical Keyboard",
  "category": "Accessories",
  "unitPrice": 2499,
  "reorderThreshold": 10,
  "stockByWarehouse": [
    { "warehouse": "WAREHOUSE_OBJECT_ID", "quantity": 25, "binLocation": "A-01" }
  ]
}
```

### Purchase order workflow

1. Procurement officer creates a purchase order with one or more product lines.
2. Admin approves it.
3. Admin or warehouse manager receives it.
4. Receiving increments the selected warehouse stock and marks the order `RECEIVED`.

Purchase order receiving uses a MongoDB session and transaction. The purchase order status update and warehouse stock increments are performed within the same transaction, so a failed operation rolls back the changes. The stock-received event is emitted after the transaction succeeds.

For production workloads, also consider request idempotency and additional safeguards against duplicate receiving requests.

## Tests

```powershell
npm test
```

The current test suite contains three test files covering the health endpoint, purchase order transaction behaviour and end-to-end API workflows. The verified test run completed with **3 test suites passed and 6 tests passed**.

The tests cover transaction success and rollback, authentication, role-based access, purchase order approval and receiving, and stock updates.

## Docker (optional)

```powershell
docker compose up --build
```

The compose file runs the API and a local MongoDB container. If using Atlas instead, run the API locally with your Atlas URI and skip the MongoDB service.

## Suggested 7-day build order

1. Run starter, connect Atlas, test health route.
2. Understand models; test auth and role middleware.
3. Finish product, warehouse and supplier CRUD.
4. Test purchase-order create/approve/receive workflow.
5. Add aggregation reports and indexes.
6. Expand Jest tests, Postman collection and Docker check.
7. Finish README screenshots, API evidence and viva notes.

## Deliberately out of scope

- Payment gateway and shipping integrations
- Microservices, Redis and Kubernetes
- Full React frontend
- Complex forecasting or live GPS tracking

Keep the project focused on a reliable backend and demonstrate each syllabus concept with working API evidence.
