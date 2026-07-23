Concept: User  pre-order food from the campus canteen and pick it up at a set time.

Functionality:

Users browse the canteen menu with item name,  prices and photos.

First add to cart, then order ,and choose a pickup time, Only cash on pickup.

The kitchen can see incoming orders and mark them ready, whenever they make the item..

Get a digital receipt for pickup and kitchen mark the order as picked up.



Order your favorite meal in one tap.

See estimated wait time (given by kitchen to prepare dish) before ordering.



Ratings and comments on individual menu items.

Admin sales dashboard showing best-selling items and peak order times.

Simple loyalty points that build up with every order and unlock a item for free.



Set a daily spending limit in your profile.

As you add food to your cart, the app tracks the running total and won't let you check out if you go over limit.



Tick stack:

Frontend: HTML, CSS, JS

Backend: Node.js

Database: MySQL

Authentication: Simple email password (register, if first time)


Build a responsive campus canteen web application where customers can:

1. Register and log in using email and password.
2. Browse active menu items with
3. Add menu items to a cart.
4. Change quantities and remove cart items.
5. See a running total.
6. Select an available pickup date and time.
7. Place an order using cash on pickup only.
8. Track the order through:
   - pending
   - accepted
   - preparing
   - ready
   - picked_up
   - rejected
9. See a digital receipt.
10. Reorder a previous order.
11. Rate and comment on menu items they have purchased.
12. Earn 1 loyalty point after a paid order is picked up.
13. Redeem eligible menu items using loyalty points.
14. Set a daily spending limit.
15. Be prevented from ordering when the new paid total would exceed that
    limit.
16. View order history and current loyalty balance.

Kitchen users must be able to:

1. Log in.
2. View incoming orders sorted by pickup time.
3. Filter orders by status and date.
4. Move orders only through valid status transitions.
5. Mark cash as received.
6. Mark an order as picked up.
7. Update estimated preparation times for menu items.
8. See order number, customer name, pickup time, items, quantities, rewards,
   total, payment status, and current status.
9. See new orders without manually reloading the page. Polling every 10
   seconds is acceptable for version 1.

Administrators must be able to:

1. Log in.
2. Create kitchen and administrator users.
3. View and manage users.
4. Create, edit, activate, and deactivate menu items.
5. Create and manage menu categories.
6. Update prices, preparation times, reward eligibility, and photos.
7. View sales totals.
8. View paid and picked-up order counts.
9. View best-selling menu items.
10. View peak order hours.
11. Filter reports by date.
12. View recent orders.