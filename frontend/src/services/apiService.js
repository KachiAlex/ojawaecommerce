// Barrel file — re-exports all services for backward compatibility.
// Individual services live in their own files under services/.
// Import from apiService as before, or import directly from the specific service file.

export { api, getStoredAuthToken } from './api';
export { authService } from './auth';
export { productService } from './products';
export { orderService } from './orders';
export { walletService } from './wallet';
export { reviewsService } from './reviews';
export { supportTicketsService } from './supportTickets';
export { userService } from './users';
export { uploadService } from './uploads';
export { notificationsService } from './notifications';
export { wishlistService } from './wishlist';
export { messagingService } from './messaging';
export { productsService } from './products';
export { disputesService } from './disputes';
export { analyticsService } from './analytics';
export { logisticsService } from './logistics';
export { subscriptionsService } from './subscriptions';
export { adminService } from './admin';

import { authService } from './auth';
import { productService } from './products';
import { orderService } from './orders';
import { walletService } from './wallet';
import { userService } from './users';
import { uploadService } from './uploads';
import { notificationsService } from './notifications';
import { messagingService } from './messaging';
import { wishlistService } from './wishlist';
import { productsService } from './products';
import { disputesService } from './disputes';
import { subscriptionsService } from './subscriptions';
import { analyticsService } from './analytics';
import { reviewsService } from './reviews';
import { supportTicketsService } from './supportTickets';
import { adminService } from './admin';
import { logisticsService } from './logistics';

export default {
  auth: authService,
  product: productService,
  products: productsService,
  order: orderService,
  orders: orderService,
  wallet: walletService,
  user: userService,
  users: userService,
  logistics: logisticsService,
  upload: uploadService,
  notifications: notificationsService,
  messaging: messagingService,
  wishlist: wishlistService,
  disputes: disputesService,
  subscriptions: subscriptionsService,
  analytics: analyticsService,
  reviews: reviewsService,
  supportTickets: supportTicketsService,
  admin: adminService
};
