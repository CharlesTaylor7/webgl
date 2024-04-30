# webgl

Simulation of an exotic twisty puzzle. The shape is a truncated octahedron with center cuts. It allows turning on 4 different axes at 120 degree angles. 
The shape has a total of 14 sides, 8 hexagonal, and 6 square. 

It is a simpler version of the [Dayan gem IV](https://twistypuzzles.com/cgi-bin/puzzle.cgi?pkey=2811) which includes 3 cuts per axis, which allows the hexgaonal faces to turn. 


# TODO

## Port to Rust + WASM
The plan is to keep the webgl api calls in JS, but use rust -> wasm to handle vertex positions.
The goal is to generate correct piece geometries.
Optimizing render latency will be followup work.
We're gonna port everything to wasm. Passing datastructures between js and wasm, is confusing to setup and is pure overhead.

- [x] Static triangle
- [ ] 3d object like a cube
- [ ] camera
- [ ] puzzle actions
- [ ] puzzle action animation
- [ ] action buffer


## Old todo list
- [x] rotate camera with keyboard controls
- [x] animate camera
- [x] hold keys to rotate camera instead of buffered actions
- [x] Tag pieces with their axis of rotation
- [x] fix colors
- [x] draw half the puzzle
- [x] draw arrays in two passes
- [x] animate
- [x] rotate camera and puzzle at independent speeds
- [x] Remove type safe builder pattern
- [x] permute positons instead of colors
- [x] filter pieces based on their type and normal axis
- [x] rotate any octant
- [x] Temporiality disable animation
- [x] reimplement rotation animation
- [ ] double check normals by deriving piece geometry from normals
- [ ] reimplement action buffer
- [ ] implement inverse rotations
- [ ] Restore hexagonal cross sections for rotations
- [ ] outlines or gaps between pieces
- [ ] hot key to reset the camera to default orientation
- [ ] lighting
- [ ] less harsh background
- [ ] Upgrade to Webgl2: https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html

