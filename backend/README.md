# FITGEAR Backend

Backend for FITGEAR using Hono + Bun + MongoDB.

## Features

- Full CRUD for Categories and Products
- Product image upload (multipart, JPG/PNG/WEBP/GIF, served from `/uploads`)
- Request validation with Zod
- Consistent error handling with status codes
- Optional product filter/search/sort in the list endpoint
- Users endpoints with Clerk sync (`/api/users/sync-clerk`) and role assignment (`ADMIN` / `CUSTOMER`)
- Server-side RBAC: admin operations (product/category writes, user reads, and the `/api/admin/*` namespace) require a valid Clerk JWT **and** the `ADMIN` role — a `CUSTOMER` gets `403`. Enforced by `requireAdminMiddleware`, verified on every request
- Orders and OrderItems creation with total/subtotal from real product prices
- Transactional write with fallback for standalone MongoDB
- Stripe checkout, payment confirmation and webhook handling
- Failed-payment webhook (`payment_intent.payment_failed`): marks the order `FAILED`, emails the customer retry instructions, and records the event in the audit log (HU-28)
- Transactional email via SendGrid with async delivery + up to 3 retries (exponential backoff, transient failures only); every send is audited in `NotificationLog`

## Requirements

- Bun >= 1.2
- MongoDB running locally or remotely

## Environment variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Variables:

- `PORT`: API port
- `MONGODB_URI`: MongoDB connection string
- `CLERK_SECRET_KEY`: Clerk backend secret key
- `FRONTEND_URL`: frontend base URL for Stripe success/cancel redirects
- `BACKEND_URL`: backend base URL (used to build absolute image URLs)
- `STRIPE_SECRET_KEY`: Stripe secret API key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `SENDGRID_API_KEY`: SendGrid API key for transactional emails (optional — when absent, emails are logged instead of sent)
- `EMAIL_FROM`: SendGrid Single-Sender-verified sender for transactional emails (e.g. `FITGEAR <you@example.com>`)

## Install dependencies

```bash
bun install
```

## Run backend

Development (watch mode):

```bash
bun run dev
```

Start:

```bash
bun run start
```

## API base routes

- `GET /api/health`
- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/users`
- `GET /api/users/:id`
- `GET /api/users/email/:email`
- `POST /api/users/sync-clerk`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `GET /api/orders/user/:userId`
- `POST /api/payments/create-checkout-session`
- `POST /api/payments/confirm-checkout-payment`
- `POST /api/payments/webhook`

## Status codes used

- `200 OK`
- `201 Created`
- `400 Bad Request`
- `404 Not Found`
- `409 Conflict`
- `500 Internal Server Error`

## Quick checks

Health check:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{ "status": "OK" }
```

## CRUD examples

Create category:

```bash
curl -X POST http://localhost:4000/api/categories \
	-H "Content-Type: application/json" \
	-d '{
		"name": "Bandas",
		"description": "Bandas de resistencia para entrenamiento"
	}'
```

Update category:

```bash
curl -X PUT http://localhost:4000/api/categories/<categoryId> \
	-H "Content-Type: application/json" \
	-d '{
		"description": "Bandas de resistencia premium"
	}'
```

Create product (multipart form-data; images are uploaded as files):

```bash
curl -X POST http://localhost:4000/api/products \
	-F "name=Banda Pro XL" \
	-F "description=Banda de alta resistencia" \
	-F "price=49.9" \
	-F "stock=30" \
	-F "categoryId=<categoryId>" \
	-F "isActive=true" \
	-F "images=@banda-pro-xl.jpg"
```

Images are validated as JPG/PNG/WEBP/GIF, max 5MB each, up to 4 per product.

Update product:

```bash
curl -X PUT http://localhost:4000/api/products/<productId> \
	-H "Content-Type: application/json" \
	-d '{
		"price": 59.9,
		"stock": 25
	}'
```

List products with optional query params:

```bash
curl "http://localhost:4000/api/products?categoryId=<categoryId>&search=banda&sortBy=price&sortOrder=asc"
```

## Validation rules

Category:

- `name`: required, non-empty string
- `description`: optional string

Product:

- `name`: required, non-empty string
- `description`: required, non-empty string
- `price`: required number > 0
- `stock`: required number >= 0
- `images`: required, 1 to 4 image files uploaded via multipart (JPG/PNG/WEBP/GIF, max 5MB each)
- `categoryId`: required valid Mongo ObjectId and must exist
- `isActive`: optional boolean, defaults to `true`

User sync-clerk:

- `clerkUserId`: required, non-empty string
- `fullName`: required, non-empty string
- `email`: required valid email
- role rule: `gabigonza449@gmail.com` -> `ADMIN`; any other email -> `CUSTOMER`

Order creation:

- `userId`: required valid Mongo ObjectId
- `items`: required non-empty array
- `items[].productId`: required valid Mongo ObjectId
- `items[].quantity`: required integer > 0

## Users API examples

Sync Clerk user (customer):

```bash
curl -X POST http://localhost:4000/api/users/sync-clerk \
	-H "Content-Type: application/json" \
	-d '{
		"clerkUserId": "user_123456",
		"fullName": "Gabriel Gonzalez",
		"email": "gabriel@example.com"
	}'
```

Sync Clerk user (admin):

```bash
curl -X POST http://localhost:4000/api/users/sync-clerk \
	-H "Content-Type: application/json" \
	-d '{
		"clerkUserId": "user_admin_1",
		"fullName": "Admin Fitgear",
		"email": "gabigonza449@gmail.com"
	}'
```

Get users list:

```bash
curl http://localhost:4000/api/users
```

Get user by id:

```bash
curl http://localhost:4000/api/users/<userId>
```

Get user by email:

```bash
curl http://localhost:4000/api/users/email/gabriel%40example.com
```

## Orders API examples

Create order:

```bash
curl -X POST http://localhost:4000/api/orders \
	-H "Content-Type: application/json" \
	-d '{
		"userId": "<userId>",
		"items": [
			{
				"productId": "<productId1>",
				"quantity": 2
			},
			{
				"productId": "<productId2>",
				"quantity": 1
			}
		]
	}'
```

Get all orders:

```bash
curl http://localhost:4000/api/orders
```

Get order by id:

```bash
curl http://localhost:4000/api/orders/<orderId>
```

Get orders by user:

```bash
curl http://localhost:4000/api/orders/user/<userId>
```

## Payments (Stripe) examples

Create checkout session from an existing order:

```bash
curl -X POST http://localhost:4000/api/payments/create-checkout-session \
	-H "Content-Type: application/json" \
	-d '{
		"orderId": "<orderId>"
	}'
```

Expected response:

```json
{
	"sessionId": "cs_test_...",
	"url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Local webhook forwarding with Stripe CLI:

```bash
stripe listen --forward-to http://localhost:4000/api/payments/webhook
```

This command prints the webhook secret you must place in `STRIPE_WEBHOOK_SECRET`.

MongoDB connection check:

- Server log should print: `MongoDB connected`
- If it fails, server prints `MongoDB connection error` and exits.
