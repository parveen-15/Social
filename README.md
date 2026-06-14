# SocialApp

A modern social networking web app inspired by Instagram + OmeTV.

## Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

## Setup & Run

### 1. Start MongoDB
Make sure MongoDB is running locally (default port 27017).

### 2. Start the backend server
```bash
cd server
npm install
npm run dev
```
Server starts on http://localhost:5000

### 3. Start the frontend (new terminal)
```bash
cd client
npm install
npm run dev
```
App opens on http://localhost:5173

## Features
- **Home** — Instagram-style feed: create posts with images & captions, like, comment
- **Chats** — Real-time messaging with Socket.IO, typing indicators, online status
- **Find Friends** — Browse/search users, send/accept friend requests, start chats
- **Random Video Call** — OmeTV-style WebRTC random matching, Next/Report/Block
- **Profile** — Edit bio/email/phone, upload avatar & photos, manage friends

## Demo Accounts
Pick any of 5 pre-seeded demo users from the login screen — no passwords needed.
Open multiple browser tabs with different users to test real-time features.
