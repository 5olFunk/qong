module Views exposing (..)

import Html exposing (Html, text, div, input, button)
import Html.Attributes exposing (width, height, style, id, value)
import Html.Events exposing (onClick, onInput)
import Math.Matrix4 as Mat4 exposing (Mat4)
import Math.Vector2 as Vec2 exposing (Vec2, vec2)
import Math.Vector3 as Vec3 exposing (Vec3, vec3)
import Meshes exposing (crate)
import Message exposing (Message(..))
import Model exposing (Model)
import Person exposing (Person)
import Screen exposing (Screen(..))
import Shaders exposing (vertexShader, fragmentShader)
import WebGL exposing (Mesh, Shader, Entity)
import WebGL.Texture as Texture exposing (Texture, Error)
import Window


eyeLevel : Float
eyeLevel = 2


view : Model -> Html Message
view model =
  let 
    scene =
      case model.screen of
        UserNameScreen -> userNameView
        EnterGameScreen -> enterGameView
        MainScreen -> mainView
  in
    scene model


userNameView : Model -> Html Message
userNameView model =
  div
    [ 
      style
        [ ( "width", toString model.size.width ++ "px" )
        , ( "height", toString model.size.height ++ "px" )
        , ( "position", "relative" )
        , ( "background-color", "black" )
        , ( "color", "white" )
        , ( "text-align", "center" )
        , ( "vertical-align", "middle" )
        ]
    ]
    [ qongHeader model
    , div
        [ style
            [ ( "width", toString model.size.width ++ "px" )
            , ( "height", toString (model.size.height//5) ++ "px" )
            , ( "font-size", "20px" )
            , ( "line-height", toString (model.size.height//5) ++ "px" )
            ]
        ]
        [
          text "Enter Player Name:"
        ]
    , div
        []
        [
          input 
            [ id "playerName"
            , onInput Name
            ]
            []
        ]
    , div
        [ style
            [ ( "width", toString model.size.width ++ "px" )
            , ( "height", toString (model.size.height//7) ++ "px" )
            , ( "font-size", "15px" )
            , ( "line-height", toString (model.size.height//7) ++ "px" )
            ]
        ]
        [
          button 
            --[ style 
            --   [ ( "margin", "4px 2px" ) 
            --   , ( "text-align", "center" )
            --   ]
            [ onClick (NewClientReqMsg model.name) ]
            [ text "go" ]
        ]
    ]
        

enterGameView : Model -> Html Message
enterGameView model =
  div
    [ 
      style
        [ ( "width", toString model.size.width ++ "px" )
        , ( "height", toString model.size.height ++ "px" )
        , ( "position", "relative" )
        , ( "background-color", "black" )
        , ( "color", "white" )
        , ( "text-align", "center" )
        , ( "vertical-align", "middle" )
        ]
    ]
    [ qongHeader model
    , div
        []
        [
          input 
            [ id "playerName"
            , onInput GameName
            ]
            []
        ]
    , div 
        [ ]
        [ 
          button
            [ onClick (NewGameReqMsg model.gameName) ]
            [ text "start new game" ]
        , button
            [ onClick (JoinGameReqMsg model.gameName) ]
            [ text "join existing game" ]
        ]
    ]


qongHeader : Model -> Html Message
qongHeader model = 
  div
    [ style
        [ ( "width", toString model.size.width ++ "px" )
        , ( "height", toString (model.size.height//3) ++ "px" )
        , ( "font-size", "80px" )
        , ( "line-height", toString (model.size.height//3) ++ "px" )
        ]
    ]
    [ 
      text "Qong" 
    ]  

mainView : Model -> Html Message
mainView model = 
  div
    [ style
        [ ("width", toString model.size.width ++ "px")
        , ("height", toString model.size.height ++ "px")
        , ("position", "relative")
        , ("background", "blue")
        ]
    ]
    [ 
      WebGL.toHtmlWith
        [ WebGL.depth 1
        ]
        [ width model.size.width
        , height model.size.height
        , style [ ( "display", "block" ) ]
        ]
        (model.texture
           |> Maybe.map (scene model.size model.person)
           |> Maybe.withDefault []
        ) 
    ]


scene : Window.Size -> Person -> Texture -> List Entity
scene { width, height } person texture =
    let
        perspective =
            Mat4.mul
                (Mat4.makePerspective 45 (toFloat width / toFloat height) 0.01 100)
                (Mat4.makeLookAt person.position (Vec3.add person.position Vec3.k) Vec3.j)
    in
        [ WebGL.entity
            vertexShader
            fragmentShader
            crate
            { texture = texture
            , perspective = perspective
            }
        ]



-- Shaders



physics : Float -> Person -> Person
physics dt person =
    let
        position =
            Vec3.add person.position (Vec3.scale dt person.velocity)
    in
        { person
            | position =
                if Vec3.getY position < eyeLevel then
                    Vec3.setY eyeLevel position
                else
                    position
        }



