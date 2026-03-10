import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  createBoard,
  dropPiece,
  isValidMove,
  checkWin,
  isDraw,
  getAIMove,
  getValidMoves,
  ROWS,
  COLS,
  PLAYER,
  AI
} from '../utils/connectFourEngine.js';

function BoardCell({ value, onClick, isWinning, isHighlighted, disabled }) {
  const getCellStyle = () => {
    let baseStyle = {
      width: '100%',
      aspectRatio: '1',
      borderRadius: '50%',
      backgroundColor: value === PLAYER ? '#ff6b6b' : value === AI ? '#4ecdc4' : '#f8f9fa',
      border: '3px solid #343a40',
      cursor: disabled ? 'default' : 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
    };

    if (isWinning) {
      baseStyle.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 15px 5px #ffd700';
      baseStyle.transform = 'scale(1.05)';
    }

    if (isHighlighted && !disabled) {
      baseStyle.transform = 'scale(1.1)';
    }

    if (disabled) {
      baseStyle.cursor = 'default';
    }

    return baseStyle;
  };

  return (
    <div 
      onClick={onClick}
      style={getCellStyle()}
      role="button"
      aria-label={value === PLAYER ? 'Player piece' : value === AI ? 'AI piece' : 'Empty cell'}
      tabIndex={disabled ? -1 : 0}
    />
  );
}

