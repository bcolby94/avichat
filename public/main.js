let uid;
let avatar = "";
let roomID = 0;

const cmd = {
  getUsers: (roomID) => {
    socket.send([`getUsers`, roomID]);
  },
  displayUsers: (users) => {
    document.getElementById("avatars").innerHTML = "";
    for (i = 0; i < users.length; i++) {
      const div = document.createElement("div");
      const node = document.createElement("img");
      div.style.position = "fixed";
      node.src = users[i].avatar;
      node.width = 128;
      node.height = 100;
      div.id = users[i].id;
      div.appendChild(node);
      div.style.marginTop = randomInt(window.innerHeight / 4, window.innerHeight - 200) + "px";
      div.style.marginLeft = randomInt(window.innerWidth / 4, window.innerWidth - 250) + "px";
      document.getElementById("avatars").appendChild(div);
    }
  },
  displayUser: (id, avatar) => {
    const div = document.createElement("div");
    const node = document.createElement("img");
    div.style.position = "fixed";
    node.src = avatar;
    node.width = 128;
    node.height = 100;
    div.id = id;
    div.appendChild(node);
    div.style.marginTop = randomInt(window.innerHeight / 4, window.innerHeight - 200) + "px";
    div.style.marginLeft = randomInt(window.innerWidth / 4, window.innerWidth - 250) + "px";
    document.getElementById("avatars").appendChild(div);
  },
  setRemoteAvatar: (url) => {
    if (socket.readyState !== 1)
      alert("Socket not connected. Please try again.");
    socket.send(["setRemoteAvatar", url]);
  },
  updateRemoteAvatar: (id, url) => {
      document.getElementById(id).innerHTML = "";
      const node = document.createElement("img");
      node.src = url;
      node.width = 128;
      node.height = 100;
      document.getElementById(id).appendChild(node);
  },
  removeUser: (id) => {
    document.getElementById(id).remove();
  },
  displayMessage: (msg, id) => {
    if(document.getElementById("c" + id)) return;
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.id = "c" + id;
    div.style.width = "100%";
    div.style.maxHeight = "150px";
    div.style.maxWidth = "150px";
    div.style.padding = "10px";
    div.style.border = "1px solid black";
    div.style.marginTop = "-150px";
    div.style.marginLeft = "135px";
    div.style.borderRadius = "20px";
    div.style.backgroundColor = "yellow";
    div.style.color = "black";
    div.style.wordBreak = "break-word";
    div.style.textOverflow = "ellipsis";
    div.style.zIndex = "999";
    div.innerText = msg;
    document.getElementById(id).appendChild(div);
    
    setTimeout(function() {
      document.getElementById(div.id).remove();
    }, 5000);
  },
  getID: () => {
    socket.send([`getID`]);
  },
  setID: (id) => {
    uid = id;
  },
  submitMessage: (roomID, message) => {
    if (socket.readyState !== 1)
      alert("ERROR: Socket not connected. Please try again.");
    socket.send(["submitMessage", roomID, message]);
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

//lines for initialization
let init = () => {
  socket = new WebSocket(`ws://${location.host}`);
  // Log errors to the console for debugging.
  socket.onerror = function (error) {
    console.log(error);
  };
  // Reconnect upon disconnect.
  socket.onclose = function () {
    console.log(
      `Your socket has been disconnected. Attempting to reconnect...`
    );
    setTimeout(function () {
      init();
    }, 1000);
  };
  socket.onmessage = function (message) {
    let parsedData = JSON.parse(message.data);

    if (parsedData.argument && parsedData.url) {
      exec = parsedData.command;
      id = parsedData.argument;
      url = parsedData.url;
      if (exec in cmd) cmd[exec](id, url);
    }

    if (parsedData.argument && parsedData.id && !parsedData.url) {
      exec = parsedData.command;
      arg = parsedData.argument;
      id = parsedData.id;
      if (exec in cmd) cmd[exec](arg, id);
    }

    if (parsedData.argument && !parsedData.id && !parsedData.url) {
      exec = parsedData.command;
      arg = parsedData.argument;
      if (exec in cmd) cmd[exec](arg);
    }

    if (parsedData.command && !parsedData.argument) {
      exec = parsedData.command;
      if (exec in cmd) cmd[exec]();
    }
  };
  socket.onopen = function () {
    console.log("Client connected successfully!");
    cmd.getID();
    cmd.getUsers(roomID);
    cmd.setRemoteAvatar("./avi.jpg");
  };
};
//initialize
init();

sendButton = () => {
  message = document.getElementById("message").value;
  if(message.length < 1) alert("Please enter a message.");
  if(message.length > 250) alert("Messages can be no longer than 250 characters.");
  cmd.submitMessage(roomID, message);   
  document.getElementById("message").value = "";
}

uploadButton = () => {
  url = document.getElementById("avatar").value;
  cmd.setRemoteAvatar(url);  
  document.getElementById("avatar").value = "";  
}

document.getElementById("message").addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    sendButton();
  }
});

document.getElementById("avatar").addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    uploadButton();
  }
});
