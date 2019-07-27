module Shaders exposing (vertexShader, fragmentShader)

import Math.Matrix4 as Mat4 exposing (Mat4)
import Math.Vector2 as Vec2 exposing (Vec2, vec2)
import Math.Vector3 as Vec3 exposing (Vec3, vec3)
import Vertex exposing (Vertex)
import WebGL.Texture as Texture exposing (Texture, Error)
import WebGL exposing (Shader)


type alias Uniforms =
    { texture : Texture
    , perspective : Mat4
    }


vertexShader : Shader Vertex Uniforms { vcoord : Vec2 }
vertexShader =
    [glsl|

        attribute vec3 position;
        attribute vec2 coord;
        uniform mat4 perspective;
        varying vec2 vcoord;

        void main () {
          gl_Position = perspective * vec4(position, 1.0);
          vcoord = coord;
        }

    |]
    

fragmentShader : Shader {} Uniforms { vcoord : Vec2 }
fragmentShader =
    [glsl|

        precision mediump float;
        uniform sampler2D texture;
        varying vec2 vcoord;

        void main () {
          gl_FragColor = vec4( 0.5, 0.5, 0.5, 1.0 );
          //gl_FragColor = texture2D(texture, vcoord);
        }

    |]


