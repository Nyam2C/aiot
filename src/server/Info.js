const dummyData = [
  {
    show: "PSY",
    locations: [
      {
        location: "Seoul",
        dates: [
          {
            date: "20250610",
            sessions: [
              { session: 1, seats: ["G10", "G11", "G12"] },
              { session: 2, seats: ["A01", "A02"] },
            ],
          },
          {
            date: "20250611",
            sessions: [
              { session: 1, seats: ["B05", "B06"] },
            ],
          },
        ],
      },
      {
        location: "Busan",
        dates: [
          {
            date: "20250612",
            sessions: [
              { session: 1, seats: ["C10", "C11"] },
              { session: 2, seats: ["D01"] },
            ],
          },
        ],
      },
    ],
  },
  {
    show: "BTS",
    locations: [
      {
        location: "Seoul",
        dates: [
          {
            date: "20250612",
            sessions: [
              { session: 1, seats: ["E20", "E21"] },
            ],
          },
          {
            date: "20250613",
            sessions: [
              { session: 2, seats: ["F05"] },
            ],
          },
        ],
      },
    ],
  },
  {
    show: "IU",
    locations: [
      {
        location: "Incheon",
        dates: [
          {
            date: "20250614",
            sessions: [
              { session: 1, seats: ["G07", "G08"] },
            ],
          },
        ],
      },
    ],
  },
];

function parseTopicToParams(topic) {
  // "Ticket/infos/PSY/Seoul/20250610/1/G10" → [PSY, Seoul, 20250610, 1, G10]
  const parts = topic.split('/');
  // 앞의 "Ticket/infos" 제거
  const params = parts.slice(2);
  return {
    show: params[0],
    location: params[1],
    date: params[2],
    session: params[3],
    seat: params[4]
  };
}

function findAndPrintReservationFromTopic(topic) {
  const { show, location, date, session, seat } = parseTopicToParams(topic);
  console.log(`show: ${show}, location: ${location}, date: ${date}, session: ${session}, seat: ${seat}`);
  let shows = dummyData;

  if (show) {
    shows = shows.filter(item => item.show === show);
    if (shows.length === 0) return "";
  } else {
    return shows.map(item => item.show).join(" ");
  }

  if (location) {
    shows = shows.flatMap(item => item.locations.filter(loc => loc.location === location));
    if (shows.length === 0) return "";
  } else {
    return shows[0].locations.map(loc => loc.location).join(" ");
  }

  if (date) {
    shows = shows.flatMap(loc => loc.dates.filter(d => d.date === date));
    if (shows.length === 0) return "";
  } else {
    return shows[0].dates.map(d => d.date).join(" ");
  }

  if (session) {
    shows = shows.flatMap(d => d.sessions.filter(s => s.session === session));
    if (shows.length === 0) return "";
  } else {
    return shows[0].sessions.map(s => s.session).join(" ");
  }

  if (seat) {
    const found = shows.some(s => s.seats.includes(seat));
    if (!found) return "";
    return seat;
  } else {
    return shows[0].seats.join(" ");
  }
}


var Info = function (solaceModule, topicName) {
    'use strict';
    var solace = solaceModule;
    var replier = {};
    replier.session = null;
    replier.topicName = topicName;
    replier.subscribed = false;

    // Logger
    replier.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2), ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    replier.log('\n*** replier to topic "' + replier.topicName + '" is ready to connect ***');

    // main function
    replier.run = function (argv) {
        replier.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    replier.connect = function (argv) {
        if (replier.session !== null) {
            replier.log('Already connected and ready to ready to receive requests.');
            return;
        }
        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            replier.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        replier.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        replier.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        replier.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];
        // create session
        try {
            replier.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            replier.log(error.toString());
        }
        // define session event listeners
        replier.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            replier.log('=== Successfully connected and ready to subscribe to request topic. ===');
            replier.subscribe();
        });
        replier.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            replier.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        replier.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            replier.log('Disconnected.');
            replier.subscribed = false;
            if (replier.session !== null) {
                replier.session.dispose();
                replier.session = null;
            }
        });
        replier.session.on(solace.SessionEventCode.SUBSCRIPTION_ERROR, function (sessionEvent) {
            replier.log('Cannot subscribe to topic: ' + sessionEvent.correlationKey);
        });
        replier.session.on(solace.SessionEventCode.SUBSCRIPTION_OK, function (sessionEvent) {
            if (replier.subscribed) {
                replier.subscribed = false;
                replier.log('Successfully unsubscribed from request topic: ' + sessionEvent.correlationKey);
            } else {
                replier.subscribed = true;
                replier.log('Successfully subscribed to request topic: ' + sessionEvent.correlationKey);
                replier.log('=== Ready to receive requests. ===');
            }
        });
        // define message event listener
        replier.session.on(solace.SessionEventCode.MESSAGE, function (message) {
            try {
                replier.reply(message);
            } catch (error) {
                replier.log(error.toString());
            }
        });
        // connect the session
        try {
            replier.session.connect();
        } catch (error) {
            replier.log(error.toString());
        }
    };

    // Subscribes to request topic on Solace PubSub+ Event Broker
    replier.subscribe = function () {
        if (replier.session !== null) {
            if (replier.subscribed) {
                replier.log('Already subscribed to "' + replier.topicName + '" and ready to receive messages.');
            } else {
                replier.log('Subscribing to topic: ' + replier.topicName);
                try {
                    replier.session.subscribe(
                        solace.SolclientFactory.createTopicDestination(replier.topicName),
                        true, // generate confirmation when subscription is added successfully
                        replier.topicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    replier.log(error.toString());
                }
            }
        } else {
            replier.log('Cannot subscribe because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Unsubscribes from request topic on Solace PubSub+ Event Broker
    replier.unsubscribe = function () {
        if (replier.session !== null) {
            if (replier.subscribed) {
                replier.log('Unsubscribing from topic: ' + replier.topicName);
                try {
                    replier.session.unsubscribe(
                        solace.SolclientFactory.createTopicDestination(replier.topicName),
                        true, // generate confirmation when subscription is removed successfully
                        replier.topicName, // use topic name as correlation key
                        10000 // 10 seconds timeout for this operation
                    );
                } catch (error) {
                    replier.log(error.toString());
                }
            }
        } else {
            replier.log('Cannot unsubscribe because not connected to Solace PubSub+ Event Broker.');
        }
    };

    replier.reply = function (message) {
        replier.log('Received message: "' + message.getSdtContainer().getValue() + '", details:\n' + message.dump());
        replier.log('Replying...');
        if (replier.session !== null) {
            var reply = solace.SolclientFactory.createMessage();
            var sdtContainer = message.getSdtContainer(replier.topicName);
            if (sdtContainer.getType() === solace.SDTFieldType.STRING) {
                var replyText = findAndPrintReservationFromTopic(message.dump().Destination);
                reply.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, replyText));
                replier.session.sendReply(message, reply);
                replier.log('Replied.');
            }
        } else {
            replier.log('Cannot reply: not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    replier.disconnect = function () {
        replier.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (replier.session !== null) {
            try {
                replier.session.disconnect();
            } catch (error) {
                replier.log(error.toString());
            }
        } else {
            replier.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    replier.exit = function () {
        replier.unsubscribe();
        setTimeout(function () {
            replier.disconnect();
        }, 1000); // wait for 1 second to disconnect
        setTimeout(function () {
            process.exit();
        }, 2000); // wait for 2 seconds to finish
    };

    return replier;
};

module.exports = Info;
