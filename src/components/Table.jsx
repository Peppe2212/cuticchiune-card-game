import React, { useState } from 'react';
import Card from './Card';

export default function Table({ roomData, playerId, isGameOver, onReplaceWithBot }) {
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
        <div className={`bg-[#fdfbf2] w-36 h-36 rounded border border-gray-400 transition-all duration-1000 ease-in-out ${
            isGameOver 
            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2.5] rotate-0 shadow-[0_0_50px_rgba(220,38,38,1)] z-[60]'
            : 'absolute top-16 left-4 transform -rotate-3 shadow-lg z-10'
        }`}>
            <div className="absolute top-1/2 left-3 right-3 h-[2px] bg-blue-900/30 -translate-y-1/2 rounded-full"></div>
            <div className="absolute left-1/2 top-3 bottom-3 w-[2px] bg-blue-900/30 -translate-x-1/2 rounded-full"></div>
            {renderSingheQuadrante(topP?.id, 'top')}
            {renderSingheQuadrante(playerId, 'bottom')}
            {renderSingheQuadrante(leftP?.id, 'left')}
            {renderSingheQuadrante(rightP?.id, 'right')}
        </div>

        {showLastTrick && (
            <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col items-center justify-center backdrop-blur-sm">
            <h2 className="text-3xl text-yellow-400 font-bold mb-8">Ultima Presa</h2>
            <div className="flex gap-4">
                {roomData.lastTrick.map((play, idx) => (
                <div key={idx} className="flex flex-col items-center">
                    <span className="text-white mb-2 font-bold">{roomData.players[play.playerId]?.name}</span>
                    <Card card={play.card} disabled={true} customClasses="w-24 h-36" />
                </div>
                ))}
            </div>
            <button 
                onClick={() => setShowLastTrick(false)}
                className="mt-12 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full text-xl shadow-lg transition-transform hover:scale-105"
            >
                Chiudi
            </button>
            </div>
        )}

        {/* CENTRO DEL TAVOLO */}
        <div className="flex-1 relative flex items-center justify-center border-4 border-green-700 rounded-[100px] mx-8 my-4 bg-green-900 shadow-inner">
            
            {/* PULSANTE ultima mano */}
            {!isGameOver && (
            <button 
                onClick={() => roomData.lastTrick && setShowLastTrick(true)}
                disabled={!roomData.lastTrick}
                className={`absolute top-6 right-8 font-bold py-2 px-5 rounded-full shadow-xl border-2 z-50 flex items-center gap-2 transition-all ${
                    roomData.lastTrick 
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-red-950 border-yellow-700 hover:scale-105 cursor-pointer' 
                        : 'bg-green-800 text-green-600 border-green-700 cursor-not-allowed'
                }`}
            >
                👀 {roomData.lastTrick ? 'Ultima Presa' : 'Nessuna Presa'}
            </button>
            )}

            {topP && (
                <div className="absolute top-4 flex items-center gap-2 z-50">
                    <span className="text-green-300 font-bold text-lg">{topP.name} (Di fronte)</span>
                    {!topP.name.includes('Bot') && roomData.status === 'playing' && (
                    <button onClick={() => onReplaceWithBot(topP.id, topP.name)} className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded shadow" title="Sostituisci con Bot">🤖</button>
                    )}
                </div>
                )}
                
                {leftP && (
                <div className="absolute left-10 flex items-center gap-2 transform -rotate-90 origin-left z-50">
                    <span className="text-green-300 font-bold text-lg">{leftP.name}</span>
                    {!leftP.name.includes('Bot') && roomData.status === 'playing' && (
                    <button onClick={() => onReplaceWithBot(leftP.id, leftP.name)} className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded shadow" title="Sostituisci con Bot">🤖</button>
                    )}
                </div>
                )}
                
                {rightP && (
                <div className="absolute right-10 flex items-center gap-2 transform rotate-90 origin-right z-50">
                    <span className="text-green-300 font-bold text-lg">{rightP.name}</span>
                    {!rightP.name.includes('Bot') && roomData.status === 'playing' && (
                    <button onClick={() => onReplaceWithBot(rightP.id, rightP.name)} className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1 rounded shadow" title="Sostituisci con Bot">🤖</button>
                    )}
                </div>
            )}

            {/* MESSAGGIO CENTRALE DI RISOLUZIONE PRESA */}
            {roomData.status === 'resolving_trick' && winningPlay && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 rounded-[100px] backdrop-blur-[2px]">
                <div className="bg-yellow-600 text-red-950 px-8 py-4 rounded-full text-3xl font-black shadow-2xl border-4 border-yellow-400 animate-bounce">
                Ha preso {roomData.players[winningPlay.playerId]?.name}!
                </div>
            </div>
            )}

            <div className="relative w-80 h-80">
            {roomData.tableCards?.map((play, idx) => {
                const pos = getPosition(play.playerId);
                const isWinningCard = winningPlay && winningPlay.playerId === play.playerId;

                const posClasses = {
                'bottom': "bottom-0 left-1/2 -translate-x-1/2 translate-y-10 z-40",
                'top': "top-0 left-1/2 -translate-x-1/2 -translate-y-10 z-10",
                'left': "top-1/2 left-0 -translate-y-1/2 -translate-x-12 z-20",
                'right': "top-1/2 right-0 -translate-y-1/2 translate-x-12 z-30"
                }[pos];

                return (
                <div key={idx} className={`absolute ${posClasses}`}>
                    {/* ETICHETTA "In vantaggio" sulla carta vincente */}
                    {isWinningCard && roomData.status === 'playing' && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-red-900 text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap z-50 shadow-md animate-pulse border border-yellow-700">
                        Prende
                        </div>
                    )}
                    <Card 
                    card={play.card} 
                    disabled={true} 
                    // Aggiunge alone dorato alla carta che sta vincendo
                    customClasses={`w-24 h-36 ${isWinningCard && roomData.status === 'playing' ? 'ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)] scale-105' : 'shadow-2xl'}`} 
                    />
                </div>
                );
            })}
            </div>
        </div>
        </>
    );
}