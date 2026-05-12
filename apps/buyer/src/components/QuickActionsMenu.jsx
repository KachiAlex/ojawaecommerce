import { useState } from 'react';
import { ROUTE_TEMPLATE_PRESETS } from '../data/routeTemplates';

const QuickActionsMenu = ({ isOpen, onClose, onAction, selectedRoutes = [] }) => {
  if (!isOpen) return null;

  const quickActions = [
    {
      id: 'apply_express',
      name: '⚡ Apply Express Premium (+20%)',
      description: 'Add 20% to all selected routes',
      action: () => onAction('template', 'express_premium')
    },
    {
      id: 'apply_economy',
      name: '💰 Apply Economy Discount (-10%)',
      description: 'Reduce 10% from all selected routes',
      action: () => onAction('template', 'economy_budget')
    },
    {
      id: 'apply_weekend',
      name: '📅 Apply Weekend Special (+15%)',
      description: 'Add weekend surcharge to selected routes',
      action: () => onAction('template', 'weekend_special')
    },
    {
      id: 'match_market',
      name: '📊 Match Market Average',
      description: 'Set prices to market average',
      action: () => onAction('match_market')
    },
    {
      id: 'round_prices',
      name: '🔢 Round Prices (to nearest 1000)',
      description: 'Round all prices for cleaner display',
      action: () => onAction('round_prices')
    },
    {
      id: 'export_csv',
      name: '📥 Export Selected as CSV',
      description: 'Download selected routes as CSV',
      action: () => onAction('export_csv')
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">⚡ Quick Actions</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            {selectedRoutes.length} route(s) selected
          </p>
          
          <div className="space-y-2">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-emerald-500 transition-colors"
              >
                <div className="font-medium text-gray-900">{action.name}</div>
                <div className="text-xs text-gray-600 mt-1">{action.description}</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsMenu;

