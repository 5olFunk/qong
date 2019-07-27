module Main exposing (main)

import AnimationFrame
import Debug
import Dict
import Direction exposing (Direction(..))
import Html exposing (Html, text, div, input, button)
import Html.Attributes exposing (width, height, style, id, value)
import Html.Events exposing (onClick, onInput)
import Message exposing (Message(..))
import NewClientResult exposing (NewClientResult(..))
import NewGameResult exposing (NewGameResult(..))
import JoinGameResult exposing (JoinGameResult(..))
import Json.Decode exposing (..)
import Json.Decode.Pipeline exposing (decode, required, optional, hardcoded, resolve)
import Json.Encode as JE
import Task exposing (Task)
import Time exposing (Time)
import Keys exposing (Keys)
import Keyboard
import Model exposing (Model, init)
import Person exposing (Person)
import Player exposing (Player)
import Screen exposing (Screen(..))
import Views exposing (..)
import WebGL exposing (Mesh, Shader, Entity)
import WebGL.Texture as Texture exposing (Texture, Error)
import WebSocket as WebSocket
import Window


main : Program Never Model Message
main =
    Html.program
        { init = init
        , view = view
        , subscriptions = subscriptions
        , update = update
        }


serverUrl : String
serverUrl = "ws://localhost:9160"


subscriptions : Model -> Sub Message
subscriptions _ =
    Sub.batch
        [ AnimationFrame.diffs Animate
        , Keyboard.downs KeyChange
        , Window.resizes Resize
        , WebSocket.listen serverUrl parseServerMessage
        ]

update : Message -> Model -> ( Model, Cmd Message )
update action model =
  case action of
    TextureLoaded textureResult ->
      ( { model | texture = Result.toMaybe textureResult }, Cmd.none )

    KeyChange code ->
      ( model, 
        case code of 
          37 -> MoveMsg model.name Clockwise
                       |> encodeMoveMsg
                       |> Debug.log "Outgoing Message: "
                       |> WebSocket.send serverUrl
          39 -> MoveMsg model.name CounterClockwise
                       |> encodeMoveMsg
                       |> Debug.log "Outgoing Message: "
                       |> WebSocket.send serverUrl
          _ -> Cmd.none
      )

    Resize size ->
      ( { model | size = size }, Cmd.none )

    Animate dt ->
      ( { model
        | person = model.person
        }
      , Cmd.none
      )
    Name name ->
      ( { model | name = name }, Cmd.none )
    GameName gameName ->
      ( { model | gameName = gameName }, Cmd.none )
    NewClientReqMsg name ->
      ( model, name
                 |> encodeNewClientReqMsg
                 |> Debug.log "Outgoing Message: "
                 |> WebSocket.send serverUrl
      )
    NewClientResMsg result -> handleNewClientRes action model
    NewGameReqMsg gameName ->
      ( model, gameName
                 |> encodeNewGameReqMsg
                 |> Debug.log "Outgoing Message: "
                 |> WebSocket.send serverUrl 
      )
    NewGameResMsg result -> handleNewGameRes action model
    JoinGameReqMsg gameName ->
      ( model, gameName
                 |> encodeJoinGameReqMsg
                 |> Debug.log "Outgoing Message: "
                 |> WebSocket.send serverUrl
      )
    JoinGameResMsg result -> handleJoinGameRes action model
    GameStateMsg running players -> handleGameStateMsg action model
    MoveMsg name direction -> ( model, Cmd.none )
    ErrorMsg error -> ( { model | alertMessage = "error occurred: " ++ error }, Cmd.none )
    --_ -> ( { model | alertMessage = "update received some goofy message" }, Cmd.none )


handleNewClientRes : Message -> Model -> ( Model, Cmd Message )
handleNewClientRes msg model =
  case msg of
    NewClientResMsg result ->
      case result of
        CreatedNewClient ->
          ( { model 
                | alertMessage = "received NewClientResMsg" 
                , screen = EnterGameScreen 
            }
          , Cmd.none )
        ClientExistsFailure ->
          ( { model
                | alertMessage = "Client already exists. Please choose another name." 
            }
          , Cmd.none )
    _ -> ( { model 
               | alertMessage = "handleNewClientRes was passed something that is not a NewClientResMsg" 
           }
         , Cmd.none )

handleNewGameRes : Message -> Model -> ( Model, Cmd Message )
handleNewGameRes msg model =
  case msg of
    NewGameResMsg result ->
      case result of
        CreatedNewGame ->
          ( { model
                | alertMessage = "received NewGameResMsg"
                , screen = MainScreen
            }
          , Cmd.none )
        FailedToCreateNewGame ->
          ( { model
                | alertMessage = "A game with that name already exists. Please choose another name or join an existing game."
            }
          , Cmd.none )
    _ -> ( { model
               | alertMessage = "handleNewGameRes was passed something that is not a NewGameResMsg"
           }
         , Cmd.none )

