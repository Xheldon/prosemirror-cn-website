const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ERROR_PATH = path.resolve(__dirname, 'error.txt');

// Note: 记录一条翻译错误到 error.txt，供 CI 判定本次是否存在错误
const recordError = (message) => {
  try {
    fs.appendFileSync(ERROR_PATH, `${message}\n`);
  } catch (e) {
    console.error('写入 error.txt 失败:', e && e.message);
  }
};

// Note: 返回翻译后的字符串；失败时 reject（由调用方决定保留原文、不写入字典），
// 并把错误写入 error.txt。不再返回占位符，避免占位符被固化进字典。
exports.translate = async (text, { key, file } = {}) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const url = process.env.OPENAI_URL;
    // Note: 缺少必要的环境变量时直接失败，而不是拿着空配置去请求
    if (!apiKey || !url) {
      const msg = `缺少 OPENAI_API_KEY 或 OPENAI_URL 环境变量`;
      recordError(`[${file}-${key}]: ${text} -> ${msg}`);
      reject(new Error(msg));
      return;
    }
    const payload = JSON.stringify({
      model: 'Qwen/Qwen3.5-27B',
      messages: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              // Note: 指令全部放在 system，user 只放纯待译文本。此前把指令和文本拼在
              // 同一句 user 消息里，遇到很短的文本（如 Code / 短代码注释）时模型会把
              // 指令一起译出来（例如 "Code" 被译成"请提供需要翻译的源文本。"）。
              text: 'You are a professional, authentic machine translation engine. Translate the text provided by the user into Simplified Chinese. Output ONLY the translated text, with no additional commentary, notes, quotes, or explanation. Preserve ALL HTML tags and attributes exactly as-is; translate only the human-readable text content, never tag names, attribute values, or code. If the text is a single word or short phrase, translate just that word or phrase.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: text,
            },
          ],
        },
      ],
      temperature: 0,
      top_p: 0.95,
      max_tokens: 4096,
      // Note: Qwen3 系列默认开启"思考模式"，会先长时间推理再输出，批量翻译时
      // 极易触发超时（实测开启时单条请求 90s 都无响应）。翻译任务不需要思考，
      // 必须关闭以保证速度和稳定。
      enable_thinking: false,
    });
    // Note: -sS 静默但保留错误；加连接/整体超时，避免接口挂起时 CI 长时间卡死；
    // 对网络类瞬时错误做少量重试。
    const res = spawn('curl', [
      '--request',
      'POST',
      '--url',
      url,
      '-sS',
      '--connect-timeout',
      '15',
      '--max-time',
      '120',
      '--retry',
      '3',
      '--retry-delay',
      '3',
      '-H',
      'Content-Type: application/json',
      '-H',
      `Authorization: Bearer ${apiKey}`,
      '-d',
      payload,
    ]);
    let result = '';
    let stderr = '';
    res.stdout.on('data', (data) => {
      result += data.toString();
    });
    res.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    // Note: curl 本身启动失败（如未安装）
    res.on('error', (err) => {
      recordError(`[${file}-${key}]: ${text} -> curl 启动失败: ${err.message}`);
      reject(err);
    });
    res.on('close', (code) => {
      // Note: curl 非 0 退出（网络/超时等），result 往往为空
      if (code !== 0) {
        const msg = `curl 退出码 ${code}: ${stderr.trim() || '(无 stderr)'}`;
        console.error(`ai 翻译失败: [${text}] -> [${msg}]`);
        recordError(`[${file}-${key}]: ${text} -> ${msg}`);
        reject(new Error(msg));
        return;
      }
      try {
        const json = JSON.parse(result);
        const translate = json.choices?.[0]?.message?.content;
        if (!translate) {
          console.error(`ai 翻译失败: [${text}] -> [${result}]`);
          recordError(`[${file}-${key}]: ${text} -> ${result}`);
          reject(new Error('接口未返回有效译文'));
          return;
        }
        resolve(translate);
      } catch (e) {
        console.error(`ai 翻译失败: [${text}] -> [${result}]`);
        recordError(`[${file}-${key}]: ${text} -> ${result}`);
        reject(e);
      }
    });
  });
};
