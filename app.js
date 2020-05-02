'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const APP_URL = "https://newhope-grocery-store.herokuapp.com";


//new text

// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  firebase = require("firebase-admin"),
  ejs = require("ejs"),
  fs = require('fs'),
  multer = require('multer'),
  app = express();

// parse application/x-www-form-urlencoded
app.use(body_parser.json());
app.use(body_parser.urlencoded());


var firebaseConfig = {
  credential: firebase.credential.cert({
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "project_id": process.env.FIREBASE_PROJECT_ID,
  }),
  databaseURL: process.env.FIREBASE_DB_URL,
  storageBucket: process.env.FIREBASE_SB_URL
};



firebase.initializeApp(firebaseConfig);

let db = firebase.firestore();
let bucket = firebase.storage().bucket();



// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {

  // Parse the request body from the POST
  let body = req.body;



  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {
    body.entry.forEach(function (entry) {

      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {
        if (webhook_event.message.quick_reply) {
          handleQuickReply(sender_psid, webhook_event.message.quick_reply.payload);
        } else {
          handleMessage(sender_psid, webhook_event.message);
        }
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }

    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});


//Set up Get Started Button. To run one time
//eg https://newhope-grocery-store.herokuapp.com/setgsbutton
app.get('/setgsbutton', function (req, res) {
  setupGetStartedButton(res);
});

//Set up Persistent Menu. To run one time
//eg https://newhope-grocery-store.herokuapp.com/setpersistentmenu
app.get('/setpersistentmenu', function (req, res) {
  setupPersistentMenu(res);
});

//Remove Get Started and Persistent Menu. To run one time
//eg https://newhope-grocery-store.herokuapp.com/clear
app.get('/clear', function (req, res) {
  removePersistentMenu(res);
});

//whitelist domains
//eg https://newhope-grocery-store.herokuapp.com/whitelists
app.get('/whitelists', function (req, res) {
  whitelistDomains(res);
});


// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {


  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Check token and mode
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

/**********************************************
Function to Handle when user send quick reply message
***********************************************/

function handleQuickReply(sender_psid, received_message) {

  switch (received_message) {
    case "on":
      showQuickReplyOn(sender_psid);
      break;
    case "off":
      showQuickReplyOff(sender_psid);
      break;
    default:
      defaultReply(sender_psid);
  }

}


/*********************************************
Function to handle when user click button
**********************************************/
const handlePostback = (sender_psid, received_postback) => {
  let payload = received_postback.payload;

  switch (payload) {
    case "get_started":
      greetUser(sender_psid);
      break;
    case "food-package":
      meals(sender_psid);
      break;
    case "yes":
      showButtonReplyYes(sender_psid);
      break;
    case "no":
      showButtonReplyNo(sender_psid);
      break;
    default:
      defaultReply(sender_psid);
  }
}

/**********************************************
Function to Handle when user send text message
***********************************************/

const handleMessage = (sender_psid, received_message) => {
  let user_message = received_message.text.toLowerCase();

  switch (user_message) {
    case "hi":
      getStarted(sender_psid);
      break;
    case "webview":
      webviewTest(sender_psid);
      break;
    case "eagle":
      eyeofEagle(sender_psid);
      break;
    case "admin":
      adminCreatePackage(sender_psid);
      break;
    case "customer":
      selectMode(sender_psid);
      break;
    case "meals":
      meals(sender_psid);
      break;
    case "private tour":
      privateTour(sender_psid);
      break;
    case "amend tour":
      amendTour(sender_psid);
      break;
    case "change hotel":
      askHotel(sender_psid);
      break;
    case "change restaurent":
      askRestaurent(sender_psid);
      break;
    case "add book":
      addBooks(sender_psid);
      break;
    case "add review":
      addReview(sender_psid);
      break;
    case "gone with the wind":
      goneWithTheWind(sender_psid)
      break;
    case "effy":
      Effy(sender_psid)
      break;
    case "hobby":
      Hobby(sender_psid)
      break;
    default:
      defaultReply(sender_psid);
  }
}



const selectMode = (sender_psid) => {
  let response1 = {
    "text": "Do you want to see our tour packages?, (type 'tour packages')"
  };
  let response2 = {
    "text": "Do you want to create your own custom private tour? (type 'private tour')"
  };
  let response3 = {
    "text": "Do you want to amend your private tour (type 'amend tour')"
  };
  let response4 = {
    "text": "todo"
  };
  callSend(sender_psid, response1).then(() => {
    return callSend(sender_psid, response2).then(() => {
      return callSend(sender_psid, response3).then(() => {
        return callSend(sender_psid, response4);
      });
    });
  });
}


const meals = (sender_psid) => {

  db.collection('meals').get()
    .then((snapshot) => {
      let elementItems = [];



      snapshot.forEach((doc) => {


        var obj = {};
        //obj._id  = doc.id ;        
        obj.title = doc.data().name;


        obj.image_url = doc.data().imageUrl;
        obj.buttons = [{
          "type": "web_url",
          "title": "BOOK NOW",
          "url": "https://newhope-grocery-store.herokuapp.com/booktour/" + obj.title + "/" + sender_psid,
          "webview_height_ratio": "full",
          "messenger_extensions": true
        }];

        elementItems.push(obj);

      });

      let response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "image_aspect_ratio": "square",
            "elements": elementItems
          }
        }
      }

      console.log("RESPONSE", response);
      console.log("SENDER", sender_psid, );
      callSend(sender_psid, response);
    })
    .catch((err) => {
      console.log('Error getting documents', err);
    });

}

