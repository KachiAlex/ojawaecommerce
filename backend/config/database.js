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

const isLocalHostname = (hostname) =>
  ['localhost', '127.0.0.1', '::1', 'db', 'postgres', 'ojawa-db'].includes(hostname);

// Returns { url, ssl } — ssl is true unless the host is local/private or sslmode=disable
function normalizeConnectionString(raw) {
  if (raw === null || raw === undefined) {
    return { url: '', ssl: false };
  }
  const safeRaw = (typeof raw === 'string' ? raw : String(raw)).trim();
  if (!safeRaw || ['null', 'undefined'].includes(safeRaw.toLowerCase())) {
    return { url: '', ssl: false };
  }
  const normalized = safeRaw.replace('postgresql://', 'postgres://');

  try {
    const url = new URL(normalized);
    const params = url.searchParams;

    const channelBinding = params.get('channel_binding');
    if (channelBinding && channelBinding !== 'disable') {
      params.set('channel_binding', 'disable');
    }

    const sslDisabled = params.get('sslmode') === 'disable' || isLocalHostname(url.hostname);
    if (!params.get('sslmode') && !sslDisabled) {
      params.set('sslmode', 'require');
    }

    url.search = params.toString();
    return { url: url.toString(), ssl: !sslDisabled };
  } catch (error) {
    console.warn('⚠️ Failed to normalize DATABASE_URL:', error.message);
    return { url: '', ssl: false };
  }
}

const pickDatabaseUrl = () => {
  const candidate = process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_PRISMA_URL_NO_SSL;

  if (!candidate || candidate === 'null' || candidate === 'undefined') {
    console.error('❌ DATABASE_URL is not set — no database fallback configured');
    return { url: '', ssl: false };
  }

  return normalizeConnectionString(candidate);
};

let { url: DATABASE_URL, ssl: DATABASE_SSL } = pickDatabaseUrl();

if (!DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is invalid or missing');
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: DATABASE_SSL ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
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
