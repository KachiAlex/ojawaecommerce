const path = require('path');
const fs = require('fs');

const envFiles = ['.env', '.env.local'];
envFiles.forEach((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    require('dotenv').config({ path: fullPath, override: true });
  }
});

const { sequelize } = require('../models');

(async () => {
  try {
    const tables = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_name IN ('conversations','messages')", { type: sequelize.QueryTypes.SELECT });
    console.log('Tables found:', tables.map(t => t.table_name));

    if (tables.length < 2) {
      console.log('Missing tables, running sync with alter:true...');
      const { Conversation, Message } = require('../models');
      await sequelize.sync({ alter: true });
      console.log('Sync complete');
    } else {
      const cols = await sequelize.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('conversations','messages') ORDER BY table_name, ordinal_position", { type: sequelize.QueryTypes.SELECT });
      console.log('Columns:');
      cols.forEach(c => console.log(`  ${c.table_name}.${c.column_name}`));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sequelize.close();
  }
})();
