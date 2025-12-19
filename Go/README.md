# Go
Basic offline Go game

## Features

- **Multiple board sizes**: 9×9, 13×13, and 19×19 with traditional grid and star points
- **Handicap system**: 2-9 handicap stones with standard placement positions
- **Full game mechanics**:
  - Stone placement with proper validation
  - Capture detection and removal
  - Ko rule enforcement
  - Pass move support
- **Game state management**:
  - New game functionality with handicap preservation
  - Undo moves with full history
  - Save and load games as JSON files (preserves board size and handicap)
  - Move tracking and numbering
- **Visual enhancements**:
  - Coordinate labels (A-T, 1-19) for all board sizes
  - Last move indicator
  - Toggle move numbers on/off
  - Dead stone marking interface
- **Scoring system**:
  - Territory calculation
  - Capture counting
  - Dead stone confirmation
  - Final score display with 6.5 komi for White
- **End game features**:
  - Automatic game over detection (two consecutive passes)
  - Interactive dead stone marking
  - Final territory and score calculation

---

*This Go game was generated 100% using [Claude Code](https://claude.ai/code).*
