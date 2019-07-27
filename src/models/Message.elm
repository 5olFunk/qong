module Message exposing (Message(..))

import Direction exposing (Direction(..))
import JoinGameResult exposing (JoinGameResult)
import Keyboard
import NewGameResult exposing (NewGameResult)
import NewClientResult exposing (NewClientResult)
import Player exposing (Player)
import Time exposing (Time)
import WebGL.Texture as Texture exposing (Texture, Error)
import Window

type Message
  = TextureLoaded (Result Error Texture)
  | KeyChange Keyboard.KeyCode
  | Animate Time
  | Resize Window.Size
  | Name String
  | GameName String
  | NewClientReqMsg String
  | NewClientResMsg NewClientResult
  | NewGameReqMsg String
  | NewGameResMsg NewGameResult
  | JoinGameReqMsg String
  | JoinGameResMsg JoinGameResult
  | GameStateMsg Bool (List Player)
  | MoveMsg String Direction
  | ErrorMsg String
