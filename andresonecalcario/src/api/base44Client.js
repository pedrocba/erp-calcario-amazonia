import { createClient } from '@base44/sdk';

const FALLBACK_APP_ID = '68ea91a66a9614db4a82043d';

const getEnvVar = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }

  // Fallback para builds fora do Vite (ex.: Netlify CLI) sem expor a variável no bundle.
  const nodeEnv = globalThis?.process?.env?.[key];
  if (nodeEnv) {
    return nodeEnv;
  }

  return undefined;
};

const appId = getEnvVar('VITE_BASE44_APP_ID') ?? FALLBACK_APP_ID;

if (appId === FALLBACK_APP_ID) {
  console.warn(
    'VITE_BASE44_APP_ID was not provided. Falling back to the default app id. Configure this env variable in Netlify for production deployments.'
  );
}

export const base44 = createClient({
  appId,
  requiresAuth: true
});
