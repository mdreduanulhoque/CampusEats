// Client side authentication helper
const Auth = {
  getToken() {
    return localStorage.getItem('campuseats_token');
  },

  getUser() {
    const userStr = localStorage.getItem('campuseats_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem('campuseats_token', token);
    localStorage.setItem('campuseats_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('campuseats_token');
    localStorage.removeItem('campuseats_user');
  },

  logout() {
    this.clearSession();
    window.location.href = '/login';
  },

  // Check route access based on required role
  checkAccess(requiredRole = null) {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      window.location.href = '/login';
      return false;
    }

    if (requiredRole && user.role !== requiredRole) {
      alert(`Access denied. You need ${requiredRole} privileges.`);
      // Redirect to correct dashboard based on role
      if (user.role === 'admin') window.location.href = '/admin';
      else if (user.role === 'kitchen') window.location.href = '/kitchen';
      else window.location.href = '/';
      return false;
    }

    return user;
  },

  // Redirect if already logged in (used on login/register pages)
  redirectIfAuthenticated() {
    const user = this.getUser();
    if (user && this.getToken()) {
      if (user.role === 'admin') window.location.href = '/admin';
      else if (user.role === 'kitchen') window.location.href = '/kitchen';
      else window.location.href = '/';
    }
  }
};
