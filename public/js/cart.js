// Cart Manager & Daily Spending Limit Tracker
const Cart = {
  STORAGE_KEY: 'campuseats_cart',

  getCart() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart(cart) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
  },

  addToCart(item, isFreeReward = false) {
    const cart = this.getCart();
    const existing = cart.find(i => i.item_id === item.item_id && i.is_free_reward === isFreeReward);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        item_id: item.item_id,
        name: item.name,
        price: parseFloat(item.price),
        photo_url: item.photo_url,
        quantity: 1,
        is_free_reward: isFreeReward,
        points_required: item.points_required || null
      });
    }

    this.saveCart(cart);
    return cart;
  },

  updateQuantity(itemId, change, isFreeReward = false) {
    let cart = this.getCart();
    const index = cart.findIndex(i => i.item_id === itemId && i.is_free_reward === isFreeReward);

    if (index !== -1) {
      cart[index].quantity += change;
      if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
      }
    }

    this.saveCart(cart);
    return cart;
  },

  removeFromCart(itemId, isFreeReward = false) {
    let cart = this.getCart();
    cart = cart.filter(i => !(i.item_id === itemId && i.is_free_reward === isFreeReward));
    this.saveCart(cart);
    return cart;
  },

  clearCart() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  getCartCount() {
    return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
  },

  getCartTotal() {
    return this.getCart().reduce((sum, item) => {
      const price = item.is_free_reward ? 0.00 : parseFloat(item.price);
      return sum + (price * item.quantity);
    }, 0.00);
  },

  getPointsTotal() {
    return this.getCart().reduce((sum, item) => {
      if (item.is_free_reward && item.points_required) {
        return sum + (parseInt(item.points_required) * item.quantity);
      }
      return sum;
    }, 0);
  }
};
