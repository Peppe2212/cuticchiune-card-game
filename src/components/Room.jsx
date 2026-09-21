import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { joinOrCreateRoom, sitAtTable, subscribeToRoom, startGame, fillTableWithDummies } from '../services/gameSync'

export default function Room() {
    const { roomId } = useParams()
    const [playerName, setPlayerName] = useState('')
    const [hasJoined, setHasJoined] = useState(false)
    const [roomData, setRoomData] = useState(null)

  // Generiamo un ID fittizio e univoco per il giocatore (in un'app vera useremmo l'autenticazione)
    const [playerId] = useState(() => {
    // 1. Controlla se il giocatore ha già un ID salvato nel telefono per QUESTA specifica stanza
    const savedId = localStorage.getItem(`cuticchiune_${roomId}`);
    if (savedId) {
        return savedId; // È tornato! Usiamo il suo vecchio ID
    }
    
    // 2. È la prima volta che entra: crea un nuovo ID casuale e salvalo nel telefono
    const newId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem(`cuticchiune_${roomId}`, newId);
    return newId;
    });

  useEffect(() => {
    // Appena si apre la pagina, inizializza la stanza su Firebase
    joinOrCreateRoom(roomId);

    // Accende il radar per ascoltare i cambiamenti
    const unsubscribe = subscribeToRoom(roomId, (data) => {
      setRoomData(data);
    });

    return () => unsubscribe(); // Spegne il radar uscendo
  }, [roomId]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const success = await sitAtTable(roomId, playerId, playerName);
    if (success) {
      setHasJoined(true);
    } else {
      alert("Il tavolo è già pieno! (4/4 giocatori)");
    }
  }

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

  // Schermata 2: Il tavolo verde vero e proprio
  const players = roomData?.players ? Object.values(roomData.players) : [];

  // Schermata 3: IL GIOCO VERO E PROPRIO
  if (roomData?.status === 'playing') {
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
            <div className="text-white">Ci sono {roomData.tableCards.length} carte sul tavolo</div>
          ) : (
            <div className="text-green-700 font-bold text-2xl">Nessuna carta a terra</div>
          )}
        </div>

        {/* Le mie carte in mano */}
        <div className="bg-green-900 p-4 rounded-t-2xl">
          <h3 className="text-white text-center mb-2">
            La tua mano ({myData.name}) {isMyTurn ? " - È IL TUO TURNO!" : ""}
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {myData.hand && myData.hand.map((card, idx) => (
              <div key={idx} className="bg-white rounded p-2 text-center border-2 border-gray-300 w-20 h-28 flex flex-col justify-between">
                <span className="text-sm font-bold text-gray-800">{card.label}</span>
                <span className="text-xs text-gray-500">di {card.suit}</span>
              </div>
            ))}
          </div>
        </div>
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

