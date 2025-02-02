const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const resetButton = document.getElementById('reset-button');
const changeModeButton = document.getElementById('change-mode-button');
const modeSelection = document.getElementById('mode-selection');
const gameScreen = document.getElementById('game-screen');
const aiModeButton = document.getElementById('ai-mode');
const twoPlayerModeButton = document.getElementById('two-player-mode');

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

function showModeSelection() {
    modeSelection.style.display = 'block';
    gameScreen.classList.add('hidden');
}

function showGameScreen() {
    modeSelection.style.display = 'none';
    gameScreen.classList.remove('hidden');
}

function startGame(vsAI) {
    isAIMode = vsAI;
    showGameScreen();
    resetGame();
}

function drawBoard() {
    ctx.fillStyle = '#1e88e5';
    ctx.fillRect(0, SQUARE_SIZE, canvas.width, canvas.height);
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawCell(r, c);
        }
    }
}

function drawCell(row, col) {
    const x = col * SQUARE_SIZE + SQUARE_SIZE/2;
    const y = (ROWS - row) * SQUARE_SIZE + SQUARE_SIZE/2;
    
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = getColor(board[row][col]);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
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
    
    ctx.clearRect(0, 0, canvas.width, SQUARE_SIZE);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, SQUARE_SIZE);
    
    if (col >= 0 && col < COLS) {
        const x = col * SQUARE_SIZE + SQUARE_SIZE/2;
        const y = SQUARE_SIZE/2;
        
        ctx.beginPath();
        ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = currentPlayer === 1 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 255, 0, 0.5)';
        ctx.fill();
    }
}

async function animatePiece(col, row, piece) {
    return new Promise(resolve => {
        const targetY = (ROWS - row) * SQUARE_SIZE + SQUARE_SIZE/2;
        const x = col * SQUARE_SIZE + SQUARE_SIZE/2;
        let currentY = SQUARE_SIZE/2;
        
        function animate() {
            // Clear the column
            ctx.clearRect(x - PIECE_RADIUS - 2, 0, PIECE_RADIUS * 2 + 4, canvas.height);
            
            // Redraw empty cells in this column
            for (let r = 0; r < ROWS; r++) {
                if (r !== row || currentY < targetY) {
                    const cellY = (ROWS - r) * SQUARE_SIZE + SQUARE_SIZE/2;
                    ctx.beginPath();
                    ctx.arc(x, cellY, PIECE_RADIUS, 0, Math.PI * 2);
                    ctx.fillStyle = getColor(board[r][col]);
                    ctx.fill();
                    ctx.strokeStyle = '#333';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
            
            // Draw falling piece
            ctx.beginPath();
            ctx.arc(x, currentY, PIECE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = getColor(piece);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            if (currentY < targetY) {
                currentY = Math.min(currentY + ANIMATION_SPEED, targetY);
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }
        
        animate();
    });
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

canvas.addEventListener('mousemove', (event) => {
    if (!gameOver && !animationInProgress) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const col = Math.floor(x / SQUARE_SIZE);
        drawHover(col);
    }
});

canvas.addEventListener('mouseleave', () => {
    drawHover(-1);
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
aiModeButton.addEventListener('click', () => startGame(true));
twoPlayerModeButton.addEventListener('click', () => startGame(false));

// Show mode selection on start
showModeSelection();
