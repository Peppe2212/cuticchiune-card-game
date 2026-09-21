import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { joinOrCreateRoom, sitAtTable, subscribeToRoom, startGame, fillTableWithDummies, playCard, playBotTurn, resolveTrick, processHandOver, startNextHand, resetGame } from '../services/gameSync'

export default function Room() {
    const { roomId } = useParams()
    const [playerName, setPlayerName] = useState('')
    const [hasJoined, setHasJoined] = useState(false)
    const [roomData, setRoomData] = useState(null)
    

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
    if (roomData?.status === 'playing' || roomData?.status === 'resolving_trick'){
        const myData = roomData.players[playerId];
        const isMyTurn = roomData.turnIndex === playerId;

        return (
        <div className="min-h-screen bg-green-800 flex flex-col justify-between p-4">
            {/* Intestazione */}
            <div className="flex justify-between text-white bg-green-900 p-2 rounded">
            <span>Stanza: {roomId}</span>
            <span className="font-bold text-yellow-400">Turno di: {roomData.players[roomData.turnIndex]?.name}</span>
            </div>

            {/* Centro del tavolo (Carte giocate) */}
            <div className="flex-1 flex items-center justify-center border-4 border-green-700 rounded-full mx-8 my-4 bg-green-900 shadow-inner min-h-[40vh]">
            {roomData.tableCards && roomData.tableCards.length > 0 ? (
                <div className="flex gap-4">
                {roomData.tableCards.map((play, idx) => (
                    <div key={idx} className="bg-white rounded p-3 text-center border-2 border-gray-300 w-24 h-36 flex flex-col justify-between shadow-2xl transform hover:scale-110 transition-transform">
                    <span className="text-base font-bold text-gray-800">{play.card.label}</span>
                    <span className="text-sm text-gray-500">di {play.card.suit}</span>
                    <span className="text-xs text-gray-400 mt-2 truncate bg-gray-100 rounded p-1">
                        {roomData.players[play.playerId].name}
                    </span>
                    </div>
                ))}
                </div>
            ) : (
                <div className="text-green-700 font-bold text-2xl">Nessuna carta a terra</div>
            )}
            </div>

            {/* Le mie carte in mano */}
            <div className="bg-green-900 p-4 rounded-t-2xl">
            <h3 className="text-white text-center mb-4 text-xl">
                La tua mano ({myData.name}) {isMyTurn ? " - È IL TUO TURNO! ⬇️" : ""}
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
                {myData.hand && myData.hand.map((card, idx) => (
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
                ))}
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
            onClick={() => startGame(roomId, roomData.players)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg transition-transform transform hover:scale-105 animate-bounce"
            >
            Diamo le carte!
            </button>
        )}

        </div>
    )

}

