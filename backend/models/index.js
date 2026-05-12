const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Vendor = require('./Vendor');
const Wallet = require('./Wallet');
const Notification = require('./Notification');

// Initialize models
const UserModel = User.init(sequelize);
const ProductModel = Product.init(sequelize);
const OrderModel = Order.init(sequelize);
const CartModel = Cart.init(sequelize);
const CartItemModel = CartItem.init(sequelize);
const VendorModel = Vendor.init(sequelize);
const WalletModel = Wallet.init(sequelize);
const NotificationModel = Notification.init(sequelize);

// Define associations
UserModel.hasOne(VendorModel, { foreignKey: 'userId', as: 'vendor' });
VendorModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

UserModel.hasOne(CartModel, { foreignKey: 'userId', as: 'cart' });
CartModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

CartModel.hasMany(CartItemModel, { foreignKey: 'cartId', as: 'cartItems' });
CartItemModel.belongsTo(CartModel, { foreignKey: 'cartId', as: 'cart' });

CartItemModel.belongsTo(ProductModel, { foreignKey: 'productId', as: 'product' });
ProductModel.hasMany(CartItemModel, { foreignKey: 'productId', as: 'cartItems' });

UserModel.hasMany(OrderModel, { foreignKey: 'buyerId', as: 'orders' });
OrderModel.belongsTo(UserModel, { foreignKey: 'buyerId', as: 'buyer' });

ProductModel.belongsTo(VendorModel, { foreignKey: 'vendorId', as: 'vendor' });
VendorModel.hasMany(ProductModel, { foreignKey: 'vendorId', as: 'products' });

UserModel.hasOne(WalletModel, { foreignKey: 'userId', as: 'wallet' });
WalletModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

UserModel.hasMany(NotificationModel, { foreignKey: 'userId', as: 'notifications' });
NotificationModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User: UserModel,
  Product: ProductModel,
  Order: OrderModel,
  Cart: CartModel,
  CartItem: CartItemModel,
  Vendor: VendorModel,
  Wallet: WalletModel,
  Notification: NotificationModel
};
