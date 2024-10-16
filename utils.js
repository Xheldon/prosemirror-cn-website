const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

exports.translate = async (text, { key, file }) => {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      messages: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: 'You are a professional, authentic machine translation engine.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Translate the following source text to chinese: ${text}，Output translation directly without any additional text. Remember, Keep ALL HTML TAG AND ATTRIBUTE, ONLY TRANSLATE CONTENT!`,
            },
          ],
        },
      ],
      temperature: 0,
      top_p: 0.95,
      max_tokens: 4096,
    });
    const apiKey = secrets.OPENAI_API_KEY;
    const url = secrets.OPENAI_URL;
    const res = spawn('curl', [
      url,
      '-H',
      'Content-Type: application/json',
      '-H',
      `api-key: ${apiKey}`,
      '-d',
      payload,
    ]);
    let result = '';
    res.stdout.on('data', (data) => {
      result += data.toString();
    });
    res.stdout.on('close', () => {
      try {
        const json = JSON.parse(result);
        const translate = json.choices?.[0]?.message?.content;
        if (!translate) {
          console.error(`ai 翻译失败: [${text}] -> [${result}]`);
          // Note: 创建一个 error.txt ，如果不存在则创建
          const errorPath = path.resolve(__dirname,'error.txt');
          if (!fs.existsSync(errorPath)) {
            fs.writeFileSync(errorPath, '');
          }
          // Note：追加到文件
          fs.appendFileSync(
            errorPath,
            `[${file}-${key}]: ${text} -> ${result}\n`
          );
          resolve('_-_-_-_-_-_');
          return;
        }
        resolve(translate);
      } catch (e) {
        console.error(`ai 翻译失败: [${text}] -> [${result}]`);
        // Note: 创建一个 error.txt ，如果不存在则创建
        if (!fs.existsSync('error.txt')) {
          fs.writeFileSync('error.txt', '');
        }
        // Note：追加到文件
        fs.appendFileSync(
          'error.txt',
          `[${file}-${key}]: ${text} -> ${result}\n`
        );
        resolve('_-_-_-_-_-_');
      }
    });
  });
};
