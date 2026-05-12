import { useState } from 'react';

const CompareButton = ({ product, onToggle, isSelected, maxCompare = 4 }) => {
  const handleToggle = () => {
    if (isSelected) {
      onToggle(product.id, false);
    } else {
      if (maxCompare && isSelected === false) {
        // Check if we've reached max
        return;
      }
      onToggle(product.id, true);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-full transition-colors ${
        isSelected
          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
    >
      {isSelected ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )}
    </button>
  );
};

export default CompareButton;

