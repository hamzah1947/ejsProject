const MongoClient = require('mongodb').MongoClient;
const client = require('socket.io').listen(process.env.PORT || 3000).sockets;
const url = "mongodb://admin:admin@ds012058.mlab.com:12058/livechatdatabase";

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var app = express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('index'))
  .get('/signup', (req, res) => res.render('signup'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

app.on('connection', function (socket) {

  MongoClient.connect(url, function (err, db) {
    if (err)
      throw err;

    socket.on('input', function (data) {
      console.log("recieved " + data.email + " on server side");
      var query = {
        Email: data.email
      };
      var arr = db.collection("users").find(query, {
        _id: 0
      }).toArray(function (err, result) {
        if (err) {
          socket.emit('output', { answer: -1 });
          throw err;
        }
        else {
          var st = [];
          for (var k in result)
            st = result[k];

          if (typeof st.Password === 'undefined') {
            socket.emit('output', {
              answer: -1
            });
          } else {
            var kn = st.Password.localeCompare(data.password);
            socket.emit('output', {
              answer: kn,
              username: st.Username
            });
          }

        }
      });

    });

    socket.on('UpdateUser', function (data) {
      console.log('reached in update query');
      db.collection("users").update({ "Email": data.Email }, { "FirstName": data.FirstName, "LastName": data.LastName, "Email": data.Email, "Username": data.Username, "Password": data.Password }, function (err, res) {
        if (err) {
          throw err;
          console.log('update query error');
        }
        console.log('reached after query');
        socket.emit('UpdateUserResult', res);
      })
    })
    socket.on('checkName', function (data) {
      db.collection("users").find({ "Username": data.user }).toArray(function (err, res) {
        if (err) {
          throw err;
        }
        socket.emit('nameResult', res);
      })
    });

    socket.on('addUser', function (data) {
      db.collection("users").insert({ FirstName: data.FirstName, LastName: data.LastName, Email: data.Email, Username: data.Username, Password: data.Password }, function () {
        console.log("User inserted succefully...");
        socket.emit("addUserResult", {})
      })
    });
    // Handle input events
    socket.on('inputmessages', function (data) {
      console.log('starting to insert message in database');
      let name = data.name;
      let recieve = data.recievedby;
      let message = data.message;

      console.log('name is ' + name);
      console.log('reciever is ' + recieve);
      console.log('message is ' + message);

      // Check for name and message
      if (message == '') {
        // Send error status
        //sendStatus('Please message');
      } else {
        // Insert message
        db.collection("conversations").update({ accountname: name, reciever: recieve }, { $push: { messages: { sender: message } } }, function (err, recs, status) {
          if (err)
            throw err;
          // console.log("records:" + recs);
          // var st = [];
          // for (var k in recs)
          //     st = recs[k];

          // console.log("type of st is " + typeof st);
          // if (recs == 0) {
          db.collection("conversations").update({ accountname: recieve, reciever: name }, { $push: { messages: { reciever: message } } });
          //}
          socket.emit('refresh');
        });

      }
    });


    socket.on("getContactList", function (data) {
      console.log("Name recieved to search friends : " + data.Username);
      db.collection("friends").find({ Username: data.Username }).toArray(function (err, res) {
        var st = [];
        for (var k in res)
          st = res[k];
        console.log(st.Friends + " type of FRIENDS : " + typeof st.Friends);
        socket.emit("getContactListResult", { Friends: st.Friends });
      });
    });

    socket.on('getMessages', function (data) {
      var searchname = data.friendname;
      console.log("search name is " + searchname);
      db.collection("conversations").find({ accountname: data.accountName, reciever: searchname }).toArray(function (err, res) {
        if (err) {
          console.log("could not find messages");
        }
        var st = [];
        for (var k in res)
          st = res[k];

        //console.log(st.messages+" type of messages "+typeof st.messages);
        //var arr=st.messages;
        //var f=arr[0];
        //console.log(f.other);
        if (st.messages !== undefined && searchname !== "")
          socket.emit('getMessagesResult', { mess: st.messages });
        else {
          db.collection("conversations").find({ accountname: searchname, reciever: data.accountName }).toArray(function (err, res) {
            var st = [];
            for (var k in res)
              st = res[k];

            if (st.messages !== undefined && searchname !== "")
              socket.emit('getMessagesResult', { mess: st.messages, reverse: true });
            else
              console.log("could not find messages");
          });
        }
      });
    })
  })
});
