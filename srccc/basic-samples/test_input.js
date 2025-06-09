// filename: test_input.js
const readline = require('readline');

function askMessage() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('메시지를 입력하세요: ', (messageText) => {
      rl.close();
      resolve(messageText);
    });
  });
}

async function main() {
  const messageText = await askMessage();
  console.log('입력된 메시지:', messageText);
}

main();
