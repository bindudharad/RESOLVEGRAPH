import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/lib/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'resolvegraph_dev_secret_key_9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000',
  trustedOrigins: (request) => {
    const configuredBase =
      process.env.BETTER_AUTH_URL ||
      process.env.AUTH_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    const origins = [configuredBase];
    if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
      process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').forEach((o) => {
        const trimmed = o.trim();
        if (trimmed && !origins.includes(trimmed)) origins.push(trimmed);
      });
    }
    const reqOrigin = request?.headers.get('origin');
    if (reqOrigin) {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(reqOrigin)) {
        origins.push(reqOrigin);
      } else if (reqOrigin === configuredBase || origins.includes(reqOrigin)) {
        origins.push(reqOrigin);
      }
    }
    return origins;
  },
  basePath: '/api/auth',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: false, // Development mode: allow immediate login
  },
  user: {
    additionalFields: {
      fullName: {
        type: 'string',
        required: false,
        defaultValue: '',
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'BUYER',
      },
      isPlatformAdmin: {
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      organization: {
        type: 'string',
        required: false,
      },
      phone: {
        type: 'string',
        required: false,
      },
      avatarUrl: {
        type: 'string',
        required: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
