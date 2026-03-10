import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [highlightedColumn, setHighlightedColumn] = useState(null);
  const aiTimeoutRef = useRef(null);
  const isMounted = useRef(true);

  const checkGameEnd = useCallback((currentBoard, currentMoves) => {
    const playerWin = checkWin(currentBoard, PLAYER);
    if (playerWin) {
      console.log(`[ConnectFour] PLAYER WINS at moves=${currentMoves}`);
      setWinner('Player');
      setWinningCells(playerWin.cells);
      saveGameResult('Player', currentMoves);
      return true;
    }

    const aiWin = checkWin(currentBoard, AI);
    if (aiWin) {
      console.log(`[ConnectFour] AI WINS at moves=${currentMoves}`);
      setWinner('AI');
      setWinningCells(aiWin.cells);
      saveGameResult('AI', currentMoves);
      return true;
    }

    if (isDraw(currentBoard)) {
      console.log(`[ConnectFour] DRAW at moves=${currentMoves}`);
      setIsDraw(true);
      setWinningCells(null);
      saveGameResult('Draw', currentMoves);
      return true;
    }

    return false;
  }, []);

  const saveGameResult = async (result, moveCount) => {
    try {
      console.log(`[ConnectFour] Saving game result: ${result}, moves: ${moveCount}`);
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
    // Clear any existing timeout to prevent multiple AI moves
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }

    console.log('[ConnectFour] AI move initiated, setting isAIThinking=true');
    setIsAIThinking(true);

    aiTimeoutRef.current = setTimeout(() => {
      // Use functional updates to always work from latest state
      setWinner(prevWinner => {
        setIsDraw(prevIsDraw => {
          // Double-check state is still valid before making AI move
          if (prevWinner || prevIsDraw) {
            console.log('[ConnectFour] Aborting AI move - game already ended');
            setIsAIThinking(false);
            aiTimeoutRef.current = null;
            return prevWinner;
          }

          // Get current board state
          setBoard(prevBoard => {
            const aiCol = getAIMove(prevBoard, 'medium');
            console.log(`[ConnectFour] AI chose column ${aiCol}`);
            if (aiCol !== null) {
              const result = dropPiece(prevBoard, aiCol, AI);
              if (result) {
                // Update moves and check game end
                setMoves(prevMoves => {
                  const newMoves = prevMoves + 1;
                  console.log(`[ConnectFour] AI moved, newMoves: ${newMoves} (Player's turn next)`);

                  // Check game end after board update
                  setTimeout(() => {
                    setBoard(currentBoard => {
                      if (!checkGameEnd(currentBoard, newMoves)) {
                        setHighlightedColumn(null);
                      }
                      return currentBoard;
                    });
                  }, 0);

                  return newMoves;
                });

                return result.board;
              }
            }
            return prevBoard;
          });

          setIsAIThinking(false);
          setIsPlayerTurn(true); // Switch back to player's turn
          aiTimeoutRef.current = null;
          return prevWinner;
        });
        return prevWinner;
      });
    }, 600);
  }, [checkGameEnd]);

  useEffect(() => {
    if (winner || isDraw || isAIThinking) return;

    console.log(`[ConnectFour] useEffect: isPlayerTurn=${isPlayerTurn}, winner=${winner}, isDraw=${isDraw}, isAIThinking=${isAIThinking}`);

    // AI triggers when it's NOT the player's turn
    if (!isPlayerTurn) {
      console.log('[ConnectFour] AI TRIGGERED!');
      aiMove();
    } else {
      console.log('[ConnectFour] AI NOT triggered (waiting for player)');
    }
  }, [winner, isDraw, isPlayerTurn, isAIThinking, aiMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
        console.log('[ConnectFour] Cleanup timeout on unmount');
      }
    };
  }, []);

  const handleColumnClick = (col) => {
    if (winner || isDraw || isAIThinking) return;
    if (!isValidMove(board, col)) return;
    if (!isPlayerTurn) {
      console.log('[ConnectFour] Player click ignored - not player turn');
      return;
    }

    console.log(`[ConnectFour] Player clicking column ${col}, moves: ${moves}, isPlayerTurn: ${isPlayerTurn}`);

    const result = dropPiece(board, col, PLAYER);
    if (result) {
      const newBoard = result.board;
      setBoard(newBoard);
      const newMoves = moves + 1;
      setMoves(newMoves);

      console.log(`[ConnectFour] Player moved, newMoves: ${newMoves}, checking ending before switching to AI`);

      // Check game end before switching to AI
      if (!checkGameEnd(newBoard, newMoves)) {
        // Only switch to AI's turn if game is still ongoing
        console.log('[ConnectFour] Game continuing, switching to AI turn');
        setIsPlayerTurn(false);
        setHighlightedColumn(null);
      } else {
        console.log('[ConnectFour] Game ended, keeping isPlayerTurn=true');
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
    // Clear any pending AI timeout
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    setBoard(createBoard());
    setWinner(null);
    setWinningCells(null);
    setIsDraw(false);
    setMoves(0);
    setIsPlayerTurn(true);
    setIsAIThinking(false);
    setHighlightedColumn(null);

    console.log('[ConnectFour] Game reset');
  };

  const getStatusMessage = () => {
    if (winner) return winner === 'Player' ? '🎉 You Win!' : '🤖 AI Wins!';
    if (isDraw) return "🤝 It's a Draw!";
    if (isAIThinking) return '🤔 AI is thinking...';
    if (isPlayerTurn) return moves === 0 ? 'Your turn - Click any column to start!' : 'Your turn!';
    return 'AI is making a move...';
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