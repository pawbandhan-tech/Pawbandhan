import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDRuOTikCSLCdb73oYSnrnhoEiKbv-6Ozc',
  authDomain: 'pawbandhan-29f84.firebaseapp.com',
  projectId: 'pawbandhan-29f84',
  storageBucket: 'pawbandhan-29f84.firebasestorage.app',
  messagingSenderId: '378867729624',
  appId: '1:378867729624:web:2371a816457fdcfe2303ad'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
