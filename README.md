# webgl

Simulation of an exotic twisty puzzle. The shape is a truncated octahedron with center cuts. It allows turning on 4 different axes at 120 degree angles. 
The shape has a total of 14 sides, 8 hexagonal, and 6 square. 

It is a simpler version of the [Dayan gem IV](https://twistypuzzles.com/cgi-bin/puzzle.cgi?pkey=2811) which includes 3 cuts per axis, which allows the hexgaonal faces to turn. 

## Hot Keys
The hotkeys are designed around the QWERTY keyboard layout. 
The left hand controls the camera, and the right hand twists the puzzle.

The camera uses WASD controls:

`w`: tilt up <br>
`s`: tilt down <br>
`a`: tilt left <br>
`d`: tilt right <br>
`q`: rotate left <br>
`e`: rotate right <br>

Twisting the puzzle is done via HJKL:
There are 4 axes of rotation possible.
`h`: Twist about the first octant 120 degrees <br>
`j`: Twist about the second octant 120 degrees <br>
`k`: Twist about the third octant 120 degrees <br>
`l`: Twist about the fourth octant 120 degrees <br>

Inverse twists are provided for convenience. These are located directly above the previous key row
`y`: Inverse of h <br>
`u`: Inverse of j <br>
`i`: Inverse of k <br>
`o`: Inverse of l <br>


## Future Ideas
- [ ] Use hexagonal cross sections for rotations
- [ ] outlines or gaps between pieces
- [ ] hot key to reset the camera to default orientation
- [ ] lighting
- [ ] less harsh background
- [ ] Upgrade to Webgl2: https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html
- [ ] Use an algebraic representation of puzzle state
- [ ] Solve detection
- [ ] support alternate puzzles
