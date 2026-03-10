// Connect Four Game Engine with Win Detection and AI

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER = 1;
const AI = 2;

// Create empty board
export function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

// Drop a piece into a column
export function dropPiece(board, col, player) {
  const newBoard = board.map(row => [...row]);
  for (let row = ROWS - 1; row >= 0; row--) {
    if (newBoard[row][col] === EMPTY) {
      newBoard[row][col] = player;
      return { board: newBoard, row, col };
    }
  }
  return null; // Column is full
}

// Check if a column is valid for a move
export function isValidMove(board, col) {
  return board[0][col] === EMPTY;
}

// Get valid columns for moves
export function getValidMoves(board) {
  const moves = [];
  for (let col = 0; col < COLS; col++) {
    if (isValidMove(board, col)) {
      moves.push(col);
    }
  }
  return moves;
}

// Check for a win
export function checkWin(board, player) {
  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS - 3; col++) {
      if (board[row][col] === player &&
          board[row][col + 1] === player &&
          board[row][col + 2] === player &&
          board[row][col + 3] === player) {
        return { winner: player, direction: 'horizontal', cells: [
          { r: row, c: col }, { r: row, c: col + 1 },
          { r: row, c: col + 2 }, { r: row, c: col + 3 }
        ]};
      }
    }
  }

  // Check vertical
  for (let row = 0; row < ROWS - 3; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === player &&
          board[row + 1][col] === player &&
          board[row + 2][col] === player &&
          board[row + 3][col] === player) {
        return { winner: player, direction: 'vertical', cells: [
          { r: row, c: col }, { r: row + 1, c: col },
          { r: row + 2, c: col }, { r: row + 3, c: col }
        ]};
      }
    }
  }

  // Check diagonal (down-right)
  for (let row = 0; row < ROWS - 3; row++) {
    for (let col = 0; col < COLS - 3; col++) {
      if (board[row][col] === player &&
          board[row + 1][col + 1] === player &&
          board[row + 2][col + 2] === player &&
          board[row + 3][col + 3] === player) {
        return { winner: player, direction: 'diagonal', cells: [
          { r: row, c: col }, { r: row + 1, c: col + 1 },
          { r: row + 2, c: col + 2 }, { r: row + 3, c: col + 3 }
        ]};
      }
    }
  }

  // Check diagonal (up-right)
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col < COLS - 3; col++) {
      if (board[row][col] === player &&
          board[row - 1][col + 1] === player &&
          board[row - 2][col + 2] === player &&
          board[row - 3][col + 3] === player) {
        return { winner: player, direction: 'diagonal-up', cells: [
          { r: row, c: col }, { r: row - 1, c: col + 1 },
          { r: row - 2, c: col + 2 }, { r: row - 3, c: col + 3 }
        ]};
      }
    }
  }

  return null;
}

// Check if board is full (draw)
export function isDraw(board) {
  return board[0].every(cell => cell !== EMPTY);
}

// Simple heuristic evaluation for AI
export function evaluateBoard(board, player) {
  let score = 0;
  const opponent = player === PLAYER ? AI : PLAYER;

  // Center column preference
  for (let row = 0; row < ROWS; row++) {
    if (board[row][3] === player) score += 3;
    if (board[row][3] === opponent) score -= 3;
  }

  // Count 2-in-a-row, 3-in-a-row patterns
  const sequences = [
    // Horizontal
    ...Array.from({ length: ROWS }, (_, r) => 
      Array.from({ length: COLS - 3 }, (_, c) => [
        { r, c }, { r, c: c + 1 }, { r, c: c + 2 }, { r, c: c + 3 }
      ])
    ).flat(),
    // Vertical
    ...Array.from({ length: ROWS - 3 }, (_, r) => 
      Array.from({ length: COLS }, (_, c) => [
        { r, c }, { r: r + 1, c }, { r: r + 2, c }, { r: r + 3, c }
      ])
    ).flat(),
    // Diagonal down-right
    ...Array.from({ length: ROWS - 3 }, (_, r) => 
      Array.from({ length: COLS - 3 }, (_, c) => [
        { r, c }, { r: r + 1, c: c + 1 }, { r: r + 2, c: c + 2 }, { r: r + 3, c: c + 3 }
      ])
    ).flat(),
    // Diagonal up-right
    ...Array.from({ length: ROWS - 3 }, (_, r) => 
      Array.from({ length: COLS - 3 }, (_, c) => [
        { r: r + 3, c }, { r: r + 2, c: c + 1 }, { r: r + 1, c: c + 2 }, { r, c: c + 3 }
      ])
    ).flat()
  ];

  for (const seq of sequences) {
    const pieces = seq.map(p => board[p.r][p.c]);
    const playerCount = pieces.filter(p => p === player).length;
    const emptyCount = pieces.filter(p => p === EMPTY).length;
    const opponentCount = pieces.filter(p => p === opponent).length;

    if (opponentCount === 0 && playerCount > 0) {
      if (playerCount === 4) score += 1000;
      else if (playerCount === 3 && emptyCount === 1) score += 50;
      else if (playerCount === 2 && emptyCount === 2) score += 10;
    }
    if (playerCount === 0 && opponentCount > 0) {
      if (opponentCount === 4) score -= 1000;
      else if (opponentCount === 3 && emptyCount === 1) score -= 80;
      else if (opponentCount === 2 && emptyCount === 2) score -= 20;
    }
  }

  return score;
}

// Minimax with alpha-beta pruning for AI decision making
export function minimax(board, depth, alpha, beta, isMaximizing) {
  const player = isMaximizing ? AI : PLAYER;
  const winResult = checkWin(board, AI);
  const loseResult = checkWin(board, PLAYER);

  if (winResult) return { score: 10000 + depth }; // Prefer winning sooner
  if (loseResult) return { score: -10000 - depth }; // Prefer losing later
  if (isDraw(board)) return { score: 0 };
  if (depth === 0) return { score: evaluateBoard(board, AI) };

  const validMoves = getValidMoves(board);

  if (isMaximizing) {
    let maxEval = -Infinity;
    let bestMove = validMoves[0];
    for (const col of validMoves) {
      const result = dropPiece(board, col, AI);
      const { score } = minimax(result.board, depth - 1, alpha, beta, false);
      if (score > maxEval) {
        maxEval = score;
        bestMove = col;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    let bestMove = validMoves[0];
    for (const col of validMoves) {
      const result = dropPiece(board, col, PLAYER);
      const { score } = minimax(result.board, depth - 1, alpha, beta, true);
      if (score < minEval) {
        minEval = score;
        bestMove = col;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// Get best AI move using minimax
export function getAIMove(board, difficulty = 'medium') {
  // Safeguard: return null if no valid moves exist
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    return null;
  }

  const depth = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6;
  const result = minimax(board, depth, -Infinity, Infinity, true);
  return result.move;
}

export { ROWS, COLS, EMPTY, PLAYER, AI };