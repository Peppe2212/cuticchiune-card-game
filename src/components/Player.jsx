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
            
            {/* Contenitore flessibile: riga fissa (flex-row) per tenere bottone e testo sempre affiancati */}
            <div className="flex justify-between items-center sm:items-end mb-2 px-1 sm:px-2 border-b border-green-700 pb-2 gap-2">
                
                {/* Blocco Sinistro: Info Giocatore (con min-w-0 per gestire nomi lunghissimi senza sfasare il layout) */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-white text-xs sm:text-xl flex flex-wrap items-center gap-1 sm:gap-2 truncate">
                        La tua mano ({myData.name}) 
                        {isMyTurn && !isProcessing && <span className="bg-yellow-500 text-red-900 text-[9px] sm:text-sm px-1.5 py-0.5 rounded-full font-bold animate-pulse">IL TUO TURNO</span>}
                        {isProcessing && <span className="bg-gray-500 text-white text-[9px] sm:text-sm px-1.5 py-0.5 rounded-full font-bold animate-pulse">ATTESA...</span>}
                    </h3>
                    
                    {/* Contenitore Punti + Etichetta Salvezza affiancati */}
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-yellow-400 font-mono text-xs sm:text-lg tracking-wider">
                            Punti: <strong className="text-base sm:text-2xl">{myData.points || 0}</strong> pt
                        </p>
                        <div className={`text-[9px] sm:text-xs font-bold px-2 py-0.5 rounded-full border shadow-sm whitespace-nowrap ${
                            (myData.validTricks || 0) > 0 ? 'bg-green-900/80 text-green-300 border-green-500' : 'bg-red-900/80 text-red-300 border-red-500'
                        }`}>
                            {(myData.validTricks || 0) > 0 ? '✅ Salvo' : '⚠️ Zero Prese'}
                        </div>
                    </div>
                </div>
                
                {/* Blocco Destro: Pulsante Ordina (Compatto, senza w-full e con whitespace-nowrap) */}
                <button 
                    onClick={() => setIsSorted(!isSorted)}
                    disabled={isProcessing}
                    className={`flex-shrink-0 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold transition-colors border shadow-sm disabled:opacity-50 text-[10px] sm:text-sm whitespace-nowrap ${
                        isSorted ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-green-800 text-gray-200 border-green-600 hover:bg-green-700'
                    }`}
                >
                    {/* Testo corto su mobile per risparmiare spazio vitale, testo completo su schermi grandi */}
                    <span className="sm:hidden">{isSorted ? '🔀 Normale' : '🪄 Ordina'}</span>
                    <span className="hidden sm:inline">{isSorted ? "🔀 Riporta a com'erano" : '🪄 Ordina per Seme'}</span>
                </button>
            </div>

            {/* GRIGLIA DELLE CARTE: intatta */}
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