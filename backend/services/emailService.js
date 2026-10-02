const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('⚠️ SMTP not configured - email notifications will be skipped');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  console.log('✅ Email transporter configured');
  return transporter;
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ojawa.com';

const TEMPLATES = {
  order_placed: {
    subject: 'Order Placed Successfully',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour order #${data.orderId} has been placed successfully. Payment is being processed.\n\nThank you for shopping with Ojawa!`
  },
  order_confirmed: {
    subject: 'Order Confirmed',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour order #${data.orderId} has been confirmed by the vendor.\n\nThank you for shopping with Ojawa!`
  },
  order_shipped: {
    subject: 'Order Shipped',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour order #${data.orderId} has been shipped. Track your delivery.\n\nThank you for shopping with Ojawa!`
  },
  order_delivered: {
    subject: 'Order Delivered',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour order #${data.orderId} has been delivered. Please confirm receipt.\n\nThank you for shopping with Ojawa!`
  },
  order_cancelled: {
    subject: 'Order Cancelled',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour order #${data.orderId} has been cancelled. Refund will be processed if applicable.\n\nThank you for shopping with Ojawa!`
  },
  payment_received: {
    subject: 'Payment Received',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nWe've received your payment of ₦${data.amount || 'N/A'} for order #${data.orderId}.\n\nThank you for shopping with Ojawa!`
  },
  payment_released: {
    subject: 'Payment Released',
    body: (data) => `Hi ${data.userName || 'Vendor'},\n\nPayment for order #${data.orderId} has been released to your wallet.\n\nThank you for selling with Ojawa!`
  },
  new_order: {
    subject: 'New Order Received',
    body: (data) => `Hi ${data.userName || 'Vendor'},\n\nYou have received a new order #${data.orderId} for ₦${data.amount || 'N/A'}.\n\nPlease log in to your vendor dashboard to process it.`
  },
  dispute_created: {
    subject: 'Dispute Created',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nA dispute has been created for order #${data.orderId}. Our team will review and resolve it.\n\nOjawa Support`
  },
  dispute_resolved: {
    subject: 'Dispute Resolved',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nThe dispute for order #${data.orderId} has been resolved.\n\nOjawa Support`
  },
  return_requested: {
    subject: 'Return Requested',
    body: (data) => `Hi ${data.userName || 'Vendor'},\n\nA return has been requested for order #${data.orderId}. Please review it in your dashboard.\n\nOjawa Support`
  },
  return_update: {
    subject: 'Return Status Update',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour return request for order #${data.orderId} has been updated.\n\nOjawa Support`
  },
  wallet_funded: {
    subject: 'Wallet Funded',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour wallet has been funded with ₦${data.amount || 'N/A'}.\n\nOjawa`
  },
  wallet_low_balance: {
    subject: 'Low Wallet Balance',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYour wallet balance is running low (₦${data.amount || 'N/A'}). Consider topping up.\n\nOjawa`
  },
  message_received: {
    subject: 'New Message',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\nYou have received a new message: "${data.message || ''}"\n\nLog in to view and respond.\n\nOjawa`
  },
  system_update: {
    subject: 'System Update',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\n${data.message || 'There is a new system update.'}\n\nOjawa`
  },
  promotion: {
    subject: 'Special Offer',
    body: (data) => `Hi ${data.userName || 'Customer'},\n\n${data.message || 'Check out our latest offers!'}\n\nOjawa`
  }
};

const sendEmail = async ({ to, type, data = {} }) => {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };

  const template = TEMPLATES[type];
  if (!template) {
    console.warn(`No email template for notification type: ${type}`);
    return { sent: false, reason: 'No template' };
  }

  try {
    const info = await t.sendMail({
      from: `"Ojawa" <${FROM_EMAIL}>`,
      to,
      subject: template.subject,
      text: template.body(data)
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = { sendEmail, getTransporter };
