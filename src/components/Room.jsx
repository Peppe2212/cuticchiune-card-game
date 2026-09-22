import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  joinOrCreateRoom, sitAtTable, subscribeToRoom, startGame, 
  fillTableWithDummies, playBotTurn, resolveTrick, 
  processHandOver, startNextHand, resetGame, acknowledgePenalty,
  replacePlayerWithBot 
} from '../services/gameSync';

import Player from './Player';
import Table from './Table';

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate(); 
    const location = useLocation();

    const isCreating = location.state?.isCreating || false;
    
    const [playerName, setPlayerName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [roomData, setRoomData] = useState(null);

    const [playerId] = useState(() => {
        const savedId = localStorage.getItem(`cuticchiune_${roomId}`);
        if (savedId) return savedId;
        const newId = Math.random().toString(36).substring(2, 9);
        localStorage.setItem(`cuticchiune_${roomId}`, newId);
        return newId;
    });

    const players = roomData?.players ? Object.entries(roomData.players).map(([id, p]) => ({ id, ...p })) : [];

    // ==========================================
    // MOTORI LOGICI E RICONNESSIONE AUTOMATICA
    // ==========================================

    useEffect(() => {
        let unsubscribe = () => {}; // Funzione vuota di default

        const initStanza = async () => {
        try {
            // 1. ASPETTA il verdetto: il database controllerà se la stanza esiste o se deve crearla
            await joinOrCreateRoom(roomId, isCreating);

            // 2. SOLO SE IL CONTROLLO PASSA, ci mettiamo in ascolto dei dati
            unsubscribe = subscribeToRoom(roomId, (data) => {
            if (!data) {
                navigate('/?error=notfound'); 
            } else {
                setRoomData(data);
                // Controllo se ero già seduto
                if (data.players && data.players[playerId]) {
                setHasJoined(true);
                setPlayerName(data.players[playerId].name);
                }
            }
            });
        } catch (error) {
            // 3. Se joinOrCreateRoom lancia un errore, rimbalza alla Home all'istante
            navigate('/?error=notfound');
        }
        };

        initStanza();

        // Pulizia quando si esce dalla pagina
        return () => unsubscribe();
    }, [roomId, navigate, playerId, isCreating]);

    useEffect(() => {
        const turnId = roomData?.turnIndex;
        const turnName = roomData?.players?.[turnId]?.name;
        if (roomData?.status === 'playing' && turnName && turnName.includes('Bot')) {
        const timer = setTimeout(() => playBotTurn(roomId).catch(console.error), 1200);
        return () => clearTimeout(timer);
        }
    }, [roomData?.turnIndex, roomData?.status, roomId]);

    useEffect(() => {
        if (roomData?.status === 'resolving_trick') {
        const humanIds = Object.keys(roomData.players).filter(id => !roomData.players[id].name.includes('Bot'));
        if (humanIds[0] === playerId) {
            const timer = setTimeout(() => resolveTrick(roomId, roomData), 2500);
            return () => clearTimeout(timer);
        }
        }
    }, [roomData, roomId, playerId]);

    useEffect(() => {
        if (roomData?.status === 'hand_over') {
        const humanIds = Object.keys(roomData.players).filter(id => !roomData.players[id].name.includes('Bot'));
        if (humanIds[0] === playerId) processHandOver(roomId, roomData);
        }
    }, [roomData, roomId, playerId]);

    useEffect(() => {
        if (roomData?.status === 'between_hands') {
        const humanIds = Object.keys(roomData.players).filter(id => !roomData.players[id].name.includes('Bot'));
        if (humanIds[0] === playerId) {
            const timer = setTimeout(() => startNextHand(roomId, roomData), 12000);
            return () => clearTimeout(timer);
        }
        }
    }, [roomData, roomId, playerId]);

    //banda
    useEffect(() => {
        let audio = null;

        if (roomData?.status === 'game_over' && roomData?.gameOverReason?.includes('10')) {
            audio = new Audio('/the_king_30sec.m4a');
            audio.loop = true; // La banda continua a suonare in loop!
            audio.play().catch(e => console.log("Il browser richiede un'interazione prima di riprodurre l'audio.", e));
        }

        // Funzione di pulizia: scatta non appena lo stato cambia (es. resetGame o navigate)
        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0; // Riporta la traccia all'inizio
            }
        };
    }, [roomData?.status, roomData?.gameOverReason]);
    
    const handleJoin = async (e) => {
        e.preventDefault();
        if (playerName.trim()) {
        const success = await sitAtTable(roomId, playerId, playerName);
        if (success) setHasJoined(true);
        }
    };

    // 🔴 SPOSTATO QUI: Tutte le variabili e l'hook useMemo DEVONO stare prima
    // dei "return" di uscita anticipata, altrimenti React va in crash. (Nessuna frase è stata modificata)
    const activeStates = ['playing', 'resolving_trick', 'suit_penalty', 'between_hands', 'game_over'];
    
    // GERARCHIA HOST (Per evitare doppi click)
    const humanIds = Object.keys(roomData?.players || {}).filter(id => !roomData.players[id]?.name.includes('Bot'));
    const originalHost = roomData?.hostId;
    const activeHostId = humanIds.includes(originalHost) ? originalHost : humanIds[0];
    const isRoomHost = activeHostId === playerId;

    // VARIABILI PER GAME OVER E SFOTTI
    const myName = roomData?.players?.[playerId]?.name;
    const isGameOver = roomData?.status === 'game_over';
    const amILoser = roomData?.losers?.includes(myName);
    const isTenSinghe = roomData?.gameOverReason?.includes('10');

    // GENERATORE MESSAGGI GOLIARDICI (Tra una mano e l'altra)
    const goliardicMessage = useMemo(() => {
        if (roomData?.status !== 'between_hands') return "";
        const mySinghe = roomData?.singhe?.[playerId] || 0;
        const someoneHas9 = humanIds.some(id => roomData?.singhe?.[id] === 9);
        
        if (someoneHas9) return "🎺 ATTENZIONE: ARRIVA LA BANDA! 🥁";
        if (mySinghe === 0) return "Ancora intonso. Ma la serata è lunga...";
        if (mySinghe >= 7) return "Stai sudando freddo, ammettilo.";
        
        const randomMsg = [
            "Salvo per un pelo!",
            "Usa la testa, non i piedi!",
            "Anche a sto giro hai rubato lo stipendio.",
            "Maestro di schivata!",
            "Sento odore di paura al tavolo..."
        ];
        return randomMsg[Math.floor(Math.random() * randomMsg.length)];
    }, [roomData?.status, roomData?.singhe, playerId, humanIds]);


    // ==========================================
    // RENDER DELLE SCHERMATE E BLOCCO INTRUSI
    // ==========================================

    // BLOCCO INTRUSI: Se non sono seduto e la partita è già iniziata, vengo cacciato!
    if (!hasJoined && roomData && roomData.status !== 'waiting') {
        navigate('/?error=started');
        return null;
    }

    if (!hasJoined) {
        return (
        <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center p-4 relative">
            {/* Tasto Indietro Assoluto */}
            <button 
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 bg-green-800 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg border border-green-600 shadow-lg flex items-center gap-2 transition-colors"
            >
            🔙 Torna alla Home
            </button>

            <form onSubmit={handleJoin} className="bg-green-800 p-8 rounded-xl shadow-xl max-w-sm w-full text-center border-2 border-green-700 mt-12">
            <h2 className="text-2xl text-white font-bold mb-6">Tavolo {roomId}</h2>
            <input type="text" placeholder="Il tuo nome" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full p-3 rounded mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" maxLength={12} required />
            <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-4 rounded transition-colors">Siediti al Tavolo</button>
            </form>
        </div>
        );
    }

    if (!roomData) return <div className="min-h-screen flex items-center justify-center bg-green-900 text-white font-bold text-xl animate-pulse">Caricamento tavolo...</div>;


    // ==========================================
    // IL GIOCO VERO E PROPRIO (Tutte le fasi mantengono il tavolo sullo sfondo)
    // ==========================================

    if (activeStates.includes(roomData?.status)) {

        return (
            <div className="min-h-screen bg-green-800 flex flex-col justify-between p-4 relative overflow-hidden">
                
                {/* INTESTAZIONE IN GIOCO */}
                <div className="flex justify-between items-center text-white bg-green-900 p-3 rounded-lg z-10 shadow-md border border-green-700">
                    <button 
                        onClick={() => {
                        if (window.confirm("Vuoi davvero abbandonare la partita in corso?")) navigate('/');
                        }}
                        className="bg-red-800 hover:bg-red-700 text-white text-sm font-bold py-1.5 px-4 rounded transition-colors shadow"
                    >
                        🚪 Abbandona
                    </button>
                    
                    <div className="flex-1 text-center">
                        <span className="font-bold text-yellow-400 text-lg tracking-wide uppercase">
                        Turno di: {roomData.players[roomData.turnIndex]?.name}
                        </span>
                    </div>

                    <div className="bg-green-950 px-3 py-1.5 rounded font-mono text-sm text-green-300 border border-green-800">
                        Stanza: {roomId}
                    </div>
                </div>

                {/* IL TAVOLO RIMANE SEMPRE MONTATO */}
                <Table 
                    roomData={roomData} 
                    playerId={playerId} 
                    isGameOver={isGameOver} 
                    onReplaceWithBot={(targetId, currentName) => replacePlayerWithBot(roomId, targetId, currentName)}
                />
                
                {/* Nascondiamo la mano del giocatore solo a fine partita o tra una mano e l'altra */}
                {!['between_hands', 'game_over'].includes(roomData.status) && (
                    <Player roomData={roomData} playerId={playerId} roomId={roomId} />
                )}

                {/* OVERLAY: AZIONE ILLEGALE (Penalità Compatta) */}
                {roomData.status === 'suit_penalty' && (
                    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-red-900 border-4 border-yellow-500 p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.8)] text-center">
                            <h1 className="text-4xl mb-4 animate-bounce font-black text-white drop-shadow-lg">🚨 ILLEGALE 🚨</h1>
                            <p className="text-lg text-white mb-2 leading-relaxed"><strong className="text-yellow-400 text-2xl uppercase block">{roomData.penaltyInfo?.name}</strong> Non ha corrisposto, forse si sente alla Ludoteca!</p>
                            <div className="bg-red-950 p-3 rounded-lg border border-red-800 my-4">
                                <p className="text-base text-gray-300 italic">A terra c'era <strong className="text-white">{roomData.penaltyInfo?.expectedSuit}</strong>,<br/>ma ha buttato <strong className="text-white">{roomData.penaltyInfo?.wrongSuit}</strong>.</p>
                            </div>
                            <div className="text-4xl mb-6 font-black text-white bg-red-600 py-2 rounded-lg transform -rotate-2 shadow-xl border-2 border-red-400">✍️ +1 SINGA</div>
                            
                            {/* CONTROLLO RACE CONDITION */}
                            {isRoomHost ? (
                                <button 
                                    onClick={(e) => {
                                        e.currentTarget.disabled = true;
                                        e.currentTarget.innerText = "Applicando...";
                                        acknowledgePenalty(roomId, roomData);
                                    }} 
                                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-red-900 font-bold py-3 px-8 rounded-xl text-xl transition-transform hover:scale-105 shadow-xl disabled:opacity-50"
                                >
                                    Continua
                                </button>
                            ) : (
                                <div className="w-full bg-gray-800/80 text-gray-400 font-bold py-3 rounded-xl text-xl border border-gray-600">
                                    ⏳ Attesa Host...
                                </div>
                            )}
                        </div>
                    </div>
                )}
            {roomData.status === 'between_hands' && (
                    <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <style>{`@keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }`}</style>
                        
                        {/* Messaggio Goliardico Fluttuante */}
                        <div className={`mb-6 px-6 py-3 rounded-full font-black text-xl shadow-2xl border-2 ${goliardicMessage.includes('BANDA') ? 'bg-red-600 text-white border-yellow-400 animate-bounce' : 'bg-black/80 text-yellow-400 border-yellow-600 animate-pulse'}`}>
                            {goliardicMessage}
                        </div>

                        <div className="bg-green-800 p-6 rounded-2xl border-4 border-yellow-600 max-w-md w-full text-center shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                            <h2 className="text-3xl text-yellow-500 font-black mb-6 drop-shadow-md">Mano Terminata!</h2>
                            <div className="space-y-3 mb-6 text-left">
                                {players.map((p, idx) => (
                                    <div key={idx} className="bg-green-700 p-3 rounded-xl flex justify-between items-center text-white shadow-inner border border-green-600">
                                        <span className="font-bold text-lg">{p.name}</span>
                                        <div className="flex gap-3 items-center text-sm">
                                            <span className="text-gray-300">Prese: {p.validTricks || 0}</span>
                                            <span className="font-bold text-yellow-400 bg-green-900 px-2 py-1 rounded-lg border border-green-800">Pt: {p.points || 0}</span>
                                            <span className="text-red-400 font-bold ml-1">Singhe: {roomData.singhe?.[p.id] || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="w-full bg-green-950 rounded-full h-3 mb-4 border border-green-700 overflow-hidden relative shadow-inner">
                                <div className="bg-yellow-500 h-full rounded-full animate-[shrinkBar_10s_linear_forwards]"></div>
                            </div>

                            {isRoomHost ? (
                                <button 
                                    onClick={(e) => {
                                        e.currentTarget.disabled = true;
                                        startNextHand(roomId, roomData);
                                    }} 
                                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-red-950 font-black py-3 rounded-xl text-xl transition-transform hover:scale-105 shadow-xl disabled:opacity-50"
                                >
                                    Distribuisci Subito ⏭
                                </button>
                            ) : (
                                <div className="w-full bg-gray-800/80 text-gray-400 font-bold py-3 rounded-xl text-xl border border-gray-600">
                                    ⏳ Attesa Host...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                
                {/* OVERLAY: SCONFITTA PERSONALIZZATA */}
                {isGameOver && (
                    <div className="absolute inset-0 z-[50] flex flex-col justify-between items-center py-12 pointer-events-none bg-black/85 backdrop-blur-md">
                        
                        {/* Esito per l'utente (Resta in alto) */}
                        <div className="text-center drop-shadow-2xl mt-4 z-[70]">
                            <h1 className={`text-7xl font-black mb-4 animate-bounce ${amILoser ? 'text-red-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]' : 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]'}`}>
                                {amILoser ? 'HAI PERSO!' : 'HAI VINTO!'}
                            </h1>
                            <h2 className="text-2xl text-yellow-500 font-bold bg-black/50 px-6 py-2 rounded-full border border-yellow-700/50">
                                {roomData.gameOverReason}
                            </h2>
                        </div>
                        
                        {/* 🔴 MODIFICA: Contenitore raggruppato spinto in basso (mt-auto) */}
                        <div className="mt-auto flex flex-col items-center gap-6 z-[70] mb-4">
                            
                            {/* Se il giocatore ha perso ed è arrivata la banda */}
                            {amILoser && isTenSinghe && (
                                <div className="text-center bg-red-900/90 p-4 sm:p-6 rounded-3xl border-4 border-red-500 backdrop-blur-md animate-pulse shadow-[0_0_30px_red]">
                                    <p className="text-3xl sm:text-4xl text-yellow-400 font-black mb-2">🎺 ECCO LA BANDA! 🥁</p>
                                    <p className="text-lg sm:text-xl text-white font-bold">Mano al portafoglio: offri da bere per tutti!</p>
                                </div>
                            )}

                            {/* Se il giocatore ha vinto, sfotte i perdenti */}
                            {!amILoser && (
                                <div className="text-center bg-green-900/90 p-4 sm:p-6 rounded-3xl border-4 border-green-500 backdrop-blur-md">
                                    <p className="text-lg text-white mb-1 font-bold">Chi paga da bere stasera:</p>
                                    <strong className="text-yellow-400 uppercase text-4xl drop-shadow-[0_0_15px_black]">
                                        {roomData.losers?.join(' e ')}
                                    </strong>
                                </div>
                            )}

                            {/* Comandi finali: Rivincita o Fuga */}
                            <div className="pointer-events-auto flex flex-col sm:flex-row gap-4 items-center">
                                {isRoomHost ? (
                                    <button 
                                        onClick={(e) => {
                                            e.currentTarget.disabled = true;
                                            resetGame(roomId, roomData);
                                        }} 
                                        className="bg-yellow-600 hover:bg-yellow-500 text-red-900 font-black py-4 px-10 rounded-full text-2xl shadow-[0_0_30px_rgba(202,138,4,0.5)] transition-transform transform hover:scale-110 disabled:opacity-50"
                                    >
                                        🔄 Gioca la Rivincita!
                                    </button>
                                ) : (
                                    <div className="bg-gray-800 text-gray-400 font-bold py-4 px-10 rounded-full text-2xl border-2 border-gray-600">
                                        ⏳ Attesa dell'Host...
                                    </div>
                                )}

                                <button 
                                    onClick={() => navigate('/')} 
                                    className="bg-red-800 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-full text-xl shadow-lg border border-red-500 transition-colors"
                                >
                                    🚪 Abbandona Tavolo
                                </button>
                            </div>
                        </div>
                        
                    </div>
                )}
            </div>
        );
        
    }

    return (
        <div className="min-h-screen bg-green-800 p-4 flex flex-col items-center">
            
            {/* INTESTAZIONE LOBBY */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-green-900 p-4 rounded-lg border border-green-700 shadow-xl">
                <button 
                    onClick={() => navigate('/')}
                    className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2"
                >
                    🔙 Torna alla Home
                </button>
                
                {/* Spazio per il logo futuro */}
                <h2 className="text-3xl text-yellow-500 font-black tracking-widest uppercase drop-shadow-md hidden sm:block">
                    Cuticchiune
                </h2>
                
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(roomId);
                        alert(`Codice ${roomId} copiato! Invia questo codice ai tuoi amici.`);
                    }}
                    className="bg-green-700 hover:bg-green-600 text-white font-mono py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2 border border-green-500"
                    title="Copia codice stanza"
                >
                    📋 {roomId}
                </button>
            </div>

            {/* CORPO CENTRALE (Lista giocatori e bottoni) */}
            <div className="text-center mb-12 mt-8">
                <h3 className="text-white text-2xl mb-2 font-bold">Giocatori seduti ({players.length}/4)</h3>
                
                {players.length < 4 && (
                    <p className="text-green-300 italic mb-8 animate-pulse">Aspettando altri giocatori...</p>
                )}

                <div className="flex flex-wrap justify-center gap-4">
                    {players.map((p, index) => (
                        <div key={index} className="bg-green-700 px-6 py-3 rounded-full text-white font-bold shadow-md border border-green-600 flex items-center gap-2">
                            👤 {p.name}
                        </div>
                    ))}
                    {[...Array(4 - players.length)].map((_, i) => (
                        <div key={`empty-${i}`} className="border-2 border-dashed border-green-600 px-6 py-3 rounded-full text-green-500 font-medium">
                            Posto libero
                        </div>
                    ))}
                </div>
                
                {/* Modalità Single Player (Visibile solo all'host se mancano giocatori) */}
                {players.length > 0 && players.length < 4 && players[0].id === playerId && (
                    <button 
                        onClick={() => fillTableWithDummies(roomId)} 
                        className="mt-12 bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-xl shadow-xl transition-transform hover:scale-105 flex items-center gap-3 mx-auto border-2 border-blue-400"
                    >
                        🤖 Gioca in Single Player (Aggiungi Bot)
                    </button>
                )}
            </div>

            {/* PULSANTE AVVIO PARTITA MULTIPLAYER (Appare solo quando il tavolo è pieno) */}
            {players.length === 4 && (!roomData || roomData.status === 'waiting') && (
                <button 
                    onClick={(e) => {
                        e.currentTarget.disabled = true; 
                        e.currentTarget.innerText = "Mescolando..."; 
                        startGame(roomId, roomData);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-12 rounded-full text-2xl shadow-lg transition-transform transform hover:scale-105 animate-bounce disabled:opacity-50 disabled:animate-none disabled:cursor-not-allowed mt-4"
                >
                    Diamo le carte!
                </button>
            )}
        </div>
    );
}