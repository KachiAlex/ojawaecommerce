// Firebase removed: use REST API for admin account fix
      console.log('\n🔧 Admin account does not exist. Please create it manually:');
      console.log('1. Go to Firebase Console → Authentication → Users');
      console.log('2. Click "Add User"');
      console.log('3. Email: admin@ojawa.com');
      console.log('4. Password: Admin123!');
      console.log('5. Click "Add User"');
      console.log('6. Then run this script again');
    } else if (error.code === 'auth/wrong-password') {
      console.log('\n🔧 Wrong password. Please reset password:');
      console.log('1. Go to Firebase Console → Authentication → Users');
      console.log('2. Find admin@ojawa.com user');
      console.log('3. Click "Reset Password"');
      console.log('4. Set new password to: Admin123!');
    } else if (error.code === 'auth/invalid-email') {
      console.log('\n🔧 Invalid email format. Please check the email address.');
    } else {
      console.log('\n🔧 Unknown error. Please check Firebase configuration.');
    }
  }
}

fixAdminAccount();
