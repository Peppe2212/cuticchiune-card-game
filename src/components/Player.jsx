import React, { useState } from 'react';
import { playCard } from '../services/gameSync';
import Card from './Card';

export default function Player({ roomData, playerId, roomId }) {
    const [isSorted, setIsSorted] = useState(false);
    
    const myData = roomData.players[playerId];
    const isMyTurn = roomData.turnIndex === playerId;
    const hasPlayedThisTurn = roomData.tableCards?.some(c => c.playerId === playerId);
    const canPlay = isMyTurn && !hasPlayedThisTurn;

    let displayHand = [...(myData.hand || [])];
    if (isSorted) {
        const powerOrder = ['4', '5', '6', '7', 'Donna', 'Cavallo', 'Re', 'Asso', '2', '3'];
        displayHand.sort((a, b) => {
        if (a.suit === b.suit) return powerOrder.indexOf(a.label) - powerOrder.indexOf(b.label);
        return a.suit.localeCompare(b.suit);
        });
    }

    return (
        <div className="bg-green-900 p-4 rounded-t-2xl relative">
        <div className="flex justify-between items-end mb-4 px-4 border-b border-green-700 pb-2">
            <div>
            <h3 className="text-white text-xl">
                La tua mano ({myData.name}) {isMyTurn ? " - È IL TUO TURNO! ⬇️" : ""}
            </h3>
            <p className="text-yellow-400 font-mono text-lg mt-1 tracking-wider">
                Bottino attuale: <strong className="text-2xl">{myData.points || 0}</strong> pt
            </p>
            </div>
            
            <button 
            onClick={() => setIsSorted(!isSorted)}
            className={`px-4 py-2 rounded-lg font-bold transition-colors border-2 shadow-lg ${
                isSorted ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-green-800 text-gray-200 border-green-600 hover:bg-green-700'
            }`}
            >
            {isSorted ? '🔀 Riporta a com\'erano' : '🪄 Ordina per Seme'}
            </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
            {displayHand.map((card, idx) => (
            <Card 
                key={idx} 
                card={card} 
                disabled={!canPlay}
                onClick={() => playCard(roomId, playerId, card, roomData)}
                customClasses="w-20 h-28"
            />
            ))}
        </div>
        </div>
    );
}