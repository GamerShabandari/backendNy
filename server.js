const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const port = process.env.PORT || 3001;
const socketIo = require("socket.io");
const picturesArray = require("./assets/fields.json");
let colorsArray = require("./assets/colorPicker.json");
let facitArray = require("./assets/facit.json");



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

  socket.on("joinNewRoom", (roomToJoin, nickname) => {

    let newRoom = {
      roomName: roomToJoin,
      users: [nickname],
      facit: [],
      fields: [],
      colors: []
    }
    roomArray.push(newRoom)
    socket.join(roomToJoin);

  });

  socket.on("joinAvailableRoom", (roomToJoin, nickname) => {

    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName == roomToJoin) {
        room.users.push(nickname)
        socket.join(roomToJoin);
        console.log(room);

        io.in(roomToJoin).emit("history", room.fields)
        return
      }

    }
  });

  socket.on("getMyRoom", function (roomToGet) {
    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];
      if (room.roomName === roomToGet) {

        room.fields = picturesArray;
        console.log("picturesarray", picturesArray);
        room.facit = facitArray;
        room.colors = colorsArray;
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

  socket.on("drawing", function (field, roomX) {

    for (let i = 0; i < roomArray.length; i++) {

      if (roomArray[i].roomName === roomX) {

        let thisRoom = roomArray[i]

        for (let i = 0; i < thisRoom.fields.length; i++) {
          const pixel = thisRoom.fields[i];

          if (pixel.position == field.position) {
            pixel.color = field.color;

          //  io.emit("drawing", pixel);
            io.in(roomX).emit("drawing", pixel)
           // console.log(field);
            return
          }
        }
      }
    }
  });


  //let testArray = [];

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
