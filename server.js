const Cancellation = require('./src/server/Cancellation');
const Info = require('./src/server/Info');
const Reservation = require('./src/server/Reservation');


var solace = require('solclientjs').debug; 

var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

var cancellation = new Cancellation(solace, 'CBUM','Ticket/cancellation/123/>');
cancellation.run(process.argv);

var info = new Info(solace, 'CBUM','Ticket/info/>');
info.run(process.argv);

var reservation = new Reservation(solace, 'CBUM','Ticket/reservation/>');
reservation.run(process.argv);


process.stdin.resume();

process.on('SIGINT', function () {
    'use strict';
    process.exit();
});

