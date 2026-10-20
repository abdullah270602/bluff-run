// Card = 0..51. rank = c % 13 (0 = Two ... 12 = Ace), suit = floor(c / 13).
export type Card = number;
export const RANKS = "23456789TJQKA";
export const SUITS = "shdc";
export const SUIT_GLYPH = ["♠", "♥", "♦", "♣"];
export const RANK_WORD = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
export const RANK_PLURAL = ["Twos", "Threes", "Fours", "Fives", "Sixes", "Sevens", "Eights", "Nines", "Tens", "Jacks", "Queens", "Kings", "Aces"];

export const rankOf = (c: Card) => c % 13;
export const suitOf = (c: Card) => (c / 13) | 0;
export const cardStr = (c: Card) => RANKS[rankOf(c)] + SUITS[suitOf(c)];
export const cardPretty = (c: Card) => RANKS[rankOf(c)] + SUIT_GLYPH[suitOf(c)];
export const parseCard = (s: string): Card => SUITS.indexOf(s[1]) * 13 + RANKS.indexOf(s[0]);

export function newDeck(rng: () => number = Math.random): Card[] {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
