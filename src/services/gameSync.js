import { ref, get, set, update, onValue } from "firebase/database";
import { db } from "./firebase";
import { createDeck, shuffleDeck, dealCards } from '../logic/deck';
import { findFiveOfCoinsHolder } from '../logic/rules';

// La struttura di base di una stanza appena creata
const INITIAL_ROOM_STATE = {
  status: 'waiting', // Può essere 'waiting' o 'playing'
  players: {},       // Qui dentro andranno i 4 giocatori
  turnIndex: null,   // Chi deve giocare
  tableCards: [],    // Le carte attualmente scese
  singhe: {}         // Il conteggio delle sconfitte
};

// 1. Entra nella stanza o la crea se non esiste
export async function joinOrCreateRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    await set(roomRef, INITIAL_ROOM_STATE);
  }
  return true;
}

// 2. Aggiunge il giocatore al tavolo (se c'è posto)
// 2. Aggiunge il giocatore al tavolo (se c'è posto)
export async function sitAtTable(roomId, playerId, playerName) {
  try {
    const roomRef = ref(db, `rooms/${roomId}`);
    let snapshot = await get(roomRef);

    // Se per qualche motivo la stanza non ha fatto in tempo a crearsi, la crea ora
    if (!snapshot.exists()) {
      await set(roomRef, INITIAL_ROOM_STATE);
      snapshot = await get(roomRef); // ricarica i dati
    }

    const roomData = snapshot.val();
    const playersCount = roomData.players ? Object.keys(roomData.players).length : 0;

    // Se c'è spazio e il giocatore non è già dentro
    if (playersCount < 4 && (!roomData.players || !roomData.players[playerId])) {
      // Usiamo 'set' per scrivere il nuovo nodo del giocatore pulito
      await set(ref(db, `rooms/${roomId}/players/${playerId}`), {
        name: playerName
      });
      return true;
    } else if (roomData.players && roomData.players[playerId]) {
      // Se era già seduto, lo fa rientrare
      return true;
    }
    
    return false; // Stanza piena
  } catch (error) {
    console.error("Errore di Firebase in sitAtTable:", error);
    alert("Errore tecnico: " + error.message);
    return false;
  }
}

// 3. Il "radar": ascolta ogni singolo cambiamento nel database e aggiorna React
export function subscribeToRoom(roomId, callback) {
  const roomRef = ref(db, `rooms/${roomId}`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val()); // Invia i nuovi dati del tavolo a React
    }
  });

  // Ritorna la funzione per spegnere il radar se il giocatore esce
  return unsubscribe;
}

// 4. Avvia la primissima partita
export async function startGame(roomId, playersData) {
  // Crea e mischia il mazzo
  const deck = shuffleDeck(createDeck());
  const playerIds = Object.keys(playersData);
  
  // Distribuisce le 10 carte a testa
  const hands = dealCards(deck, playerIds);
  
  // Trova chi ha il 5 di denari per il primissimo turno
  const startingPlayerId = findFiveOfCoinsHolder(hands);

  // Inizializza le singhe a 0 per tutti i giocatori
  const initialSinghe = {};
  playerIds.forEach(id => initialSinghe[id] = 0);

  // Aggiorna l'oggetto players con le carte in mano
  const updatedPlayers = { ...playersData };
  playerIds.forEach(id => {
    updatedPlayers[id].hand = hands[id];
    updatedPlayers[id].points = 0;       // Punti presi nella mano corrente
    updatedPlayers[id].validTricks = 0;  // Prese >= 1 punto (per la franchezza)
  });

  // Salva tutto su Firebase e cambia lo status in 'playing'
  const updates = {
    status: 'playing',
    players: updatedPlayers,
    turnIndex: startingPlayerId, 
    tableCards: [], // Le 4 carte che verranno giocate nel giro
    singhe: initialSinghe
  };

  await update(ref(db, `rooms/${roomId}`), updates);
}
// 5. [SOLO PER TEST] Riempie i posti vuoti con giocatori fittizi
export async function fillTableWithDummies(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (snapshot.exists()) {
    const roomData = snapshot.val();
    const currentPlayers = roomData.players || {};
    const currentCount = Object.keys(currentPlayers).length;
    
    // Quanti bot servono per arrivare a 4?
    const needed = 4 - currentCount;
    if (needed <= 0) return;

    const updates = {};
    for (let i = 1; i <= needed; i++) {
      const dummyId = `dummy_${Math.random().toString(36).substring(2, 9)}`;
      updates[`rooms/${roomId}/players/${dummyId}`] = { name: `Test Bot ${i}` };
    }
    
    // Aggiorna Firebase in un colpo solo
    await update(ref(db), updates);
  }
}