import { ref, get, set, update, onValue } from "firebase/database";
import { db } from "./firebase";
import { createDeck, shuffleDeck, dealCards } from '../logic/deck';
import { findFiveOfCoinsHolder, isValidMove, determineTrickWinner, calculateTrickPoints } from '../logic/rules';

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

// 4. Avvia la partita: mescola, distribuisce e cerca il 5 di denari
export async function startGame(roomId, roomData) {
  const deck = shuffleDeck(createDeck());
  const playerIds = Object.keys(roomData.players);
  const hands = dealCards(deck, playerIds);

  const updatedPlayers = { ...roomData.players };
  let startingPlayerId = playerIds[0]; // Fallback di sicurezza

  // Assegna le mani e cerca il 5 di denari
  playerIds.forEach(id => {
    updatedPlayers[id].hand = hands[id];
    updatedPlayers[id].points = 0;
    updatedPlayers[id].validTricks = 0;

    // Controlla se il giocatore ha il 5 di denari
    const has5Denari = hands[id].some(card => 
      (card.label === '5' || card.value === '5') && 
      card.suit.toLowerCase() === 'denari'
    );

    if (has5Denari) {
      startingPlayerId = id;
    }
  });

  // Azzera le statistiche per una partita pulita
  const updates = {
    status: 'playing',
    players: updatedPlayers,
    turnIndex: startingPlayerId, // Il turno va a chi ha il 5 di denari
    tableCards: [],
    singhe: {},
    lastLoser: null,
    losers: null
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
  if (roomData.turnIndex !== playerId) return; 

  const myHand = roomData.players[playerId].hand;
  const tableCards = roomData.tableCards || [];
  const leadSuit = tableCards.length > 0 ? tableCards[0].card.suit : null;

  // 🔴 REGOLA PENALITÀ: Se non risponde a seme
  if (!isValidMove(cardToPlay, myHand, leadSuit)) {
    const playerName = roomData.players[playerId].name;
    const currentSinghe = roomData.singhe?.[playerId] || 0;
    const newSingheCount = currentSinghe + 1;
    
    // Simula come sarà il tabellone delle singhe dopo questa penalità
    const allSinghe = { ...(roomData.singhe || {}), [playerId]: newSingheCount };
    
    let count5 = 0;
    let player10 = null;
    let losers = [];

    Object.keys(roomData.players).forEach(id => {
      const s = allSinghe[id] || 0;
      if (s >= 10) player10 = roomData.players[id].name;
      if (s >= 5) {
        count5++;
        losers.push(roomData.players[id].name);
      }
    });

    const isGameOver = !!player10 || count5 >= 2;
    let gameOverReason = "";
    if (player10) gameOverReason = "Sconfitta per 10 Singhe!";
    else if (count5 >= 2) gameOverReason = "Due giocatori hanno raggiunto 5 Singhe!";

    const updates = {
      [`rooms/${roomId}/singhe/${playerId}`]: newSingheCount,
      [`rooms/${roomId}/lastLoser`]: playerId,
      [`rooms/${roomId}/penaltyInfo`]: {
        name: playerName,
        wrongSuit: cardToPlay.suit,
        expectedSuit: leadSuit,
        isGameOver: isGameOver // Ora calcola correttamente la condizione!
      },
      [`rooms/${roomId}/status`]: 'suit_penalty'
    };

    if (isGameOver) {
      updates[`rooms/${roomId}/losers`] = player10 ? [player10] : losers;
      updates[`rooms/${roomId}/gameOverReason`] = gameOverReason;
    }

    await update(ref(db), updates);
    return; // Ferma il gioco, mano saltata!
  }

  // --- SE LA MOSSA È VALIDA, CONTINUA NORMALMENTE ---
  const updatedHand = myHand.filter(c => c.id !== cardToPlay.id);
  const newTableCards = [...tableCards, { playerId, card: cardToPlay }];
  
  const playerIds = Object.keys(roomData.players);
  const currentIndex = playerIds.indexOf(playerId);
  const nextTurnIndex = playerIds[(currentIndex + 1) % playerIds.length];

  const updates = {
    [`rooms/${roomId}/players/${playerId}/hand`]: updatedHand,
    [`rooms/${roomId}/tableCards`]: newTableCards,
  };

  if (newTableCards.length < 4) {
    updates[`rooms/${roomId}/turnIndex`] = nextTurnIndex;
  } else {
    updates[`rooms/${roomId}/status`] = 'resolving_trick';
  }

  await update(ref(db), updates);
}

// 7. [AUTO-PLAY BOT] Intelligenza Artificiale Euristica per il Bot
// 7. [AUTO-PLAY BOT] Intelligenza "A Scansare" per il Cuticchiune
export async function playBotTurn(roomId) {
  try {
    const snapshot = await get(ref(db, `rooms/${roomId}`));
    if (!snapshot.exists()) return;
    const roomData = snapshot.val();

    const botId = roomData.turnIndex;
    if (!botId) return;
    
    const botData = roomData.players[botId];
    const botHand = botData?.hand;
    if (!botHand || botHand.length === 0) return;

    const tableCards = roomData.tableCards || [];
    const leadSuit = tableCards.length > 0 ? tableCards[0].card.suit : null;

    let validCards = botHand;
    if (leadSuit) {
      const matchingSuit = botHand.filter(c => c.suit === leadSuit);
      if (matchingSuit.length > 0) validCards = matchingSuit;
    }

    // Ordina per forza, per poter scegliere scientemente
    const powerOrder = ['4', '5', '6', '7', 'Donna', 'Cavallo', 'Re', 'Asso', '2', '3'];
    const getPwr = (c) => powerOrder.indexOf(c.label || c.value);
    validCards.sort((a, b) => getPwr(a) - getPwr(b));

    let chosenCard;

    if (tableCards.length === 0) {
      // Primo a giocare: lancia la carta più debole per non rischiare
      chosenCard = validCards[0];
    } else {
      let currentWinningCard = tableCards[0].card;
      tableCards.forEach(play => {
        if (play.card.suit === leadSuit && getPwr(play.card) > getPwr(currentWinningCard)) {
          currentWinningCard = play.card;
        }
      });

      // Divide le carte tra quelle che vincerebbero la presa e quelle che la perderebbero
      const winningCards = validCards.filter(c => c.suit === leadSuit && getPwr(c) > getPwr(currentWinningCard));
      const losingCards = validCards.filter(c => c.suit !== leadSuit || getPwr(c) < getPwr(currentWinningCard));

      const pointsOnTable = tableCards.reduce((acc, play) => acc + (play.card.points || 0), 0);
      const needsTrick = (botData.validTricks || 0) === 0;

      if (pointsOnTable > 0) {
        // C'È BOTTINO A TERRA! Pericolo!
        if (needsTrick && pointsOnTable <= 3 && winningCards.length > 0) {
          // Ha zero prese, il bottino è piccolo: tenta di uscire franco in sicurezza!
          chosenCard = winningCards[0]; // Vince con la vincente più bassa possibile
        } else if (losingCards.length > 0) {
          // Fugge! Si sbarazza della carta perdente PIÙ ALTA in suo possesso
          chosenCard = losingCards[losingCards.length - 1];
        } else {
          // È costretto a prendere la presa: scarta la sua carta vincente PIÙ ALTA per levarsela
          chosenCard = winningCards[winningCards.length - 1];
        }
      } else {
        // NON CI SONO PUNTI A TERRA (es. solo 4, 5, 6)
        if (losingCards.length > 0) {
          // Ottima occasione per sbarazzarsi delle carte alte senza prendere punti
          chosenCard = losingCards[losingCards.length - 1];
        } else {
          // Costretto a vincere il liscio: scarta la carta alta
          chosenCard = winningCards[winningCards.length - 1];
        }
      }
    }

    await playCard(roomId, botId, chosenCard, roomData);
    
  } catch (error) {
    console.error("❌ Errore bot:", error);
  }
}

// 8. Risolve la presa: decreta il vincitore, assegna i punti e pulisce il tavolo
export async function resolveTrick(roomId, roomData) {
  if (roomData.status !== 'resolving_trick') return;

  const tableCards = roomData.tableCards;
  
  // 1. Chi ha vinto la presa?
  const winnerId = determineTrickWinner(tableCards);

  // 2. È l'ultima mano?
  const anyPlayer = Object.values(roomData.players)[0];
  const isLastTrick = anyPlayer.hand === undefined || anyPlayer.hand.length === 0;

  // 3. Calcola i punti
  const points = calculateTrickPoints(tableCards, isLastTrick);

  // 4. Aggiorna il bottino del vincitore
  const winnerData = roomData.players[winnerId];
  const newPoints = (winnerData.points || 0) + points;
  const newValidTricks = (winnerData.validTricks || 0) + (points >= 1 ? 1 : 0);

  // 🔴 PREPARA L'AGGIORNAMENTO (Ora salva la presa!)
  const updates = {
    [`rooms/${roomId}/tableCards`]: null, // Pulisce il tavolo
    [`rooms/${roomId}/lastTrick`]: tableCards, // <-- FOTOGRAFA L'ULTIMA PRESA QUI
    [`rooms/${roomId}/players/${winnerId}/points`]: newPoints,
    [`rooms/${roomId}/players/${winnerId}/validTricks`]: newValidTricks,
    [`rooms/${roomId}/turnIndex`]: winnerId, 
  };

  if (isLastTrick) {
    updates[`rooms/${roomId}/status`] = 'hand_over'; 
  } else {
    updates[`rooms/${roomId}/status`] = 'playing';
  }

  await update(ref(db), updates);
}

// 9. Calcola i risultati della mano e assegna le singhe
export async function processHandOver(roomId, roomData) {
  if (roomData.status !== 'hand_over') return;

  const playerIds = Object.keys(roomData.players);
  const singhe = { ...roomData.singhe };
  
  let maxPoints = Math.max(...playerIds.map(id => roomData.players[id].points || 0));
  let lastLoser = null;

  // CONTROLLO 1: Cappotto
  const isCappotto = maxPoints === 35;
  // CONTROLLO 2: Zero Prese
  const zeroTricksPlayers = playerIds.filter(id => (roomData.players[id].validTricks || 0) === 0);

  // FASE A: ASSEGNAZIONE SINGHE
  playerIds.forEach(id => {
    const p = roomData.players[id];
    let getsSinga = false;

    if (isCappotto) {
      if (p.points < 35) getsSinga = true;
    } else if (zeroTricksPlayers.length > 0) {
      if ((p.validTricks || 0) === 0) getsSinga = true;
    } else {
      if (p.points === maxPoints) getsSinga = true;
    }

    if (getsSinga) {
      singhe[id] = (singhe[id] || 0) + 1;
      lastLoser = id; 
    }
  });

  // FASE B: CONTROLLO FINE PARTITA RIGIDO
  let matchOver = false;
  let losers = [];
  let gameOverReason = "";

  let count5 = 0;
  let player10 = null;

  playerIds.forEach(id => {
    const s = singhe[id] || 0;
    if (s >= 10) player10 = roomData.players[id].name;
    if (s >= 5) count5++;
  });

  console.log(`🔍 [DEBUG] Giocatori con 5+ singhe: ${count5}`);

  if (player10) {
    // Sconfitta per 10 singhe (Cappotto negativo)
    matchOver = true;
    losers = [player10]; 
    gameOverReason = "Sconfitta per 10 Singhe!";
  } else if (count5 >= 2) {
    // Sconfitta standard: almeno 2 giocatori sono a 5 singhe
    matchOver = true;
    playerIds.forEach(id => {
      if ((singhe[id] || 0) >= 5) losers.push(roomData.players[id].name);
    });
    gameOverReason = "Due giocatori hanno raggiunto 5 Singhe!";
  }

  // FASE C: AGGIORNAMENTO DATABASE
  const updates = {};
  updates[`rooms/${roomId}/singhe`] = singhe;
  updates[`rooms/${roomId}/lastLoser`] = lastLoser || roomData.turnIndex;

  if (matchOver) {
    updates[`rooms/${roomId}/status`] = 'game_over';
    updates[`rooms/${roomId}/losers`] = losers;
    updates[`rooms/${roomId}/gameOverReason`] = gameOverReason;
  } else {
    updates[`rooms/${roomId}/status`] = 'between_hands';
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
    tableCards: [],
    lastTrick: null // 🔴 ECCO LA MODIFICA: Cancella la memoria della presa precedente!
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

// 12. Chiude la schermata di punizione e passa oltre
export async function acknowledgePenalty(roomId, roomData) {
  const isGameOver = roomData.penaltyInfo?.isGameOver;
  
  await update(ref(db), {
    // Se era la quinta singa va al Game Over, altrimenti va al tabellone tra una mano e l'altra
    [`rooms/${roomId}/status`]: isGameOver ? 'game_over' : 'between_hands'
  });
}