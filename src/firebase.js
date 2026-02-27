// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getFirestore }  from 'firebase/firestore'
import { getAuth }       from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyBeG55ZR_55arbBDeuLMD2tk0PV-xuEBuA',
  authDomain:        'rutasoptimizadas-cc6b9.firebaseapp.com',
  projectId:         'rutasoptimizadas-cc6b9',
  storageBucket:     'rutasoptimizadas-cc6b9.firebasestorage.app',
  messagingSenderId: '889876230628',
  appId:             '1:889876230628:web:ec9f5505f2ce47f18cd7f1',
  measurementId:     'G-1BVBB3NV4K',
}

const app = initializeApp(firebaseConfig)

export const db   = getFirestore(app)
export const auth = getAuth(app)
