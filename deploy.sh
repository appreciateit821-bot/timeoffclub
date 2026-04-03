#!/bin/bash

# 타임오프클럽 자동 배포 스크립트

echo "🚀 Starting deployment..."

# 1. 빌드
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# 2. Next.js를 Cloudflare Pages용으로 변환
echo "⚡ Converting for Cloudflare Pages..."
npx @cloudflare/next-on-pages

if [ $? -ne 0 ]; then
    echo "❌ Pages conversion failed!"
    exit 1
fi

# 3. 배포
echo "🌍 Deploying to Cloudflare Pages..."
npx wrangler pages deploy .vercel/output/static --project-name=timeoffclub --branch=main

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🎉 Live at: https://timeoffclub.pages.dev"
else
    echo "❌ Deployment failed!"
    exit 1
fi