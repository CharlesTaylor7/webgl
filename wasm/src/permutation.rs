use std::collections::HashMap;

#[derive(Clone)]
pub struct PermHashMap(HashMap<u8, u8>);

impl PermHashMap {
  pub fn identity() -> Self {
    Self(HashMap::default())
  }

  pub fn invert(&self) -> Self {
    Self(self.0.iter().map(|(k, v)| (*v, *k)).collect())
  }

  pub fn compose(p: &Self, q: &Self) -> Self {
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
  }

  pub fn permute(&self, k: u8) -> u8 {
    self.0.get(&k).map_or(k, |v| *v)
  }
}

#[derive(Clone)]
pub struct PermArray<const N: u8>([u8; N as usize])
where
  [u8; N as usize]: Sized;
//Assert<{ N as usize < 256 }>: IsTrue;
impl<const N: u8> PermArray<N>
where
  [u8; N as usize]: Sized, //Assert<{ N as usize < 256 }>: IsTrue;
{
  pub fn identity() -> Self {
    let mut array = [0; N as usize];
    for i in 1_u8..N {
      array[i as usize] = i;
    }
    Self(array)
  }

  pub fn invert(&self) -> Self {
    let mut array = [0; N as usize];
    for (k, v) in self.0.iter().enumerate() {
      array[*v as usize] = k as u8;
    }
    Self(array)
  }

  pub fn compose(p: &Self, q: &Self) -> Self {
    todo!()
    /*
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
    */
    //Self::identity()
  }

  fn permute(&self, k: u8) -> u8 {
    self.0[k as usize]
  }
}

// For const assertions
pub enum Assert<const CHECK: bool> {}
pub trait IsTrue {}
impl IsTrue for Assert<true> {}
