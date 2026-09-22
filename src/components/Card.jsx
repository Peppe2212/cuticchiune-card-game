import React from 'react';

export default function Card({ card, disabled, onClick, customClasses = "" }) {
    // Se la carta è coperta o i dati non sono completi
    if (!card || !card.suit || !card.rankId) {
        return (
            <div className={`relative flex items-center justify-center bg-transparent rounded-lg ${customClasses}`}>
                <img 
                    src="/cards/dorso.png" 
                    alt="Carta coperta"
                    className="w-full h-full object-fill rounded-lg"
                />
            </div>
        );
    }

    const imageName = `${card.suit}_${card.rankId}.png`;
    const imagePath = `/cards/${imageName}`;

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            // 🔴 RIMOSSO bg-[#fdfbf2] e i bordi: il bottone ora è un "fantasma" trasparente
            className={`relative transition-all duration-200 focus:outline-none flex items-center justify-center bg-transparent rounded-lg
            ${disabled ? 'cursor-not-allowed opacity-95' : 'cursor-pointer hover:-translate-y-3'} 
            ${customClasses}`}
        >
            <img 
                src={imagePath} 
                alt={`${card.label} di ${card.suit}`}
                // 🔴 OBJECT-FILL: l'immagine si dilata per combaciare perfettamente con le dimensioni dinamiche
                className="w-full h-full object-fill rounded-lg drop-shadow-sm"
                onError={(e) => {
                    console.error(`⚠️ Errore file: non trovo l'immagine [ ${imagePath} ]`);
                    e.target.onerror = null; 
                    e.target.src = "/cards/dorso.png"; 
                }}
            />
        </button>
    );
}