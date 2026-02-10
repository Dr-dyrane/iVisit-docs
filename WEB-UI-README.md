# 🌐 iVisit Document Generator - Next.js Web UI

A sophisticated Next.js interface for the iVisit Document Generator, featuring Apple-level design and seamless Claude Opus integration.

## 🚀 **Overview**

*   **Framework**: Next.js 14 (App Router)
*   **Styling**: Tailwind CSS + Custom Design Tokens (Medical Red #86100E)
*   **Fonts**: Inter (Sans), Space Grotesk (Heading), JetBrains Mono (Code)
*   **Features**:
    *   Glassmorphism UI components
    *   Real-time generation status
    *   Supabase memory toggle
    *   Local history of generated documents

## 🛠️ **Installation & Setup**

The Web UI is located in the `web-ui` directory.

### **1. Install Dependencies**

```bash
cd web-ui
npm install
```

### **2. Development Server**

Start the development server with hot reload:

```bash
npm run dev
```

Visit **http://localhost:3000** to see the application.

### **3. Production Build**

To run in production mode (faster):

```bash
npm run build
npm start
```

## 🏗️ **Architecture**

### **Frontend (`app/`)**
*   **`page.tsx`**: The main interface. Handles state (form inputs, recent docs) and calls the API.
*   **`layout.tsx`**: Defines global fonts and the base gradient background.
*   **`globals.css`**: Tailwind directives and custom CSS variables for the "Medical Red" theme and glass effects.

### **Backend (`app/api/`)**
*   **`api/generate/route.ts`**: The Next.js API Route.
    *   Receives POST requests from the frontend.
    *   Spawns a child process to run the CLI tool (`node ../index.js`).
    *   Streams the output back to the frontend.

## 🎨 **Design System**

The UI follows the iVisit family design language:

*   **Primary Color**: Medical Red (`#86100E` / `rgb(134 16 30)`)
*   **Secondary Color**: Deep Blue-Black (`#0B0F1A` / `rgb(11 15 26)`)
*   **Accent**: Bright Red (`#F87171`)
*   **Typography**:
    *   *Headings*: **Space Grotesk** (Modern, technical)
    *   *Body*: **Inter** (Clean, legible)
    *   *Code*: **JetBrains Mono**

## 📝 **Notes**

*   **Legacy Files**: You may see `server.js` or `index.html` in the folder. These are from the previous Express version and are **not used** by the Next.js app.
*   **CLI Dependency**: The Web UI relies on `../index.js` existing and being functional. Ensure the root dependencies are installed (`npm install` in the project root).
