// Test Firestore connection
const admin = require('firebase-admin');

console.log('Testing Firestore connection...');

const serviceAccount = {
  projectId: 'ojawa-ecommerce',
  clientEmail: 'firebase-adminsdk-fbsvc@ojawa-ecommerce.iam.gserviceaccount.com',
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCuZ8hfdya+759x\n5yXbDudg9pCdTFm9pw5YcWLdM0O/sZ6eB8EzQrXnLHkLA9hlhQ31S6XPuAIySW18\nQkVq0xp5wl9gC+Si1LVuSE1tdqCHYRcOYhf4C4EjgC2jE1ENhSRtxogVB1Ic9TVc\nA5sEXVyqRwZVYZoJhUwrLzAqy0LOrNS/qwVs+YYDK5TA4jIjfnQ4k12K24sYnMyc\nKngMMi62ENN5a5TzIT1LRk3KTGb5HizgOxn0si5AdlT7Aq5CqC8Uypbse0c3Rs1y\nR/MJcM8S4sjMLgEXWhgv9SexCPFjGkrQp/13OWk6IDuEfn6f6uvhJns6rBwz6Q0c\nTbY3xHWtAgMBAAECggEABpZb0pB3AAgf3Kb0JO+Nn9NlF9StLahi0Cze/m3EBCuV\n8X0BMcNpVV62gLFa8E5KMW0zliJ3Wyv77NEgLmSxIvWx2AUclBjjWtPAyh7MeYIn\nI1XJqkadXVINum0NmlLgn7cITbEHcgAOzXFDOH/VP7o4iN6+0teJAbcoNm/6D6fJ\nlqLXFsa3ciDB2I3QmszMDY5Eo1TqMJTLEAoGa281Pg6r5vYPD8sR00r7vRlR73KF\nENoIwZbLNe01qqnTbF13F9I8KqH3HFC2mOv4q/oi6oJBkXzgIed8VWTAgxH7Nazp\nQTZEUSW3boECnSzXLoLz9oYRwfDdxxSUGliEtmOB8QKBgQDlstuT8HoejTdNdObP\nVbsS6HPxLhLZV+Q7GOAgK/UHfVl95dkAjDZVaIxRFEg+CmDADm22kJVd3CnSV5dZ\n71FIRKrl/MjshvJQlDtLjpTjhCDkNWyE15vyBUEPvX9lvnvdgUlqsy80qd8bjEnl\nNdy9oFDoigsODqs0NdNvsaeBcQKBgQDCYB37mgX/WUPownqrO3Mxfx/04GFNrdvl\nsB/GWQ+v55ZNERovulZ/IBb2oGfiTN898TyZjgNXf0i9yXE5x1S+lYibR0Tr3xQU\n8peBlkuj13wqH68kSukEkA5qIvyorBlf2Po7hPnp6bvl0sWw9nWnnRDYQ7cg1sQd\nF76dSC2Z/QKBgQC3sZjur8NJyY9vj0zChQIttd57A2ipjiOEq3kZ4W18ht9Z0sX/\nLSKKnSiR8tFvZCdJkIBnHyuEu3xqrgfpMX1keR3e/ZDFr4n7rP/ahfVGGjWfq6XU\newVIwLDuYJKQkIxIcYuAHDplOHCnfELgXnng4GO0BCmhHVQHVgB4c6/M0QKBgHHH\nx+VO/PHDdCAdL6dqbnzr2G4EppDNE+q5FXCLE8a5ft7wAu8rWZSi2S5XKVhr/UYK\nH5oXaldel9sYvyG+UBob+FJE/tA/zkaQ1yUxMGfhLLqPv3s0KoDUPsvcXR/zVgso\nPRp4Nb66ZpYaskRrkOWj6Idf5CPh8/y/uIHjDWaVAoGAaFHdYtYeMn/6j9/I/rPs\n9J+JZh+nuN7Ntf27wUmllENGNl79+gEWYtFrXkaGWlveKrtGS6a0tyQuCJluWnse\nczJKTzitq/BxJag9uiRppkx+86DHGx6/9tflRcvj/tUlG++iyPnxSYXOG0HhnN5P\nc3pVQuLpvjw8wpALc7dKn30=\n-----END PRIVATE KEY-----\n"
};

console.log('Firebase Project ID:', serviceAccount.projectId);
console.log('Client Email:', serviceAccount.clientEmail);
console.log('Private Key:', serviceAccount.privateKey ? 'Present' : 'Missing');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  const db = admin.firestore();

  // Test connection by listing collections
  db.listCollections()
    .then((collections) => {
      console.log('✅ Firestore connection successful!');
      console.log(`Found ${collections.length} collections:`);
      collections.forEach(col => console.log(`  - ${col.id}`));
    })
    .catch((error) => {
      console.error('❌ Firestore connection failed:', error.message);
      console.error('Error details:', error);
    })
    .finally(() => {
      process.exit(0);
    });
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}
