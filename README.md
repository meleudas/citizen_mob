# Citizen Mob — Law-Abiding Citizen

Mobile app for reporting and tracking public violations (Ukraine).
Built with React Native, Expo, and Redux Toolkit.

## Features

- Auth (login, register, guest mode)
- Violation CRUD with photo upload
- Map with markers and clustering
- Calendar view
- Offline storage and auto-sync
- Ukrainian / English i18n, light/dark theme

## Tech Stack

React Native · Expo 54 · Redux Toolkit · React Navigation · Cloudinary · SQLite

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Run `npm install`
4. Run `npx expo start`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset |
| `EXPO_PUBLIC_API_URL` | Backend API base URL |

## API

Production: `https://server.citizen-mob.com/api`

## License

[0BSD](LICENSE)
