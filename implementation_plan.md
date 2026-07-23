Here is a streamlined, step-by-step implementation plan for the **CampusEats** web application based on your requirements and specified tech stack (**HTML/CSS/JS, Node.js, MySQL**).

---

## Phase 1: Database Setup & Initial Infrastructure

### 1. Database Schema (`campuseats_simple.sql`)
Verify and structure your MySQL tables:
* **`users`**: `id`, `email`, `password_hash`, `role` (`customer`, `kitchen`, `admin`), `daily_limit`, `loyalty_points`, `created_at`
* **`categories`**: `id`, `name`
* **`menu_items`**: `id`, `category_id`, `name`, `price`, `photo_url`, `prep_time_mins`, `is_reward_eligible`, `points_required`, `is_active`
* **`orders`**: `id`, `user_id`, `total_amount`, `status` (`pending`, `accepted`, `preparing`, `ready`, `picked_up`, `rejected`), `pickup_datetime`, `payment_status` (`unpaid`, `paid`), `earned_points`, `created_at`
* **`order_items`**: `id`, `order_id`, `menu_item_id`, `quantity`, `price_at_purchase`, `is_redeemed_with_points`
* **`reviews`**: `id`, `user_id`, `menu_item_id`, `rating`, `comment`, `created_at`

### 2. Node.js Project Initialization
* Set up Express server (`server.js`).
* Configure `mysql2` connection pool to query your database.
* Set up standard middleware: `express.json()`, `express.urlencoded()`, static file serving for the frontend folder.

---

## Phase 2: Authentication & User Roles

### 1. Authentication System
* Implement API endpoints:
  * `POST /api/auth/register` (Customer registration: hash password using `bcryptjs`).
  * `POST /api/auth/login` (Returns JWT token or session containing `userId` and `role`).
* Middleware (`authMiddleware`, `roleMiddleware`):
  * Protect routes based on roles (`customer`, `kitchen`, `admin`).

### 2. Basic Frontend Shell
* Build simple HTML layouts for:
  * Authentication: `login.html`, `register.html`
  * Role dashboards: `index.html` (Customer), `kitchen.html` (Kitchen), `admin.html` (Admin).

---

## Phase 3: Menu Management & Customer Catalog

### 1. Admin Menu APIs & UI
* **Backend:**
  * `POST /api/admin/categories` & `GET /api/categories`
  * CRUD endpoints for menu items: `POST`, `PUT`, `DELETE` `/api/admin/menu`
* **Frontend:** Admin tab to manage categories, toggle item availability (`is_active`), set prices, and configure prep times.

### 2. Customer Menu Browsing
* **Backend:** `GET /api/menu` (Fetch active items joined with average ratings).
* **Frontend:**
  * Display menu items grouped by category with image, name, price, prep time, and rating.

---

## Phase 4: Cart, Daily Limit & Order Checkout

### 1. Cart & Client-Side Validation
* Client-side JavaScript cart using `localStorage`.
* **Daily Spending Limit Check:**
  * Read user’s daily spending limit from profile.
  * Calculate running total of today's placed orders + current cart total. Block checkout button if the limit is exceeded.

### 2. Order Placement
* **Backend Endpoint:** `POST /api/orders`
  * Verify user's daily spending limit on the server side against today's existing paid/pending orders.
  * Create transaction in MySQL: insert record into `orders` and corresponding rows into `order_items`.
  * Initial status: `pending`. Payment status: `unpaid`.

---

## Phase 5: Kitchen Workflow & Cash Handling

### 1. Kitchen Order View
* **Backend:** `GET /api/kitchen/orders` (Sorted by `pickup_datetime`, filterable by `status` and `date`).
* **Frontend (`kitchen.html`):**
  * Card view showing order details: order ID, customer name, pickup time, items, quantities, total, and status.
  * Implement auto-refresh using JavaScript `setInterval` polling every 10 seconds.

### 2. Order Status Transitions & Pickup
* **Backend:** `PATCH /api/kitchen/orders/:id/status`
  * Restrict transitions: `pending` → `accepted`/`rejected` → `preparing` → `ready` → `picked_up`.
  * **Payment & Loyalty Logic:** When status moves to `picked_up`:
    * Set `payment_status = 'paid'`.
    * Increment customer's `loyalty_points` by 1.
* Updates for prep times: `PATCH /api/kitchen/menu/:id/prep-time`.

---

## Phase 6: Customer Loyalty, History & Ratings

### 1. Loyalty Points Redemption
* On checkout, allow customers to redeem eligible items if their loyalty point balance meets requirements (`is_reward_eligible`).
* Adjust checkout calculation accordingly.

### 2. Order History & Reordering
* **Backend:** `GET /api/customer/orders`
* **Frontend:**
  * Show past orders, digital receipts, and real-time order status tracking.
  * **Reorder action:** Add items from a past order directly back into the cart.

### 3. Ratings & Reviews
* Allow customers to rate (1–5 stars) and comment on items from past `picked_up` orders.
* `POST /api/reviews` (Enforce rule: user must have purchased the item).

---

## Phase 7: Admin Dashboard & Sales Analytics

### 1. Admin Management
* Endpoint & UI to create and list `kitchen` and `admin` accounts.
* Manage customer profiles (view, update daily limits).

### 2. Analytics Queries
Create SQL aggregation endpoints filterable by date range:
* **Total Sales & Order Count:** `SUM(total_amount)` where status is `picked_up`.
* **Best-Selling Items:** `GROUP BY menu_item_id ORDER BY SUM(quantity) DESC`.
* **Peak Order Hours:** `GROUP BY HOUR(pickup_datetime) ORDER BY COUNT(*) DESC`.
* **Frontend:** Simple tabular and metric display on the Admin dashboard.

---

## Phase 8: Testing & Refinement

1. **Rule Verification:**
   * Test daily limit boundary checks (client & server side).
   * Verify invalid status updates are blocked (e.g., direct jump from `pending` to `picked_up`).
   * Test loyalty points increments only after cash is received and status is marked `picked_up`.
2. **Polling Check:** Verify the kitchen dashboard auto-updates smoothly every 10 seconds without page reloads.

<!-- PRODUCT_CARD:6166_doc -->