const { admin, db } = require('./adminInit');

async function createBuyerAccount() {
  try {
    const buyerEmail = 'buyer.mock@ojawa.test';
    const buyerPassword = 'Buyer@12345';
    
    console.log('Creating mock buyer account...');
    
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(buyerEmail);
      console.log('Buyer account already exists');
    } catch (error) {
      userRecord = await admin.auth().createUser({
        email: buyerEmail,
        password: buyerPassword,
        displayName: 'Mock Buyer',
        emailVerified: true
      });
      console.log('Created new buyer account');
    }

    const uid = userRecord.uid;
    
    // Create/update user profile
    await db.collection('users').doc(uid).set(
      {
        uid,
        email: buyerEmail,
        displayName: 'Mock Buyer',
        phone: '+2348011112222',
        address: '45 Allen Avenue, Ikeja, Lagos, NG',
        role: 'buyer',
        isVendor: false,
        isLogisticsPartner: false,
        isAdmin: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    
    // Create/update wallet for buyer
    const walletSnapshot = await db.collection('wallets')
      .where('userId', '==', uid)
      .limit(1)
      .get();
    
    if (walletSnapshot.empty) {
      await db.collection('wallets').add({
        userId: uid,
        userType: 'buyer',
        balance: 500000, // ₦500,000 starting balance
        currency: 'NGN',
        walletId: `WLT-BUYER-${Date.now()}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('Created wallet with ₦500,000 balance');
    } else {
      console.log('Wallet already exists');
    }
    
    console.log('\n✅ Mock buyer account ready!');
    console.log('Email:', buyerEmail);
    console.log('Password:', buyerPassword);
    console.log('Wallet Balance: ₦500,000');
    
  } catch (error) {
    console.error('Error creating buyer account:', error);
  } finally {
    process.exit();
  }
}

createBuyerAccount();

