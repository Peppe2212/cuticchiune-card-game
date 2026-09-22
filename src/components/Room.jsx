import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { joinOrCreateRoom, sitAtTable, subscribeToRoom, startGame, fillTableWithDummies, playCard, playBotTurn, resolveTrick, processHandOver, startNextHand, resetGame, acknowledgePenalty } from '../services/gameSync'

export default function Room() {
    const { roomId } = useParams()
    const [playerName, setPlayerName] = useState('')
    const [hasJoined, setHasJoined] = useState(false)
    const [roomData, setRoomData] = useState(null)
    const [isSorted, setIsSorted] = useState(false);

    // 1. IL PLAYER ID DEVE STARE QUI IN ALTO (Prima di qualsiasi useEffect)
    const [playerId] = useState(() => {
        const savedId = localStorage.getItem(`cuticchiune_${roomId}`);
        if (savedId) return savedId;
        const newId = Math.random().toString(36).substring(2, 9);
        localStorage.setItem(`cuticchiune_${roomId}`, newId);
        return newId;
    });
    
    const handleJoin = async (e) => {
        e.preventDefault();
        if (playerName.trim()) {
            const success = await sitAtTable(roomId, playerId, playerName);
            if (success) setHasJoined(true);
        }
    };

    const players = roomData?.players 
    ? Object.entries(roomData.players).map(([id, p]) => ({ id, ...p })) 
    : [];

    // --- 1. INIZIALIZZAZIONE STANZA ---
    useEffect(() => {
        joinOrCreateRoom(roomId);
        const unsubscribe = subscribeToRoom(roomId, (data) => setRoomData(data));
        return () => unsubscribe();
    }, [roomId]);

    // --- 2. TRIGGER BOT ---
    const currentTurnId = roomData?.turnIndex;
    const currentTurnName = roomData?.players?.[currentTurnId]?.name;
    const gameStatus = roomData?.status;

    useEffect(() => {
        if (gameStatus === 'playing' && currentTurnName && currentTurnName.includes('Bot')) {
        console.log(`🤖 È il turno di ${currentTurnName}, elaborazione mossa...`);
        const timer = setTimeout(() => {
            playBotTurn(roomId).catch(err => console.error("❌ Errore bot:", err));
        }, 1200);
        return () => clearTimeout(timer);
        }
    }, [gameStatus, currentTurnId, currentTurnName, roomId]);

    // --- 3. TRIGGER RISOLUZIONE PRESA (Raccoglie le 4 carte) ---
    useEffect(() => {
        if (roomData?.status === 'resolving_trick') {
        const humanIds = Object.keys(roomData.players).filter(id => !roomData.players[id].name.includes('Bot'));
        if (humanIds[0] === playerId) {
            const timer = setTimeout(() => resolveTrick(roomId, roomData), 2500);
            return () => clearTimeout(timer);
        }
        }
    }, [roomData, roomId, playerId]);

    // --- 4. TRIGGER FINE MANO (Calcola le singhe) ---
    useEffect(() => {
        if (roomData?.status === 'hand_over') {
        const humanIds = Object.keys(roomData.players).filter(id => !roomData.players[id].name.includes('Bot'));
        if (humanIds[0] === playerId) {
            processHandOver(roomId, roomData);
        }
        }
    }, [roomData, roomId, playerId]);

    // --- 5. TRIGGER AVANZAMENTO TABELLONE (Nuova mano) ---
    useEffect(() => {
        if (roomData?.status === 'between_hands') {
        const humanIds = Object.keys(roomData.players).filter(id => !roomData.players[id].name.includes('Bot'));
        if (humanIds[0] === playerId) {
            const timer = setTimeout(() => startNextHand(roomId, roomData), 12000);
            return () => clearTimeout(timer);
        }
        }
    }, [roomData, roomId, playerId]);

  // Schermata 1: Chiede il nome prima di farlo sedere
    if (!hasJoined) {
        return (
        <div className="min-h-screen bg-green-900 flex items-center justify-center p-4">
            <form onSubmit={handleJoin} className="bg-green-800 p-8 rounded-xl shadow-xl max-w-sm w-full text-center border-2 border-green-700">
            <h2 className="text-2xl text-white font-bold mb-6">Tavolo {roomId}</h2>
            <input 
                type="text" 
                placeholder="Il tuo nome" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-3 rounded mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                maxLength={12}
                required
            />
            <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-4 rounded transition-colors">
                Siediti al Tavolo
            </button>
            </form>
        </div>
        )
    }


    // Schermata 3: IL GIOCO VERO E PROPRIO
    
    if (roomData?.status === 'playing' || roomData?.status === 'resolving_trick') {
        const myData = roomData.players[playerId];
        const isMyTurn = roomData.turnIndex === playerId;

        // 1. CALCOLO POSIZIONI (Giro Antiorario: tu sei a Sud, il prossimo a Est/Destra)
        const playerIds = Object.keys(roomData.players);
        const myIndex = playerIds.indexOf(playerId);
        
        const getPosition = (id) => {
        const pIndex = playerIds.indexOf(id);
        const offset = (pIndex - myIndex + playerIds.length) % playerIds.length;
        if (offset === 0) return 'bottom'; // Tu
        if (offset === 1) return 'right';  // Prossimo
        if (offset === 2) return 'top';    // Di fronte
        if (offset === 3) return 'left';   // Precedente
        };

        const getPlayerByPos = (pos) => {
        const id = playerIds.find(id => getPosition(id) === pos);
        return id ? { id, ...roomData.players[id] } : null;
        };

        const topP = getPlayerByPos('top');
        const leftP = getPlayerByPos('left');
        const rightP = getPlayerByPos('right');

        // Helper per stampare le stanghette delle singhe
        const renderStanghette = (id) => {
        const singhe = roomData.singhe?.[id] || 0;
        return Array(singhe).fill('|').join(' ');
        };

        
        return (
            <div className="min-h-screen bg-green-800 flex flex-col justify-between p-4 relative overflow-hidden">
                
                {/* Intestazione */}
                <div className="flex justify-between text-white bg-green-900 p-2 rounded z-10">
                <span>Stanza: {roomId}</span>
                <span className="font-bold text-yellow-400">Turno di: {roomData.players[roomData.turnIndex]?.name}</span>
                </div>

                {/* FOGLIETTO DELLE SINGHE (La Croce Realistica) */}
                <div className="absolute top-16 left-4 bg-[#fdfbf2] w-32 h-36 rounded shadow-lg border border-gray-400 transform -rotate-3 z-10">
                    
                    {/* Assi centrali (La croce che non tocca i bordi estremi) */}
                    <div className="absolute top-1/2 left-3 right-3 h-[2px] bg-blue-900/30 -translate-y-1/2 rounded-full"></div>
                    <div className="absolute left-1/2 top-3 bottom-3 w-[2px] bg-blue-900/30 -translate-x-1/2 rounded-full"></div>
                    
                    {/* Nord (Di fronte) - Segni orizzontali, crescono verso l'alto */}
                    <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 flex flex-col-reverse mb-2 gap-1.5">
                        {[...Array(roomData.singhe?.[topP?.id] || 0)].map((_,i) => 
                        <div key={i} className="w-5 h-[2px] bg-blue-900 rotate-[-5deg] rounded-full"></div>
                        )}
                    </div>
                    
                    {/* Sud (Tu) - Segni orizzontali, crescono verso il basso */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 flex flex-col mt-2 gap-1.5">
                        {[...Array(roomData.singhe?.[playerId] || 0)].map((_,i) => 
                        <div key={i} className="w-5 h-[2px] bg-blue-900 rotate-[-5deg] rounded-full"></div>
                        )}
                    </div>
                    
                    {/* Ovest (Sinistra) - Segni verticali, crescono verso sinistra */}
                    <div className="absolute right-1/2 top-1/2 -translate-y-1/2 flex flex-row-reverse mr-2 gap-1.5">
                        {[...Array(roomData.singhe?.[leftP?.id] || 0)].map((_,i) => 
                        <div key={i} className="w-[2px] h-5 bg-blue-900 rotate-[8deg] rounded-full"></div>
                        )}
                    </div>
                    
                    {/* Est (Destra) - Segni verticali, crescono verso destra */}
                    <div className="absolute left-1/2 top-1/2 -translate-y-1/2 flex flex-row ml-2 gap-1.5">
                        {[...Array(roomData.singhe?.[rightP?.id] || 0)].map((_,i) => 
                        <div key={i} className="w-[2px] h-5 bg-blue-900 rotate-[8deg] rounded-full"></div>
                        )}
                    </div>

                </div>

                {/* CENTRO DEL TAVOLO (Carte distanziate) */}
                <div className="flex-1 relative flex items-center justify-center border-4 border-green-700 rounded-[100px] mx-8 my-4 bg-green-900 shadow-inner">
                
                {/* Etichette degli avversari */}
                {topP && <div className="absolute top-4 text-green-300 font-bold text-lg">{topP.name} (Di fronte)</div>}
                {leftP && <div className="absolute left-8 text-green-300 font-bold text-lg transform -rotate-90 origin-left">{leftP.name}</div>}
                {rightP && <div className="absolute right-8 text-green-300 font-bold text-lg transform rotate-90 origin-right">{rightP.name}</div>}

                {/* Area in cui atterrano le carte (PIÙ LARGA) */}
                <div className="relative w-80 h-80">
                    {roomData.tableCards?.map((play, idx) => {
                    const pos = getPosition(play.playerId);
                    
                    // Spaziatura aumentata (translate-x-12 e translate-y-10)
                    let posClasses = "";
                    if (pos === 'bottom') posClasses = "bottom-0 left-1/2 -translate-x-1/2 translate-y-10 z-40";
                    if (pos === 'top') posClasses = "top-0 left-1/2 -translate-x-1/2 -translate-y-10 z-10";
                    if (pos === 'left') posClasses = "top-1/2 left-0 -translate-y-1/2 -translate-x-12 z-20";
                    if (pos === 'right') posClasses = "top-1/2 right-0 -translate-y-1/2 translate-x-12 z-30";

                    return (
                        <div key={idx} className={`absolute ${posClasses} bg-white rounded p-2 text-center border-2 border-gray-300 w-24 h-36 flex flex-col justify-between shadow-2xl`}>
                        <span className="text-base font-bold text-gray-800">{play.card.label}</span>
                        <span className="text-sm text-gray-500">di {play.card.suit}</span>
                        </div>
                    );
                    })}
                </div>
                </div>

                {/* LE MIE CARTE E PUNTEGGIO LIVE */}
                <div className="bg-green-900 p-4 rounded-t-2xl relative">
                <div className="flex justify-between items-end mb-4 px-4 border-b border-green-700 pb-2">
                    <div>
                    <h3 className="text-white text-xl">
                        La tua mano ({myData.name}) {isMyTurn ? " - È IL TUO TURNO! ⬇️" : ""}
                    </h3>
                    <p className="text-yellow-400 font-mono text-lg mt-1 tracking-wider">
                        Punteggio attuale: <strong className="text-2xl">{myData.points || 0}</strong> pt
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
                    {(() => {
                    let displayHand = [...(myData.hand || [])];
                    if (isSorted) {
                        const powerOrder = ['4', '5', '6', '7', 'Donna', 'Cavallo', 'Re', 'Asso', '2', '3'];
                        displayHand.sort((a, b) => {
                        if (a.suit === b.suit) return powerOrder.indexOf(a.label) - powerOrder.indexOf(b.label);
                        return a.suit.localeCompare(b.suit);
                        });
                    }

                    return displayHand.map((card, idx) => (
                        <div 
                        key={idx} 
                        onClick={() => isMyTurn ? playCard(roomId, playerId, card, roomData) : null}
                        className={`bg-white rounded p-2 text-center border-2 border-gray-300 w-20 h-28 flex flex-col justify-between select-none
                        ${isMyTurn 
                            ? 'cursor-pointer hover:-translate-y-4 hover:border-yellow-500 hover:shadow-xl transition-all' 
                            : 'opacity-70 cursor-not-allowed'}`}
                        >
                        <span className="text-sm font-bold text-gray-800">{card.label}</span>
                        <span className="text-xs text-gray-500">di {card.suit}</span>
                        </div>
                    ));
                    })()}
                </div>
            </div>

        </div>
        )
    }

    // Schermata 4: TABELLONE PUNTEGGI (Tra una mano e l'altra)
    if (roomData?.status === 'between_hands') {
        return (
        <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center p-4">
            <div className="bg-green-800 p-8 rounded-2xl border-4 border-yellow-600 max-w-lg w-full text-center shadow-2xl">
            <h2 className="text-3xl text-yellow-500 font-bold mb-6">Mano Terminata!</h2>
            
            <div className="space-y-4 mb-8 text-left">
                {players.map((p, idx) => {
                const mySinghe = roomData.singhe?.[p.id] || 0;
                return (
                    <div key={idx} className="bg-green-700 p-4 rounded flex justify-between items-center text-white text-lg">
                    <span className="font-bold">{p.name}</span>
                    <div className="flex gap-4">
                        <span>Prese: {p.points} pt</span>
                        <span className="text-red-400 font-bold">Singhe: {mySinghe}/5</span>
                    </div>
                    </div>
                );
                })}
            </div>

            <button 
                onClick={() => startNextHand(roomId, roomData)}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl text-xl transition-all"
            >
                Distribuisci Nuova Mano
            </button>
            </div>
        </div>
        )
    }

    // Schermata 5: GAME OVER (Qualcuno ha raggiunto 5 singhe)
    if (roomData?.status === 'game_over') {
        return (
        <div className="min-h-screen bg-red-900 flex flex-col items-center justify-center p-4">
            <h1 className="text-6xl text-white font-bold mb-4">FINE PARTITA</h1>
            <h2 className="text-3xl text-yellow-400 mb-8">{roomData.losers?.join(', ')} ha perso (5 Singhe!)</h2>
            {/* Qui in futuro potremo aggiungere il pulsante per resettare a 0 le singhe e rifare la rivincita */}
        </div>
        )
    }

    return (
        <div className="min-h-screen bg-green-800 p-4 flex flex-col items-center">
        <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-green-900 p-4 rounded-lg border border-green-700">
            <h2 className="text-xl text-yellow-500 font-bold tracking-widest uppercase">Cuticchiune</h2>
            <div className="text-white font-mono bg-green-950 px-4 py-1 rounded">Codice: {roomId}</div>
        </div>

        {/* Area dei giocatori seduti */}
        <div className="text-center mb-12">
            <h3 className="text-white text-lg mb-4">
            Giocatori seduti ({players.length}/4)
            </h3>
            <div className="flex flex-wrap justify-center gap-4">
            {players.map((p, index) => (
                <div key={index} className="bg-green-700 px-6 py-3 rounded-full text-white font-bold shadow-md border border-green-600 flex items-center gap-2">
                <span className="text-xl">👤</span> {p.name}
                </div>
            ))}
            
            {[...Array(4 - players.length)].map((_, i) => (
                <div key={`empty-${i}`} className="border-2 border-dashed border-green-600 px-6 py-3 rounded-full text-green-500 font-medium">
                Posto libero
                </div>
            ))}
            </div>

            {/* PULSANTE DI TEST (Visibile solo se mancano giocatori) */}
            {players.length > 0 && players.length < 4 && (
            <button 
                onClick={() => fillTableWithDummies(roomId)}
                className="mt-6 bg-gray-600 hover:bg-gray-500 text-white font-mono text-sm py-2 px-4 rounded border border-gray-400 opacity-70 hover:opacity-100"
            >
                🛠 Riempimento rapido (Test)
            </button>
            )}
        </div>

        {/* PULSANTE PER AVVIARE LA PARTITA (Visibile solo a tavolo pieno) */}
        {players.length === 4 && (!roomData || roomData.status === 'waiting') && (
            <button 
            onClick={() => startGame(roomId, roomData)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg transition-transform transform hover:scale-105 animate-bounce"
            >
            Diamo le carte!
            </button>
        )}

        </div>
    )

}

