# Ignite Parse Auth Kit

A comprehensive React Native (Expo) template powered by Ignite CLI and Parse Server, providing production-ready authentication solutions including email/password authentication, Google Sign-In integration, session persistence, and password reset functionality.

[![Build Status](https://img.shields.io/github/actions/workflow/status/your-org/ignite-parse-auth-kit/ci.yml?branch=main&style=flat-square)](https://github.com/your-org/ignite-parse-auth-kit/actions)
[![Coverage](https://codecov.io/gh/your-org/ignite-parse-auth-kit/branch/main/graph/badge.svg?style=flat-square)](https://codecov.io/gh/your-org/ignite-parse-auth-kit)
[![npm version](https://img.shields.io/npm/v/ignite-parse-auth-kit.svg?style=flat-square)](https://www.npmjs.com/package/ignite-parse-auth-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Support & Contact](#support--contact)
- [Changelog](#changelog)

---

## Features

### Authentication & Security

- **Email/Password Authentication** - Complete signup and login flow with real-time validation
- **Google Sign-In Integration** - Seamless OAuth via Expo AuthSession
- **Password Reset** - Built-in password recovery using Parse Server
- **Session Persistence** - Fast session restore using MMKV storage
- **Server Health Monitoring** - Pre-flight checks before authentication actions

### Developer Experience

- **React Native + Expo** - Cross-platform development with modern tooling
- **TypeScript Support** - Fully typed AuthContext and API responses
- **Path Aliases** - Clean imports with `@/...` syntax
- **Offline-First Ready** - Parse local datastore enabled for offline capabilities
- **Production Ready** - Comprehensive error handling and loading states

---

## Quick Start

### Prerequisites

Ensure you have the following installed on your development machine:

- **Node.js** LTS (v18 or higher)
- **Package Manager** - Yarn (recommended) or npm
- **Expo CLI** - Install globally: `npm install -g @expo/cli`
- **Mobile Development Environment**:
  - **iOS**: Xcode (macOS only)
  - **Android**: Android Studio

### Installation

1. **Use this template**
   - Click the "Use this template" button on GitHub
   - Or visit: `https://github.com/your-org/ignite-parse-auth-kit/generate`
   - Create your new repository from this template

2. **Clone your new repository**
   ```bash
   git clone https://github.com/your-username/your-new-repo-name.git
   cd your-new-repo-name
   ```

3. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

4. **Configure environment variables**
   ```bash
   # Create your environment file with Parse Server configuration
   # Add your EXPO_PUBLIC_* variables as needed
   ```

5. **Start the development server**
   ```bash
   expo start --clear
   ```

6. **Launch on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go for physical device testing

---

## Usage Guide

### Authentication Methods

The AuthContext provides a comprehensive API for handling all authentication scenarios:

### Code Examples

#### Email/Password Login
```tsx
import { useAuth } from '@/context/AuthContext'

export function LoginScreen() {
  const { setAuthEmail, setAuthPassword, login, isLoading, error } = useAuth()

  const handleLogin = async () => {
    setAuthEmail('user@example.com')
    setAuthPassword('password123')
    
    const result = await login()
    if (!result.success) {
      console.error('Login failed:', result.error)
    } else {
      console.log('Login successful!')
    }
  }

  return (
    // Your UI components here
    <LoginForm onSubmit={handleLogin} loading={isLoading} error={error} />
  )
}
```

#### User Registration
```tsx
import { useAuth } from '@/context/AuthContext'

export function SignupScreen() {
  const { setAuthEmail, setAuthPassword, signUp, isLoading } = useAuth()

  const handleSignUp = async () => {
    setAuthEmail('newuser@example.com')
    setAuthPassword('securePassword123')
    
    const result = await signUp('unique_username')
    if (result.success) {
      // User created and automatically logged in
      console.log('Account created successfully!')
    }
  }

  return (
    <SignupForm onSubmit={handleSignUp} loading={isLoading} />
  )
}
```

#### Password Reset
```tsx
import { useAuth } from '@/context/AuthContext'

export function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth()

  const handlePasswordReset = async (email: string) => {
    const result = await requestPasswordReset(email)
    if (result.success) {
      // Password reset email sent
      showSuccessMessage('Password reset email sent!')
    } else {
      showErrorMessage(result.error)
    }
  }

  return (
    <PasswordResetForm onSubmit={handlePasswordReset} />
  )
}
```

#### Google Sign-In
```tsx
import { useAuth } from '@/context/AuthContext'
import { GoogleSignin } from '@react-native-google-signin/google-signin'

export function SocialLoginScreen() {
  const { googleSignIn } = useAuth()

  const handleGoogleSignIn = async () => {
    try {
      // Get Google auth response via Expo AuthSession
      const googleResponse = await getGoogleAuthResponse()
      
      const result = await googleSignIn(googleResponse)
      if (result.success) {
        console.log('Google sign-in successful!')
      }
    } catch (error) {
      console.error('Google sign-in failed:', error)
    }
  }

  return (
    <GoogleSignInButton onPress={handleGoogleSignIn} />
  )
}
```

#### Server Health Check
```tsx
import { useAuth } from '@/context/AuthContext'

export function ServerStatusComponent() {
  const { checkServerStatus } = useAuth()

  const verifyServerConnection = async () => {
    const status = await checkServerStatus()
    
    if (status.isRunning) {
      console.log('✅ Parse Server is running')
    } else {
      console.error('❌ Server unavailable:', status.message)
    }
  }

  useEffect(() => {
    verifyServerConnection()
  }, [])

  return null
}
```

---

## Configuration

### Environment Variables

Create a `.env` file in your project root with the following required variables:

```env
# Parse Server Configuration (Required)
EXPO_PUBLIC_SERVER_URL=https://your-parse-server.herokuapp.com/parse
EXPO_PUBLIC_APP_ID=your_unique_app_identifier
EXPO_PUBLIC_JAVASCRIPT_KEY=your_javascript_key

# Optional: Google Sign-In Configuration
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Optional: Development Settings
NODE_ENV=development
```

> **⚠️ Security Note**: Never commit sensitive keys to version control. Use Expo's secure environment variable handling for production deployments.

### TypeScript Configuration

The template includes pre-configured path aliases for clean imports:

**tsconfig.json**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/*"],
      "@/components/*": ["app/components/*"],
      "@/context/*": ["app/context/*"],
      "@/lib/*": ["app/lib/*"]
    }
  }
}
```

**babel.config.js**
```javascript
module.exports = function (api) {
  api.cache(true)
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './app',
          },
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        },
      ],
    ],
  }
}
```

### Parse Server Setup

The Parse SDK is initialized in `app/lib/Parse/parse.ts` with the following configuration:

- **AsyncStorage Integration** - For React Native compatibility
- **Local Datastore** - Enabled for offline-first capabilities
- **Runtime Validation** - Environment variables are validated on app start
- **Error Handling** - Comprehensive error boundaries for Parse operations

---

## Project Structure

```text
ignite-parse-auth-kit/
├── app/                          # Main application directory
│   ├── components/               # Reusable UI components
│   ├── context/                  # React Context providers
│   │   └── AuthContext.tsx          # Central authentication state
│   ├── lib/                      # Core libraries and utilities
│   │   ├── Parse/
│   │   │   └── parse.ts             # Parse SDK initialization
│   │   └── utils/
│   │       ├── validation.ts        # Form validation helpers
│   │       └── storage.ts           # MMKV storage wrapper
│   ├── screens/                  # Application screens
│   │   ├── LoginScreen.tsx          # Email/password login
│   │   ├── RegisterScreen.tsx       # User registration
│   │   ├── ForgotPasswordScreen.tsx # Password recovery
│   │   └── DashboardScreen.tsx      # Protected route example
│   ├── navigators/               # Navigation configuration
│   │   ├── AuthNavigator.tsx        # Authentication flow
│   │   ├── AppNavigator.tsx         # Main app navigation
│   │   └── types.ts                 # Navigation type definitions
│   └── types/                    # TypeScript type definitions
│       ├── auth.ts                  # Authentication types
│       └── api.ts                   # API response types
├── assets/                       # Static assets (images, fonts)
├── .env.example                  # Environment variables template
├── app.json                      # Expo configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

---

## Development

### Available Scripts

```bash
# Start development server
npm start

# Start with cache cleared
npm run start:clear

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

### Development Workflow

1. **Feature Development** - Create feature branches from `main`
2. **Testing** - Run tests and manual testing on both platforms
3. **Code Quality** - Ensure TypeScript compliance and linting passes
4. **Documentation** - Update relevant documentation for new features

---

## Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Use this template** to create your own repository
2. **Clone** your new repository locally
3. **Create** a feature branch: `git checkout -b feat/your-feature-name`
4. **Make** your changes and improvements
5. **Test** thoroughly on both iOS and Android
6. **Submit** a pull request to the original template repository

### Contribution Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/) format
- Include tests for new features
- Update documentation for API changes
- Keep PRs focused and atomic
- Ensure all CI checks pass

### Commit Message Format
```
type(scope): description

feat(auth): add biometric authentication support
fix(login): resolve session persistence issue
docs(readme): update installation instructions
```

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

```
MIT License - Copyright (c) 2024 Ignite Parse Auth Kit

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

---

## Support & Contact

### Getting Help

- **Bug Reports**: [GitHub Issues](https://github.com/your-org/ignite-parse-auth-kit/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/your-org/ignite-parse-auth-kit/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/ignite-parse-auth-kit/wiki)
