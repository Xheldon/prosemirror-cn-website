#!/bin/bash

echo "VERCEL_GIT_COMMIT_MESSAGE: $VERCEL_GIT_COMMIT_MESSAGE"

if [[ "$VERCEL_GIT_COMMIT_MESSAGE" == *"更新文档[bot]"* ]]; then
  # 执行构建
  echo "✅ - 开始构建"
  exit 1
else
  # 跳过构建
  echo "🛑 - 跳过构建"
  exit 0
fi