function adminCreatePackage(sender_psid) {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "Create a tour package",
          "buttons": [{
              "type": "web_url",
              "title": "create",
              "url": "https://newhope-grocery-store.herokuapp.com/addpackage/" + sender_psid,
              "webview_height_ratio": "full",
              "messenger_extensions": true,
            },

          ],
        }]
      }
    }
  }
  callSendAPI(sender_psid, response);
}


function privateTour(sender_psid) {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "Create your private tour",
          "buttons": [{
              "type": "web_url",
              "title": "Create",
              "url": "https://newhope-grocery-store.herokuapp.com/privatetour/" + sender_psid,
              "webview_height_ratio": "full",
              "messenger_extensions": true,
            },

          ],
        }]
      }
    }
  }
  callSendAPI(sender_psid, response);
}



function webviewTest(sender_psid) {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "Click to open webview?",
          "buttons": [{
              "type": "web_url",
              "title": "webview",
              "url": "https://newhope-grocery-store.herokuapp.com/webview/" + sender_psid,
              "webview_height_ratio": "full",
              "messenger_extensions": true,
            },

          ],
        }]
      }
    }
  }
  callSendAPI(sender_psid, response);
}

const textReply = (sender_psid) => {
  let response = {
    "text": "You sent text message"
  };
  callSend(sender_psid, response);
}


const quickReply = (sender_psid) => {
  let response = {
    "text": "Select your reply",
    "quick_replies": [{
      "content_type": "text",
      "title": "On",
      "payload": "on",
    }, {
      "content_type": "text",
      "title": "Off",
      "payload": "off",
    }]
  };
  callSend(sender_psid, response);
}

const showQuickReplyOn = (sender_psid) => {
  let response = {
    "text": "You sent quick reply ON"
  };
  callSend(sender_psid, response);
}

const showQuickReplyOff = (sender_psid) => {
  let response = {
    "text": "You sent quick reply OFF"
  };
  callSend(sender_psid, response);
}

const buttonReply = (sender_psid) => {

  let response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
          "title": "Are you OK?",
          "image_url": "https://www.mindrops.com/images/nodejs-image.png",
          "buttons": [{
              "type": "postback",
              "title": "Yes!",
              "payload": "yes",
            },
            {
              "type": "postback",
              "title": "No!",
              "payload": "no",
            }
          ],
        }]
      }
    }
  }
  callSend(sender_psid, response);
}

const defaultReply = (sender_psid) => {
  let response1 = {
    "text": "To test text reply, type 'text'"
  };
  let response2 = {
    "text": "To test quick reply, type 'quick'"
  };
  let response3 = {
    "text": "To test button reply, type 'button'"
  };
  let response4 = {
    "text": "To test webview, type 'webview'"
  };
  callSend(sender_psid, response1).then(() => {
    return callSend(sender_psid, response2).then(() => {
      return callSend(sender_psid, response3).then(() => {
        return callSend(sender_psid, response4);
      });
    });
  });
}

