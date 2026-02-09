
import React from 'react';
import { WallpaperStyle } from '../types';

interface StyleCardProps {
  style: WallpaperStyle;
  isSelected: boolean;
  onClick: () => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ style, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center min-w-[85px] h-[95px] rounded-2xl transition-all duration-300 ${
        isSelected 
          ? 'bg-blue-600 border-2 border-blue-400 shadow-lg shadow-blue-900/40' 
          : 'bg-slate-800 border-2 border-transparent grayscale-[0.5]'
      }`}
    >
      <span className="text-2xl mb-1">{style.icon}</span>
      <span className="text-xs font-medium text-slate-100">{style.name}</span>
    </button>
  );
};

export default StyleCard;
