// Note: 中文站 SEO。只改 <head> 前缀和站点级抓取文件，不动译文正文。
// Cloudflare Pages 在根目录没有 404.html 时，会把任意未知路径以 200 回成首页，
// 所以 sitemap.xml / robots.txt 曾经拿到的是首页 HTML。必须先放上真实文件。

const fs = require('fs');
const path = require('path');

const SITE = 'https://prosemirror.xheldon.com';
const OG_IMAGE = `${SITE}/img/picture.png`;
const SITEMAP_URL = `${SITE}/sitemap.xml`;

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: ${SITEMAP_URL}
`;

// Note: 与线上最终地址一致：目录页带尾斜杠，backers.html 被 Pages 308 到 /backers。
const PAGES = {
  '/': {
    title: 'ProseMirror 中文文档',
    description:
      '用于在网页上构建结构化富文本编辑器的工具包。支持协作编辑、可扩展文档模型和模块化插件。本站为中文译本。',
  },
  '/docs/': {
    title: 'ProseMirror 文档',
    description:
      'ProseMirror 中文文档入口，包含指南、API 参考手册、示例，以及版本更新记录和社区资源。',
  },
  '/docs/guide/': {
    title: 'ProseMirror 指南',
    description:
      '介绍 ProseMirror 的文档模型、Schema、变换、编辑器状态、视图、命令与协作编辑，建议按章节顺序阅读。',
  },
  '/docs/ref/': {
    title: 'ProseMirror 参考手册',
    description:
      'ProseMirror 公共 API 中文参考，按模块列出 model、state、view、transform 等接口说明。',
  },
  '/docs/changelog/': {
    title: 'ProseMirror 更新日志',
    description: 'ProseMirror 各模块的版本发布记录与变更说明中文译本。',
  },
  '/examples/': {
    title: 'ProseMirror 示例',
    description:
      'ProseMirror 示例与实现说明，包括基础编辑器、Markdown、菜单、Schema、图片上传、脚注和协作编辑。',
  },
  '/examples/basic/': {
    title: 'ProseMirror 基础示例',
    description:
      '用 prosemirror-example-setup 和基础 Schema（含列表）快速配置一个可用的 ProseMirror 富文本编辑器。',
  },
  '/examples/dino/': {
    title: 'ProseMirror 自定义节点示例',
    description:
      '通过自定义 Schema 节点，在 ProseMirror 文档里加入站点特有的元素。本例把恐龙做成文档节点。',
  },
  '/examples/markdown/': {
    title: 'ProseMirror Markdown 示例',
    description:
      '在 Markdown 文本框和 ProseMirror 编辑界面之间切换，输入输出仍是 Markdown，无需改后端。',
  },
  '/examples/tooltip/': {
    title: 'ProseMirror 工具提示示例',
    description:
      '用插件视图做悬停在选区上的动态工具提示，用来放选中文字后才出现的编辑控件。',
  },
  '/examples/upload/': {
    title: 'ProseMirror 图片上传示例',
    description:
      '选择本地图片后先插入占位符并开始上传，上传完成后再把占位符换成最终图片。',
  },
  '/examples/schema/': {
    title: 'ProseMirror Schema 示例',
    description:
      '不依赖现成的基础 Schema，从零编写几种不同文档样式各自允许的结构。',
  },
  '/examples/menu/': {
    title: 'ProseMirror 菜单示例',
    description:
      '为 ProseMirror 编辑器搭建自定义菜单栏。示例菜单包只适合入门，不建议直接用于生产。',
  },
  '/examples/fold/': {
    title: 'ProseMirror 折叠节点示例',
    description:
      '用节点装饰和节点视图实现可折叠区块，让读者隐藏或展开其中的内容。',
  },
  '/examples/codemirror/': {
    title: 'ProseMirror 内嵌代码编辑器示例',
    description:
      '用节点视图把代码块渲染成始终可见的 CodeMirror 编辑器，并与外层 ProseMirror 文档同步。',
  },
  '/examples/lint/': {
    title: 'ProseMirror 文档检查示例',
    description:
      '扫描文档中的常见问题，用装饰标出范围，单击定位、双击尝试自动修复。',
  },
  '/examples/footnote/': {
    title: 'ProseMirror 脚注示例',
    description:
      '把脚注做成带内容的内联节点，并用一个内嵌的 ProseMirror 子编辑器修改脚注正文。',
  },
  '/examples/track/': {
    title: 'ProseMirror 变更跟踪示例',
    description:
      '把编辑步骤保留下来，以便提交一批更改、逐条撤销，并查看某段文字来自哪一次提交。',
  },
  '/examples/collab/': {
    title: 'ProseMirror 协作编辑示例',
    description:
      '编辑器连接协作服务，让正在编辑同一篇文档的人看到彼此的修改。',
  },
  '/backers': {
    title: 'ProseMirror 赞助者名单',
    description:
      '2015 年通过众筹资助 ProseMirror 开源的个人与组织名单，筹集总额 50,000 欧元。',
  },
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const normalizeRel = (fileKey) => {
  let rel = String(fileKey).replace(/\\/g, '/');
  const website = rel.indexOf('website/public/');
  if (website !== -1) return rel.slice(website + 'website/public/'.length);
  const pub = rel.indexOf('/public/');
  if (pub !== -1) return rel.slice(pub + '/public/'.length);
  if (rel.startsWith('public/')) return rel.slice('public/'.length);
  return rel.replace(/^\.\//, '');
};

const canonicalUrlForFile = (fileKey) => {
  const rel = normalizeRel(fileKey);
  if (rel === '404.html') return null;
  let pathname;
  if (rel === 'index.html') pathname = '/';
  else if (rel.endsWith('/index.html')) pathname = `/${rel.slice(0, -'index.html'.length)}`;
  else if (rel.endsWith('.html')) pathname = `/${rel.slice(0, -'.html'.length)}`;
  else pathname = `/${rel}`;
  return new URL(pathname, SITE).href;
};

const chineseFromEnglish = (title) => {
  const raw = String(title || '').trim();
  const specific = [
    [/embedded code editor/i, '内嵌代码编辑器示例'],
    [/friendly markdown/i, 'Markdown 示例'],
    [/dinos in the document/i, '自定义节点示例'],
    [/schemas from scratch/i, 'Schema 示例'],
    [/adding a menu/i, '菜单示例'],
    [/folding nodes/i, '折叠节点示例'],
    [/editing footnotes/i, '脚注示例'],
    [/tracking changes/i, '变更跟踪示例'],
    [/upload handling/i, '图片上传示例'],
    [/tooltips/i, '工具提示示例'],
    [/linting example/i, '文档检查示例'],
    [/collaborate/i, '协作编辑示例'],
    [/reference manual/i, '参考手册'],
    [/version changelog|changelog/i, '更新日志'],
    [/backer list/i, '赞助者名单'],
    [/guide/i, '指南'],
    [/examples/i, '示例'],
    [/docs/i, '文档'],
  ];
  for (const [pattern, zh] of specific) {
    if (pattern.test(raw)) return `ProseMirror ${zh}`;
  }
  let name = raw.replace(/^ProseMirror\s+/i, '');
  if (/example$/i.test(name)) {
    name = name.replace(/example$/i, '示例').replace(/\s+/g, ' ').trim();
    return `ProseMirror ${name}`;
  }
  if (!name || /^prosemirror$/i.test(raw)) return 'ProseMirror 中文文档';
  return `ProseMirror ${name}`;
};

const metaForPath = (pathname, englishTitle) => {
  if (PAGES[pathname]) return PAGES[pathname];
  const title = chineseFromEnglish(englishTitle);
  return {
    title,
    description: `${title}。ProseMirror 中文文档中的一页。`,
  };
};

const renderTags = (meta, href) => {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  return [
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${href}">`,
    `<meta property="og:locale" content="zh_CN">`,
    `<meta property="og:site_name" content="ProseMirror 中文文档">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${href}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    `<meta property="og:image:alt" content="ProseMirror 标志">`,
    `<meta property="og:image:width" content="200">`,
    `<meta property="og:image:height" content="200">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${OG_IMAGE}">`,
  ].join('');
};

