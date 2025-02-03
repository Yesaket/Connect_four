# Connect Four Web Game

## Contributors
- Yesaket

## Project Overview
A web-based implementation of the classic Connect Four game with an AI opponent. The game features a modern UI, smooth animations, and multiple AI difficulty levels.

## Features Implemented
1. **Game Logic**
   - Complete Connect Four game mechanics
   - AI opponent with multiple difficulty levels
   - Win detection for horizontal, vertical, and diagonal connections


2. **Technical Features**
   - Flask backend for game logic
   - Canvas-based frontend rendering
   - Alpha-beta pruning AI algorithm
   - Comprehensive test suite

## AI Implementation
The game uses the Alpha-Beta Pruning algorithm, which is an optimization of the Minimax algorithm. This is a powerful decision-making algorithm commonly used in two-player games.

### How Alpha-Beta Pruning Works
1. **Depth-First Search**: The algorithm looks ahead several moves, creating a game tree.
2. **Minimax Strategy**: 
   - The AI (maximizing player) tries to maximize its score
   - The human player (minimizing player) is assumed to try to minimize AI's score
3. **Pruning**: The algorithm skips evaluating moves that are guaranteed to be worse than previously examined moves

### Position Evaluation
The AI evaluates board positions using several factors:
1. **Center Control**: Pieces in the center columns are worth more points
2. **Window Scoring**:
   - 4 in a row = 100 points
   - 3 in a row with empty space = 5 points
   - 2 in a row with empty spaces = 2 points
   - Blocking opponent's 3 in a row = -4 points
3. **Direction Checking**: Evaluates horizontal, vertical, and diagonal connections

### Difficulty Levels
The difficulty is controlled by the search depth in the alpha_beta function:
```python
ai_col, _ = game.alpha_beta(5, float('-inf'), float('inf'), True)
```
- Currently set to depth depends on the ai difficulty level. Easy being 1, Medium being 2, Hard being 5
- Higher depth = stronger AI but slower decisions
- Lower depth = weaker AI but faster decisions

## Issues Encountered & Solutions
1. **Animation Glitches**
   - Issue: Pieces would disappear momentarily during drop animation
   - Solution: Improved the animation logic to maintain piece visibility throughout

2. **AI Move Display**
   - Issue: AI moves would show up in final position before animation
   - Solution: Synchronized board state updates with animations

3. **Column Highlighting**
   - Issue: Inconsistent highlight behavior and visual artifacts
   - Solution: Implemented proper column tracking and highlight clearing

4. **Testing Challenges**
   - Issue: Initial test structure didn't match class-based implementation
   - Solution: Refactored tests to work with ConnectFour class and added fixtures
4. **Ai Difficulty Selection**
   - Issue: Difficulty selection not working
   - Solution: Implemented easy/medium/hard selection and default to medium difficulty and connect the front end to the backend.


## Development Time
- Initial Implementation: ~4 hours
- UI Improvements: ~2 hours
- Animation Fixes: ~2 hours
- Testing Implementation: ~1 hour
- Total: ~9 hours

## Running the Project
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python app.py
   ```

3. Open in browser:
   ```
   http://localhost:8082
   ```

## Running Tests
```bash
python -m pytest tests/test_game.py -v
```
