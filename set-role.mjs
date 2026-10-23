import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const auth = getAuth();
const user = await auth.getUserByEmail('ichyaulumiddin22@gmail.com');

await auth.setCustomUserClaims(user.uid, {
  ...user.customClaims,
  role: 'Super Admin',
});

console.log('Peran berhasil disimpan.');