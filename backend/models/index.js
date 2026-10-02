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
const WalletTransaction = require('./WalletTransaction');
const EscrowRelease = require('./EscrowRelease');
const Withdrawal = require('./Withdrawal');
const AdminAuditLog = require('./AdminAuditLog');
const SecurityAuditLog = require('./SecurityAuditLog');
const AnalyticsEvent = require('./AnalyticsEvent');
const Conversation = require('./Conversation');
const Message = require('./Message');
const StockReservation = require('./StockReservation');
const Review = require('./Review');
const LogisticsRoute = require('./LogisticsRoute');
const DeliveryTracking = require('./DeliveryTracking');
const EmailLog = require('./EmailLog');
const AppSetting = require('./AppSetting');
const PromoCampaign = require('./PromoCampaign');

// Initialize models
const UserModel = User.init(sequelize);
const ProductModel = Product.init(sequelize);
const OrderModel = Order.init(sequelize);
const CartModel = Cart.init(sequelize);
const CartItemModel = CartItem.init(sequelize);
const VendorModel = Vendor.init(sequelize);
const WalletModel = Wallet.init(sequelize);
const NotificationModel = Notification.init(sequelize);
const WalletTransactionModel = WalletTransaction.init(sequelize);
const EscrowReleaseModel = EscrowRelease.init(sequelize);
const WithdrawalModel = Withdrawal.init(sequelize);
const AdminAuditLogModel = AdminAuditLog.init(sequelize);
const SecurityAuditLogModel = SecurityAuditLog.init(sequelize);
const AnalyticsEventModel = AnalyticsEvent.init(sequelize);
const ConversationModel = Conversation.init(sequelize);
const MessageModel = Message.init(sequelize);
const StockReservationModel = StockReservation.init(sequelize);
const ReviewModel = Review.init(sequelize);
const LogisticsRouteModel = LogisticsRoute.init(sequelize);
const DeliveryTrackingModel = DeliveryTracking.init(sequelize);
const EmailLogModel = EmailLog.init(sequelize);
const AppSettingModel = AppSetting.init(sequelize);
const PromoCampaignModel = PromoCampaign.init(sequelize);

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

UserModel.hasMany(WalletTransactionModel, { foreignKey: 'userId', as: 'walletTransactions' });
WalletTransactionModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

UserModel.hasMany(WithdrawalModel, { foreignKey: 'userId', as: 'withdrawals' });
WithdrawalModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

OrderModel.hasMany(EscrowReleaseModel, { foreignKey: 'orderId', as: 'escrowReleases' });
EscrowReleaseModel.belongsTo(OrderModel, { foreignKey: 'orderId', as: 'order' });

EscrowReleaseModel.belongsTo(UserModel, { foreignKey: 'vendorId', as: 'vendor' });

ConversationModel.hasMany(MessageModel, { foreignKey: 'conversationId', as: 'messages' });
MessageModel.belongsTo(ConversationModel, { foreignKey: 'conversationId', as: 'conversation' });

UserModel.hasMany(MessageModel, { foreignKey: 'senderId', as: 'sentMessages' });
MessageModel.belongsTo(UserModel, { foreignKey: 'senderId', as: 'sender' });

ProductModel.hasMany(StockReservationModel, { foreignKey: 'productId', as: 'stockReservations' });
StockReservationModel.belongsTo(ProductModel, { foreignKey: 'productId', as: 'product' });

ProductModel.hasMany(ReviewModel, { foreignKey: 'productId', as: 'reviews' });
ReviewModel.belongsTo(ProductModel, { foreignKey: 'productId', as: 'product' });

UserModel.hasMany(LogisticsRouteModel, { foreignKey: 'logisticsPartnerId', as: 'logisticsRoutes' });
LogisticsRouteModel.belongsTo(UserModel, { foreignKey: 'logisticsPartnerId', as: 'logisticsPartner' });

module.exports = {
  sequelize,
  User: UserModel,
  Product: ProductModel,
  Order: OrderModel,
  Cart: CartModel,
  CartItem: CartItemModel,
  Vendor: VendorModel,
  Wallet: WalletModel,
  Notification: NotificationModel,
  WalletTransaction: WalletTransactionModel,
  EscrowRelease: EscrowReleaseModel,
  Withdrawal: WithdrawalModel,
  AdminAuditLog: AdminAuditLogModel,
  SecurityAuditLog: SecurityAuditLogModel,
  AnalyticsEvent: AnalyticsEventModel,
  Conversation: ConversationModel,
  Message: MessageModel,
  StockReservation: StockReservationModel,
  Review: ReviewModel,
  LogisticsRoute: LogisticsRouteModel,
  DeliveryTracking: DeliveryTrackingModel,
  EmailLog: EmailLogModel,
  AppSetting: AppSettingModel,
  PromoCampaign: PromoCampaignModel
};