const getUserProfile = (sender_psid) => {
  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/" + sender_psid + "?fields=first_name,last_name,profile_pic&access_token=EAAC0Amc4MRgBAGR5JMXzFDQBBZCbHRjOkVPeKg3UokgQzZAYlIAZBQoPnwsKo6FZBmSOd5kPm16TUJEFdveL9iZA4IAG2EN1IozqH17jKueHNU2rPObJYjxkL6Kq3WttHxYhaj83SGYNK9ZBEtYXkJTOiXVV9key1xS8WZCpWXoQy3bluiMysR5IYlm1Q9QfVQZD",
      "method": "GET"
    }, (err, res, body) => {
      if (!err) {
        let data = JSON.parse(body);
        resolve(data);
      } else {
        console.error("Error:" + err);
      }
    });
  });
}

/* FUNCTION TO GETSTARTED */

async function getStarted(sender_psid) {
  let user = await getUserProfile(sender_psid);
  let response = {
    "text": "Hi" + user.first_name + " " + user.last_name + ". Welcome to Newhope.'\n'🇺🇸 Please choose the language below.'\n' 🇲🇲 မိ မိႏွ စ္ သက္ ရာ ဘာ သာ စကား ကိုေ ရြး ပါ။ '\n' 🇲🇲 မိ မိ နှ စ် သက် ရာ ဘာ သာ စကား ကို ရွေး ပါ။ "
  }
  callSend(sender_psid, response);
}

/*FUNCTION TO GREET USER*/

async function greetUser(sender_psid) {
  let user = await getUserProfile(sender_psid);
  let response1 = {
    "text": "မင်္ဂလာပါ " + user.first_name + " " + user.last_name + ". New Hope Grocery မှ ကြိုဆိုပါတယ်ခင်ဗျ 🙂"
  };
  let response2 = {
    "text": "မင်္ဂလာပါခင်ဗျ၊ myanpwel "
  }
  let response3 = {
    "text": "......"
  };
  let response4 = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "What do you want to eat?",
        "buttons": [{
            "type": "postback",
            "title": "Admin နဲ့ Chat မယ်",
            "payload": "chat-with-admin"
          },
          {
            "type": "postback",
            "title": "Food Package ရှာမယ်",
            "payload": "food-package"
          }
        ]
      }
    }
  };
  callSend(sender_psid, response1).then(() => {
    return callSend(sender_psid, response2).then(() => {
      return callSend(sender_psid, response3).then(() => {
        return callSend(sender_psid, response4);
      });
    });
  });
}

const callSendAPI = (sender_psid, response) => {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/v2.6/me/messages",
      "qs": {
        "access_token": PAGE_ACCESS_TOKEN
      },
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        resolve('message sent!')
      } else {
        console.error("Unable to send message:" + err);
      }
    });
  });
}

async function callSend(sender_psid, response) {
  let send = await callSendAPI(sender_psid, response);
  return 1;
}


/*************************************
FUNCTION TO SET UP GET STARTED BUTTON
**************************************/

const setupGetStartedButton = (res) => {
  let messageData = {
    "get_started": {
      "payload": "get_started"
    }
  };

  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.send(body);
      } else {
        // TODO: Handle errors
        res.send(body);
      }
    });
}

/**********************************
FUNCTION TO SET UP PERSISTENT MENU
***********************************/

const setupPersistentMenu = (res) => {
  var messageData = {
    "persistent_menu": [{
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [{
            "type": "postback",
            "title": "View My Tasks",
            "payload": "view-tasks"
          },
          {
            "type": "postback",
            "title": "Add New Task",
            "payload": "add-task"
          },
          {
            "type": "postback",
            "title": "Cancel",
            "payload": "cancel"
          }
        ]
      },
      {
        "locale": "default",
        "composer_input_disabled": false
      }
    ]
  };

  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.send(body);
      } else {
        res.send(body);
      }
    });
}

/***********************
FUNCTION TO REMOVE MENU
************************/

const removePersistentMenu = (res) => {
  var messageData = {
    "fields": [
      "persistent_menu",
      "get_started"
    ]
  };
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.send(body);
      } else {
        res.send(body);
      }
    });
}


/***********************************
FUNCTION TO ADD WHITELIST DOMAIN
************************************/

const whitelistDomains = (res) => {
  var messageData = {
    "whitelisted_domains": [
      "https://newhope-grocery-store.herokuapp.com",
      "https://herokuapp.com"
    ]
  };
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.send(body);
      } else {
        res.send(body);
      }
    });
}