import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  joinOrCreateRoom, sitAtTable, subscribeToRoom, startGame, 
  fillTableWithDummies, playBotTurn, resolveTrick, 
  processHandOver, startNextHand, resetGame, acknowledgePenalty 
} from '../services/gameSync';

import Player from './Player';
import Table from './Table';

export default function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate(); // Per il redirect alla Home
    
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
    // MOTORI LOGICI E ROUTING DI SICUREZZA
    // ==========================================

    useEffect(() => {
        // Se fallisce l'inizializzazione, torna alla Home
        joinOrCreateRoom(roomId).catch(() => navigate('/')); 
        
        const unsubscribe = subscribeToRoom(roomId, (data) => {
        // Se Firebase restituisce null (stanza cancellata o inesistente), torna alla Home
        if (!data) navigate('/'); 
        else setRoomData(data);
        });
        return () => unsubscribe();
    }, [roomId, navigate]);

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
            const timer = setTimeout(() => startNextHand(roomId, roomData), 6000);
            return () => clearTimeout(timer);
        }
        }
    }, [roomData, roomId, playerId]);

    const handleJoin = async (e) => {
        e.preventDefault();
        if (playerName.trim()) {
        const success = await sitAtTable(roomId, playerId, playerName);
        if (success) setHasJoined(true);
        }
    };

    // ==========================================
    // RENDER DELLE SCHERMATE
    // ==========================================

    if (!hasJoined) {
        return (
        <div className="min-h-screen bg-green-900 flex items-center justify-center p-4">
            <form onSubmit={handleJoin} className="bg-green-800 p-8 rounded-xl shadow-xl max-w-sm w-full text-center border-2 border-green-700">
            <h2 className="text-2xl text-white font-bold mb-6">Tavolo {roomId}</h2>
            <input type="text" placeholder="Il tuo nome" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full p-3 rounded mb-4 text-center text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" maxLength={12} required />
            <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-4 rounded transition-colors">Siediti al Tavolo</button>
            </form>
        </div>
        );
    }

    if (!roomData) return <div className="min-h-screen flex items-center justify-center bg-green-900 text-white">Caricamento tavolo...</div>;

    if (roomData?.status === 'playing' || roomData?.status === 'resolving_trick') {
        return (
        <div className="min-h-screen bg-green-800 flex flex-col justify-between p-4 relative overflow-hidden">
            <div className="flex justify-between text-white bg-green-900 p-2 rounded z-10">
            <span>Stanza: {roomId}</span>
            <span className="font-bold text-yellow-400">Turno di: {roomData.players[roomData.turnIndex]?.name}</span>
            </div>
            
            <Table roomData={roomData} playerId={playerId} />
            <Player roomData={roomData} playerId={playerId} roomId={roomId} />
        </div>
        );
    }

    if (roomData?.status === 'suit_penalty') {
        const { name, expectedSuit, wrongSuit } = roomData.penaltyInfo || {};
        return (
        <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-900 border-4 border-yellow-500 p-8 rounded-2xl max-w-xl shadow-[0_0_50px_rgba(220,38,38,0.6)] z-50">
            <h1 className="text-6xl mb-6 animate-bounce">🚨 AZIONE ILLEGALE 🚨</h1>
            <p className="text-2xl text-white mb-4 leading-relaxed"><strong className="text-yellow-400 text-3xl uppercase block mb-2">{name}</strong> non ha risposto a seme!</p>
            <div className="bg-red-950 p-4 rounded-lg border border-red-800 my-6">
                <p className="text-xl text-gray-300 italic">A terra c'era <strong className="text-white">{expectedSuit}</strong>,<br/>ma ha buttato <strong className="text-white">{wrongSuit}</strong>.</p>
            </div>
            <div className="text-5xl mb-8 font-black text-white bg-red-600 py-3 rounded-lg transform -rotate-2">✍️ +1 SINGA</div>
            <button onClick={() => acknowledgePenalty(roomId, roomData)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-red-900 font-bold py-4 px-8 rounded-xl text-xl transition-all shadow-xl">Vai al tabellone</button>
            </div>
        </div>
        );
    }

    if (roomData?.status === 'between_hands') {
        return (
        <div className="min-h-screen bg-green-900 flex flex-col items-center justify-center p-4">
            <div className="bg-green-800 p-8 rounded-2xl border-4 border-yellow-600 max-w-lg w-full text-center shadow-2xl">
            <h2 className="text-3xl text-yellow-500 font-bold mb-6">Mano Terminata!</h2>
            <div className="space-y-4 mb-8 text-left">
                {players.map((p, idx) => (
                <div key={idx} className="bg-green-700 p-4 rounded flex justify-between items-center text-white text-lg">
                    <span className="font-bold">{p.name}</span>
                    <div className="flex gap-6 items-center">
                    <span className="text-gray-300 text-sm">Mani vinte: {p.validTricks || 0}</span>
                    <span className="font-bold text-yellow-400">Punti: {p.points || 0}</span>
                    <span className="text-red-400 font-bold ml-2">Singhe: {roomData.singhe?.[p.id] || 0}</span>
                    </div>
                </div>
                ))}
            </div>
            <button onClick={() => startNextHand(roomId, roomData)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl text-xl transition-all">Distribuisci Nuova Mano</button>
            </div>
        </div>
        );
    }

    if (roomData?.status === 'game_over') {
        return (
        <div className="min-h-screen bg-red-900 flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-6xl text-white font-bold mb-4 animate-bounce">FINE PARTITA</h1>
            <h2 className="text-3xl text-yellow-500 mb-2 font-bold">{roomData.gameOverReason}</h2>
            <p className="text-2xl text-white mb-12">Chi paga da bere: <strong className="text-yellow-400 uppercase text-4xl block mt-4">{roomData.losers?.join(' e ')}</strong></p>
            <button onClick={() => resetGame(roomId, roomData)} className="bg-yellow-600 hover:bg-yellow-500 text-red-900 font-bold py-5 px-12 rounded-full text-3xl shadow-xl transition-transform transform hover:scale-105">🔄 Gioca la Rivincita!</button>
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-800 p-4 flex flex-col items-center">
        <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-green-900 p-4 rounded-lg border border-green-700">
            <h2 className="text-xl text-yellow-500 font-bold tracking-widest uppercase">Cuticchiune</h2>
            <div className="text-white font-mono bg-green-950 px-4 py-1 rounded">Codice: {roomId}</div>
        </div>
        <div className="text-center mb-12">
            <h3 className="text-white text-lg mb-4">Giocatori seduti ({players.length}/4)</h3>
            <div className="flex flex-wrap justify-center gap-4">
            {players.map((p, index) => <div key={index} className="bg-green-700 px-6 py-3 rounded-full text-white font-bold shadow-md border border-green-600 flex items-center gap-2">👤 {p.name}</div>)}
            {[...Array(4 - players.length)].map((_, i) => <div key={`empty-${i}`} className="border-2 border-dashed border-green-600 px-6 py-3 rounded-full text-green-500 font-medium">Posto libero</div>)}
            </div>
            {players.length > 0 && players.length < 4 && <button onClick={() => fillTableWithDummies(roomId)} className="mt-6 bg-gray-600 hover:bg-gray-500 text-white font-mono text-sm py-2 px-4 rounded border border-gray-400 opacity-70 hover:opacity-100">🛠 Riempimento rapido (Test)</button>}
        </div>
            {players.length === 4 && (!roomData || roomData.status === 'waiting') && (
            <button 
            onClick={(e) => {
                e.currentTarget.disabled = true; // Blocca il pulsante all'istante
                e.currentTarget.innerText = "Mescolando..."; // Cambia il testo visivamente
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