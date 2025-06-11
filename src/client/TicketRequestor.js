const solace = require('solclientjs').debug;
const readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function questionAsync(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

var TicketRequestor = function (solaceModule, topicName, onReply) {
  var solace = solaceModule;
  var requestor = {};
  requestor.session = null;
  requestor.topicName = topicName;
  requestor.onReply = onReply;

  requestor.run = function (argv) {
    requestor.connect(argv);
  };

  requestor.connect = function (argv) {
    if (requestor.session !== null) return;
    var hosturl = argv[2];
    var usernamevpn = argv[3];
    var username = usernamevpn.split('@')[0];
    var vpn = usernamevpn.split('@')[1];
    var pass = argv[4];
    requestor.session = solace.SolclientFactory.createSession({
      url: hosturl,
      vpnName: vpn,
      userName: username,
      password: pass,
    });
    requestor.session.on(solace.SessionEventCode.UP_NOTICE, function () {
      requestor.request();
    });
    requestor.session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function () {
      console.log('Connection failed');
    });
    requestor.session.connect();
  };

  requestor.request = function () {
    if (requestor.session !== null) {
      var requestText = 'Ticketing Request';
      var request = solace.SolclientFactory.createMessage();
      request.setDestination(solace.SolclientFactory.createTopicDestination(requestor.topicName));
      request.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, requestText));
      request.setDeliveryMode(solace.MessageDeliveryModeType.DIRECT);
      requestor.session.sendRequest(
        request,
        5000,
        function (session, message) {
          if (requestor.onReply) requestor.onReply(message.getSdtContainer().getValue());
          requestor.session.disconnect();
        },
        function () {
          console.log('Request failed');
          requestor.session.disconnect();
        },
        null
      );
    }
  };

  return requestor;
};

const factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

(async function main() {
  const menu = await questionAsync('1. 예약  2. 취소  (번호 입력): ');
  if (menu.trim() === '1') {
    // 예약 로직 (기존과 동일)
    let topic = 'Ticket/info';
    let argv = process.argv;
    let topicStack = ['Ticket/info'];

    while (true) {
      var flag = true;
      const reply = await new Promise(resolve => {
        const requestor = new TicketRequestor(solace, topic, resolve);
        requestor.run(argv);
      });

      console.log('서버 응답:', reply);

      if (reply === "true") {
        const reserve = await questionAsync('예약하시겠습니까?(Y/N): ');
        if (reserve.trim().toUpperCase() === 'Y') {
          const reserveTopic = topic.replace('Ticket/info', 'Ticket/reserve');
          const reserveReply = await new Promise(resolve => {
            const requestor = new TicketRequestor(solace, reserveTopic, resolve);
            requestor.run(argv);
          });
          console.log('서버 응답:', reserveReply);
          if (reserveReply === "예약 완료") {
            console.log('예약이 완료되었습니다. 프로그램을 종료합니다.');
          } else {
            console.log('예약에 실패했습니다. 프로그램을 종료합니다.');
          }
          break;
        } else {
          break;
        }
      }

      const input = await questionAsync('입력(엔터만 입력시 종료): ');
      if (!input) break;

      if (reply.startsWith("해당")) {
        console.log('다시 입력해 주세요.');
        flag = false;
      }

      if(flag){
          topic += '/' + input;
          topicStack.push(topic);
      }
    }
    rl.close();
    process.exit();
  } else if (menu.trim() === '2') {
    // 취소 로직
    const userID = await questionAsync('사용자 ID를 입력하세요: ');
    const show = await questionAsync('공연명을 입력하세요: ');
    const location = await questionAsync('지역을 입력하세요: ');
    const date = await questionAsync('날짜(YYYYMMDD)를 입력하세요: ');
    const session = await questionAsync('회차(숫자)를 입력하세요: ');
    const seat = await questionAsync('좌석명을 입력하세요: ');

    const cancelTopic = `Ticket/cancellation/${userID}/${show}/${location}/${date}/${session}/${seat}`;
    const argv = process.argv;
    const cancelReply = await new Promise(resolve => {
      const requestor = new TicketRequestor(solace, cancelTopic, resolve);
      requestor.run(argv);
    });
    console.log('서버 응답:', cancelReply);
    if (cancelReply === "취소 완료") {
      console.log('티켓이 성공적으로 취소되었습니다.');
    } else {
      console.log('티켓 취소에 실패했습니다.');
    }
    rl.close();
    process.exit();
  } else {
    console.log('잘못된 입력입니다.');
    rl.close();
    process.exit();
  }
})();