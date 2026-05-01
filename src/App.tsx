/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Timer, 
  Play, 
  Pause, 
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { Block, GameMode, Grid, GameState } from './types';

const COLS = 7;
const ROWS = 10;
const INITIAL_ROWS = 4;
const TICK_RATE = 1000;
const TIME_LIMIT = 10; // 10 seconds for time mode

const generateId = () => Math.random().toString(36).substring(2, 9);
const generateValue = () => Math.floor(Math.random() * 9) + 1;

const POKEMON_SPRITES: Record<number, string> = {
  1: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',   // Bulbasaur
  2: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',   // Charmander
  3: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',   // Squirtle
  4: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',  // Pikachu
  5: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png',  // Jigglypuff
  6: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/52.png',  // Meowth
  7: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',  // Gengar
  8: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png', // Eevee
  9: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png', // Mewtwo
};

const POKEMON_TYPES: Record<number, string> = {
  1: '#7AC74C', // Grass
  2: '#EE8130', // Fire
  3: '#6390F0', // Water
  4: '#F7D02C', // Electric
  5: '#FBC1E0', // Fairy
  6: '#E2E2E2', // Normal
  7: '#705746', // Dark
  8: '#C6B784', // Normal/Eevee
  9: '#F95587', // Psychic
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    target: 0,
    score: 0,
    mode: 'classic',
    selectedIndices: [],
    isGameOver: false,
    timeLeft: TIME_LIMIT,
    totalTime: TIME_LIMIT,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(true);

  // Background icons grid
  const bgIcons = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => Math.floor(Math.random() * 151) + 1);
  }, []);

  // Initialize target
  const generateNewTarget = useCallback(() => {
    return Math.floor(Math.random() * 20) + 10;
  }, []);

  const addRow = useCallback((currentGrid: Grid): Grid | null => {
    if (currentGrid[0].some(cell => cell !== null)) {
      return null; // Game Over
    }

    const newGrid = [...currentGrid.map(row => [...row])];
    for (let r = 0; r < ROWS - 1; r++) {
      newGrid[r] = newGrid[r + 1];
    }
    const bottomRow: (Block | null)[] = Array.from({ length: COLS }, () => ({
      id: generateId(),
      value: generateValue()
    }));
    newGrid[ROWS - 1] = bottomRow;
    return newGrid;
  }, []);

  const initGame = (mode: GameMode) => {
    const emptyGrid: Grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let grid = emptyGrid;
    for (let i = 0; i < INITIAL_ROWS; i++) {
      grid = addRow(grid) || grid;
    }

    setGameState({
      grid,
      target: generateNewTarget(),
      score: 0,
      mode,
      selectedIndices: [],
      isGameOver: false,
      timeLeft: TIME_LIMIT,
      totalTime: TIME_LIMIT,
    });
    setIsPlaying(true);
    setIsPaused(false);
    setShowMenu(false);
  };

  const handleBlockClick = (r: number, c: number) => {
    if (!isPlaying || isPaused || gameState.isGameOver) return;
    
    const block = gameState.grid[r][c];
    if (!block) return;

    const isAlreadySelected = gameState.selectedIndices.find(idx => idx.r === r && idx.c === c);
    
    let nextSelected = [...gameState.selectedIndices];
    if (isAlreadySelected) {
      nextSelected = nextSelected.filter(idx => !(idx.r === r && idx.c === c));
    } else {
      nextSelected.push({ r, c });
    }

    const currentSum = nextSelected.reduce((sum, idx) => sum + (gameState.grid[idx.r][idx.c]?.value || 0), 0);

    if (currentSum === gameState.target) {
      const newGrid = [...gameState.grid.map(row => [...row])];
      nextSelected.forEach(idx => {
        newGrid[idx.r][idx.c] = null;
      });

      for (let col = 0; col < COLS; col++) {
        let emptySpot = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row--) {
          if (newGrid[row][col] !== null) {
            const temp = newGrid[row][col];
            newGrid[row][col] = null;
            newGrid[emptySpot][col] = temp;
            emptySpot--;
          }
        }
      }

      let finalGrid: Grid | null = newGrid;
      if (gameState.mode === 'classic') {
        finalGrid = addRow(newGrid);
      }

      if (!finalGrid) {
        setGameState(prev => ({ ...prev, isGameOver: true }));
      } else {
        setGameState(prev => ({
          ...prev,
          grid: finalGrid!,
          target: generateNewTarget(),
          selectedIndices: [],
          score: prev.score + nextSelected.length * 10,
          timeLeft: TIME_LIMIT,
        }));
      }
    } else if (currentSum > gameState.target) {
      setGameState(prev => ({ ...prev, selectedIndices: [] }));
    } else {
      setGameState(prev => ({ ...prev, selectedIndices: nextSelected }));
    }
  };

  useEffect(() => {
    if (!isPlaying || isPaused || gameState.isGameOver || gameState.mode !== 'time') return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          const newGrid = addRow(prev.grid);
          if (!newGrid) return { ...prev, isGameOver: true, timeLeft: 0 };
          return {
            ...prev,
            grid: newGrid,
            timeLeft: TIME_LIMIT,
            selectedIndices: [],
          };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, TICK_RATE);

    return () => clearInterval(timer);
  }, [isPlaying, isPaused, gameState.isGameOver, gameState.mode, addRow]);

  const currentSum = useMemo(() => {
    return gameState.selectedIndices.reduce((sum, idx) => sum + (gameState.grid[idx.r][idx.c]?.value || 0), 0);
  }, [gameState.selectedIndices, gameState.grid]);

  if (showMenu) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#EE1515] text-white p-6 font-pixel overflow-hidden relative">
        {/* Pokéball pattern in background */}
        <div className="absolute top-1/2 left-0 w-full h-[20px] bg-black -translate-y-1/2 z-0 shadow-lg" />
        <div className="absolute top-1/2 left-1/2 w-[100px] h-[100px] bg-white border-[10px] border-black rounded-full -translate-x-1/2 -translate-y-1/2 z-0 shadow-xl flex items-center justify-center">
            <div className="w-[40px] h-[40px] bg-neutral-100 border-[4px] border-black rounded-full" />
        </div>
        <div className="absolute inset-0 top-1/2 bg-white -z-10" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-12 max-w-md w-full relative z-10"
        >
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] leading-tight">
              POKÉ<span className="text-[#FFDE00] drop-shadow-[0_4px_0_rgba(59,76,202,1)]">SUM</span>
            </h1>
            <p className="text-black inline-block bg-[#FFDE00] px-4 py-1 border-2 border-black text-[10px] uppercase tracking-wider">Gotta Sum 'Em All!</p>
          </div>

          <div className="grid gap-6 mt-12 px-4">
            <button 
              onClick={() => initGame('classic')}
              className="group relative flex flex-col items-center justify-center p-6 bg-white border-4 border-black shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              <div className="text-black font-bold text-lg mb-2">CLASSIC ADVENTURE</div>
              <div className="text-neutral-500 text-[10px]">Endless numerical battle!</div>
            </button>

            <button 
              onClick={() => initGame('time')}
              className="group relative flex flex-col items-center justify-center p-6 bg-[#3B4CCA] border-4 border-black text-white shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
            >
              <div className="font-bold text-lg mb-2 text-[#FFDE00]">SPEED CHALLENGE</div>
              <div className="text-white/70 text-[10px]">Racing against the clock!</div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f0f0] text-black font-pixel selection:bg-none relative overflow-hidden">
      {/* Pokemon Background Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none grid grid-cols-6 sm:grid-cols-10 gap-8 p-4">
        {bgIcons.map((id, i) => (
          <img 
            key={i}
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${id}.png`}
            alt=""
            className="w-12 h-12 grayscale"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>

      {/* Pokédex Style Sidebar/Header Decoration */}
      <div className="absolute top-0 left-0 w-full h-8 bg-[#EE1515] border-b-4 border-black flex items-center px-4 gap-2">
        <div className="w-4 h-4 bg-blue-400 border-2 border-white rounded-full shadow-inner" />
        <div className="w-2 h-2 bg-red-400 rounded-full" />
        <div className="w-2 h-2 bg-yellow-400 rounded-full" />
        <div className="w-2 h-2 bg-green-400 rounded-full" />
      </div>

      <div className="w-full max-w-[400px] px-2 pt-12 pb-6 flex flex-col items-center flex-1">
        {/* HUD */}
        <div className="w-full grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white border-2 border-black p-2 text-center text-[10px]">
             SCORE<br/><span className="text-xs">{gameState.score}</span>
          </div>
          <div className="bg-white border-2 border-black p-2 flex flex-col items-center justify-center">
            <button onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? "RESUME" : "PAUSE"}
            </button>
          </div>
          <button 
            onClick={() => initGame(gameState.mode)}
            className="bg-white border-2 border-black p-2 text-[10px] flex items-center justify-center"
          >
            RETRY
          </button>
        </div>

        {/* Message Window (Target Display) */}
        <div className="w-full bg-[#f8f8f8] border-4 border-black p-4 mb-6 shadow-[inset_0_4px_0_rgba(0,0,0,0.1)] relative">
            <div className="text-[10px] text-neutral-500 uppercase mb-2">Wild Target appears!</div>
            <motion.div 
              key={gameState.target}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-4xl font-black text-black"
            >
              SUM: {gameState.target}
            </motion.div>
            
            {gameState.mode === 'time' && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[8px]">TIME:</span>
                <div className="flex-1 h-3 bg-neutral-200 border-2 border-black overflow-hidden">
                    <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: `${(gameState.timeLeft / gameState.totalTime) * 100}%` }}
                        className={`h-full transition-colors ${gameState.timeLeft < 3 ? 'bg-red-500' : 'bg-green-500'}`}
                    />
                </div>
              </div>
            )}
            
            {/* Visual indicator of selection sum */}
            <div className="absolute -bottom-4 right-4 bg-[#FFDE00] border-2 border-black px-2 py-1 text-[10px] font-bold shadow-sm">
                YOURS: {currentSum}
            </div>
        </div>

        {/* Battle Field (Board) */}
        <div className="relative p-2 bg-[#8c8c8c] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <div 
            className={`grid gap-1 transition-all duration-300 ${isPaused ? 'opacity-20 blur-md pointer-events-none' : 'opacity-100'}`}
            style={{ 
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            }}
          >
            {gameState.grid.map((row, r) => 
              row.map((cell, c) => {
                const isSelected = gameState.selectedIndices.some(idx => idx.r === r && idx.c === c);
                const blockColor = cell ? POKEMON_TYPES[cell.value] : 'transparent';

                return (
                  <div key={`${r}-${c}`} className="w-12 h-12 sm:w-13 sm:h-13">
                    <AnimatePresence mode="popLayout">
                      {cell && (
                        <motion.button
                          layoutId={cell.id}
                          layout
                          initial={{ scale: 0, y: -20, rotate: -10 }}
                          animate={{ 
                            scale: isSelected ? 0.85 : 1, 
                            opacity: 1,
                            backgroundColor: blockColor,
                            rotate: 0,
                            borderColor: isSelected ? '#ffffff' : '#000000',
                            borderWidth: '3px',
                          }}
                          exit={{ 
                            scale: 1.5, 
                            opacity: 0, 
                            rotate: 45,
                            backgroundColor: '#FFDE00'
                          }}
                          onClick={() => handleBlockClick(r, c)}
                          className={`w-full h-full font-bold flex items-center justify-center border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all relative overflow-hidden group`}
                        >
                          {/* Inner white circle slightly visible for sprite pop */}
                          <div className="absolute inset-1 bg-white/20 rounded-full blur-sm" />
                          
                          <img 
                            src={POKEMON_SPRITES[cell.value]} 
                            alt="" 
                            className={`absolute inset-0 w-full h-full object-contain p-1 z-0 drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)] transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Number badge */}
                          <div className="absolute bottom-0 right-0 bg-black text-white px-1 py-0.5 text-[8px] min-w-[14px]">
                            {cell.value}
                          </div>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Pause Screen */}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
              <button 
                onClick={() => setIsPaused(false)}
                className="bg-[#FFDE00] border-4 border-black px-6 py-3 font-bold shadow-[4px_4px_0_0_#000]"
              >
                RESUME
              </button>
            </div>
          )}
        </div>

        {/* Footer info Bar */}
        <div className="w-full mt-6 bg-[#30a7d7] border-4 border-black p-3 flex justify-between items-center text-white text-[8px] uppercase">
            <div>Mode: {gameState.mode}</div>
            <div>Sum Bound v1.0</div>
        </div>
      </div>

      {/* Game Over Screen */}
      <AnimatePresence>
        {gameState.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#EE1515]/90 p-6 font-pixel"
          >
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white border-4 border-black p-8 rounded-none max-w-sm w-full text-center space-y-8 shadow-[8px_8px_0_0_#000]"
            >
              <div className="space-y-4">
                <div className="text-red-600 text-2xl font-black">OH NO!</div>
                <p className="text-black text-xs leading-loose">The grid is full!<br/>Your Pokémon journey ends here.</p>
              </div>

              <div className="bg-neutral-100 border-2 border-black p-4">
                <div className="text-[10px] text-neutral-500 uppercase">Hall of Fame Score</div>
                <div className="text-3xl font-black text-black">{gameState.score}</div>
              </div>

              <div className="grid gap-4">
                <button 
                  onClick={() => initGame(gameState.mode)}
                  className="w-full py-4 bg-[#FFDE00] border-2 border-black text-black font-bold uppercase text-[10px] shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Restart Battle
                </button>
                <button 
                  onClick={() => setShowMenu(true)}
                  className="w-full py-4 bg-white border-2 border-black text-black font-bold uppercase text-[10px] shadow-[4px_4px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                   Return to Lab
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
