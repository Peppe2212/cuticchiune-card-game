import React, { useState } from 'react';
import Card from './Card';

export default function Table({ roomData, playerId, isGameOver, onReplaceWithBot, isSpectator }) {
    const [showLastTrick, setShowLastTrick] = useState(false);

    const playerIds = Object.keys(roomData.players || {});
    const myIndex = playerIds.indexOf(playerId);
    
    const getPosition = (id) => {
        const pIndex = playerIds.indexOf(id);
        const offset = (pIndex - myIndex + playerIds.length) % playerIds.length;
        if (offset === 0) return 'bottom';
        if (offset === 1) return 'right';
        if (offset === 2) return 'top';
        if (offset === 3) return 'left';
    };

    const getPlayerByPos = (pos) => {
        const id = playerIds.find(id => getPosition(id) === pos);
        return id ? { id, ...roomData.players[id] } : null;
    };

    const topP = getPlayerByPos('top');
    const leftP = getPlayerByPos('left');
    const rightP = getPlayerByPos('right');

    // --- LOGICA VISIVA: Chi sta vincendo la presa attualmente? ---
    const getWinningPlay = () => {
        const cards = roomData.tableCards;
        if (!cards || cards.length === 0) return null;
        
        const powerOrder = ['4', '5', '6', '7', 'Donna', 'Cavallo', 'Re', 'Asso', '2', '3'];
        const leadSuit = cards[0].card.suit;
        
        let bestPlay = cards[0];
        let maxPower = powerOrder.indexOf(bestPlay.card.label);

        for (let i = 1; i < cards.length; i++) {
        const play = cards[i];
        if (play.card.suit === leadSuit) {
            const power = powerOrder.indexOf(play.card.label);
            if (power > maxPower) {
            maxPower = power;
            bestPlay = play;
            }
        }
        }
        return bestPlay;
    };

    const winningPlay = getWinningPlay();
    // -------------------------------------------------------------

    const renderSingheQuadrante = (id, pos) => {
        if (!id) return null;
        const count = roomData.singhe?.[id] || 0;
        if (count === 0) return null;

        const isRed = count >= 5;
        const colorClass = isRed ? 'bg-red-600' : 'bg-blue-900';
        const isVerticalAxis = pos === 'left' || pos === 'right';
        const strokes = [];
        
        const visibleStrokes = Math.min(count, 5);
        for (let i = 0; i < visibleStrokes; i++) {
        if (isVerticalAxis) {
            strokes.push(<div key={i} className={`w-[2px] h-3 ${colorClass} rotate-[8deg] rounded-full`}></div>);
        } else {
            strokes.push(<div key={i} className={`w-3 h-[2px] ${colorClass} rotate-[-5deg] rounded-full`}></div>);
        }
        }

        let comicalRotation = "";
        let unrotateIcon = ""; 
        if (pos === 'right') { comicalRotation = ""; unrotateIcon = ""; }
        else if (pos === 'left') { comicalRotation = "rotate-180"; unrotateIcon = "rotate-180"; }
        else if (pos === 'bottom') { comicalRotation = "rotate-90"; unrotateIcon = "-rotate-90"; }
        else if (pos === 'top') { comicalRotation = "-rotate-90"; unrotateIcon = "rotate-90"; }

        const comical = count > 5 && (
        <div key="comical" className={`relative flex items-center justify-start w-12 h-12 opacity-100 drop-shadow-md ${comicalRotation}`}>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-full">
            {count >= 6 && (
                <div className="absolute left-0 top-1/2 w-4 h-[2.5px] bg-purple-500 -rotate-[35deg] origin-left">
                <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full border-[0.5px] border-purple-800"></div>
                </div>
            )}
            {count >= 7 && (
                <div className="absolute left-0 top-1/2 w-4 h-[2.5px] bg-cyan-400 rotate-[35deg] origin-left">
                <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-pink-500 rounded-full border-[0.5px] border-cyan-800"></div>
                </div>
            )}
            {count >= 8 && (
                <div className="absolute left-3.5 top-1/2 w-4 h-[2.5px] bg-orange-500 -rotate-[35deg] origin-left">
                <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border-[0.5px] border-orange-800"></div>
                </div>
            )}
            {count >= 9 && (
                <div className="absolute left-3.5 top-1/2 w-4 h-[2.5px] bg-lime-400 rotate-[35deg] origin-left">
                <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-red-500 rounded-full border-[0.5px] border-lime-800"></div>
                </div>
            )}
            {count >= 10 && (
                <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 bg-red-600 rounded-full border-2 border-yellow-400 shadow-[0_0_8px_red] z-20">
                <div className={`text-[12px] leading-none ${unrotateIcon}`}>🥁</div>
                </div>
            )}
            </div>
        </div>
        );

        const layoutClasses = {
        'top': 'bottom-1/2 left-1/2 -translate-x-1/2 flex-col-reverse mb-1.5',
        'bottom': 'top-1/2 left-1/2 -translate-x-1/2 flex-col mt-1.5',
        'left': 'right-1/2 top-1/2 -translate-y-1/2 flex-row-reverse mr-1.5',
        'right': 'left-1/2 top-1/2 -translate-y-1/2 flex-row ml-1.5'
        }[pos];

        return (
        <div className={`absolute flex items-center gap-[3px] ${layoutClasses}`}>
            {strokes}{comical}
        </div>
        );
    };

    return (
        <>
        {/* FOGLIETTO DELLE SINGHE */}
        <div className={`bg-[#fdfbf2] w-24 h-24 sm:w-36 sm:h-36 rounded border border-gray-400 transition-all duration-1000 ease-in-out ${
            isGameOver 
            // 🔴 Spinto in alto (top-[38%]) e decisamente più grande (scale-[1.7] su mobile, scale-[2] su PC)
            ? 'fixed top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.7] sm:scale-[2] rotate-0 shadow-[0_0_50px_rgba(220,38,38,1)] z-[60]'
            : 'absolute top-16 sm:top-28 left-2 sm:left-4 transform -rotate-3 shadow-lg z-10'
        }`}>
            <div className="absolute top-1/2 left-2 right-2 sm:left-3 sm:right-3 h-[2px] bg-blue-900/30 -translate-y-1/2 rounded-full"></div>
            <div className="absolute left-1/2 top-2 bottom-2 sm:top-3 sm:bottom-3 w-[2px] bg-blue-900/30 -translate-x-1/2 rounded-full"></div>
            <div className="scale-75 sm:scale-100 w-full h-full relative">
                {renderSingheQuadrante(topP?.id, 'top')}
                {renderSingheQuadrante(playerId, 'bottom')}
                {renderSingheQuadrante(leftP?.id, 'left')}
                {renderSingheQuadrante(rightP?.id, 'right')}
            </div>
        </div>

        {/* ========================================== */}
        {/* SISTEMA ULTIMA PRESA (Visibile solo ai Giocatori) */}
        {/* ========================================== */}
        {!isSpectator && roomData?.lastTrick && (
            <>
            
                {/* 2. WIDGET ULTIMA PRESA (Compatto e fluttuante) */}
                {showLastTrick && (
                    <div className="absolute top-4 sm:top-6 right-2 sm:right-8 bg-black/90 p-2 sm:p-4 rounded-xl border-2 border-yellow-600 z-[70] shadow-2xl backdrop-blur-md animate-[slideIn_0.2s_ease-out]">
                        <div className="flex justify-between items-center mb-2 sm:mb-3 gap-4">
                            <h2 className="text-xs sm:text-sm text-yellow-400 font-bold uppercase tracking-wider">Ultima Presa</h2>
                            <button 
                                onClick={() => setShowLastTrick(false)} 
                                className="text-white hover:text-red-500 font-black text-lg sm:text-xl leading-none transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="flex gap-1 sm:gap-2">
                            {/* Mappa delle carte con il '?' per prevenire crash */}
                            {roomData.lastTrick?.map((play, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <span className="text-gray-300 text-[8px] sm:text-[10px] mb-1 font-bold truncate max-w-[40px]">
                                    {roomData.players[play.playerId]?.name}
                                </span>
                                <Card card={play.card} disabled={true} customClasses="w-10 h-14 sm:w-12 sm:h-16" />
                            </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
        )}

        {/* CENTRO DEL TAVOLO (Bordi, margini e arrotondamenti adattivi) */}
        <div className="flex-1 relative flex items-center justify-center border-2 sm:border-4 border-green-700 rounded-[40px] sm:rounded-[100px] mx-1 sm:mx-8 my-2 sm:my-4 bg-green-900 shadow-inner">
            
            {/* PULSANTE ULTIMA MANO */}
            {!isGameOver && (
            <button 
                onClick={() => roomData.lastTrick && setShowLastTrick(true)}
                disabled={!roomData.lastTrick}
                className={`absolute top-2 sm:top-6 right-2 sm:right-8 font-bold py-1 px-2 sm:py-2 sm:px-5 rounded-full shadow-xl border sm:border-2 z-50 flex items-center gap-1 sm:gap-2 transition-all text-[10px] sm:text-base ${
                    roomData.lastTrick 
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-red-950 border-yellow-700 hover:scale-105 cursor-pointer' 
                        : 'bg-green-800 text-green-600 border-green-700 cursor-not-allowed'
                }`}
            >
                👀 {roomData.lastTrick ? 'Ultima Presa' : 'Nessuna Presa'}
            </button>
            )}

            {/* GIOCATORE IN ALTO (Centrato) */}
            <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 sm:gap-1 z-50">
                <span className="text-green-300 font-bold text-[11px] sm:text-lg truncate max-w-[120px] sm:max-w-none text-center drop-shadow-md">
                    {topP.name} <span className="hidden sm:inline">(Di fronte)</span>
                </span>
                <div className={`text-[9px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap ${
                    (topP.validTricks || 0) > 0 ? 'bg-green-900/80 text-green-300 border-green-500' : 'bg-red-900/80 text-red-300 border-red-500'
                }`}>
                    {(topP.validTricks || 0) > 0 ? '✅ Salvo' : '⚠️ Zero Prese'}
                </div>
            </div>

            {/* GIOCATORE A SINISTRA (Ancorato a un punto invisibile e ruotato in riga) */}
                <div className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-0 h-0 z-50">
                    {/* flex-row su mobile per creare una linea sottile, flex-col su schermi grandi */}
                    <div className="-rotate-90 sm:rotate-0 flex flex-row sm:flex-col items-center gap-2 sm:gap-1">
                        <span className="text-green-300 font-bold text-[11px] sm:text-lg whitespace-nowrap drop-shadow-md">
                            {leftP.name}
                        </span>
                        <div className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap ${
                            (leftP.validTricks || 0) > 0 ? 'bg-green-900/80 text-green-300 border-green-500' : 'bg-red-900/80 text-red-300 border-red-500'
                        }`}>
                            {(leftP.validTricks || 0) > 0 ? '✅ Salvo' : '⚠️ Zero Prese'}
                        </div>
                    </div>
                </div>

                {/* GIOCATORE A DESTRA (Ancorato a un punto invisibile e ruotato in riga) */}
                <div className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-0 h-0 z-50">
                    <div className="rotate-90 sm:rotate-0 flex flex-row sm:flex-col items-center gap-2 sm:gap-1">
                        <span className="text-green-300 font-bold text-[11px] sm:text-lg whitespace-nowrap drop-shadow-md">
                            {rightP.name}
                        </span>
                        <div className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full border shadow-sm whitespace-nowrap ${
                            (rightP.validTricks || 0) > 0 ? 'bg-green-900/80 text-green-300 border-green-500' : 'bg-red-900/80 text-red-300 border-red-500'
                        }`}>
                            {(rightP.validTricks || 0) > 0 ? '✅ Salvo' : '⚠️ Zero Prese'}
                        </div>
                    </div>
                </div>
            

            {/* MESSAGGIO CENTRALE DI RISOLUZIONE PRESA */}
            {roomData.status === 'resolving_trick' && winningPlay && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 rounded-[40px] sm:rounded-[100px] backdrop-blur-[2px]">
                <div className="bg-yellow-600 text-red-950 px-4 py-2 sm:px-8 sm:py-4 rounded-full text-lg sm:text-3xl font-black shadow-2xl border-2 sm:border-4 border-yellow-400 animate-bounce text-center">
                Ha preso {roomData.players[winningPlay.playerId]?.name}!
                </div>
            </div>
            )}

            {/* GRIGLIA DELLE CARTE A TERRA */}
            <div className="relative w-52 h-52 sm:w-80 sm:h-80">
            {roomData.tableCards?.map((play, idx) => {
                const pos = getPosition(play.playerId);
                const isWinningCard = winningPlay && winningPlay.playerId === play.playerId;

                // Spostamenti dinamici per avvicinare le carte al centro nei telefoni
                const posClasses = {
                'bottom': "bottom-0 left-1/2 -translate-x-1/2 translate-y-6 sm:translate-y-10 z-40",
                'top': "top-0 left-1/2 -translate-x-1/2 -translate-y-6 sm:-translate-y-10 z-10",
                'left': "top-1/2 left-0 -translate-y-1/2 -translate-x-8 sm:-translate-x-12 z-20",
                'right': "top-1/2 right-0 -translate-y-1/2 translate-x-8 sm:translate-x-12 z-30"
                }[pos];

                return (
                <div key={idx} className={`absolute ${posClasses}`}>
                    {/* ETICHETTA "Prende" sulla carta vincente */}
                    {isWinningCard && roomData.status === 'playing' && (
                        <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-red-900 text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full whitespace-nowrap z-50 shadow-md animate-pulse border border-yellow-700">
                        Prende
                        </div>
                    )}
                    <Card 
                    card={play.card} 
                    disabled={true} 
                    // Carte ridotte sui telefoni e grandi su PC
                    customClasses={`w-16 h-24 sm:w-24 sm:h-36 ${isWinningCard && roomData.status === 'playing' ? 'ring-2 sm:ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] scale-105' : 'shadow-xl sm:shadow-2xl'}`} 
                    />
                </div>
                );
            })}
            </div>
        </div>
        </>
    );
    
}