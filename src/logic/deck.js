export const SUITS = ['denari', 'coppe', 'spade', 'bastoni'];

// Ordine di forza: 3, 2, Asso, Re, Cavallo, Donna, 7, 6, 5, 4
export const RANKS = [
  { id: '3', label: '3', power: 10, points: 1 },
  { id: '2', label: '2', power: 9,  points: 1 },
  { id: '1', label: 'Asso', power: 8, points: 3 },
  { id: '10', label: 'Re', power: 7, points: 1 },
  { id: '9', label: 'Cavallo', power: 6, points: 1 },
  { id: '8', label: 'Donna', power: 5, points: 1 },
  { id: '7', label: '7', power: 4,  points: 0 },
  { id: '6', label: '6', power: 3,  points: 0 },
  { id: '5', label: '5', power: 2,  points: 0 },
  { id: '4', label: '4', power: 1,  points: 0 },
];

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank.id}_${suit}`,
        suit,
        rankId: rank.id,
        label: rank.label,
        power: rank.power,
        points: rank.points,
      });
    }
  }
  return deck;
}

// Algoritmo Fisher-Yates per mescolare il mazzo
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Distribuisce 10 carte ciascuno ai 4 giocatori
export function dealCards(shuffledDeck, playerIds) {
  const hands = {};
  playerIds.forEach((id, index) => {
    hands[id] = shuffledDeck.slice(index * 10, (index + 1) * 10);
  });
  return hands;
}