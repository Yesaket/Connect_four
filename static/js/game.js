const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const resetButton = document.getElementById('reset-button');
const changeModeButton = document.getElementById('change-mode-button');
const modeSelection = document.getElementById('mode-selection');
const gameScreen = document.getElementById('game-screen');
const aiModeButton = document.getElementById('ai-mode');
const twoPlayerModeButton = document.getElementById('two-player-mode');
const difficultySelection = document.getElementById('difficulty-selection');

const ROWS = 6;
const COLS = 7;
const SQUARE_SIZE = 80;
const PIECE_RADIUS = SQUARE_SIZE/2 - 5;
const ANIMATION_SPEED = 15; // pixels per frame
const AI_MOVE_DELAY = 500; // milliseconds

canvas.width = COLS * SQUARE_SIZE;
canvas.height = (ROWS + 1) * SQUARE_SIZE;

let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let gameOver = false;
let currentPlayer = 1; // 1 for player 1 (red), 2 for player 2/AI (yellow)
let animationInProgress = false;
let isAIMode = true; // Default to AI mode
let aiDepth = 4; // Default to medium difficulty
let lastHighlightedColumn = -1;

function showModeSelection() {
    modeSelection.style.display = 'block';
    gameScreen.classList.add('hidden');
    difficultySelection.classList.remove('visible');
}

function showGameScreen() {
    modeSelection.style.display = 'none';
    gameScreen.classList.remove('hidden');
}

function startGame(vsAI) {
    isAIMode = vsAI;
    showGameScreen();
    resetGame();
    updateStatus();
}

