const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const port = process.env.PORT || 3001;
const socketIo = require("socket.io");
let colorsArray = require("./assets/colorPicker.json");
let facitArray = require("./assets/facit.json");
let fieldsStartArray = require("./assets/fields.json");
const fs = require('fs');
const { Timer } = require('timer-node');


const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let roomArray = [];

function getFields() {
  const data = JSON.parse(fs.readFileSync('./assets/fields.json', 'utf8'))
  return (data);
};

app.use(cors());
app.use(bodyParser.json());

io.on("connection", function (socket) {
  console.log("a user connected");
  if (roomArray.length > 0) {
    io.emit("availableRooms", roomArray);
  }

  socket.on("join", (roomToJoin, nickname) => {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];
      if (roomToJoin == room.roomName) {

        if (room.roomIsFull === false && room.gameOver === false) {
          room.users.push(nickname)
          socket.join(roomToJoin);
          io.in(roomToJoin).emit("history", room.fields)

          if (room.users.length == 4) {
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
      facit: facitArray,
      fields: getFields(),
      colors: [...colorsArray],
      roomIsFull: false,
      gameOver: false,
      time: roomTimerLabel
    }
    roomArray.push(newRoom)
    socket.join(roomToJoin);
    console.log(newRoom);

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
            console.log(fieldsStartArray);
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

  socket.on("timeToCheckFacit", function (roomToCheck) {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName == roomToCheck) {

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
        let percentage = (count[0] / count[1]) * 100 + "%";
        room.time.stop();
        let roomTime = room.time.time()
        io.in(roomToCheck).emit("gameOver", percentage, roomTime)




        console.log(room.time.time());

        //console.log(room.time);

        return;

      }
    }
  });


  socket.on("disconnect", function () {
    console.log("user disconnected");
  });

});

server.listen(port, () => {
  console.log("listens to port " + port);
});

module.exports = { app, io };
