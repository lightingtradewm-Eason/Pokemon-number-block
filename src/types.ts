export type GameMode = 'classic' | 'time';

export interface Block {
  id: string;
  value: number;
}

export type Grid = (Block | null)[][];

export interface GameState {
  grid: Grid;
  target: number;
  score: number;
  mode: GameMode;
  selectedIndices: { r: number; c: number }[];
  isGameOver: boolean;
  timeLeft: number;
  totalTime: number;
}
