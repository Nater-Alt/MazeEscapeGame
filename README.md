# Maze Escape Game

A browser-based first-person 3D maze escape experience built with Three.js. Explore the labyrinth, manage stamina, conserve flashlight batteries, gather keys and notes, and avoid the patrolling creature as you work toward the exit door.

## Features

- **First-person controls** with mouse look, WASD movement, sprinting, and jumping.
- **Stamina system** that drains while sprinting and slowly regenerates while walking or resting.
- **Flashlight with limited battery** that can be toggled on/off and recharged by consuming collected batteries.
- **Inventory UI** (open with <kbd>Tab</kbd>) listing batteries, keys, and discovered notes. Use batteries with <kbd>1</kbd> when the inventory is open.
- **Interactive pickups** for batteries, keys, and notes collected with <kbd>E</kbd>.
- **Locked exit door** that requires three keys to open before the player can escape.
- **Roaming enemy** that patrols the maze, reacts to noise from sprinting and a flashlight beam pointed at it, chases on sight, and plays ominous footstep audio when nearby.
- **Win/Lose states** with restart option.

## Controls

| Key | Action |
| --- | ------ |
| Mouse | Look around (requires pointer lock) |
| W / A / S / D | Move |
| Shift | Sprint (while stamina is available) |
| Space | Jump |
| F | Toggle flashlight |
| Tab | Open/close inventory |
| E | Interact / pick up |
| 1 | Use a battery while the inventory is open |

## Getting Started

1. Start a simple HTTP server in the project directory (for example, using Python):
   ```bash
   python -m http.server
   ```
2. Open your browser to `http://localhost:8000/`.
3. Click **Start** to lock the pointer and begin exploring the maze.

Collect three keys, manage your flashlight batteries, avoid the enemy, and reach the exit to escape!
