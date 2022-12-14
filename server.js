const express = require("express");
const bodyParser = require("body-parser");
const app = express();

const cors = require("cors");
var logger = require('morgan');
const server = require("http").createServer(app);
app.use(logger('dev'));
const port = process.env.PORT || 3001;
const socketIo = require("socket.io");
let colorsArray = require("./assets/colorPicker.json");
let savedDrawingsArray = require('./assets/savedDrawings.json');

const fs = require('fs');
const { Timer } = require('timer-node');

const io = socketIo(server, {
  cors: {
    origin: "https://grid-painter-front.herokuapp.com/",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let roomArray = [];

function getFields() {
  const data = JSON.parse(fs.readFileSync('./assets/fields.json', 'utf8'))
  return (data);
};

function getFacit() {
  let numberFacit = Math.floor(Math.random() * (1 + 5 - 1)) + 1;
  const data = JSON.parse(fs.readFileSync('./assets/facit' + numberFacit + '.json', 'utf8'))
  return (data);
};

app.use(cors());
app.use(bodyParser.json());

io.on("connection", function (socket) {
  console.log("a user connected");
  if (roomArray.length > 0) {
    io.emit("availableRooms", roomArray);
  }

  if (savedDrawingsArray.length > 0) {
    io.emit("savedDrawings", savedDrawingsArray);
  }

  socket.on("join", (roomToJoin, nickname) => {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];
      if (roomToJoin == room.roomName) {

        if (room.roomIsFull === false && room.gameOver === false) {
          room.users.push(nickname)
          socket.join(roomToJoin);
          socket.id = nickname;
          socket.room = room;
          io.in(roomToJoin).emit("history", room.fields)

          if (room.users.length == 8) {
            room.roomIsFull = true;
          }
          return
        } else {
          io.emit("fullRoom", roomToJoin, nickname.nickname)
          return
        }

      }
    }

    const roomTimerLabel = new Timer({ label: roomToJoin + '-timer' })
    roomTimerLabel.start();

    let newRoom = {
      roomName: roomToJoin,
      users: [nickname],
      facit: getFacit(),
      fields: getFields(),
      colors: [...colorsArray],
      roomIsFull: false,
      gameOver: false,
      time: roomTimerLabel
    }
    roomArray.push(newRoom)
    socket.join(roomToJoin);
    socket.id = nickname;
    socket.room = newRoom;

  });

  socket.on("getMyRoom", function (roomToGet) {
    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];
      if (room.roomName === roomToGet) {
        io.in(roomToGet).emit("hereIsYourRoom", room)
        return
      }
    }
  });

  socket.on("color", function (colorFromRoom, fromRoom) {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName === fromRoom) {

        for (let i = 0; i < room.colors.length; i++) {
          const color = room.colors[i];

          if (color.color === colorFromRoom) {
            room.colors.splice(i, 1);

            io.in(fromRoom).emit("updateColors", room.colors)
            return;
          }
        }
      }
    }
  });

  socket.on("colorChange", function (colorToChange, fromRoom) {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName === fromRoom) {

        room.colors.push({ color: colorToChange });
        io.in(fromRoom).emit("updateColors", room.colors)
        return;
      }
    }

  });

  socket.on("draw", function (fieldToDraw, roomToDraw) {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName == roomToDraw) {

        for (let i = 0; i < room.fields.length; i++) {
          const pixel = room.fields[i];

          if (pixel.position === fieldToDraw.position) {
            pixel.color = fieldToDraw.color;
            io.in(roomToDraw).emit("drawing", fieldToDraw)
            return

          }
        }
      }
    }
  });

  socket.on("chatt", function (room, user, message) {
    let newMsg = { nickname: user, text: message }
    io.in(room).emit("chatting", newMsg)
    return;
  });

  socket.on("saveThisDrawing", function (drawingToSave, roomThatSaved, results, timeH, timeM, timeS) {

    let time = timeH + ":" + timeM + ":" + timeS

    let newDrawing = {
      name: roomThatSaved,
      imageField: drawingToSave,
      timeTaken: time,
      result: results
    }

    let newArrayToSave = [...savedDrawingsArray, newDrawing]
    newArrayToSaveSerialized = JSON.stringify(newArrayToSave)
    
    fs.writeFile('./assets/savedDrawings.json', newArrayToSaveSerialized, 'utf8', function(err){
      if (err) {
        console.log(err);
      }
    });
    io.in(roomThatSaved).emit("drawingSaved")
    return;
  });


  socket.on("timeToCheckFacit", function (roomToCheck, userWhosDone) {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName == roomToCheck) {

        for (let i = 0; i < room.users.length; i++) {
          const userX = room.users[i];
          if (userX.nickname === userWhosDone) {
            userX.isDone = true;
          }
        }
        for (let i = 0; i < room.users.length; i++) {
          const thisUser = room.users[i];

          if (thisUser.isDone === false) {
            io.in(roomToCheck).emit("waitingForEveryOne", room.users)
            return
          }

        }

        io.in(roomToCheck).emit("waitingForEveryOne", room.users)

        let count = [0, 0];
        for (let i in room.facit) {
          count[1]++; // total count
          if (room.fields[i].color === room.facit[i].color) {
            if (room.fields[i].color === "white" && room.facit[i].color === "white") {
              count[1]--;
            } else {
              count[0]++;
            } // match count
          }
        }
        room.gameOver = true;
        let percentage = (count[0] / count[1]) * 100;
        Number(percentage)
        percentage = Math.round(percentage)
        room.time.stop();
        let roomTime = room.time.time()
        io.in(roomToCheck).emit("gameOver", percentage, roomTime)
        return;

      }
    }
  });


  socket.on("disconnect", function () {

    for (let e = 0; e < roomArray.length; e++) {
      const room = roomArray[e];
      if (room === socket.room) {
        for (let i = 0; i < room.users.length; i++) {
          const user = room.users[i];
          if (user === socket.id) {
            room.users.splice(i, 1);
            io.in(room.roomName).emit("usersUpdate", room.users)
            if (room.users.length === 0) {
              roomArray.splice(e, 1);

            }
            io.emit("availableRooms", roomArray);
            return;
          }
        }
      }
    }


  });

});

server.listen(port, () => {
  console.log("listens to port " + port);
});

module.exports = { app, io };