handleJoinGameRes : Message -> Model -> ( Model, Cmd Message )
handleJoinGameRes msg model =
  case msg of
    JoinGameResMsg result ->
      case result of
        JoinedGame ->
          ( { model
                | alertMessage = "received JoinGameResMsg"
                , screen = MainScreen
            }
          , Cmd.none )
        FailedToJoinGame ->
          ( { model
                | alertMessage = "Failed to join that game, please choose another game or create a new one."
            }
          , Cmd.none )
    _ -> ( { model
               | alertMessage = Debug.log "" "handleJoinGameRes was passed something that is not a JoinGameResMsg"
           }
         , Cmd.none )


handleGameStateMsg : Message -> Model -> ( Model, Cmd Message )
handleGameStateMsg msg model =
  case msg of
    GameStateMsg running players ->
      ( { model
            | screen = MainScreen
            , gameRunning = running
            , players = players
        }
      , Cmd.none )

    _ -> ( { model | alertMessage = "handleGameStateMsg was passed something that is not a GameStateMsg." } , Cmd.none )

parseServerMessage : String -> Message
parseServerMessage msg =
  let
    cleanup result = 
      case result of
        Ok (GameStateMsg r ps) -> ErrorMsg msg
        Ok m -> m
        Err e -> ErrorMsg e

  in
    decodeString messageDecoder (Debug.log "Incoming server message: " msg)
      |> cleanup
  

messageDecoder : Decoder Message
messageDecoder =
  let
    toDecoder : String -> Decoder Message
    toDecoder msgType =
      case msgType of
        "NewClientResMsg" ->
          decode NewClientResMsg
            |> required "result" newClientResultDecoder
        
        "NewGameResMsg" ->
          decode NewGameResMsg
            |> required "result" newGameResultDecoder

        "JoinGameResMsg" ->
          decode JoinGameResMsg
            |> required "result" joinGameResultDecoder

        "GameStateMsg" -> 
          decode GameStateMsg
            |> required "running" bool
            |> required "players" (list playerDecoder)

        other -> fail <| "Cannot decode unknown message type " ++ other

  in
    decode toDecoder
      |> required "messageType" string
      |> resolve


playerDecoder : Decoder Player
playerDecoder =
  decode Player
    |> required "name" string
    |> required "score" int
    |> required "position" int


newClientResultDecoder : Decoder NewClientResult
newClientResultDecoder =
  string
    |> andThen (\str ->
      case str of
        "CreatedNewClient" -> succeed CreatedNewClient
        "ClientExistsFailure" -> succeed ClientExistsFailure
        somethingElse -> fail <| "Unknown NewClientResult: " ++ somethingElse
    )


newGameResultDecoder : Decoder NewGameResult
newGameResultDecoder = 
  string 
    |> andThen (\str ->
      case str of
        "CreatedNewGame" -> succeed CreatedNewGame
        "FailedToCreateNewGame" -> succeed FailedToCreateNewGame
        somethingElse -> fail <| "Unknown NewGameResult: " ++ somethingElse
    )

joinGameResultDecoder : Decoder JoinGameResult
joinGameResultDecoder =
  string 
    |> andThen (\str ->
      case str of
        "JoinedGame" -> succeed JoinedGame
        "FailedToJoinGame" -> succeed FailedToJoinGame
        somethingElse -> fail <| "Unknown JoinGameResult: " ++ somethingElse
    )

--
--gameStateMsgDecoder : JD.Decoder Message
--gameStateMsgDecoder = 
--  JD.object3 GameStateMsg
--    (JD.string )
--    ( "running" := JD.bool )
--    ( "players" := JD.list ) 

encodeNewClientReqMsg : String -> String
encodeNewClientReqMsg name = 
  let msg = JE.object [ ("messageType", JE.string "NewClientReqMsg") , ("name", JE.string name) ]
  in JE.encode 2 msg

encodeNewGameReqMsg : String -> String
encodeNewGameReqMsg gameName =
  let msg = JE.object [ ("messageType", JE.string "NewGameReqMsg") , ("gameName", JE.string gameName) ]
  in JE.encode 2 msg  

encodeJoinGameReqMsg : String -> String
encodeJoinGameReqMsg gameName =
  let msg = JE.object [ ("messageType", JE.string "JoinGameReqMsg") , ("gameName", JE.string gameName) ]
  in JE.encode 2 msg

encodeMoveMsg : Message -> String
encodeMoveMsg msg =
  case msg of
    MoveMsg name direction ->
      let jmsg = 
          JE.object [ ("messageType", JE.string "MoveMsg") 
                    , ("name", JE.string name) 
                    , case direction of
                        Clockwise -> ("direction", JE.string "Clockwise")
                        CounterClockwise -> ("direction", JE.string "CounterClockwise")
                    ]
      in JE.encode 2 jmsg
    _ -> ""

