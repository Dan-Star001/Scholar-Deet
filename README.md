# Scholar Deet

Scholar Deet is a professional virtual classroom platform designed to facilitate seamless real-time learning between instructors and students. By integrating high-definition video streaming with synchronized data management, the platform provides a robust environment for remote education, classroom control, and student engagement.

---

## Overview

The platform serves as a centralized hub for instructors to manage their teaching history and for students to join live, interactive sessions. Built with a focus on minimalism and high-density information display, Scholar Deet ensures that the learning experience is unobstructed by unnecessary visual clutter while providing all the tools necessary for modern digital pedagogy.

Access the full project documentation here: [Scholar Deet Guide (PDF)](./Scholar%20Deet.pdf)

---

## Core Features

### Instructor Experience
- Comprehensive Dashboard: View real-time statistics including total sessions conducted, total students reached, and precise attendance metrics.
- Session History: Access detailed records of past sessions, including timestamps and student counts.
- Performance Analytics: Visualize student attendance trends through interactive area charts to monitor engagement over time.
- Classroom Control: Real-time management tools including the ability to mute all students, lock or unlock the chat interface, and pin important messages.
- Automated Reporting: Generate and download professional PDF summaries for each session, inclusive of attendance logs and duration data.

### Student Experience
- Seamless Access: Join sessions instantly via unique 6-character session IDs. No account creation is required for students.
- Hardware Verification: A dedicated lobby allows students to test and verify their microphone and camera status before entering the live session.
- Interaction Tools: Real-time hand-raising notifications and high-quality video/audio streaming.
- Chat Participation: Integrated messaging system for direct interaction with the instructor and peers.

### Synchronized Classroom Logic
- Global Session Timer: A shared, server-synchronized clock ensures all participants are viewing the same session duration.
- Chat Moderation: An integrated profanity filter automatically sanitizes messages to maintain a professional learning environment.
- Attendance Tracking: Automatic logging of student join and leave times, providing instructors with accurate presence data.

---

## Technical Architecture

Scholar Deet is built using a modern, event-driven stack designed for low latency and high reliability.

### Frontend
- Framework: React (Vite)
- Language: TypeScript
- Styling: Vanilla CSS and Tailwind CSS for flexible, high-performance layouts.
- Interface Components: Radix UI primitives and Shadcn/UI.
- Animations: Framer Motion for smooth state transitions.

### Infrastructure and Media
- Real-time Sync: Firebase Realtime Database handles session states, chat logs, and participant data.
- Video and Audio: Agora RTC SDK provides high-definition, low-latency media streams.
- Hosting: Optimized for serverless deployment environments like Vercel.

---

## Directory Structure

src/
├── components/
│   ├── ui/             # Reusable primitive UI components.
│   └── classroom/      # Logic-specific components (Video grids, control bars).
├── hooks/              # Custom React hooks for session management, auth, and Agora.
├── utils/              # Configuration files for Firebase, Agora, and moderation filters.
├── pages/              # Primary route components for the dashboard and classroom.
└── App.tsx             # Main routing and provider configuration.

---

## Setup and Installation

### Prerequisites
- Node.js (v18 or higher)
- Firebase Account (Realtime Database and Authentication enabled)
- Agora Developer Account (App ID)

### Local Development
1. Clone the repository to your local machine.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables by creating a .env file in the root directory:
   ```text
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_DATABASE_URL=your_database_url
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_AGORA_APP_ID=your_agora_app_id
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Usage Workflow

### For Instructors
1. Sign up or log in via the instructor portal.
2. Set your "Total Students" in the profile settings to ensure accurate attendance percentages.
3. Start a new session from the dashboard.
4. Distribute the unique session link or ID to your students.
5. Utilize the control bar to moderate chat and student participation.

### For Students
1. Navigate to the session link provided by the instructor.
2. Enter your name and verify your hardware settings.
3. Participate in the live lesson using video, audio, and chat.

---

## Security and Moderation

Data integrity and safe communication are prioritized through:
- Content Sanitization: Automatic filtering of abusive language in chat.
- Protected Routes: Only authenticated instructors can access the management dashboard and session history.
- Input Validation: All user inputs are validated via schema-based rules to prevent malformed data entry.

---

---

## Project Assets & Submission Links

To fulfill the submission requirements, all project-related documentation and design assets are linked below:

* **Presentation Slides (PDF):** [View the Project Presentation](https://github.com/Dan-Star001/Scholar-Deet/blob/main/docs/Scholar%20Deet.pdf)
    * *Covers: Project details, core features, and technical stack.*
* **Colour Palette:** [View the ScholarDeet Design Palette](https://coolors.co/3b82f6-29303d-ffffff-0a0a0a)
    * *Our palette focuses on a professional "Tech-Blue" identity with clear semantic status indicators.*

---


## License

This project is licensed under the MIT License.
