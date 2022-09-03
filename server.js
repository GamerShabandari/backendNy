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
  //console.log(data);
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
        room.users.push(nickname)
        socket.join(roomToJoin);
        //console.log(room);
        io.in(roomToJoin).emit("history", room.fields)
        console.log("du joinar tidigare rum: " + roomToJoin);
        return
      }
    }

    let newRoom = {
      roomName: roomToJoin,
      users: [nickname],
      facit: facitArray,
      fields: getFields(),
     // fields: [...fieldsStartArray],
      colors: [...colorsArray]
    }
    roomArray.push(newRoom)
    socket.join(roomToJoin);
    console.log("du joinar nytt rum: " + roomToJoin);
    //console.log(newRoom);
  });

  socket.on("getMyRoom", function (roomToGet) {
    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];
      if (room.roomName === roomToGet) {
        console.log("du ville ha all info från rum: " + room.roomName);
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

  socket.on("disconnect", function () {
    console.log("user disconnected");
  });

});

server.listen(port, () => {
  console.log("listens to port " + port);
});

module.exports = { app, io };
