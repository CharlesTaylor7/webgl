use std::collections::HashMap;

#[derive(Clone)]
pub struct Permutation(HashMap<u8, u8>);

impl Permutation {
  fn identity() -> Self {
    Permutation(HashMap::default())
  }

  fn invert(&self) -> Self {
    Permutation(self.0.iter().map(|(k, v)| (*v, *k)).collect())
  }

  fn compose(p: &Self, q: &Self) -> Self {
    let (mut p, q) = p
      .0
      .iter()
      .fold((p.clone(), q.clone()), |(mut p, mut q), (k, v)| {
        let qv = q.permute(*v);
        if *k == qv {
          p.0.remove(k);
        } else {
          p.0.insert(*k, qv);
        }
        q.0.remove(v);
        (p, q)
      });
    for (key, value) in q.0 {
      p.0.insert(key, value);
    }
    p
    //Self::identity()
  }

  fn permute(&self, k: u8) -> u8 {
    self.0.get(&k).map_or(k, |v| *v)
  }
}
