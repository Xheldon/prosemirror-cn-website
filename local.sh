#!/bin/bash

# 此脚本用于方便本地构建，不走 Github Action，其行为与 Github Action 一致

rm -rf website

git clone https://github.com/ProseMirror/website.git
cd website
npm i
cat ../append-head.html >> templates/head.html
make

cd ..
node index.js
