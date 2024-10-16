# English

## Prosemirror Chinese Documentation

1. Based on Azure GPT-4o-128k + manual correction translation.
2. Comments are manually added.

## PR Instructions

1. Only need to maintain the index.json files in the dict directory; if you feel the translation is incorrect, feel free to submit a PR.
2. Modify \_translate in index.json as needed.
3. \_translate is the translated content, and \_note is your understanding of it as an annotation.\_note field supports HTML format and will be directly rendered below the original text.

## CI Steps

1. Pull from the original repository Prosemirror/website, compare with last-commit.txt; if there are updates, proceed to the next step; if not, interrupt CI.
2. cd into website, follow instructions from the original repository: after `npm i` + `make`, various index.html files will be built in the publish directory.
3. After running `npm i` in root directory, run index.js to query dictionary files (index.json) in dict directories that match paths with those under public for Chinese replacement; if fields aren't found, perform AI translation and update dictionary.
4. Move `website/public` directory up one level into `public` directory and push remotely to trigger Vercel's build update.

## Local Build Instructions

1. Follow above CI steps until reaching third step
2. cd into website and run `npm run devserver -- --port 8888`; then open port 8888 for viewing—if everything looks good execute fourth step of above CI process.

## Notes To Prevent Future Forgetfulness On My Part

1. This project's CI can be triggered two ways: manually or via weekly checks once per week
   2.CI may modify files within dict directories along with generating new index.htmls overwriting same-path/same-name ones inside public
   3.CI commits modifications back into this repo triggering Vercel updates hence merges cannot trigger here

# 中文说明

## Prosemirror 中文文档

1. 基于 Azure GPT-4o-128k + 人工修正翻译。
2. 注释部分为人工添加。

## PR 说明

1. 只需要维护 dict 目录的各个 index.json 即可，如果感觉翻译的不对，欢迎提交 PR。
2. 修改 index.json 中的 \_translate 即可。
3. \_translate 是翻译内容，\_note 是你对内容的理解注释。\_note 字段支持 HTML 格式，会直接渲染到原文下方。

## CI 步骤

1. 拉取原仓库 Prosemirror/website，对比 last-commit.txt，有更新则执行下一步，无更新则中断 CI。
2. cd 到 website，按原仓库说明，`npm i` + `make` 后，会构建出 publish 目录的各个 index.html
3. 根目录 `npm i` 后，运行 index.js，查询跟 index 在 public 中同路径的 dict 目录中的 index.json 字典，进行中文替换，如果字段未查询到，则进行 AI 翻译并更新字典。
4. 将 website 中的 public 目录移动到上层的 docs 目录中，推送到远端，出发 Vercel 的构建更新。

## 本地构建说明

1. 按照上述的 CI 步骤，运行到第三步后
2. cd 到 website，运行 `npm run devserver -- --port 8888` 之后打开 `8888` 端口即可查看，没问题的话执行上面 CI 步骤的第四步即可。

## 防止将来我自己忘记的备注

1. 本项目 CI 有两种触发方式：手动触发和每周检查一次。
2. ci 可能会修改 dict 目录中的文件，以及新产生 index.html 覆盖 public 中的同路径同名文件。
3. ci 会将修改再次提交到本仓库中，以触发 Vercel 的更新，因此本仓库不能通过 Merge 触发。
