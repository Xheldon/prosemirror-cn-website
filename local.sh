#!/bin/bash

# 此脚本用于方便本地构建，不走 Github Action，其行为与 Github Action 一致

rm -rf website

# 上游已迁移至 Forgejo 平台，旧的 github.com/ProseMirror/website 已 archive 不再更新
git clone https://code.haverbeke.berlin/prosemirror/website.git
cd website
npm i
cat ../append-head.html >> templates/head.html
make

cd ..
node index.js
