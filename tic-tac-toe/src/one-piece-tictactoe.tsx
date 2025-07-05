"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trophy, Anchor } from "lucide-react";
import Image from "next/image";

type Player = "luffy" | "meat";
type Winner = Player | "draw" | null;
type Board = (Player | null)[];

export default function OnePieceTicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>("luffy");
  const [winner, setWinner] = useState<Winner>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [totalWins, setTotalWins] = useState({ luffy: 0, meat: 0 });
  const [gameCount, setGameCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinningLine, setShowWinningLine] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [anchorData, setAnchorData] = useState<
    {
      left: string;
      top: string;
      delay: string;
      duration: string;
    }[]
  >([]);
  const [bubbleData, setBubbleData] = useState<
    { left: string; top: string; delay: string; duration: string }[]
  >([]);

  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // columns
    [0, 4, 8],
    [2, 4, 6], // diagonals
  ];

  const blinkCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle winning line animation and auto-restart
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (
      winner &&
      winner !== "draw" &&
      winningLine.length > 0 &&
      !gameComplete
    ) {
      setIsAnimating(true);
      setShowWinningLine(true);
      blinkCountRef.current = 0;

      intervalRef.current = setInterval(() => {
        setShowWinningLine((prev) => {
          const newValue = !prev;

          // Only increment on the "off" state (when hiding the line)
          if (!newValue) {
            blinkCountRef.current++;
          }

          // After 3 complete blinks (3 off states), stop the animation
          if (blinkCountRef.current >= 3) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            // Set final state and clean up
            setTimeout(() => {
              setIsAnimating(false);
              setShowWinningLine(true);

              // Auto-restart after animation
              setTimeout(() => {
                resetBoard();
              }, 500);
            }, 300); // Small delay to show final blink state
          }

          return newValue;
        });
      }, 300);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [winner, winningLine, gameComplete]);

  // Check if game series is complete (someone reached 3 wins)
  useEffect(() => {
    if (totalWins.luffy >= 3 || totalWins.meat >= 3) {
      setGameComplete(true);
    }
  }, [totalWins]);

  useEffect(() => {
    setAnchorData(
      Array.from({ length: 12 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${3 + Math.random() * 2}s`,
      }))
    );
    setBubbleData(
      Array.from({ length: 8 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        duration: `${2 + Math.random() * 3}s`,
      }))
    );
  }, []);

  const checkWinner = (newBoard: Board) => {
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (
        newBoard[a] &&
        newBoard[a] === newBoard[b] &&
        newBoard[a] === newBoard[c]
      ) {
        setWinner(newBoard[a] as Winner);
        setWinningLine(combination);
        // Update total wins
        const winnerPlayer = newBoard[a] as Player;
        setTotalWins((prev) => ({
          ...prev,
          [winnerPlayer]: prev[winnerPlayer] + 1,
        }));
        return newBoard[a] as Winner;
      }
    }
    if (newBoard.every((cell) => cell !== null)) {
      setWinner("draw");
      setWinningLine([]);
      // Auto-restart for draws (no animation needed)
      if (!gameComplete) {
        setTimeout(() => {
          resetBoard();
        }, 1500);
      }
      return "draw" as Winner;
    }
    return null;
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || isAnimating || gameComplete) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (!gameWinner) {
      setCurrentPlayer(currentPlayer === "luffy" ? "meat" : "luffy");
    }
  };

  const resetBoard = () => {
    // Clear any running intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setBoard(Array(9).fill(null));
    setCurrentPlayer("luffy");
    setWinner(null);
    setWinningLine([]);
    setGameCount((prev) => prev + 1);
    setShowWinningLine(true);
    setIsAnimating(false);
    blinkCountRef.current = 0;
  };

  const startNewSeries = () => {
    // Clear any running intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset everything to initial state
    setBoard(Array(9).fill(null));
    setCurrentPlayer("luffy");
    setWinner(null);
    setWinningLine([]);
    setTotalWins({ luffy: 0, meat: 0 });
    setGameCount(0);
    setIsAnimating(false);
    setShowWinningLine(true);
    setGameComplete(false);
    blinkCountRef.current = 0;
  };

  const renderIcon = (player: Player) => {
    if (player === "luffy") {
      return (
        <div className="relative flex items-center justify-center w-16 h-16">
          <Image
            src="/placeholder.svg?height=64&width=64"
            alt="Luffy hungry face"
            width={64}
            height={64}
            className="animate-bounce rounded-full object-cover w-full h-full bg-orange-400"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      );
    }
    if (player === "meat") {
      return (
        <div className="relative flex items-center justify-center w-16 h-16">
          <span className="text-5xl animate-pulse">🍖</span>
        </div>
      );
    }
    return null;
  };

  const getWinnerMessage = () => {
    if (gameComplete) {
      const seriesWinner = totalWins.luffy >= 3 ? "luffy" : "meat";
      return (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy size={48} className="text-yellow-400 animate-bounce" />
          </div>
          <p className="text-2xl font-bold text-white drop-shadow-lg">
            🏆 {seriesWinner === "luffy" ? "Luffy" : "Meat"} Wins the Series! 🏆
          </p>
          <p className="text-yellow-400 font-semibold drop-shadow-md">
            {seriesWinner === "luffy"
              ? "Luffy ate all the meat!"
              : "The meat was too delicious!"}
          </p>
        </div>
      );
    }
    if (winner === "draw") {
      return (
        <div className="text-center">
          <p className="text-xl font-bold text-white drop-shadow-lg">
            It&apos;s a Draw!
          </p>
          <p className="text-slate-200 text-sm drop-shadow-md">
            Luffy is still hungry...
          </p>
        </div>
      );
    }
    if (winner) {
      return (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {renderIcon(winner as Player)}
            <p className="text-xl font-bold text-white drop-shadow-lg">
              {winner === "luffy" ? "Luffy" : "Meat"} Wins!
            </p>
            {renderIcon(winner as Player)}
          </div>
          <p className="text-slate-200 text-sm drop-shadow-md">
            {isAnimating
              ? winner === "luffy"
                ? "Luffy is celebrating!"
                : "The meat is sizzling!"
              : "Starting new adventure..."}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-[10px] max-w-[2000px] mx-auto overflow-hidden">
      {/* One Piece static background */}
      <div className="fixed inset-0 z-0">
        <div
          className="w-full h-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900"
          style={{ filter: "brightness(0.7) contrast(1.1)" }}
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"></div>
        {/* Additional overlay */}
        <div className="absolute inset-0 bg-blue-900/20"></div>
      </div>

      {/* Floating anchors and bubbles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
        {anchorData.map((anchor, i) => (
          <div
            key={`anchor-${i}`}
            className="absolute animate-pulse"
            style={{
              left: anchor.left,
              top: anchor.top,
              animationDelay: anchor.delay,
              animationDuration: anchor.duration,
            }}
          >
            <Anchor size={24} className="text-white/15" />
          </div>
        ))}
        {/* Floating bubbles */}
        {bubbleData.map((bubble, i) => (
          <div
            key={`bubble-${i}`}
            className="absolute animate-bounce"
            style={{
              left: bubble.left,
              top: bubble.top,
              animationDelay: bubble.delay,
              animationDuration: bubble.duration,
            }}
          >
            <div className="w-2 h-2 bg-white/25 rounded-full"></div>
          </div>
        ))}
      </div>

      <Card className="bg-slate-900/85 backdrop-blur-xl border-blue-400/40 shadow-2xl p-8 w-full max-w-[650px] mx-auto relative z-20 border-2">
        {/* Decorative border */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 via-red-500/8 to-blue-500/8 rounded-lg"></div>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-blue-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            One Piece Tic-Tac-Toe
          </h1>
          <div className="flex items-center justify-center gap-2 text-white">
            <span className="text-2xl">⚓</span>
            <span className="text-sm font-semibold drop-shadow-md">
              Luffy vs Meat Adventure!
            </span>
            <span className="text-2xl">⚓</span>
          </div>
          <p className="text-xs text-slate-200 mt-1 mb-0 drop-shadow-md">
            First to 3 wins becomes Pirate King!
          </p>
        </div>

        {/* Score Board */}
        <div className="flex justify-between items-center mb-0 mt-0 bg-slate-800/70 rounded-lg p-4 border border-blue-400/25 relative z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-400">
              <div className="w-full h-full bg-orange-400 flex items-center justify-center text-white font-bold">
                L
              </div>
            </div>
            <span className="text-orange-400 font-bold text-sm drop-shadow-md">
              LUFFY
            </span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    i < totalWins.luffy
                      ? "bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/50"
                      : "border-orange-500/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Trophy size={24} className="text-yellow-400" />
            <span className="text-white text-xs font-semibold drop-shadow-md">
              ROUND #{gameCount + 1}
            </span>
            <span className="text-slate-300 text-xs drop-shadow-md">
              Grand Line
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-red-400 flex items-center justify-center bg-white">
              <span className="text-5xl">🍖</span>
            </div>
            <span className="text-red-400 font-bold text-sm drop-shadow-md">
              MEAT
            </span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    i < totalWins.meat
                      ? "bg-red-500 border-red-500 shadow-lg shadow-red-500/50"
                      : "border-red-500/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Current Player or Winner */}
        <div className="text-center mb-6 min-h-[100px] flex items-center justify-center relative z-10">
          {winner || gameComplete ? (
            getWinnerMessage()
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-white text-sm drop-shadow-md">
                Current Turn:
              </span>
              <div className="flex items-center gap-3">
                {renderIcon(currentPlayer)}
                <span className="text-white font-bold text-lg drop-shadow-lg">
                  {currentPlayer === "luffy" ? "LUFFY'S TURN" : "MEAT'S TURN"}
                </span>
              </div>
              <span className="text-slate-200 text-xs drop-shadow-md">
                {currentPlayer === "luffy"
                  ? "Luffy is hungry for victory!"
                  : "The meat is ready to be eaten!"}
              </span>
            </div>
          )}
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
          {board.map((cell, index) => {
            const isWinningCell = winningLine.includes(index);
            const shouldHighlight =
              isWinningCell && winner !== null && winner !== "draw";
            return (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!!cell || !!winner || isAnimating || gameComplete}
                className={`
                  aspect-square bg-slate-800/70 backdrop-blur-sm border-2 border-slate-600/40
                   rounded-xl flex items-center justify-center transition-all duration-300
                  hover:bg-slate-700/70 hover:scale-105 hover:border-blue-400/60
                  disabled:cursor-not-allowed relative overflow-hidden
                  ${
                    shouldHighlight && showWinningLine
                      ? winner === "luffy"
                        ? "bg-gradient-to-br from-orange-500/50 to-red-400/50 border-orange-400 shadow-lg shadow-orange-400/30"
                        : "bg-gradient-to-br from-red-500/50 to-pink-400/50 border-red-400 shadow-lg shadow-red-400/30"
                      : shouldHighlight && !showWinningLine
                      ? "bg-slate-800/70 border-slate-600/40"
                      : ""
                  }
                  ${
                    !cell && !winner && !gameComplete
                      ? "hover:shadow-lg hover:shadow-blue-400/25"
                      : ""
                  }
                `}
              >
                {/* Ocean wave effect for empty cells */}
                {!cell && (
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/15 to-transparent opacity-50"></div>
                )}
                {cell && (
                  <div className="animate-in zoom-in-50 duration-300 relative z-10">
                    {renderIcon(cell as Player)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 relative z-10">
          {gameComplete ? (
            <Button
              onClick={startNewSeries}
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 shadow-lg font-bold"
            >
              <RotateCcw size={16} className="mr-2" />
              New Adventure
            </Button>
          ) : (
            <div className="flex-1"></div>
          )}
          <Button
            onClick={startNewSeries}
            variant="outline"
            className="flex-1 border-blue-400/40 text-white hover:bg-blue-700/25 hover:text-white bg-transparent font-semibold backdrop-blur-sm"
          >
            Reset Journey
          </Button>
        </div>

        {/* Game Rules */}
        <div className="mt-6 text-center text-slate-200 text-xs space-y-1 relative z-10">
          <p className="font-semibold text-white drop-shadow-md">
            🏆 First to 3 wins becomes the Pirate King! 🏆
          </p>
          <p className="drop-shadow-md">
            🍖 Luffy vs 🍖 Meat - The Ultimate Battle!
          </p>
          <p className="text-slate-300 drop-shadow-md">
            {'"I\'m gonna be the Pirate King!" - Monkey D. Luffy'}
          </p>
        </div>
      </Card>
    </div>
  );
}
