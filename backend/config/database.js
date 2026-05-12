const { Sequelize } = require('sequelize');

const DEFAULT_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';

const pickDatabaseUrl = () => {
  const candidate = process.env.DATABASE_URL
    || process.env.NEON_DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.VERCEL_POSTGRES_URL
    || process.env.POSTGRES_PRISMA_URL
    || process.env.POSTGRES_PRISMA_URL_NO_SSL
    || DEFAULT_DATABASE_URL;

  if (!candidate || candidate === 'null' || candidate === 'undefined') {
    return DEFAULT_DATABASE_URL;
  }

  return candidate.replace('postgresql://', 'postgres://');
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
