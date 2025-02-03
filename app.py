from flask import Flask, render_template, jsonify, request
import numpy as np

app = Flask(__name__)

ROW_COUNT = 6
COLUMN_COUNT = 7
WINDOW_LENGTH = 4
EMPTY = 0
PLAYER_PIECE = 1
AI_PIECE = 2

class ConnectFour:
    def __init__(self):
        self.board = self.create_board()
        
    def create_board(self):
        return np.zeros((ROW_COUNT, COLUMN_COUNT))

    def drop_piece(self, row, col, piece):
        self.board[row][col] = piece

    def is_valid_location(self, col):
        if col < 0 or col >= COLUMN_COUNT:
            raise IndexError(f"Column {col} is out of bounds")
        return self.board[ROW_COUNT-1][col] == 0

    def get_next_open_row(self, col):
        for r in range(ROW_COUNT):
            if self.board[r][col] == 0:
                return r
        return None

    def winning_move(self, piece):
        # Horizontal check
        for c in range(COLUMN_COUNT-3):
            for r in range(ROW_COUNT):
                if (self.board[r][c] == piece and 
                    self.board[r][c+1] == piece and 
                    self.board[r][c+2] == piece and 
                    self.board[r][c+3] == piece):
                    return True

        # Vertical check
        for c in range(COLUMN_COUNT):
            for r in range(ROW_COUNT-3):
                if (self.board[r][c] == piece and 
                    self.board[r+1][c] == piece and 
                    self.board[r+2][c] == piece and 
                    self.board[r+3][c] == piece):
                    return True

        # Positive diagonal check
        for c in range(COLUMN_COUNT-3):
            for r in range(ROW_COUNT-3):
                if (self.board[r][c] == piece and 
                    self.board[r+1][c+1] == piece and 
                    self.board[r+2][c+2] == piece and 
                    self.board[r+3][c+3] == piece):
                    return True

        # Negative diagonal check
        for c in range(COLUMN_COUNT-3):
            for r in range(3, ROW_COUNT):
                if (self.board[r][c] == piece and 
                    self.board[r-1][c+1] == piece and 
                    self.board[r-2][c+2] == piece and 
                    self.board[r-3][c+3] == piece):
                    return True

        return False

    def evaluate_window(self, window, piece):
        score = 0
        opp_piece = PLAYER_PIECE if piece == AI_PIECE else AI_PIECE

        if window.count(piece) == 4:
            score += 100
        elif window.count(piece) == 3 and window.count(EMPTY) == 1:
            score += 5
        elif window.count(piece) == 2 and window.count(EMPTY) == 2:
            score += 2

        if window.count(opp_piece) == 3 and window.count(EMPTY) == 1:
            score -= 4

        return score

    def score_position(self, piece):
        score = 0

        # Score center column
        center_array = [int(i) for i in list(self.board[:, COLUMN_COUNT//2])]
        center_count = center_array.count(piece)
        score += center_count * 3

        # Horizontal score
        for r in range(ROW_COUNT):
            row_array = [int(i) for i in list(self.board[r,:])]
            for c in range(COLUMN_COUNT-3):
                window = row_array[c:c+WINDOW_LENGTH]
                score += self.evaluate_window(window, piece)

        # Vertical score
        for c in range(COLUMN_COUNT):
            col_array = [int(i) for i in list(self.board[:,c])]
            for r in range(ROW_COUNT-3):
                window = col_array[r:r+WINDOW_LENGTH]
                score += self.evaluate_window(window, piece)

        # Positive diagonal score
        for r in range(ROW_COUNT-3):
            for c in range(COLUMN_COUNT-3):
                window = [self.board[r+i][c+i] for i in range(WINDOW_LENGTH)]
                score += self.evaluate_window(window, piece)

        # Negative diagonal score
        for r in range(ROW_COUNT-3):
            for c in range(COLUMN_COUNT-3):
                window = [self.board[r+3-i][c+i] for i in range(WINDOW_LENGTH)]
                score += self.evaluate_window(window, piece)

        return score

    def is_terminal_node(self):
        return self.winning_move(PLAYER_PIECE) or self.winning_move(AI_PIECE) or len(self.get_valid_locations()) == 0

    def get_valid_locations(self):
        valid_locations = []
        for col in range(COLUMN_COUNT):
            if self.is_valid_location(col):
                valid_locations.append(col)
        return valid_locations

    def alpha_beta(self, depth, alpha, beta, maximizing_player):
        valid_locations = self.get_valid_locations()
        is_terminal = self.is_terminal_node()
        
        if depth == 0 or is_terminal:
            if is_terminal:
                if self.winning_move(AI_PIECE):
                    return (None, 100000000000000)
                elif self.winning_move(PLAYER_PIECE):
                    return (None, -100000000000000)
                else:  # Game is over, no more valid moves
                    return (None, 0)
            else:  # Depth is zero
                return (None, self.score_position(AI_PIECE))

        if maximizing_player:
            value = float('-inf')
            column = valid_locations[0]
            for col in valid_locations:
                row = self.get_next_open_row(col)
                temp_board = self.board.copy()
                self.drop_piece(row, col, AI_PIECE)
                new_score = self.alpha_beta(depth-1, alpha, beta, False)[1]
                self.board = temp_board
                if new_score > value:
                    value = new_score
                    column = col
                alpha = max(alpha, value)
                if alpha >= beta:
                    break
            return column, value
        else:  # Minimizing player
            value = float('inf')
            column = valid_locations[0]
            for col in valid_locations:
                row = self.get_next_open_row(col)
                temp_board = self.board.copy()
                self.drop_piece(row, col, PLAYER_PIECE)
                new_score = self.alpha_beta(depth-1, alpha, beta, True)[1]
                self.board = temp_board
                if new_score < value:
                    value = new_score
                    column = col
                beta = min(beta, value)
                if alpha >= beta:
                    break
            return column, value

# Initialize game
game = ConnectFour()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/reset', methods=['POST'])
def reset():
    global game
    game = ConnectFour()
    return jsonify({'board': game.board.tolist()})

@app.route('/make_move', methods=['POST'])
def make_move():
    try:
        data = request.get_json()
        col = data.get('column')
        
        if not isinstance(col, int) or col < 0 or col >= COLUMN_COUNT:
            return jsonify({'error': 'Invalid column number'}), 400
            
        if not game.is_valid_location(col):
            return jsonify({'error': 'Column is full'}), 400
            
        # Player move
        row = game.get_next_open_row(col)
        game.drop_piece(row, col, PLAYER_PIECE)
        
        # Check if player won
        if game.winning_move(PLAYER_PIECE):
            return jsonify({
                'board': game.board.tolist(),
                'gameOver': True,
                'winner': 'player'
            })
        
        # AI move
        ai_col, _ = game.alpha_beta(5, float('-inf'), float('inf'), True)
        ai_row = game.get_next_open_row(ai_col)
        game.drop_piece(ai_row, ai_col, AI_PIECE)
        
        # Check if AI won
        if game.winning_move(AI_PIECE):
            return jsonify({
                'board': game.board.tolist(),
                'gameOver': True,
                'winner': 'ai'
            })
        
        # Check for draw
        if len(game.get_valid_locations()) == 0:
            return jsonify({
                'board': game.board.tolist(),
                'gameOver': True,
                'winner': 'draw'
            })
        
        return jsonify({
            'board': game.board.tolist(),
            'gameOver': False,
            'aiMove': ai_col
        })
    except IndexError as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8082, debug=True)