function drawBoard() {
    // Clear the entire canvas including the preview row
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill the board background
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(0, SQUARE_SIZE, canvas.width, canvas.height - SQUARE_SIZE);
    
    // Draw all cells
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * SQUARE_SIZE + SQUARE_SIZE/2;
            const y = (ROWS - r) * SQUARE_SIZE + SQUARE_SIZE/2;
            
            // Draw the hole
            ctx.beginPath();
            ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw the piece if one exists
            if (board[r][c] !== 0) {
                ctx.beginPath();
                ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = getColor(board[r][c]);
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
}

function getColor(piece) {
    switch(piece) {
        case 0: return 'white';
        case 1: return 'red';
        case 2: return 'yellow';
    }
}

function drawHover(col) {
    if (animationInProgress) return;
    
    // If we're highlighting a different column or moving out of the board
    if (col !== lastHighlightedColumn) {
        // Redraw the board to clear any highlights
        drawBoard();
        lastHighlightedColumn = col;
        
        // Add new highlight if we're over a valid column
        if (col >= 0 && col < COLS) {
            const x = col * SQUARE_SIZE;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Consistent, subtle highlight
            ctx.fillRect(x, 0, SQUARE_SIZE, canvas.height);
            
            // Draw the preview piece at the top
            const centerX = x + SQUARE_SIZE/2;
            ctx.beginPath();
            ctx.arc(centerX, SQUARE_SIZE/2, PIECE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = currentPlayer === 1 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 0, 0.5)';
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

async function makeMove(col) {
    if (gameOver || animationInProgress) return;
    
    try {
        animationInProgress = true;
        
        if (isAIMode) {
            const response = await fetch('/make_move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ column: col })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Find the row where the piece landed
                let row;
                for (let r = 0; r < ROWS; r++) {
                    if (data.board[r][col] !== board[r][col]) {
                        row = r;
                        break;
                    }
                }
                
                // Animate player's piece
                await animatePiece(col, row, 1);
                board = data.board;
                
                if (data.gameOver) {
                    gameOver = true;
                    if (data.winner === 'player') {
                        statusText.textContent = 'Player 1 wins! ';
                    } else if (data.winner === 'ai') {
                        statusText.textContent = 'AI wins! ';
                    } else {
                        statusText.textContent = "It's a draw! ";
                    }
                } else {
                    statusText.textContent = "AI is thinking... ";
                    
                    // Add delay before AI move
                    await new Promise(resolve => setTimeout(resolve, AI_MOVE_DELAY));
                    
                    // Find AI's move
                    const aiCol = data.aiMove;
                    let aiRow;
                    for (let r = 0; r < ROWS; r++) {
                        if (data.board[r][aiCol] === 2) {
                            aiRow = r;
                            break;
                        }
                    }
                    
                    // Animate AI's piece
                    await animatePiece(aiCol, aiRow, 2);
                    statusText.textContent = 'Your turn! (Red)';
                }
            }
        } else {
            // Two-player mode
            const row = getNextOpenRow(col);
            if (row === null) {
                animationInProgress = false;
                return;
            }
            
            await animatePiece(col, row, currentPlayer);
            board[row][col] = currentPlayer;
            
            if (checkWin(row, col)) {
                gameOver = true;
                statusText.textContent = `Player ${currentPlayer} wins! `;
            } else if (isBoardFull()) {
                gameOver = true;
                statusText.textContent = "It's a draw! ";
            } else {
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                statusText.textContent = `Player ${currentPlayer}'s turn! (${currentPlayer === 1 ? 'Red' : 'Yellow'})`;
            }
        }
        
        drawBoard();
        animationInProgress = false;
    } catch (error) {
        console.error('Error:', error);
        animationInProgress = false;
    }
}

async function animatePiece(col, row, piece) {
    return new Promise(resolve => {
        const targetY = (ROWS - row) * SQUARE_SIZE + SQUARE_SIZE/2;
        const x = col * SQUARE_SIZE + SQUARE_SIZE/2;
        let currentY = SQUARE_SIZE/2;
        let velocity = 0;
        const gravity = 1.5;
        const dampening = 0.3;
        const bounceThreshold = 4;
        
        function animate() {
            const colX = col * SQUARE_SIZE;
            
            // Clear the entire column
            ctx.clearRect(colX, 0, SQUARE_SIZE, canvas.height);
            
            // Draw the blue background for this column
            ctx.fillStyle = '#1e88e5';
            ctx.fillRect(colX, SQUARE_SIZE, SQUARE_SIZE, canvas.height - SQUARE_SIZE);
            
            // Draw all the holes in this column
            for (let r = 0; r < ROWS; r++) {
                const pieceY = (ROWS - r) * SQUARE_SIZE + SQUARE_SIZE/2;
                ctx.beginPath();
                ctx.arc(x, pieceY, PIECE_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Draw all the existing pieces in this column
            for (let r = 0; r < ROWS; r++) {
                if (board[r][col] !== 0) {
                    const pieceY = (ROWS - r) * SQUARE_SIZE + SQUARE_SIZE/2;
                    ctx.beginPath();
                    ctx.arc(x, pieceY, PIECE_RADIUS, 0, Math.PI * 2);
                    ctx.fillStyle = getColor(board[r][col]);
                    ctx.fill();
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
            
            // Draw the falling piece
            ctx.beginPath();
            ctx.arc(x, currentY, PIECE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = getColor(piece);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Update position
            velocity += gravity;
            currentY += velocity;
            
            // Check if we've hit the target
            if (currentY >= targetY) {
                currentY = targetY;
                velocity = -velocity * dampening;
                
                if (Math.abs(velocity) < bounceThreshold) {
                    // Update the board state
                    board[row][col] = piece;
                    // Redraw just this column one final time
                    ctx.clearRect(colX, 0, SQUARE_SIZE, canvas.height);
                    ctx.fillStyle = '#1e88e5';
                    ctx.fillRect(colX, SQUARE_SIZE, SQUARE_SIZE, canvas.height - SQUARE_SIZE);
                    
                    // Draw all holes and pieces in final state
                    for (let r = 0; r < ROWS; r++) {
                        const pieceY = (ROWS - r) * SQUARE_SIZE + SQUARE_SIZE/2;
                        ctx.beginPath();
                        ctx.arc(x, pieceY, PIECE_RADIUS, 0, Math.PI * 2);
                        ctx.fillStyle = 'white';
                        ctx.fill();
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        
                        if (board[r][col] !== 0) {
                            ctx.beginPath();
                            ctx.arc(x, pieceY, PIECE_RADIUS, 0, Math.PI * 2);
                            ctx.fillStyle = getColor(board[r][col]);
                            ctx.fill();
                            ctx.strokeStyle = '#333';
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }
                    
                    animationInProgress = false;
                    resolve();
                    return;
                }
            }
            
            requestAnimationFrame(animate);
        }
        
        animate();
    });
}

function getNextOpenRow(col) {
    for (let r = 0; r < ROWS; r++) {
        if (board[r][col] === 0) {
            return r;
        }
    }
    return null;
}

function checkWin(row, col) {
    const piece = board[row][col];
    
    // Horizontal check
    for (let c = 0; c <= COLS - 4; c++) {
        if (board[row][c] === piece &&
            board[row][c+1] === piece &&
            board[row][c+2] === piece &&
            board[row][c+3] === piece) {
            return true;
        }
    }
    
    // Vertical check
    for (let r = 0; r <= ROWS - 4; r++) {
        if (board[r][col] === piece &&
            board[r+1][col] === piece &&
            board[r+2][col] === piece &&
            board[r+3][col] === piece) {
            return true;
        }
    }
    
    // Diagonal checks
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === piece &&
                board[r+1][c+1] === piece &&
                board[r+2][c+2] === piece &&
                board[r+3][c+3] === piece) {
                return true;
            }
        }
    }
    
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] === piece &&
                board[r-1][c+1] === piece &&
                board[r-2][c+2] === piece &&
                board[r-3][c+3] === piece) {
                return true;
            }
        }
    }
    
    return false;
}

function isBoardFull() {
    return board[ROWS-1].every(cell => cell !== 0);
}

async function resetGame() {
    if (animationInProgress) return;
    
    try {
        if (isAIMode) {
            const response = await fetch('/reset', {
                method: 'POST'
            });
            
            const data = await response.json();
            board = data.board;
        } else {
            board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
            currentPlayer = 1;
        }
        
        gameOver = false;
        statusText.textContent = isAIMode ? 'Your turn! (Red)' : "Player 1's turn! (Red)";
        drawBoard();
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateStatus() {
    if (gameOver) {
        if (checkWin(null, null)) {
            statusText.textContent = "It's a draw!";
        } else {
            const winnerText = currentPlayer === 1 ? "Red" : "Yellow";
            statusText.textContent = `${winnerText} wins! 🎉`;
        }
    } else {
        const playerText = currentPlayer === 1 ? "Red" : "Yellow";
        const turnText = (isAIMode && currentPlayer === 2) ? "AI is thinking..." : `${playerText}'s turn!`;
        statusText.textContent = turnText;
    }
}

async function makeAIMove() {
    if (!isAIMode || currentPlayer !== 2 || gameOver) return;
    
    animationInProgress = true;
    updateStatus();
    
    // Simulate AI thinking time based on difficulty
    const thinkingTime = Math.max(500, aiDepth * 200);
    await new Promise(resolve => setTimeout(resolve, thinkingTime));
    
    let bestScore = -Infinity;
    let bestCol = 0;
    
    for (let col = 0; col < COLS; col++) {
        const row = getNextOpenRow(col);
        if (row === -1) continue;
        
        board[row][col] = 2;
        const score = minimax(board, aiDepth, -Infinity, Infinity, false);
        board[row][col] = 0;
        
        if (score > bestScore) {
            bestScore = score;
            bestCol = col;
        }
    }
    
    makeMove(bestCol);
}

function minimax(board, depth, alpha, beta, maximizingPlayer) {
    // Base cases: check if game is over or depth is reached
    const result = evaluatePosition(board);
    if (depth === 0 || result !== null) {
        return result;
    }
    
    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (let col = 0; col < COLS; col++) {
            const row = getNextOpenRow(col);
            if (row === -1) continue;
            
            board[row][col] = 2;
            const eval = minimax(board, depth - 1, alpha, beta, false);
            board[row][col] = 0;
            
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let col = 0; col < COLS; col++) {
            const row = getNextOpenRow(col);
            if (row === -1) continue;
            
            board[row][col] = 1;
            const eval = minimax(board, depth - 1, alpha, beta, true);
            board[row][col] = 0;
            
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluatePosition(board) {
    // Check for win
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === 0) continue;
            
            // Check horizontal, vertical, and both diagonals
            const directions = [[0,1], [1,0], [1,1], [1,-1]];
            for (const [dr, dc] of directions) {
                let count = 1;
                let r2 = r + dr;
                let c2 = c + dc;
                
                while (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS && board[r2][c2] === board[r][c]) {
                    count++;
                    r2 += dr;
                    c2 += dc;
                }
                
                r2 = r - dr;
                c2 = c - dc;
                while (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS && board[r2][c2] === board[r][c]) {
                    count++;
                    r2 -= dr;
                    c2 -= dc;
                }
                
                if (count >= 4) {
                    return board[r][c] === 2 ? 1000 : -1000;
                }
            }
        }
    }
    
    // If no win, evaluate position based on piece positions
    let score = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === 0) continue;
            
            // Favor center positions
            const centerBonus = Math.abs(c - COLS/2);
            const heightBonus = r;
            const positionScore = (5 - centerBonus) + heightBonus;
            
            if (board[r][c] === 2) {
                score += positionScore;
            } else {
                score -= positionScore;
            }
        }
    }
    
    return score;
}

canvas.addEventListener('mousemove', (event) => {
    if (!gameOver && !animationInProgress) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const col = Math.floor(x / SQUARE_SIZE);
        drawHover(col);
    }
});

canvas.addEventListener('mouseleave', () => {
    lastHighlightedColumn = -1;
    drawBoard();
});

canvas.addEventListener('click', (event) => {
    if (!gameOver && !animationInProgress) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const col = Math.floor(x / SQUARE_SIZE);
        
        if (col >= 0 && col < COLS) {
            makeMove(col);
        }
    }
});

resetButton.addEventListener('click', resetGame);
changeModeButton.addEventListener('click', showModeSelection);
aiModeButton.addEventListener('click', () => {
    difficultySelection.classList.add('visible');
});
twoPlayerModeButton.addEventListener('click', () => {
    startGame(false);
});

document.querySelectorAll('.difficulty-button').forEach(button => {
    button.addEventListener('click', () => {
        aiDepth = parseInt(button.dataset.depth);
        startGame(true);
    });
});

// Show mode selection on start
showModeSelection();
