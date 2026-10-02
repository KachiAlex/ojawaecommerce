const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const AppSetting = sequelize.define('AppSetting', {
      key: {
        type: DataTypes.STRING(128),
        primaryKey: true
      },
      value: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      updatedBy: {
        type: DataTypes.STRING(128),
        allowNull: true
      }
    }, {
      tableName: 'app_settings',
      timestamps: true
    });

    return AppSetting;
  }
};
