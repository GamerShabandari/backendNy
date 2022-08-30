const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const server = require("http").createServer(app);
const port = process.env.PORT || 3001;
const socketIo = require("socket.io");
const picturesArray = require("./assets/fields.json");
let colorsArray = require("./assets/colorPicker.json");
const { log } = require("console");


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
  io.emit("history", picturesArray);
  io.emit("colors", colorsArray);
  if (roomArray.length > 0) {
    io.emit("availableRooms", roomArray);
  }
  


  socket.on("joinNewRoom", (roomToJoin, nickname) => {

    console.log(nickname);
    let newRoom = {
      roomName : roomToJoin,
      users : [nickname]
    }
    roomArray.push(newRoom)
    socket.join(roomToJoin);

  });

  socket.on("joinAvailableRoom", (roomToJoin, nickname) => {


    for (let i = 0; i < roomArray.length; i++) {
      const room = roomArray[i];

      if (room.roomName == roomToJoin) {
        room.users.push(nickname)
        console.log(room);
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

  socket.on("drawing", function (msg) {
    for (let i = 0; i < picturesArray.length; i++) {
      const pixel = picturesArray[i];

      if (pixel.position == msg.position) {
        pixel.color = msg.color;
      }

      io.emit("drawing", msg);
    }
  });
});

server.listen(port, () => {
  console.log("listens to port " + port);
});

module.exports = { app, io };
