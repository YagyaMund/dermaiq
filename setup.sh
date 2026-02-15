#!/bin/bash

# DermaIQ Setup Script

echo "🚀 Setting up DermaIQ - AI Product Image Analyzer"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Please create .env.local and add your OpenAI API key:"
    echo ""
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo ""
    exit 1
fi

# Check if OPENAI_API_KEY is set
if grep -q "your_openai_api_key_here" .env.local; then
    echo "⚠️  Warning: Please replace 'your_openai_api_key_here' with your actual OpenAI API key in .env.local"
    echo ""
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Dependencies installed"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""
