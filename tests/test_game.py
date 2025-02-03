import pytest
from app import app, ConnectFour

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def game():
    return ConnectFour()

def test_create_board(game):
    board = game.create_board()
    assert len(board) == 6  # ROW_COUNT
    assert len(board[0]) == 7  # COLUMN_COUNT
    assert all(cell == 0 for row in board for cell in row)

def test_is_valid_location(game):
    # Test empty column
    assert game.is_valid_location(0) == True
    # Fill a column and test
    for i in range(6):  # ROW_COUNT
        game.drop_piece(i, 0, 1)
    assert game.is_valid_location(0) == False
    # Test invalid column
    with pytest.raises(IndexError):
        game.is_valid_location(7)
    with pytest.raises(IndexError):
        game.is_valid_location(-1)

def test_get_next_open_row(game):
    # Test empty column
    assert game.get_next_open_row(0) == 0
    # Drop a piece and test
    game.drop_piece(0, 0, 1)
    assert game.get_next_open_row(0) == 1
    # Fill column and test
    for i in range(1, 6):  # Fill rest of column
        game.drop_piece(i, 0, 1)
    assert game.get_next_open_row(0) == None

def test_drop_piece(game):
    # Drop piece in first column
    game.drop_piece(0, 0, 1)
    assert game.board[0][0] == 1
    # Drop another piece in same column
    game.drop_piece(1, 0, 2)
    assert game.board[1][0] == 2

def test_winning_move(game):
    # Test horizontal win
    for col in range(4):
        game.drop_piece(0, col, 1)
    assert game.winning_move(1) == True
    
    # Test vertical win
    game = ConnectFour()  # Reset board
    for row in range(4):
        game.drop_piece(row, 0, 1)
    assert game.winning_move(1) == True
    
    # Test positive diagonal win
    game = ConnectFour()  # Reset board
    for i in range(4):
        game.drop_piece(i, i, 1)
    assert game.winning_move(1) == True
    
    # Test negative diagonal win
    game = ConnectFour()  # Reset board
    for i in range(4):
        game.drop_piece(i, 3-i, 1)
    assert game.winning_move(1) == True
    
    # Test no win
    game = ConnectFour()  # Reset board
    assert game.winning_move(1) == False

def test_make_move_endpoint(client):
    # Test valid move
    response = client.post('/make_move', json={'column': 3})
    assert response.status_code == 200
    data = response.get_json()
    assert 'board' in data
    assert 'gameOver' in data
    assert 'aiMove' in data
    
    # Test invalid column number
    response = client.post('/make_move', json={'column': 7})
    assert response.status_code == 400