const stripManaged = (head) =>
  head
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<meta\s+content="[^"]*"\s+name="description"\s*\/?>/gi, '')
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/gi, '')
    .replace(/<link\s+href="[^"]*"\s+rel="canonical"\s*\/?>/gi, '')
    .replace(/<meta\s+property="og:[^"]+"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<meta\s+content="[^"]*"\s+property="og:[^"]+"\s*\/?>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]+"\s+content="[^"]*"\s*\/?>/gi, '')
    .replace(/<meta\s+content="[^"]*"\s+name="twitter:[^"]+"\s*\/?>/gi, '');

const setLang = (head) =>
  head.replace(/<html\b([^>]*)>/i, (full, attrs) => {
    let next = attrs;
    if (/\blang=/i.test(next)) {
      next = next.replace(/\blang=(["'])[\s\S]*?\1/i, 'lang="zh-CN"');
      next = next.replace(/\blang=[^\s>]+/i, 'lang="zh-CN"');
    } else {
      next += ' lang="zh-CN"';
    }
    return `<html${next}>`;
  });

// Note: 只改 </head> 或首个 <header 之前的前缀，避免重写译文正文。
const applySeoToHtml = (html, fileKey) => {
  const href = canonicalUrlForFile(fileKey);
  if (!href) return html;
  const pathname = new URL(href).pathname;
  const headEnd = html.search(/<\/head>|<header\b/i);
  const end = headEnd === -1 ? html.length : headEnd;
  let head = html.slice(0, end);
  const rest = html.slice(end);
  const titleMatch = head.match(/<title>([^<]*)<\/title>/i);
  const meta = metaForPath(pathname, titleMatch ? titleMatch[1] : '');
  const block = renderTags(meta, href);
  head = stripManaged(head);
  if (/<title>[^<]*<\/title>/i.test(head)) {
    head = head.replace(
      /<title>[^<]*<\/title>/i,
      `<title>${escapeHtml(meta.title)}</title>${block}`
    );
  } else {
    head += `<title>${escapeHtml(meta.title)}</title>${block}`;
  }
  head = setLang(head);
  return head + rest;
};

const walkHtml = (root, dir = root, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(root, full, out);
    else if (ent.isFile() && ent.name.endsWith('.html')) {
      out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  return out;
};

const notFoundHtml = () => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>页面未找到 | ProseMirror 中文文档</title>
<meta name="description" content="这个地址没有对应的 ProseMirror 中文文档页面。">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/css/site.css">
</head>
<body>
<header>
  <nav>
    <a class="logo" href="/">ProseMirror</a>
    <div class="navlinks">
      <a href="/examples/">示例</a>
      <a href="/docs/">文档</a>
    </div>
  </nav>
</header>
<article>
  <h1>页面未找到</h1>
  <p>这个地址没有对应的文档页面。可以从<a href="/">首页</a>、<a href="/docs/">文档</a>或<a href="/examples/">示例</a>继续看。</p>
</article>
</body>
</html>
`;

const sitemapXml = (urls) => {
  const body = urls
    .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};

const writeRobotsAndNotFound = (root) => {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'robots.txt'), ROBOTS_TXT);
  fs.writeFileSync(path.join(root, '404.html'), notFoundHtml());
};

const writeCrawlFiles = (root) => {
  const files = walkHtml(root)
    .filter((rel) => rel !== '404.html')
    .sort();
  const urls = [];
  for (const rel of files) {
    const full = path.join(root, rel);
    const html = fs.readFileSync(full, 'utf8');
    const next = applySeoToHtml(html, rel);
    if (next !== html) fs.writeFileSync(full, next);
    const href = canonicalUrlForFile(rel);
    if (href) urls.push(href);
  }
  urls.sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemapXml(urls));
  writeRobotsAndNotFound(root);
  return urls;
};

const assertTree = (root) => {
  const files = walkHtml(root)
    .filter((rel) => rel !== '404.html')
    .sort();
  const urls = [];
  for (const rel of files) {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    const href = canonicalUrlForFile(rel);
    const meta = metaForPath(new URL(href).pathname, '');
    const headEnd = html.search(/<\/head>|<header\b/i);
    const head = html.slice(0, headEnd === -1 ? html.length : headEnd);
    const title = `<title>${escapeHtml(meta.title)}</title>`;
    if (!head.includes(title)) throw new Error(`${rel} 标题不是中文页标题`);
    if (!head.includes(`name="description" content="${escapeHtml(meta.description)}"`)) {
      throw new Error(`${rel} 缺少 description`);
    }
    if ((head.match(/rel="canonical"/g) || []).length !== 1) {
      throw new Error(`${rel} canonical 数量不对`);
    }
    if (!head.includes(`rel="canonical" href="${href}"`)) {
      throw new Error(`${rel} canonical 不是 ${href}`);
    }
    if (!head.includes(`property="og:url" content="${href}"`)) {
      throw new Error(`${rel} og:url 与 canonical 不一致`);
    }
    if (!head.includes(`property="og:title" content="${escapeHtml(meta.title)}"`)) {
      throw new Error(`${rel} og:title 与 title 不一致`);
    }
    if (!head.includes('lang="zh-CN"')) throw new Error(`${rel} lang 不是 zh-CN`);
    urls.push(href);
  }
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expected = [...urls].sort((a, b) => a.localeCompare(b));
  if (locs.join('\n') !== expected.join('\n')) {
    throw new Error(`sitemap 与页面不一致\n${locs.join('\n')}\n---\n${expected.join('\n')}`);
  }
  if (sitemap.includes('404')) throw new Error('sitemap 包含 404');
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  if (robots !== ROBOTS_TXT) throw new Error('robots.txt 与预期不一致');
  const notFound = fs.readFileSync(path.join(root, '404.html'), 'utf8');
  if (!/noindex/i.test(notFound)) throw new Error('404 未 noindex');
  if (/rel="canonical"/i.test(notFound)) throw new Error('404 不应有 canonical');
  return expected;
};

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, 'public'));
  writeCrawlFiles(root);
  const urls = assertTree(root);
  console.log(`SEO updated ${urls.length} URLs in ${root}`);
}

module.exports = {
  SITE,
  PAGES,
  applySeoToHtml,
  canonicalUrlForFile,
  writeCrawlFiles,
  writeRobotsAndNotFound,
  assertTree,
};
