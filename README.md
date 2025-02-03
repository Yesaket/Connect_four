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
