module Model exposing (Model, init)

import Keyboard
import Math.Vector3 as Vec3 exposing (Vec3, vec3)
import Keys exposing (Keys)
import Message exposing (Message(..))
import Person exposing (Person)
import Player exposing (Player)
import Screen exposing (Screen(..))
import Task exposing (Task)
import WebGL.Texture as Texture exposing (Texture)
import Window

type alias Model =
  { screen : Screen
  , texture : Maybe Texture
  , keys : Keys
  , size : Window.Size
  , person : Person
  , name : String
  , gameName : String
  , alertMessage : String
  , gameRunning : Bool
  , players : List Player
  }

eyeLevel : Float
eyeLevel = 2

serverUrl : String
serverUrl = "ws://localhost:9160"

init : ( Model, Cmd Message )
init =
    ( { screen = UserNameScreen
      , texture = Nothing
      , person = Person (vec3 0 eyeLevel -10) (vec3 0 0 0)
      , keys = Keys False False 
      , size = Window.Size 0 0
      , name = ""
      , gameName = ""
      , alertMessage = "Alerts go here..."
      , gameRunning = False
      , players = []
      }
    , Cmd.batch
        [ Task.attempt TextureLoaded (Texture.load "textures/fivetwelve.jpg")
        , Task.perform Resize Window.size
        ]
    )


