// Note: 读取 public 目录下的 docs/ref 下的 index.html，解析出其中的 article 内容，翻译其中的中文，写回 index.html

const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const glob = require('glob');
const { Semaphore } = require('async-mutex');

const { translate } = require('./utils');
// 使用信号量控制并发

const args = process.argv.slice(2);
const MAX_CONCURRENT = 2;

// Note: 配置各个文件需要翻译的节点选择器，如果不存在，则默认翻译页面首个 article 中的全部 p 标签内容
const defaultConfig = (more) => {
  return [
    {
      container: 'header',
      selector: 'h1, .navlinks a',
    },
    {
      container: 'article',
      selector: `p, div#content h3, pre span.tok-comment${
        more ? `, ${more}` : ''
      }`,
    },
  ];
};
const config = {
  'website/public/index.html': [...defaultConfig()],
  'website/public/examples/index.html': [...defaultConfig('h2, h3')],
  'website/public/examples/basic/index.html': [...defaultConfig('ul li, h1')],
  'website/public/examples/markdown/index.html': [
    ...defaultConfig('textarea#content'),
  ],
  'website/public/docs/ref/index.html': [
    ...defaultConfig('ul li, #part_top h2'),
  ],
  'website/public/docs/index.html': [...defaultConfig('h2, h3')],
};

