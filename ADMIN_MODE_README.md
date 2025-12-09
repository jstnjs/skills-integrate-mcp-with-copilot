# Admin Mode Implementation

## Overview
This implementation adds authentication to prevent students from removing each other from activities. Only authenticated teachers can register and unregister students.

## Test Credentials

For testing purposes, use these credentials:

**Teacher 1:**
- Username: `teacher1`
- Password: `password123`

**Teacher 2:**
- Username: `teacher2`
- Password: `password456`

## How It Works

### Student View (Not Logged In)
- Can view all activities and participants
- Cannot see delete (❌) buttons next to participants
- Cannot access the signup form
- See a message to login to register students

### Teacher View (Logged In)
- Can view all activities and participants
- Can see and use delete (❌) buttons to unregister students
- Can access the signup form to register students
- User icon (👤) appears in the top right corner
- Can logout from the dropdown menu

## Technical Details

### Backend Changes
- Added authentication endpoints: `/auth/login`, `/auth/logout`, `/auth/status`
- Protected signup and unregister endpoints with authentication middleware
- Session-based authentication using secure cookies
- Teacher credentials stored in `teachers.json` with bcrypt-hashed passwords

### Frontend Changes
- Login modal for teacher authentication
- User icon and dropdown menu in header
- Conditional rendering of delete buttons based on auth status
- Auth-required message for the signup form
- Login link for easy access to authentication

### Security Features
- Passwords hashed with bcrypt
- HttpOnly cookies for session management
- 24-hour session timeout
- Secure session ID generation

## Password Hashes
The password hashes in `teachers.json` were generated using bcrypt with cost factor 12:
- `password123` → `$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBwtK5Nq6`
- `password456` → `$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW`
