// Verifica se la carta giocata rispetta l'obbligo di rispondere a seme
export function isValidMove(card, playerHand, leadSuit) {
  if (!leadSuit) return true; // Primo a giocare nel giro
  if (card.suit === leadSuit) return true;
  
  const hasLeadSuit = playerHand.some(c => c.suit === leadSuit);
  return !hasLeadSuit; // Può giocare fuori seme solo se non possiede il seme di apertura
}

// Determina il vincitore del giro (solo carte del seme di apertura, vince la potenza più alta)
export function determineTrickWinner(trickCards) {
  const leadSuit = trickCards[0].card.suit;
  const validCards = trickCards.filter(entry => entry.card.suit === leadSuit);
  
  validCards.sort((a, b) => b.card.power - a.card.power);
  return validCards[0].playerId;
}

// Trova chi possiede il 5 di denari per la primissima mano
export function findFiveOfCoinsHolder(hands) {
  for (const [playerId, cards] of Object.entries(hands)) {
    if (cards.some(c => c.id === '5_denari')) {
      return playerId;
    }
  }
  return null;
}

// Calcolo delle singhe a fine mano
export function calculateHandResults(playerStats) {
  // playerStats: { [playerId]: { points: number, validTricks: number } }
  // validTricks: numero di prese che contenevano almeno 1 punto (regola di franchezza/salvezza)
  
  const playerIds = Object.keys(playerStats);
  const unfrankedPlayers = playerIds.filter(id => playerStats[id].validTricks === 0);

  // Se uno o più giocatori non hanno fatto prese con punti, prendono loro la singa
  if (unfrankedPlayers.length > 0) {
    return unfrankedPlayers;
  }

  // Se tutti sono franchi, perde chi ha accumulato più punti
  let maxPoints = -1;
  let losers = [];

  for (const id of playerIds) {
    const pts = playerStats[id].points;
    if (pts > maxPoints) {
      maxPoints = pts;
      losers = [id];
    } else if (pts === maxPoints) {
      losers.push(id);
    }
  }

  return losers;
}

// Verifica condizioni di fine partita ed eccezione "esce franco"
export function checkGameOver(previousSinghe, newSinghe, losers) {
  // 1. Condizione: qualcuno raggiunge 10 singhe
  const reachedTen = Object.entries(newSinghe).some(([_, count]) => count >= 10);
  if (reachedTen) {
    return { isOver: true, reason: 'TEN_SINGHE' };
  }

  // 2. Condizione: due giocatori raggiungono contemporaneamente quota 5 (Eccezione Esce Franco)
  const playersCrossingFive = losers.filter(
    id => previousSinghe[id] < 5 && newSinghe[id] >= 5
  );

  if (playersCrossingFive.length >= 2) {
    return { isOver: true, reason: 'TWO_PLAYERS_HIT_FIVE_SIMULTANEOUSLY' };
  }

  // 3. Condizione standard: ci sono almeno due giocatori con >= 5 singhe
  const playersAtFiveOrMore = Object.values(newSinghe).filter(c => c >= 5).length;
  if (playersAtFiveOrMore >= 2) {
    return { isOver: true, reason: 'TWO_PLAYERS_AT_FIVE' };
  }

  return { isOver: false, reason: null };
}

// Prossimo mazziere / primo di mano in senso antiorario
export function getNextDealer(currentDealerIndex, losersIndices, totalPlayers = 4) {
  // In senso antiorario: (index + 1) % 4 è il giocatore alla destra
  if (losersIndices.length === 1) {
    return (losersIndices[0] + 1) % totalPlayers;
  }
  
  // Più perdenti: fa carte il perdente più a destra (in senso antiorario) rispetto al vecchio mazziere
  for (let step = 1; step < totalPlayers; step++) {
    const candidate = (currentDealerIndex + step) % totalPlayers;
    if (losersIndices.includes(candidate)) {
      return (candidate + 1) % totalPlayers;
    }
  }

  return (currentDealerIndex + 1) % totalPlayers;
}

// Calcola i punti totali di una presa, aggiungendo il bonus se è l'ultima
export function calculateTrickPoints(trickCards, isLastTrick = false) {
  let points = 0;
  
  // Somma i punti base delle carte giocate
  for (const entry of trickCards) {
    points += entry.card.points;
  }
  
  // Aggiunge i 3 punti bonus se è l'ultima presa delle 10
  if (isLastTrick) {
    points += 3; 
  }
  
  return points;
}