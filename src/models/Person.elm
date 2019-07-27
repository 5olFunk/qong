module Person exposing (Person)

import Math.Vector3 as Vec3 exposing (Vec3, vec3)

type alias Person =
  { position : Vec3
  , velocity : Vec3
  }
