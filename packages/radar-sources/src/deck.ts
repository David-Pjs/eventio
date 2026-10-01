export interface DeckState {
  index: number;
  saved: string[];
}

export type DeckAction =
  | { type: 'skip'; length: number }
  | { type: 'back' }
  | { type: 'save'; id: string; length: number }
  | { type: 'unsave'; id: string }
  | { type: 'jump'; index: number }
  | { type: 'reset' }
  | { type: 'hydrate'; saved: string[] };

export const initialDeck = (saved: string[]): DeckState => ({ index: 0, saved });

export function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'skip':
      return { ...state, index: Math.min(state.index + 1, action.length) };
    case 'back':
      return { ...state, index: Math.max(state.index - 1, 0) };
    case 'save':
      return {
        index: Math.min(state.index + 1, action.length),
        saved: state.saved.includes(action.id) ? state.saved : [...state.saved, action.id],
      };
    case 'unsave':
      return { ...state, saved: state.saved.filter((id) => id !== action.id) };
    case 'jump':
      return { ...state, index: Math.max(action.index, 0) };
    case 'reset':
      return { ...state, index: 0 };
    case 'hydrate':
      return { ...state, saved: [...new Set([...action.saved, ...state.saved])] };
  }
}
