Create a first-person 3D maze escape game with the following mechanics:

Player Controls

W / A / S / D → Move

Shift → Sprint (only while stamina > 0)

Space → Jump

F → Toggle Flashlight (on/off)

TAB → Open/Close Inventory

E → Interact (pick up items, open doors, etc.)

Core Gameplay Systems

Stamina System

Player has a stamina bar that decreases while sprinting.

When stamina reaches zero, the player is forced to walk.

Stamina regenerates slowly when not sprinting.

Flashlight System

The flashlight requires battery energy.

Battery level slowly drains when the flashlight is on.

Batteries are scattered around the maze and can be collected using E.

Battery items are stored in the inventory, and the player can use one to refill the flashlight.

Inventory System

Inventory opens with TAB.

Players can collect:

Batteries (to recharge flashlight)

Keys (to unlock locked doors or gates inside the maze)

Notes (optional items providing hints or codes)

Items appear in simple inventory slots. No stacking needed unless you want to allow it.

Maze Progression

The maze contains locked sections that require keys to progress.

Keys are placed in hard-to-reach or hidden areas.

The goal is to find the final exit door and escape.

Progression is based on finding the correct keys and pathways through the maze.

Threat System (Chase Enemy)

A single roaming enemy patrols the maze.

If the enemy sees the player, it begins to chase.

The player can break line of sight to escape (turn corners, hide behind objects).

If caught, the player loses and restarts or reloads (your choice).

Enemy Behavior Rules

It moves through the maze using a pathfinding system.

It emits footstep sounds when close.

The enemy reacts to:

Noise from sprinting (greater detection radius)

Flashlight beam if pointed directly at it

Win Condition

Reach the exit door located in the deepest section of the maze.

Door requires:

2–4 keys (your choice how many)
