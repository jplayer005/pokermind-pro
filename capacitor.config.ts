import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokermind.pro',
  appName: 'PokerMind Pro',
  webDir: 'dist',
  android: {
    backgroundColor: '#07070d',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env['VITE_GOOGLE_WEB_CLIENT_ID'] ?? '',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
