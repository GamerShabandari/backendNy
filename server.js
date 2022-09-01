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



const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let roomArray = [];

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
        io.in(roomToJoin).emit("history", room.fields)
        console.log("du joinar tidigare rum: " + roomToJoin);
        return
      }
    }

    let newRoom = {
      roomName: roomToJoin,
      users: [nickname],
      facit: facitArray,
      fields: fieldsStartArray,
      colors: colorsArray
    }
    roomArray.push(newRoom)
    socket.join(roomToJoin);
    console.log("du joinar nytt rum: " + roomToJoin);

  });

  socket.on("getMyRoom", function (roomToGet) {
    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];
      if (room.roomName === roomToGet) {
        console.log("du ville ha all info från rum: " + room.roomName);
        io.emit("hereIsYourRoom", room);
        return
      }
    }
  });


  socket.on("disconnect", function () {
    console.log("user disconnected");
  });


  socket.on("color", function (msg) {
    for (let i = 0; i < colorsArray.length; i++) {
      const color = colorsArray[i];

      if (color.color === msg) {
        colorsArray.splice(i, 1);

        io.emit("updateColors", colorsArray);
        return;
      }
    }
  });

  socket.on("colorChange", function (msg) {
    console.log(msg);
    colorsArray.push({ color: msg });
    io.emit("updateColors", colorsArray);
    console.log(colorsArray);

    return;
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
    //io.emit("chatting", room, user, message);
    //testArray.push({room: room, nickname: user, text: message});
    let newMsg = { nickname: user, text: message }
    // console.log(testArray);

    io.in(room).emit("chatting", newMsg)
    return;
  });


});

server.listen(port, () => {
  console.log("listens to port " + port);
});

module.exports = { app, io };
