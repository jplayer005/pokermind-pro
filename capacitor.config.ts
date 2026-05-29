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
  },
};

export default config;
