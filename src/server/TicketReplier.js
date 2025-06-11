const solace = require('solclientjs').debug;
const dummyData = require('./dummyData'); // 공연 데이터 객체를 따로 분리해 import

function parseTopicToParams(topic) {
  const parts = topic.split('/');
  const params = parts.slice(2);
  return {
    show: params[0],
    location: params[1],
    date: params[2],
    session: params[3] ? Number(params[3]) : undefined,
    seat: params[4]
  };
}

function reserveSeat({ show, location, date, session, seat }) {
  // 좌석 예약 처리: 해당 좌석의 available을 false로 변경
  const showObj = dummyData.find(item => item.show === show);
  if (!showObj) return false;
  const locationObj = showObj.locations.find(loc => loc.location === location);
  if (!locationObj) return false;
  const dateObj = locationObj.dates.find(d => d.date === date);
  if (!dateObj) return false;
  const sessionObj = dateObj.sessions.find(s => s.session === session);
  if (!sessionObj) return false;
  const seatObj = sessionObj.seats.find(seatObj => seatObj.name === seat);
  if (!seatObj || !seatObj.available) return false; // 이미 예약된 좌석은 예약 불가
  seatObj.available = false; // 예약 처리
  return true;
}

function cancelSeat({ show, location, date, session, seat }) {
  // 좌석 취소 처리: 해당 좌석의 available을 true로 변경
  const showObj = dummyData.find(item => item.show === show);
  if (!showObj) return false;
  const locationObj = showObj.locations.find(loc => loc.location === location);
  if (!locationObj) return false;
  const dateObj = locationObj.dates.find(d => d.date === date);
  if (!dateObj) return false;
  const sessionObj = dateObj.sessions.find(s => s.session === session);
  if (!sessionObj) return false;
  const seatObj = sessionObj.seats.find(seatObj => seatObj.name === seat);
  if (!seatObj || seatObj.available) return false; // 이미 취소된 좌석은 취소 불가
  seatObj.available = true; // 취소 처리
  return true;
}

function findAndPrintReservationFromTopic(topic) {
  // 예약 요청인지 확인
  if (topic.startsWith('Ticket/reserve/')) {
    const { show, location, date, session, seat } = parseTopicToParams(topic.replace('Ticket/reserve/', 'Ticket/info/'));
    const result = reserveSeat({ show, location, date, session, seat });
    console.log(result);
    return result ? "예약 완료" : "예약 실패";
  }

  // 취소 요청인지 확인
  if (topic.startsWith('Ticket/cancellation/')) {
    // userID는 무시하고 공연정보만 파싱
    const parts = topic.split('/');
    // Ticket/cancellation/userID/공연/지역/날짜/회차/좌석
    const show = parts[3];
    const location = parts[4];
    const date = parts[5];
    const session = Number(parts[6]);
    const seat = parts[7];
    const result = cancelSeat({ show, location, date, session, seat });
    return result ? "취소 완료" : "취소 실패";
  }

  // 정보 조회 로직
  const { show, location, date, session, seat } = parseTopicToParams(topic);
  let shows = dummyData;

  // 1. 공연명
  if (!show||show==='?') {
    return shows.map(item => item.show).join(",");
  }
  const showObj = shows.find(item => item.show === show);
  if (!showObj) return "해당 공연 정보가 없습니다.";

  // 2. 지역
  if (!location) {
    return showObj.locations.map(loc => loc.location).join(",");
  }
  const locationObj = showObj.locations.find(loc => loc.location === location);
  if (!locationObj) return "해당 장소 정보가 없습니다.";

  // 3. 날짜
  if (!date) {
    return locationObj.dates.map(d => d.date).join(",");
  }
  const dateObj = locationObj.dates.find(d => d.date === date);
  if (!dateObj) return "해당 날짜 정보가 없습니다.";

  // 4. 회차
  if (!session || isNaN(session)) {
    return dateObj.sessions.map(s => s.session).join(",");
  }
  const sessionObj = dateObj.sessions.find(s => s.session === session);
  if (!sessionObj) return "해당 회차 정보가 없습니다.";

  // 5. 좌석
  if (!seat) {
    // 사용 가능한 좌석만 반환
    return sessionObj.seats.filter(seatObj => seatObj.available).map(seatObj => seatObj.name).join(",");
  }
  // 좌석 이름으로 찾기
  const seatObj = sessionObj.seats.find(seatObj => seatObj.name === seat);
  if (!seatObj) return "해당 좌석 정보가 없습니다.";
  return seatObj.available ? "true" : "false";
}

var TicketReplier = function (solaceModule, topicName) {
  var solace = solaceModule;
  var replier = {};
  replier.session = null;
  replier.topicName = topicName;
  replier.subscribed = false;

  replier.log = function (line) {
    var now = new Date();
    var time = [('0' + now.getHours()).slice(-2), ('0' + now.getMinutes()).slice(-2), ('0' + now.getSeconds()).slice(-2)];
    var timestamp = '[' + time.join(':') + '] ';
    console.log(timestamp + line);
  };

  replier.run = function (argv) {
    replier.connect(argv);
  };

  replier.connect = function (argv) {
    if (replier.session !== null) return;
    var hosturl = argv[2];
    var usernamevpn = argv[3];
    var username = usernamevpn.split('@')[0];
    var vpn = usernamevpn.split('@')[1];
    var pass = argv[4];
    replier.session = solace.SolclientFactory.createSession({
      url: hosturl,
      vpnName: vpn,
      userName: username,
      password: pass,
    });
    replier.session.on(solace.SessionEventCode.UP_NOTICE, () => {
      replier.log('Connected.');
      replier.subscribe();
    });
    replier.session.on(solace.SessionEventCode.MESSAGE, function (message) {
      replier.reply(message);
    });
    replier.session.connect();
  };

  replier.subscribe = function () {
    if (replier.session !== null && !replier.subscribed) {
      replier.session.subscribe(
        solace.SolclientFactory.createTopicDestination(replier.topicName),
        true,
        replier.topicName,
        10000
      );
      replier.subscribed = true;
    }
  };

  replier.reply = function (message) {
    var topic = message.getDestination().getName();
    var replyText = findAndPrintReservationFromTopic(topic);
    var reply = solace.SolclientFactory.createMessage();
    reply.setSdtContainer(solace.SDTField.create(solace.SDTFieldType.STRING, replyText));
    replier.session.sendReply(message, reply);
    replier.log(`Replied to ${topic} with "${replyText}"`);
  };

  return replier;
};

const factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);
solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

const replier = new TicketReplier(solace, 'Ticket/>');
replier.run(process.argv);