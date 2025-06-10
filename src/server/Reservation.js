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

function findAndPrintReservation({ show, location, date, session, seat }) {
  let shows = dummyData;

  // 1. show
  if (show) {
    shows = shows.filter(item => item.show === show);
    if (shows.length === 0) {
      console.log(`Show "${show}" not found.`);
      return;
    }
  } else {
    // show가 없으면 전체 show 목록 출력
    console.log('shows:', shows.map(item => item.show));
    return;
  }

  // 2. location
  if (location) {
    shows = shows.flatMap(item => item.locations.filter(loc => loc.location === location));
    if (shows.length === 0) {
      console.log(`Location "${location}" not found for show "${show}".`);
      return;
    }
  } else {
    // location이 없으면 해당 show의 location 목록 출력
    console.log('locations:', shows[0].locations.map(loc => loc.location));
    return;
  }

  // 3. date
  if (date) {
    shows = shows.flatMap(loc => loc.dates.filter(d => d.date === date));
    if (shows.length === 0) {
      console.log(`Date "${date}" not found for location "${location}".`);
      return;
    }
  } else {
    // date가 없으면 해당 location의 date 목록 출력
    console.log('dates:', shows[0].dates.map(d => d.date));
    return;
  }

  // 4. session
  if (session) {
    shows = shows.flatMap(d => d.sessions.filter(s => s.session === session));
    if (shows.length === 0) {
      console.log(`Session "${session}" not found for date "${date}".`);
      return;
    }
  } else {
    // session이 없으면 해당 date의 session 목록 출력
    console.log('sessions:', shows[0].sessions.map(s => s.session));
    return;
  }

  // 5. seat
  if (seat) {
    const found = shows.some(s => s.seats.includes(seat));
    if (!found) {
      console.log(`Seat "${seat}" not found for session "${session}".`);
      return;
    }
    // 좌석이 있으면 해당 좌석만 출력
    console.log('seat:', seat);
    return;
  } else {
    // seat이 없으면 해당 session의 좌석 목록 출력
    console.log('seats:', shows[0].seats);
    return;
  }
}


