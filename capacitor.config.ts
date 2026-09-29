import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'node:fs';

// O `cap sync` NAO carrega o .env: sem isto o serverClientId ia vazio para o APK e o
// login Google falhava em silencio. Le o .env aqui e avisa alto se ainda assim faltar.
function fromDotEnv(key: string): string | undefined {
  try {
    const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m?.[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
}

const googleWebClientId =
  process.env['VITE_GOOGLE_WEB_CLIENT_ID'] || fromDotEnv('VITE_GOOGLE_WEB_CLIENT_ID') || '';
if (!googleWebClientId) {
  console.warn('[capacitor.config] VITE_GOOGLE_WEB_CLIENT_ID vazio: o login Google NAO vai funcionar neste APK.');
}

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
      serverClientId: googleWebClientId,
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
