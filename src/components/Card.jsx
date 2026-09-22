import React from 'react';

export default function Card({ card, onClick, disabled, customClasses = "" }) {
    return (
        <div 
        onClick={disabled ? null : onClick}
        className={`bg-white rounded p-2 text-center border-2 border-gray-300 flex flex-col justify-between select-none shadow-md
        ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-4 hover:border-yellow-500 hover:shadow-xl transition-all'} 
        ${customClasses}`}
        >
        <span className="text-sm font-bold text-gray-800">{card.label}</span>
        <span className="text-xs text-gray-500">di {card.suit}</span>
        </div>
    );
}