function GameBoard({ board, onColumnClick, winningCells, disabled, highlightedColumn }) {
  return (
    <div 
      style={{
        backgroundColor: '#343a40',
        padding: '8px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxWidth: '100%',
      }}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="d-flex" style={{ gap: '6px', marginBottom: '6px' }}>
          {row.map((cell, colIndex) => (
            <div key={colIndex} style={{ flex: 1, minWidth: 0 }}>
              <BoardCell
                value={cell}
                onClick={() => !disabled && onColumnClick(colIndex)}
                isWinning={winningCells?.some(c => c.r === rowIndex && c.c === colIndex)}
                isHighlighted={highlightedColumn === colIndex && !disabled}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ConnectFour() {
  const [board, setBoard] = useState(createBoard());
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [moves, setMoves] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [highlightedColumn, setHighlightedColumn] = useState(null);

  const checkGameEnd = useCallback((currentBoard, currentMoves) => {
    const playerWin = checkWin(currentBoard, PLAYER);
    if (playerWin) {
      setWinner('Player');
      setWinningCells(playerWin.cells);
      saveGameResult('Player', currentMoves);
      return true;
    }

    const aiWin = checkWin(currentBoard, AI);
    if (aiWin) {
      setWinner('AI');
      setWinningCells(aiWin.cells);
      saveGameResult('AI', currentMoves);
      return true;
    }

    if (isDraw(currentBoard)) {
      setIsDraw(true);
      setWinningCells(null);
      saveGameResult('Draw', currentMoves);
      return true;
    }

    return false;
  }, []);

  const saveGameResult = async (result, moveCount) => {
    try {
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: result, moves: moveCount })
      });
    } catch (err) {
      console.error('Failed to save game:', err);
    }
  };

  const aiMove = useCallback(() => {
    setIsAIThinking(true);
    
    setTimeout(() => {
      const aiCol = getAIMove(board, 'medium');
      if (aiCol !== null) {
        const result = dropPiece(board, aiCol, AI);
        if (result) {
          const newBoard = result.board;
          setBoard(newBoard);
          const newMoves = moves + 1;
          setMoves(newMoves);
          
          if (!checkGameEnd(newBoard, newMoves)) {
            setHighlightedColumn(null);
          }
        }
      }
      setIsAIThinking(false);
    }, 600);
  }, [board, moves, checkGameEnd]);

  useEffect(() => {
    if (winner || isDraw) return;

    const hasPlayerPieces = board.some(row => row.some(cell => cell === PLAYER));
    const hasAIPieces = board.some(row => row.some(cell => cell === AI));

    if (hasPlayerPieces && !hasAIPieces && !isAIThinking) {
      aiMove();
    }
  }, [board, winner, isDraw, isAIThinking, aiMove]);

  const handleColumnClick = (col) => {
    if (winner || isDraw || isAIThinking) return;
    if (!isValidMove(board, col)) return;

    const result = dropPiece(board, col, PLAYER);
    if (result) {
      const newBoard = result.board;
      setBoard(newBoard);
      const newMoves = moves + 1;
      setMoves(newMoves);
      
      if (!checkGameEnd(newBoard, newMoves)) {
        setHighlightedColumn(null);
      }
    }
  };

  const handleColumnHover = (col) => {
    if (!winner && !isDraw && !isAIThinking && isValidMove(board, col)) {
      setHighlightedColumn(col);
    } else {
      setHighlightedColumn(null);
    }
  };

  const resetGame = () => {
    setBoard(createBoard());
    setWinner(null);
    setWinningCells(null);
    setIsDraw(false);
    setMoves(0);
    setIsAIThinking(false);
    setHighlightedColumn(null);
  };

  const getStatusMessage = () => {
    if (winner) return winner === 'Player' ? '🎉 You Win!' : '🤖 AI Wins!';
    if (isDraw) return "🤝 It's a Draw!";
    if (isAIThinking) return '🤔 AI is thinking...';
    if (moves === 0) return 'Your turn - Click any column to start!';
    return 'Your turn!';
  };

  return (
    <div className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Connect 4</h1>
        <Link to="/">
          <Button variant="outline-secondary" size="sm">← Back to Home</Button>
        </Link>
      </div>

      <Row className="mb-4">
        <Col xs={12}>
          <Alert 
            variant={winner === 'Player' ? 'success' : winner === 'AI' ? 'danger' : isDraw ? 'info' : 'primary'}
            className="text-center py-3"
          >
            <h4 className="mb-0">{getStatusMessage()}</h4>
            {isAIThinking && <Spinner animation="border" size="sm" className="ms-2" />}
          </Alert>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xs={12} md={10} lg={8}>
          <div 
            className="position-relative"
            onMouseLeave={() => setHighlightedColumn(null)}
            onTouchEnd={() => setHighlightedColumn(null)}
          >
            <GameBoard
              board={board}
              onColumnClick={handleColumnClick}
              winningCells={winningCells}
              disabled={winner || isDraw || isAIThinking}
              highlightedColumn={highlightedColumn}
            />
            
            {!winner && !isDraw && !isAIThinking && (
              <div 
                className="d-flex"
                style={{ gap: '8px', marginTop: '12px' }}
              >
                {Array(COLS).fill(null).map((_, col) => (
                  <button
                    key={col}
                    onClick={() => handleColumnClick(col)}
                    onMouseEnter={() => handleColumnHover(col)}
                    onTouchStart={() => handleColumnHover(col)}
                    disabled={!isValidMove(board, col)}
                    variant="outline-dark"
                    as="button"
                    style={{
                      flex: 1,
                      padding: '12px 8px',
                      fontSize: ' clamp(16px, 4vw, 20px)',
                      borderRadius: '8px',
                      border: '2px solid #343a40',
                      backgroundColor: isValidMove(board, col) ? '#4ecdc4' : '#e9ecef',
                      color: isValidMove(board, col) ? '#fff' : '#6c757d',
                      cursor: isValidMove(board, col) ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      opacity: highlightedColumn === col ? 0.8 : 1,
                    }}
                  >
                    ⬇
                  </button>
                ))}
              </div>
            )}
          </div>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col xs={12} className="text-center">
          <div className="d-inline-flex gap-3 flex-wrap justify-content-center mb-4">
            <Badge bg="danger" className="p-2 fs-6">🔴 Your Pieces</Badge>
            <Badge bg="info" className="p-2 fs-6">🟢 AI Pieces</Badge>
          </div>
          
          {(winner || isDraw) && (
            <div className="mt-3">
              <Button 
                variant="primary" 
                size="lg" 
                onClick={resetGame}
                className="px-5"
              >
                Play Again
              </Button>
            </div>
          )}
        </Col>
      </Row>

      <Row className="mt-5">
        <Col xs={12} className="text-center">
          <div className="bg-light p-4 rounded-3">
            <h5 className="mb-3">How to Play</h5>
            <p className="mb-2 text-muted">
              Click the arrow buttons below each column to drop your piece.
            </p>
            <p className="mb-2 text-muted">
              Connect 4 pieces horizontally, vertically, or diagonally to win!
            </p>
            <p className="mb-0 text-muted">
              You play as 🔴 and the AI plays as 🟢. Good luck!
            </p>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default ConnectFour;