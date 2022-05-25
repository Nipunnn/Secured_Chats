const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000).sockets;
const crypto = require('crypto');
const md5 = text => {
    return crypto
      .createHash('md5')
      .update(text)
      .digest();
  }
  
//connect to mongoDB

mongo.connect('mongodb://127.0.0.1/securedchat', function(err, db){
    if(err){
        throw err;
    }

         console.log('Connected to database!');

    // connect to socket.io
        client.on('connection', function(socket){
        let chat = db.collection('chats');

        // function to send the status
        sendStatus = function(s){
            socket.emit('status', s);
        }

        // get the chats from mongo databse collection
        chat.find().limit(100).sort({_id:1}).toArray(function(err, res){
            if(err){
                throw err;
            }
            

            // output the messages
            socket.emit('output', res);
        });

        socket.on('input', function(data){
            let name = data.name;
            let message = data.message;
            
            //encrypt the messages

            const encrypt = (text, secretKey) => {
                secretKey = md5(secretKey);
                console.log(secretKey.toString('base64'));
                secretKey = Buffer.concat([secretKey, secretKey.slice(0, 8)]);
              
                const cipher = crypto.createCipheriv('des-ede3', secretKey, '');
                const encrypted = cipher.update(text, 'utf8', 'base64');
              
                return encrypted + cipher.final('base64');
              };
              const encrypted = encrypt(message, 'testkey');
              message = encrypted;
              
              console.log(encrypted);

            // Check for the name and the message

            if(name == '' || message == ''){

                // output an error if name and message field are left empty
               
                sendStatus('Please enter your name and the message!');
            } else {
                // insert a message
                chat.insert({name: name, message: message}, function(){
                    client.emit('output', [data]);

                    // send the status
                    sendStatus({
                        message: 'Message sent!',
                        clear: true
                    });
                });
            }
        });

        // clear mongo collection
        socket.on('clear', function(data){
            // Remove all chats from collection
            chat.remove({}, function(){
                socket.emit('cleared');
            });
        });
    });
});
