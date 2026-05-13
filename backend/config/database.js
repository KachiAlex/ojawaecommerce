const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');
const { Sequelize } = require('sequelize');
require('pg');
require('pg-hstore');

const envPath = path.resolve(__dirname, '..', '.env');
const envLocalPath = path.resolve(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  config({ path: envPath, override: true });
}

if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

const DEFAULT_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

function normalizeConnectionString(raw) {
  const safeRaw = typeof raw === 'string' ? raw : '';
  const normalized = safeRaw.replace('postgresql://', 'postgres://');

  try {
    const url = new URL(normalized);
    const params = url.searchParams;

    const channelBinding = params.get('channel_binding');
    if (channelBinding && channelBinding !== 'disable') {
      params.set('channel_binding', 'disable');
    }

    if (!params.get('sslmode')) {
      params.set('sslmode', 'require');
    }

    url.search = params.toString();
    return url.toString();
  } catch (error) {
    console.warn('⚠️ Failed to normalize DATABASE_URL:', error.message);
    return normalized;
  }
}

const NORMALIZED_DEFAULT_DATABASE_URL = normalizeConnectionString(DEFAULT_DATABASE_URL);

const pickDatabaseUrl = () => {
  const candidate = process.env.DATABASE_URL
    || process.env.NEON_DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.VERCEL_POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_PRISMA_URL_NO_SSL
    || DEFAULT_DATABASE_URL;

  if (!candidate || candidate === 'null' || candidate === 'undefined') {
    return NORMALIZED_DEFAULT_DATABASE_URL;
  }

  const normalizedCandidate = normalizeConnectionString(candidate);

  if (!normalizedCandidate || normalizedCandidate.trim() === '') {
    return NORMALIZED_DEFAULT_DATABASE_URL;
  }

  return normalizedCandidate;
};

const DATABASE_URL = pickDatabaseUrl();

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to PostgreSQL database:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };
