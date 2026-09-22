import React, { useState, useEffect } from 'react';
import { playCard } from '../services/gameSync';
import Card from './Card';

export default function Player({ roomData, playerId, roomId }) {
    const [isSorted, setIsSorted] = useState(false);
    
    // 1. STATO LOCALE PER IL BLOCCO DEI DOPPI CLICK
    const [isProcessing, setIsProcessing] = useState(false);
    
    const myData = roomData.players[playerId];
    const isMyTurn = roomData.turnIndex === playerId;
    const hasPlayedThisTurn = roomData.tableCards?.some(c => c.playerId === playerId);
    
    // 2. Può giocare se è il suo turno, non ha ancora buttato la carta, e non sta già elaborando un click
    const canPlay = isMyTurn && !hasPlayedThisTurn;

    // 3. Sblocchiamo l'interfaccia non appena il server conferma il cambio di stato
    useEffect(() => {
        if (!isMyTurn || hasPlayedThisTurn) {
        setIsProcessing(false);
        }
    }, [isMyTurn, hasPlayedThisTurn]);

    let displayHand = [...(myData.hand || [])];
    if (isSorted) {
        const powerOrder = ['4', '5', '6', '7', 'Donna', 'Cavallo', 'Re', 'Asso', '2', '3'];
        displayHand.sort((a, b) => {
        if (a.suit === b.suit) return powerOrder.indexOf(a.label) - powerOrder.indexOf(b.label);
        return a.suit.localeCompare(b.suit);
        });
    }

    // 4. Funzione protetta per lanciare la carta
    const handlePlayCard = async (card) => {
        if (!canPlay || isProcessing) return; // Disinnesco del doppio click
        
        setIsProcessing(true); // Blocca la UI all'istante
        
        try {
        await playCard(roomId, playerId, card, roomData);
        } catch (error) {
        console.error("Errore di rete durante la giocata:", error);
        setIsProcessing(false); // Sblocca in caso di errore per riprovare
        }
    };

    return (
        <div className="bg-green-900 p-2 sm:p-4 rounded-t-2xl relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 sm:mb-4 px-2 sm:px-4 border-b border-green-700 pb-2 gap-2">
            <div>
            <h3 className="text-white text-sm sm:text-xl flex flex-wrap items-center gap-2">
                La tua mano ({myData.name}) 
                {isMyTurn && !isProcessing && <span className="bg-yellow-500 text-red-900 text-[10px] sm:text-sm px-2 py-0.5 rounded-full font-bold animate-pulse">IL TUO TURNO</span>}
                {isProcessing && <span className="bg-gray-500 text-white text-[10px] sm:text-sm px-2 py-0.5 rounded-full font-bold animate-pulse">ATTESA...</span>}
            </h3>
            <p className="text-yellow-400 font-mono text-sm sm:text-lg mt-1 tracking-wider">
                Bottino: <strong className="text-lg sm:text-2xl">{myData.points || 0}</strong> pt
            </p>
            </div>
            
            <button 
            onClick={() => setIsSorted(!isSorted)}
            disabled={isProcessing}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold transition-colors border sm:border-2 shadow-lg disabled:opacity-50 text-xs sm:text-base w-full sm:w-auto ${
                isSorted ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-green-800 text-gray-200 border-green-600 hover:bg-green-700'
            }`}
            >
            {isSorted ? '🔀 Riporta a com\'erano' : '🪄 Ordina per Seme'}
            </button>
        </div>

        {/* gap-1 riduce lo spazio tra le carte sui telefoni */}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
            {displayHand.map((card, idx) => (
            <div 
                key={idx} 
                className={`transition-transform duration-100 ${isProcessing ? 'scale-95 opacity-80' : ''}`}
            >
                <Card 
                card={card} 
                disabled={!canPlay || isProcessing}
                onClick={() => handlePlayCard(card)}
                // Carte in mano scalate per mobile
                customClasses="w-[3.5rem] h-[5rem] sm:w-20 sm:h-28"
                />
            </div>
            ))}
        </div>
        </div>
    );
}