var Reservation = function (solaceModule, queueName, topicName) {
    'use strict';
    var solace = solaceModule;
    var subscriber = {};
    subscriber.session = null;
    subscriber.flow = null;
    subscriber.queueName = queueName;
    subscriber.consuming = false;
    subscriber.topicName = topicName;
    subscriber.subscribed = false;

    // Logger
    subscriber.log = function (line) {
        var now = new Date();
        var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2),
            ('0' + now.getSeconds()).slice(-2)];
        var timestamp = '[' + time.join(':') + '] ';
        console.log(timestamp + line);
    };

    subscriber.log('*** Consumer to queue "' + subscriber.queueName + '" is ready to connect ***');

    // main function
    subscriber.run = function (argv) {
        subscriber.connect(argv);
    };

    // Establishes connection to Solace PubSub+ Event Broker
    subscriber.connect = function (argv) {
        if (subscriber.session !== null) {
            subscriber.log('Already connected and ready to consume messages.');
            return;
        }

        // extract params
        if (argv.length < (2 + 3)) { // expecting 3 real arguments
            subscriber.log('Cannot connect: expecting all arguments' +
                ' <protocol://host[:port]> <client-username>@<message-vpn> <client-password>.\n' +
                'Available protocols are ws://, wss://, http://, https://, tcp://, tcps://');
            process.exit();
        }
        var hosturl = argv.slice(2)[0];
        subscriber.log('Connecting to Solace PubSub+ Event Broker using url: ' + hosturl);
        var usernamevpn = argv.slice(3)[0];
        var username = usernamevpn.split('@')[0];
        subscriber.log('Client username: ' + username);
        var vpn = usernamevpn.split('@')[1];
        subscriber.log('Solace PubSub+ Event Broker VPN name: ' + vpn);
        var pass = argv.slice(4)[0];

        // create session
        try {
            subscriber.session = solace.SolclientFactory.createSession({
                // solace.SessionProperties
                url:      hosturl,
                vpnName:  vpn,
                userName: username,
                password: pass,
            });
        } catch (error) {
            subscriber.log(error.toString());
        }

        // define session event listeners
        subscriber.session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            subscriber.log('=== Successfully connected and ready to start the message subscriber. ===');
            subscriber.startConsume();
        });
        subscriber.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            subscriber.log('Connection failed to the message router: ' + sessionEvent.infoStr +
                ' - check correct parameter values and connectivity!');
        });
        subscriber.session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            subscriber.log('Disconnected.');
            subscriber.consuming = false;
            if (subscriber.session !== null) {
                subscriber.session.dispose();
                subscriber.session = null;
            }
        });
        subscriber.connectToSolace();   
    };

    subscriber.connectToSolace = function () {
        try {
            subscriber.session.connect();
        } catch (error) {
            subscriber.log(error.toString());
        }
    };

    // Starts consuming messages from Solace PubSub+ Event Broker
    subscriber.startConsume = function () {
        if (subscriber.session !== null) {
            if (subscriber.consuming) {
                subscriber.log('Already started subscriber for queue "' + subscriber.queueName + '" and ready to receive messages.');
            } else {
                subscriber.log('Starting subscriber for queue: ' + subscriber.queueName);
                try {
                    // Create a message subscriber
                    subscriber.messageSubscriber = subscriber.session.createMessageConsumer({
                        // solace.MessageConsumerProperties
                        queueDescriptor: { name: subscriber.queueName, type: solace.QueueType.QUEUE },
                        acknowledgeMode: solace.MessageConsumerAcknowledgeMode.CLIENT, // Enabling Client ack
                        createIfMissing: true // Create queue if not exists
                    });
                    // Define message subscriber event listeners
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.UP, function () {
                        subscriber.subscribe();
                        subscriber.consuming = true;
                        subscriber.log('=== Ready to receive messages. ===');
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.CONNECT_FAILED_ERROR, function () {
                        subscriber.consuming = false;
                        subscriber.log('=== Error: the message subscriber could not bind to queue "' + subscriber.queueName +
                            '" ===\n   Ensure this queue exists on the message router vpn');
                        subscriber.exit();
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.DOWN, function () {
                        subscriber.consuming = false;
                        subscriber.log('=== The message subscriber is now down ===');
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.DOWN_ERROR, function () {
                        subscriber.consuming = false;
                        subscriber.log('=== An error happened, the message subscriber is down ===');
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.SUBSCRIPTION_ERROR, function (sessionEvent) {
                      subscriber.log('Cannot subscribe to topic ' + sessionEvent.reason);
                    });
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.SUBSCRIPTION_OK, function (sessionEvent) {
                      if (subscriber.subscribed) {
                        subscriber.subscribed = false;
                        subscriber.log('Successfully unsubscribed from topic: ' + sessionEvent.correlationKey);
                      } else {
                        subscriber.subscribed = true;
                        subscriber.log('Successfully subscribed to topic: ' + sessionEvent.correlationKey);
                        subscriber.log('=== Ready to receive messages. ===');
                      }
                    });
                    // Define message received event listener
                    subscriber.messageSubscriber.on(solace.MessageConsumerEventName.MESSAGE, function (message) {
                        subscriber.log('Received message: "' + message.getBinaryAttachment() + '",' +
                            ' details:\n' + message.dump());
                        // Need to explicitly ack otherwise it will not be deleted from the message router
                        message.acknowledge();
                    });
                    // Connect the message subscriber
                    subscriber.messageSubscriber.connect();
                } catch (error) {
                    subscriber.log(error.toString());
                }
            }
        } else {
            subscriber.log('Cannot start the queue subscriber because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Subscribes to topic on Solace PubSub+ Event Broker
    subscriber.subscribe = function () {
      if (subscriber.messageSubscriber !== null) {
        if (subscriber.subscribed) {
          subscriber.log('Already subscribed to "' + subscriber.topicName
              + '" and ready to receive messages.');
        } else {
          subscriber.log('Subscribing to topic: ' + subscriber.topicName);
          try {
            subscriber.messageSubscriber.addSubscription(
              solace.SolclientFactory.createTopicDestination(subscriber.topicName),
              subscriber.topicName, // correlation key as topic name
              10000 // 10 seconds timeout for this operation
            );
          } catch (error) {
            subscriber.log(error.toString());
          }
        }
      } else {
        subscriber.log('Cannot subscribe because not connected to Solace PubSub+ Event Broker.');
      }
    };
  
    subscriber.exit = function () {
        subscriber.unsubscribe();
        setTimeout(function () {
          subscriber.stopConsume();
          subscriber.disconnect();
          process.exit();
        }, 1000); // wait for 1 second to get confirmation on removeSubscription
    };

    // Disconnects the subscriber from queue on Solace PubSub+ Event Broker
    subscriber.stopConsume = function () {
        if (subscriber.session !== null) {
            if (subscriber.consuming) {
                subscriber.consuming = false;
                subscriber.log('Disconnecting consumption from queue: ' + subscriber.queueName);
                try {
                    subscriber.messageSubscriber.disconnect();
                    subscriber.messageSubscriber.dispose();
                } catch (error) {
                    subscriber.log(error.toString());
                }
            } else {
                subscriber.log('Cannot disconnect the subscriber because it is not connected to queue "' +
                    subscriber.queueName + '"');
            }
        } else {
            subscriber.log('Cannot disconnect the subscriber because not connected to Solace PubSub+ Event Broker.');
        }
    };

    // Unsubscribes from topic on Solace PubSub+ Event Broker
    subscriber.unsubscribe = function () {
      if (subscriber.session !== null) {
        if (subscriber.subscribed) {
          subscriber.log('Unsubscribing from topic: ' + subscriber.topicName);
          try {
            subscriber.messageSubscriber.removeSubscription(
              solace.SolclientFactory.createTopicDestination(subscriber.topicName),
              subscriber.topicName, // correlation key as topic name
              10000 // 10 seconds timeout for this operation
            );
          } catch (error) {
            subscriber.log(error.toString());
          }
        } else {
          subscriber.log('Cannot unsubscribe because not subscribed to the topic "'
              + subscriber.topicName + '"');
        }
      } else {
        subscriber.log('Cannot unsubscribe because not connected to Solace PubSub+ Event Broker.');
      }
    };

    // Gracefully disconnects from Solace PubSub+ Event Broker
    subscriber.disconnect = function () {
        subscriber.log('Disconnecting from Solace PubSub+ Event Broker...');
        if (subscriber.session !== null) {
            try {
                setTimeout(function () {
                    subscriber.session.disconnect();
                }, 1000); // wait for 1 second to get confirmation on removeSubscription
            } catch (error) {
                subscriber.log(error.toString());
            }
        } else {
            subscriber.log('Not connected to Solace PubSub+ Event Broker.');
        }
    };

    return subscriber;
};

module.exports = Reservation;
