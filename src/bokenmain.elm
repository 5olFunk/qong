module Main exposing (..)

import AnimationFrame
import Html exposing (Html, text, div)
import Html.Attributes exposing (width, height, style)
import Keyboard
import Math.Matrix4 as Mat4 exposing (Mat4)
import Math.Vector2 as Vec2 exposing (Vec2, vec2)
import Math.Vector3 as Vec3 exposing (Vec3, vec3)
import Task exposing (Task)
import Time exposing (Time)
import WebGL exposing (Mesh, Shader, Entity)
import WebGL.Texture as Texture exposing (Texture, Error)
import Window

type alias Model =
  { texture : Maybe Texture
  , keys : Keys
  , size : Window.Size
  , board : Board
  }

type alias Board =
  { players : List String
  , view : Vec3
  }

type Msg
  = TextureLoaded (Result Error Texture)
  | KeyChange Bool Keyboard.KeyCode
  | Animate Time
  | Resize Window.Size

type alias Keys =
  { left : Bool
  , right : Bool
  }

main : Program Never Model Msg
main =
  Html.program
    { init = init
    , view = view
    , subscriptions = subscriptions
    , update = update
    }

init : ( Model, Cmd Msg )
init =
  ( { texture = Nothing
    , keys = Keys False False
    , board = Board [ "ian", "alexa" ] (vec3 0 0 -10)
    , size = Window.Size 0 0
    }
  , Cmd.batch
      [ Task.attempt TextureLoaded (Texture.load "texture/garlic-farm.jpg")
      , Task.perform Resize Window.size
      ]
  )

subscriptions : Model -> Sub Msg
subscriptions _ =
  Sub.batch
    [ AnimationFrame.diffs Animate
    , Keyboard.downs (KeyChange True)
    , Keyboard.ups (KeyChange False)
    , Window.resizes Resize
    ]

update : Msg -> Model -> ( Model, Cmd Msg )
update action model =
  case action of
    TextureLoaded textureResult ->
      ( { model | texture = Result.toMaybe textureResult }, Cmd.none )
    KeyChange on code ->
      ( { model | keys = keyFunc on code model.keys }, Cmd.none )
    Resize size ->
      ( { model | size = size}, Cmd.none )
    Animate dt ->
      ( { model 
          | board = 
              model.board 
                |> move model.keys
        }
      , Cmd.none 
      ) --add animation stuff here

move : Keys -> Board -> Board
move { left, right } board =
    let
        direction a b =
            if a == b then
                0
            else if a then
                1
            else
                -1
    in
        board

view : Model -> Html Msg
view { size, board, texture } =
  div
    [ style
      [ ( "width", toString size.width ++ "px" )
      , ( "height", toString size.height ++ "px" )
      , ( "position", "relative" )
      ]
    ]
    [ WebGL.toHtmlWith
      [ WebGL.depth 1
      ]
      [ width size.width
      , height size.height
      , style [ ( "display", "block" ) ]
      ]
      (texture
         |> Maybe.map (scene size board)
         |> Maybe.withDefault []
      )
    ]

keyFunc : Bool -> Keyboard.KeyCode -> Keys -> Keys
keyFunc on keyCode keys =
  case keyCode of
    37 ->
      { keys | left = on }
    39 ->
      { keys | right = on }
    _ ->
      keys

scene : Window.Size -> Board -> Texture -> List Entity
scene { width, height } board texture =
  let
    perspective =
      Mat4.mul
        (Mat4.makePerspective 45 (toFloat width / toFloat height) 0.01 100)
        (Mat4.makeLookAt board.view (Vec3.add board.view Vec3.k) Vec3.j)
  in
    [ WebGL.entity
        vertexShader
        fragmentShader
        paddle
        { texture = texture
        , perspective = perspective
        }
    ]


-- Mesh

type alias Vertex =
  { position : Vec3
  , coord : Vec2
  }

paddle : Mesh Vertex
paddle =
  [ (0,0), (90,0), (180,0), (270,0), (0,90), (0,-90) ]
    |> List.concatMap rotatedSquare
    |> WebGL.triangles

rotatedSquare : ( Float, Float ) -> List ( Vertex, Vertex, Vertex )
rotatedSquare ( angleXZ, angleYZ ) =
  let
    transformMat =
      Mat4.mul
        (Mat4.makeRotate (degrees angleXZ) Vec3.j)
        (Mat4.makeRotate (degrees angleYZ) Vec3.i)

    transform vertex =
      { vertex
        | position =
            Mat4.transform transformMat vertex.position
      }

    transformTriangle ( a, b, c ) =
      ( transform a, transform b, transform c )
  in
    List.map transformTriangle square


square : List ( Vertex, Vertex, Vertex )
square =
  let
    topLeft =
      Vertex (vec3 -1 1 1) (vec2 0 1)

    topRight =
      Vertex (vec3 1 1 1) (vec2 1 1)

    bottomLeft =
      Vertex (vec3 -1 -1 1) (vec2 0 0)

    bottomRight =
      Vertex (vec3 1 -1 1) (vec2 1 0)
  in
    [ ( topLeft, topRight, bottomLeft )
    , ( bottomLeft, topRight, bottomRight )
    ]

-- Shaders

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
      gl_FragColor = vec4(1.0f, 0.0f, 0.0f, 1.0f);
      //gl_FragColor = texture2D(texture, vcoord);
    }

  |]
