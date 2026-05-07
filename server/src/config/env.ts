import 'dotenv/config';

const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export interface AppConfig {
  env: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  adminUsername: string;
  adminPassword: string | undefined;
  corsOrigin: string;
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devtools',
  jwtSecret:
    process.env.NODE_ENV === 'test'
      ? 'test-secret'
      : required('JWT_SECRET', process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
