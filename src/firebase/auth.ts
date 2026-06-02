import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth } from './config'
import { useAuthStore } from '@/store/authStore'

let googleAuthInitialized = false

function ensureGoogleAuthInitialized() {
  if (googleAuthInitialized) return
  googleAuthInitialized = true
  GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  })
}

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    ensureGoogleAuthInitialized()
    const googleUser = await GoogleAuth.signIn()
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)
    return signInWithCredential(auth, credential)
  } else {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }
}

export async function signOut() {
  await fbSignOut(auth)
  useAuthStore.getState().setUser(null)
  useAuthStore.getState().setGuestMode(false)
}
