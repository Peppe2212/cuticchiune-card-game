import React from 'react';
import Card from './Card';

export default function Table({ roomData, playerId }) {
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

    // Disegna le singhe e le antenne
    const renderSingheQuadrante = (id, pos) => {
        if (!id) return null;
        const count = roomData.singhe?.[id] || 0;
        if (count === 0) return null;

        const isRed = count >= 5;
        const colorClass = isRed ? 'bg-red-600' : 'bg-blue-900';
        const isVerticalAxis = pos === 'left' || pos === 'right';
        const strokes = [];
        
        for (let i = 0; i < Math.min(count, 10); i++) {
        if (isVerticalAxis) {
            strokes.push(<div key={i} className={`w-[2px] h-3 ${colorClass} rotate-[8deg] rounded-full`}></div>);
        } else {
            strokes.push(<div key={i} className={`w-3 h-[2px] ${colorClass} rotate-[-5deg] rounded-full`}></div>);
        }
        }

        const comical = count > 5 && (
        <div key="comical" className="relative flex justify-center w-4 h-3 mt-0.5 opacity-90 drop-shadow-md">
            <div className="absolute left-0 bottom-0 w-[1.5px] h-3 bg-red-600 -rotate-45"></div>
            <div className="absolute right-0 bottom-0 w-[1.5px] h-3 bg-red-600 rotate-45"></div>
            <div className="absolute -left-1 -top-1 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
            <div className="absolute -right-1 -top-1 w-1.5 h-1.5 bg-red-600 rounded-full"></div>
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
        <div className="absolute top-16 left-4 bg-[#fdfbf2] w-36 h-36 rounded shadow-lg border border-gray-400 transform -rotate-3 z-10">
            <div className="absolute top-1/2 left-3 right-3 h-[2px] bg-blue-900/30 -translate-y-1/2 rounded-full"></div>
            <div className="absolute left-1/2 top-3 bottom-3 w-[2px] bg-blue-900/30 -translate-x-1/2 rounded-full"></div>
            {renderSingheQuadrante(topP?.id, 'top')}
            {renderSingheQuadrante(playerId, 'bottom')}
            {renderSingheQuadrante(leftP?.id, 'left')}
            {renderSingheQuadrante(rightP?.id, 'right')}
        </div>

        {/* CENTRO DEL TAVOLO */}
        <div className="flex-1 relative flex items-center justify-center border-4 border-green-700 rounded-[100px] mx-8 my-4 bg-green-900 shadow-inner">
            {topP && <div className="absolute top-4 text-green-300 font-bold text-lg">{topP.name} (Di fronte)</div>}
            {leftP && <div className="absolute left-8 text-green-300 font-bold text-lg transform -rotate-90 origin-left">{leftP.name}</div>}
            {rightP && <div className="absolute right-8 text-green-300 font-bold text-lg transform rotate-90 origin-right">{rightP.name}</div>}

            <div className="relative w-80 h-80">
            {roomData.tableCards?.map((play, idx) => {
                const pos = getPosition(play.playerId);
                const posClasses = {
                'bottom': "bottom-0 left-1/2 -translate-x-1/2 translate-y-10 z-40",
                'top': "top-0 left-1/2 -translate-x-1/2 -translate-y-10 z-10",
                'left': "top-1/2 left-0 -translate-y-1/2 -translate-x-12 z-20",
                'right': "top-1/2 right-0 -translate-y-1/2 translate-x-12 z-30"
                }[pos];

                return (
                <div key={idx} className={`absolute ${posClasses}`}>
                    <Card card={play.card} disabled={true} customClasses="w-24 h-36" />
                </div>
                );
            })}
            </div>
        </div>
        </>
    );
}