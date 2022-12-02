const express = require("express");
const path = require("path");
const http = require("http");
const app = express();
const webServer = http.createServer(app);
// WebSockets
const webSocketServer = require("ws").Server;
const ws = new webSocketServer({
  server: webServer,
});
//run the websocket webserver
webServer.listen(80, function listening() {
  console.log("Listening on %d", webServer.address().port);
});
//name variables
let throttledUsers, cloudflare, rooms;
cloudflare = false;
throttledUsers = new Set();
throttledUsers2 = new Set();
rooms = [0];

const clients = new Map();

app.use(express.static(path.join(__dirname, "public")));

process.on("uncaughtException", function (err) {
  console.log("UNCAUGHT EXCEPTION\n" + err);
});

ws.on("connection", function connection(ws, req) {
  let id = makeid();
  let realIP;
  cloudflare
    ? (realIP = req.headers["cf-connecting-ip"])
    : (realIP = req.connection.remoteAddress);
  let roomID = 0;
  if (!clients.has(id)) {
    clients.set(id, {
      socket: ws,
      id: id,
      roomID: roomID,
      avatar: "",
    });
  } else {
    //client exists already, replace it
    clients.delete(id);
    clients.set(id, {
      socket: ws,
      id: id,
      roomID: roomID,
      avatar: "",
    });
  }

  wsBroadcastRoom(
    JSON.stringify({
      command: "displayUser",
      argument: id,
      url: clients.get(id).avatar,
    }),
    roomID
  );

  ws.on("close", function () {
    clients.delete(id);
    wsBroadcastRoom(
      JSON.stringify({
        command: "removeUser",
        argument: id
      }),
      roomID
    );
  });

  ws.on("message", function incoming(message) {
    if (ws.readyState !== 1) return;
    for (let i = 0; i < message.length; i++) {
      if (message[i].match(`/[^\x00-\x7F]/g`)) return;
    }
    if (ws.readyState !== 1 || !id) return;
    let msg = message.split(",");

    if (msg[0] === "getID") {
      if (msg[0] in cmd) {
        let funct = cmd[msg[0]];
        funct();
      }
    }

    if (msg[0] === "submitMessage") {
      let post;
      let postArr = [];
      let roomID = msg[1];
      for (let i = 0; i < msg.length; i++) {
        if (i > 1) {
          postArr.push(msg[i]);
        }
      }
      post = postArr.join();
      if (post.length > 250) return;
      if (msg[0] in cmd && post.length > 0) {
        let funct = cmd[msg[0]];
        funct(roomID, post, realIP);
      }
    }

    if (msg[0] === "setRemoteAvatar") {
      let url;
      url = msg[1];
      if (msg[0] in cmd) {
        let funct = cmd[msg[0]];
        funct(url);
      }
    }

    if (msg[0] === "getUsers") {
      let roomID;
      roomID = msg[1];
      if (msg[0] in cmd) {
        let funct = cmd[msg[0]];
        funct(roomID);
      }
    }
  });
  // Server commands go here
  const cmd = {
    getUsers: (roomID) => {
      clients.get(id).roomID = roomID;
      let eachClient = [];
      clients.forEach(function (c) {
        eachClient.push({
          id: c.id,
          avatar: c.avatar,
          roomID: c.roomID,
        });
      });
      ws.send(
        JSON.stringify({
          command: "displayUsers",
          argument: eachClient,
        })
      );
    },
    getID: () => {
      ws.send(
        JSON.stringify({
          command: "setID",
          argument: id,
        })
      );
    },
    setRemoteAvatar: (url) => {
      clients.get(id).avatar = url;
        wsBroadcastRoom(
          JSON.stringify({
            command: "updateRemoteAvatar",
            argument: id,
            url: url,
          }),
          roomID
        );
    },
    submitMessage: (roomID, post, realIP) => {
      clients.get(id).roomID = roomID;
      if (!post) return;
      if (throttledUsers.has(realIP)) return;
      throttledUsers.add(realIP);
      clearThrottles(realIP);
      if (post.length > 250) return;
      if (post) {
        wsBroadcastRoom(
          JSON.stringify({
            command: "displayMessage",
            argument: post,
            id: id,
          }),
          roomID
        );
      }
    },
  };
});

let wsBroadcastRoom = function (data, roomID) {
  clients.forEach(function (client) {
    if (client.socket.readyState !== 1) return;
    if (client.roomID == roomID) client.socket.send(data);
  });
};

let clearThrottles = (IP) => {
  setTimeout(function () {
    throttledUsers.delete(IP);
  }, 1000);
};

let makeid = () => {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 16; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};
