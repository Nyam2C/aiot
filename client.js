const readline = require('readline');
const getInfo = require('./src/client/getInfo');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function login(callback) {
    console.log('아이디를 입력하세요:');
    rl.question('> 아이디: ', (id) => {
        console.log(`로그인 성공: ${id}`);
        callback();
    });

}

function showMenu() {
  console.log('\n무엇을 하시겠습니까?');
  console.log('1. 예약하기');
  console.log('2. 예약 정보 조회');
  console.log('3. 예약 취소하기');5
  console.log('4. 알람 설정');
  console.log('5. 종료하기');
}

function handleInput(answer) {
  switch (answer.trim()) {
    case '1':
      console.log('▶ 예약하기 로직 실행');
      var getInfoInstance = getInfo(solace, 'Ticket/info/123');
      getInfoInstance.run(process.argv);
      break;
    case '2':
      console.log('▶ 예약 정보 조회 로직 실행');
      // TODO: 예약 정보 조회 함수 호출
      break;
    case '3':
      console.log('▶ 예약 취소하기 로직 실행');
      // TODO: 예약 취소 함수 호출
      break;
    case '4':
      console.log('▶ 알람 설정 로직 실행');
      // TODO: 알람 설정 함수 호출
      break;
    case '5':
      console.log('프로그램을 종료합니다.');
      rl.close();
      return;
    default:
      console.log('잘못된 입력입니다. 1~5 사이의 숫자를 입력하세요.');
  }
  promptMenu();
}

function promptMenu() {
  showMenu();
  rl.question('> 선택: ', handleInput);
}

var solace = require('solclientjs').debug; 

var factoryProps = new solace.SolclientFactoryProperties();
factoryProps.profile = solace.SolclientFactoryProfiles.version10;
solace.SolclientFactory.init(factoryProps);

solace.SolclientFactory.setLogLevel(solace.LogLevel.WARN);

login(() => {
  promptMenu();
});

rl.on('close', () => {
  process.exit(0);
});
