import { ref, get, set, update, onValue } from "firebase/database";
import { db } from "./firebase";
import { createDeck, shuffleDeck, dealCards } from '../logic/deck';
import { findFiveOfCoinsHolder, isValidMove} from '../logic/rules';

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

// 6. Gioca una carta dalla mano al tavolo
export async function playCard(roomId, playerId, cardToPlay, roomData) {
  // Controlli di sicurezza di base
  if (roomData.turnIndex !== playerId) return; 

  const myHand = roomData.players[playerId].hand;
  const tableCards = roomData.tableCards || [];
  
  // Trova il seme di apertura (se ci sono già carte a terra)
  const leadSuit = tableCards.length > 0 ? tableCards[0].card.suit : null;

  // Controllo regole: il giocatore sta rispettando l'obbligo di seme?
  if (!isValidMove(cardToPlay, myHand, leadSuit)) {
    alert(`Devi rispondere a seme! (Seme richiesto: ${leadSuit})`);
    return;
  }

  // Rimuove la carta dalla mano del giocatore
  const updatedHand = myHand.filter(c => c.id !== cardToPlay.id);

  // Aggiunge la carta al tavolo, salvando anche l'ID di chi l'ha giocata
  const newTableCards = [...tableCards, { playerId, card: cardToPlay }];

  // Determina di chi è il prossimo turno (ordine circolare/antiorario)
  const playerIds = Object.keys(roomData.players);
  const currentIndex = playerIds.indexOf(playerId);
  const nextTurnIndex = playerIds[(currentIndex + 1) % playerIds.length];

  // Prepara l'aggiornamento per Firebase
  const updates = {
    [`rooms/${roomId}/players/${playerId}/hand`]: updatedHand,
    [`rooms/${roomId}/tableCards`]: newTableCards,
  };

  // Se il giro non è finito (meno di 4 carte a terra), passa il turno
  if (newTableCards.length < 4) {
    updates[`rooms/${roomId}/turnIndex`] = nextTurnIndex;
  } else {
    // Se le carte sono 4, blocca temporaneamente i turni per risolvere la presa
    updates[`rooms/${roomId}/status`] = 'resolving_trick';
  }

  // Applica le modifiche a Firebase
  await update(ref(db), updates);
}

// 9. Calcola i risultati della mano e assegna le singhe
export async function processHandOver(roomId, roomData) {
  if (roomData.status !== 'hand_over') return;

  const playerIds = Object.keys(roomData.players);
  const singhe = { ...roomData.singhe };
  
  // Trova il punteggio più basso di questa mano
  let minPoints = Math.min(...playerIds.map(id => roomData.players[id].points || 0));

  let matchOver = false;
  let losers = [];
  let lastLoser = null; // Ci serve per capire chi farà il mazziere/inizierà il prossimo turno

  playerIds.forEach(id => {
    const p = roomData.players[id];
    
    // REGOLA DELLA SINGA: Prende la singa chi fa il punteggio più basso 
    // OPPURE chi non è "uscito franco" (nessuna presa da almeno 1 punto)
    if (p.points === minPoints || (p.validTricks || 0) === 0) {
      singhe[id] = (singhe[id] || 0) + 1;
      lastLoser = id; // Segniamo chi ha perso per il cambio mazziere
    }

    // CONDIZIONE FINE PARTITA (5 Singhe)
    if (singhe[id] >= 5) {
      // Qui si incastra l'eccezione "esce franco": se ha 5 singhe ma in questa esatta
      // mano ha fatto punti validi, si potrebbe salvare (dipende dalla variante esatta che giochi).
      // Per ora applichiamo la regola base: 5 = Fine partita.
      matchOver = true;
      losers.push(p.name);
    }
  });

  const updates = {};
  updates[`rooms/${roomId}/singhe`] = singhe;
  updates[`rooms/${roomId}/lastLoser`] = lastLoser || roomData.turnIndex;

  if (matchOver) {
    updates[`rooms/${roomId}/status`] = 'game_over';
    updates[`rooms/${roomId}/losers`] = losers;
  } else {
    updates[`rooms/${roomId}/status`] = 'between_hands'; // Pausa per mostrare i punteggi
  }
  
  await update(ref(db), updates);
}

// 10. Avvia la mano successiva dopo aver mostrato i punteggi
export async function startNextHand(roomId, roomData) {
  const deck = shuffleDeck(createDeck());
  const playerIds = Object.keys(roomData.players);
  const hands = dealCards(deck, playerIds);
  
  // Il primo a giocare è l'ultimo ad aver preso la singa
  const startingPlayerId = roomData.lastLoser || playerIds[0];

  const updatedPlayers = { ...roomData.players };
  playerIds.forEach(id => {
    updatedPlayers[id].hand = hands[id];
    updatedPlayers[id].points = 0;       
    updatedPlayers[id].validTricks = 0;  
  });

  const updates = {
    status: 'playing',
    players: updatedPlayers,
    turnIndex: startingPlayerId, 
    tableCards: []
  };

  await update(ref(db, `rooms/${roomId}`), updates);
}

// 11. Azzera tutto per una nuova partita (Rivincita)
export async function resetGame(roomId, roomData) {
  const updates = {};
  const playerIds = Object.keys(roomData.players);
  
  // Resetta le mani e i punteggi dei giocatori
  playerIds.forEach(id => {
    updates[`rooms/${roomId}/players/${id}/hand`] = [];
    updates[`rooms/${roomId}/players/${id}/points`] = 0;
    updates[`rooms/${roomId}/players/${id}/validTricks`] = 0;
  });

  // Azzera i contatori della stanza e cambia lo stato
  updates[`rooms/${roomId}/singhe`] = {};
  updates[`rooms/${roomId}/lastLoser`] = null;
  updates[`rooms/${roomId}/tableCards`] = [];
  updates[`rooms/${roomId}/losers`] = null;
  updates[`rooms/${roomId}/turnIndex`] = null;
  updates[`rooms/${roomId}/status`] = 'waiting'; // Torna al pulsante "Diamo le carte!"

  await update(ref(db), updates);
}