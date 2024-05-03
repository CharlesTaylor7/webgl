enum Hex {
  White,
  Pink,
  Red,
  Blue,
  Yellow,
  Silver,
  Orange,
  Green,
}

enum Square {
  White,
  Yellow,
  Blue,
  Green,
  Red,
  Orange,
}

struct TriangleFacet(Hex);
struct EdgeFacet(Square, Hex);

struct PerspectiveShift {
  hexes: Vec<Hex>,
  squares: Vec<Square>,
}

struct Rotation {
  hexes: Vec<Hex>,
  squares: Vec<Square>,
}

fn triangle_facets() -> Vec<TriangleFacet> {
  vec![
    TriangleFacet(Hex::White),
    TriangleFacet(Hex::Pink),
    TriangleFacet(Hex::Red),
    TriangleFacet(Hex::Blue),
    TriangleFacet(Hex::Yellow),
    TriangleFacet(Hex::Silver),
    TriangleFacet(Hex::Orange),
    TriangleFacet(Hex::Green),
  ]
}

fn edge_facets() -> Vec<EdgeFacet> {
  vec![
    EdgeFacet(Square::Blue, Hex::White),
    EdgeFacet(Square::Blue, Hex::Orange),
    EdgeFacet(Square::Blue, Hex::Pink),
    EdgeFacet(Square::Blue, Hex::Green),
    //
    EdgeFacet(Square::Yellow, Hex::White),
    EdgeFacet(Square::Yellow, Hex::Silver),
    EdgeFacet(Square::Yellow, Hex::Blue),
    EdgeFacet(Square::Yellow, Hex::Orange),
    //
    EdgeFacet(Square::Orange, Hex::White),
    EdgeFacet(Square::Orange, Hex::Green),
    EdgeFacet(Square::Orange, Hex::Red),
    EdgeFacet(Square::Orange, Hex::Silver),
    //
    EdgeFacet(Square::Green, Hex::Yellow),
    EdgeFacet(Square::Green, Hex::Blue),
    EdgeFacet(Square::Green, Hex::Silver),
    EdgeFacet(Square::Green, Hex::Red),
    //
    EdgeFacet(Square::Red, Hex::Yellow),
    EdgeFacet(Square::Red, Hex::Pink),
    EdgeFacet(Square::Red, Hex::Orange),
    EdgeFacet(Square::Red, Hex::Blue),
    //
    EdgeFacet(Square::White, Hex::Yellow),
    EdgeFacet(Square::White, Hex::Red),
    EdgeFacet(Square::White, Hex::Green),
    EdgeFacet(Square::White, Hex::Pink),
  ]
}
