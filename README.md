# SupplyPulse

Multi-warehouse inventory management REST API built with Node.js, Express, MongoDB and Mongoose.

## Features
- JWT authentication and bcrypt password hashing
- Role-based access: ADMIN, WAREHOUSE_MANAGER, PROCUREMENT_OFFICER
- Product, warehouse and supplier CRUD
- Purchase order creation, approval and receiving
- Transaction-safe stock updates with rollback
- Protection against concurrent duplicate receiving
- Low-stock analytics
- Request validation and centralized error handling
- EventEmitter stock-received audit event
- Safe, non-destructive database seed script
- Jest and Supertest automated tests
- Postman API collection
- Optional Docker configuration

## Requirements
- Node.js 20+
- npm
- MongoDB Atlas or local MongoDB
- Postman (recommended)

## PowerShell Setup
Run from the project directory:
```powershell
Copy-Item .env.example .env
npm install
```
Configure `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_ORIGIN`, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env`. Use a JWT secret of at least 32 characters and a seed administrator password of at least 16 characters. Never commit `.env` or share credentials.

For MongoDB Atlas, create a database user, allow your IP under Network Access, and copy the Node.js driver connection URI into `MONGODB_URI`. URL-encode special characters in the database password.

## Run the API
```powershell
npm run dev
```
For a normal start:
```powershell
npm start
```
Default address: `http://localhost:5000`

Health endpoints:
- `GET /`
- `GET /api/v1/health`

## Seed Sample Data
Configure seed credentials in `.env`, then run:
```powershell
npm run seed
```
The seed script creates or preserves the administrator, sample warehouse, supplier and products. It is non-destructive: it does not clear collections, delete existing records, or reset existing product stock.

## API Routes
All routes use the `/api/v1` prefix.

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Authenticated |
| GET | `/warehouses` | Authenticated |
| POST | `/warehouses` | Admin |
| GET | `/warehouses/:id` | Authenticated |
| PATCH, DELETE | `/warehouses/:id` | Admin |
| GET | `/suppliers` | Authenticated |
| POST | `/suppliers` | Admin or Procurement Officer |
| GET | `/suppliers/:id` | Authenticated |
| PATCH | `/suppliers/:id` | Admin or Procurement Officer |
| DELETE | `/suppliers/:id` | Admin |
| GET | `/products` | Authenticated |
| POST | `/products` | Admin or Warehouse Manager |
| GET | `/products/:id` | Authenticated |
| PATCH | `/products/:id` | Admin or Warehouse Manager |
| DELETE | `/products/:id` | Admin |
| GET | `/analytics/low-stock` | Authenticated |
| GET | `/purchase-orders` | Authenticated |
| POST | `/purchase-orders` | Admin or Procurement Officer |
| GET | `/purchase-orders/:id` | Authenticated |
| PATCH | `/purchase-orders/:id/approve` | Admin |
| PATCH | `/purchase-orders/:id/receive` | Admin or Warehouse Manager |

## Authentication
Register or log in to receive a JWT. Send it with protected requests using:
`Authorization: Bearer YOUR_TOKEN`

## Purchase Order Workflow
1. Procurement Officer or Admin creates a draft purchase order.
2. Admin approves the order.
3. Admin or Warehouse Manager receives it.
4. Stock is incremented and the order becomes `RECEIVED`.

Receiving uses a MongoDB transaction. Failed operations roll back stock and order changes. Conditional status updates prevent concurrent duplicate receiving. Duplicate product lines are accumulated correctly. The stock-received event is emitted only after a successful transaction.

## Tests and Security
Run automated tests:
```powershell
npm test
```
Latest verified result: **11 test suites passed, 57 tests passed.**

Run dependency audit:
```powershell
npm audit
```
Latest verified result: **0 vulnerabilities.**

## Postman
Import `postman/SupplyPulse.postman_collection.json`. The collection contains 25 requests across 8 folders: Health, Authentication, Warehouses, Suppliers, Products, Purchase Orders, Analytics and Cleanup.

Cleanup requests are optional reference-integrity checks. They may return `409 Conflict` when a resource is referenced by a purchase order.

## Docker (Optional)
```powershell
docker compose up --build
```
Docker runtime verification has not been completed. Docker is optional; the API can run locally with MongoDB Atlas.

## Next Development Phase
Complete backend verification and Postman checks before beginning frontend development.

## Out of Scope
Payment and shipping integrations, microservices, Redis/Kubernetes, complex forecasting and live GPS tracking.
