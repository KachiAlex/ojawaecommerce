const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Order = sequelize.define('Order', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      buyerId: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      isGuest: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      guestEmail: {
        type: DataTypes.STRING,
        allowNull: true
      },
      guestPhone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      vendorId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      vendorIds: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      items: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'completed', 'escrow_funded'),
        defaultValue: 'pending'
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'escrow_funded'),
        defaultValue: 'pending'
      },
      paymentMethod: DataTypes.STRING,
      paymentReference: DataTypes.STRING,
      paymentId: DataTypes.STRING,
      refundStatus: {
        type: DataTypes.ENUM('none', 'pending_refund', 'refunded', 'refund_failed'),
        defaultValue: 'none'
      },
      refundAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      refundReason: DataTypes.TEXT,
      refundReference: DataTypes.STRING,
      refundedAt: DataTypes.DATE,
      disputeStatus: {
        type: DataTypes.ENUM('none', 'open', 'under_review', 'resolved', 'closed'),
        defaultValue: 'none'
      },
      disputeReason: DataTypes.TEXT,
      disputeResolution: DataTypes.TEXT,
      disputeCreatedAt: DataTypes.DATE,
      disputeResolvedAt: DataTypes.DATE,
      returnStatus: {
        type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected', 'returned', 'completed'),
        defaultValue: 'none'
      },
      returnReason: DataTypes.TEXT,
      returnRequestedAt: DataTypes.DATE,
      returnApprovedAt: DataTypes.DATE,
      returnRejectedAt: DataTypes.DATE,
      returnTrackingNumber: DataTypes.STRING,
      shippingAddress: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      trackingNumber: DataTypes.STRING,
      estimatedDelivery: DataTypes.DATE,
      actualDelivery: DataTypes.DATE,
      notes: DataTypes.TEXT,
      orderNumber: DataTypes.STRING,
      logisticsPartnerId: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      logisticsMeta: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      deliveryOption: {
        type: DataTypes.STRING,
        allowNull: true
      },
      statusHistory: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      escrowReleased: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      escrowReleasedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      escrowReleasedBy: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'orders',
      timestamps: true
    });

    return Order;
  }
};
