use crate::permutation::{PermArray, PermHashMap};

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
struct SquareFacet(Square);

// all possible facets for center cuts only puzzle.
enum Facet {
  Square(SquareFacet),
  Triangle(TriangleFacet),
  Edge(EdgeFacet),
}

//fn puzzle()
struct Puzzle {
  edges: Vec<EdgeFacet>,
  squares: Vec<SquareFacet>,
  triangles: Vec<TriangleFacet>,
  edge_permutation: PermArray<24>,
  square_permutation: PermArray<6>,
  triangle_permutation: PermArray<8>,
}

impl Puzzle {
  fn new() -> Self {
    Self {
      edges: vec![],
      squares: vec![],
      triangles: vec![],
      edge_permutation: PermArray::identity(),
      square_permutation: PermArray::identity(),
      triangle_permutation: PermArray::identity(),
    }
  }
}

/*
fn facets() -> Vec<Facet> {
  triangle_facets()
    .map(|t| Facet::Triangle(facet))
    .concat(square_facets())
    .concat(edge_facets())
}
*/

fn square_facets() -> Vec<SquareFacet> {
  vec![
    SquareFacet(Square::White),
    SquareFacet(Square::Yellow),
    SquareFacet(Square::Blue),
    SquareFacet(Square::Green),
    SquareFacet(Square::Yellow),
    SquareFacet(Square::Red),
    SquareFacet(Square::Orange),
  ]
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