const propertyMap = {
  'og:title': 'ProseMirror 中文',
  'og:url': 'https://prosemirror.xheldon.com',
  'og:image': 'https://prosemirror.xheldon.com/img/picture.png',
  'og:description': '基于浏览器的结构化文本编辑器组件',
};
const semaphore = new Semaphore(MAX_CONCURRENT);
// 使用 glob 模块来匹配文件
let files;
files = glob.sync(path.resolve(__dirname, `website/public/**/index.html`));
Promise.all(
  files.map((file) => {
    return new Promise((rootResolve) => {
      const rawString = fs.readFileSync(file, 'utf8');
      if (!rawString) {
        console.error('文件不存在');
        process.exit(1);
      }
      const key = path.relative(__dirname, file);
      const dom = new JSDOM(rawString);
      const document = dom.window.document;

      // Note: 修改 head 部分的 meta 信息
      document.querySelector('html').setAttribute('lang', 'zh-CN');
      const head = document.querySelector('head');
      if (head) {
        const metas = head.querySelectorAll('meta');
        if (metas.length) {
          metas.forEach((meta) => {
            const property = meta.getAttribute('property');
            if (property && propertyMap[property]) {
              meta.setAttribute('content', propertyMap[property]);
            }
          });
        }
        // Note: 增加 google 统计/广告（要吃饭呀）
        // Note: 谷歌统计
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-KQYXRE0B3X';
        head.appendChild(script);
        const script2 = document.createElement('script');
        script2.innerHTML = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-KQYXRE0B3X')`;
        head.appendChild(script2);
        // Note: 谷歌广告
        const script3 = document.createElement('script');
        script3.async = true;
        script3.crossorigin = 'anonymous';
        script3.src =
          'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5486286026923411';
        head.appendChild(script3);
      }

      // Note: 修改 nav 部分，增加译者博客地址
      const nav = document.querySelector('header .navlinks');
      if (nav) {
        const a = document.createElement('a');
        a.href = 'https://www.xheldon.com';
        a.target = '_blank';
        a.textContent = '译者';
        nav.appendChild(a);
      }
      const banner = document.createElement('div');
      banner.id = 'banner-info';
      // Note: 整站通知
      const p = key.replace('website/public', '').replace('index.html', '');
      banner.innerHTML = `本文档为 GPT-4o + 人工翻译，hover 可以显示原文。<a style="cursor: pointer;" href="https://prosemirror-old.xheldon.com${p}" target="_blank">原始翻译地址</a>。翻译有问题？<a style="cursor: pointer;" href="https://github.com/Xheldon/prosemirror-cn-website/blob/main/dict${p}index.json" target="_blank">我来翻译！</a>`;
      const header = document.querySelector('header');
      if (header) {
        header.parentNode.insertBefore(banner, header);
      }

      // Note: 指南和接口文档增加译者前言
      const add = document.createElement('div');
      add.id = 'add-info';
      add.innerHTML = `<blockquote>
  本手册/文档采用 GPT-4o + 人工方式翻译。每周检查一次原仓库或手动更新，<a href="https://github.com/Xheldon/prosemirror-cn-website" target="_blank">欢迎 Star 和 PR</a>。
  </blockquote>
  <b>译者前言：</b>
  <ol>
  <li><b>鼠标悬浮在中文上会出现英文原文，方便读者在觉得翻译质量不行的时候直接查看原文（欢迎 PR 更好的翻译）。</b></li>
  <li><b>因为有些接口需要上下文，因此译者的增加了注释以对此进行额外的说明，以灰色背景块显示出来，代表了译者对某个接口的理解。</b></li>
  <li><b>如果你觉得我的工作有帮助，可以 <a href="https://www.xheldon.com/donate/" target="_blank">赏杯咖啡钱</a> 。</b></li>
  <li><b>欢迎关注我的技术/生活公众号「开二度魔法」，id：CoderXheldon </b></li>
  </ol>
  <hr>`;
      if (key.includes('docs/ref/index.html')) {
        const h2 = document.querySelector(`#part_top h2`);
        if (h2) {
          h2.parentNode.insertBefore(add, h2);
        }
      }
      if (key.includes('docs/guide/index.html')) {
        const h1 = document.querySelector(`article h1`);
        if (h1) {
          h1.parentNode.insertBefore(add, h1);
        }
      }
      if (key.includes('docs/index.html')) {
        const ul = document.querySelectorAll('article .grid-list')?.[1];
        if (ul) {
          const li = document.createElement('li');
          li.innerHTML = `<a href="https://www.xheldon.com/" class="blocklink">
      <h3>译者博客</h3>
      <p data-x-en="ProseMirror 翻译者的个人博客，域名的 .com 和 .cn 均可访问">ProseMirror 翻译者的个人博客，域名的 .com 和 .cn 均可访问</p>
    </a>`;
          ul.appendChild(li);
        }
      }

      // Note: 如果 config 中的路径文件不存在，则使用默认，否则使用 config 配置文件
      let list = [];
      list = (config[key] || defaultConfig())
        .map((c) => {
          const container = document.querySelector(c.container);
          if (!container) {
            console.log(`${file} 未找到 ${c.container} 标签`);
            return;
          }
          return [...container.querySelectorAll(c.selector)] || [];
        })
        .flat()
        .filter(Boolean);
      if (!list.length) {
        console.log(`${file} 不存在可翻译内容，中断`);
        return;
      }

      const dictPath = file
        .replace('.html', '.json')
        .replace('public', 'dict')
        .replace('/website', '');
      if (!fs.existsSync(dictPath)) {
        // Note: 如果不存在，则递归创建
        fs.mkdirSync(path.dirname(dictPath), { recursive: true });
        fs.writeFileSync(dictPath, '{}');
      }
      let dict = {};
      try {
        dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      } catch (error) {
        console.error(`${dictPath} 解析失败, 跳过`);
        return;
      }
      Promise.all(
        Array.from(list).map((item, key) => {
          return new Promise((resolve) => {
            const text = item.innerHTML.trim();
            // Note: 移除换行符
            const pureText = item.textContent.trim().replace(/\s+/gm, ' ');
            if (!pureText) return;
            if (dict[pureText]) {
              if (dict[pureText]._translate) {
                item.innerHTML = dict[pureText]._translate;
                // Note: hover 显示原文，不需要 html 标签
                if (item.tagName === 'P' || item.tagName === 'LI') {
                  item.setAttribute('data-x-en', pureText);
                }
              }
              // Note: 如果有注释，则插入到当前 p 后面
              if (dict[pureText]._note) {
                const note = document.createElement('div');
                note.setAttribute('type', 'comment');
                note.innerHTML = dict[pureText]._note;
                // Note: 如果 p 本身在 a 标签里面，而 p 内又有 a 标签，那么实际渲染的时候会发生意外当的情况
                if (item.parentNode.tagName === 'A') {
                  item.parentNode?.parentNode?.insertBefore(
                    note,
                    item.parentNode?.nextSibling
                  );
                } else {
                  item.parentNode.insertBefore(note, item.nextSibling);
                }
              }
              resolve();
            } else {
              semaphore.acquire().then(() => {
                translate(text, { key: file })
                  .then((translate) => {
                    dict[pureText] = {
                      _translate: translate,
                      _note: '',
                    };
                    console.log('AI 翻译:', `${pureText} -> ${translate}`);
                    // Note: 跟之前一样替换
                    item.innerHTML = dict[pureText]._translate;
                    item.setAttribute('data-x-en', pureText);
                  })
                  .finally(() => {
                    // Note: 随机增加延迟
                    setTimeout(() => {
                      semaphore.release();
                      resolve();
                    }, Math.random() * 5000);
                  });
              });
            }
          });
        })
      ).finally(() => {
        // 在文件处理完成后（不管有没有错误,保存更新后的字典
        console.log(`${file} 翻译完成`);
        fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2));
        fs.writeFileSync(file, dom.serialize());
        rootResolve();
      });
    });
  })
).finally(() => {
  console.log(`文件全部翻译完成`);
});
