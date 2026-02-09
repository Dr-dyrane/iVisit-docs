# iVisit Document Generator - Web UI

A beautiful web interface for generating professional documents with AI precision.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd web-ui
npm install
```

### 2. Start Server
```bash
npm start
```

### 3. Open Browser
Navigate to: http://localhost:3001

## ✨ Features

### 🎨 **Apple-Level Design**
- Beautiful gradient backgrounds with glass morphism
- Smooth animations and transitions
- Responsive design for all devices
- iVisit branding throughout

### ⌨️ **Keyboard Shortcuts**
- `Ctrl + P` - Print current document
- `Ctrl + G` - Generate document
- `Ctrl + K` - Show keyboard shortcuts
- `ESC` - Close modals

### 📄 **Document Generation**
- Pre-configured templates (Business, Legal, Technical, etc.)
- Custom prompt support
- Real-time generation status
- Recent document history

### 🖨 **Smart Features**
- Local storage for recent documents
- Print-optimized view
- Live status updates
- Error handling with user feedback

## 📁 **Project Structure**

```
web-ui/
├── index.html          # Beautiful web interface
├── server.js           # Express backend server
├── package.json         # Web UI dependencies
└── README.md           # This file
```

## 🎯 **Usage**

### **Generate Documents**
1. Select document type from dropdown
2. Choose to use Supabase memory (optional)
3. Click "Generate" or press `Ctrl + G`
4. View real-time generation status
5. Print with `Ctrl + P` or download from `/docs` folder

### **Document Types**
- **Business Proposal** - Comprehensive business documents
- **Privacy Policy** - Complete privacy documentation
- **Product Requirements** - PRD for features and APIs
- **Technical Documentation** - Architecture and system docs
- **API Documentation** - Backend service documentation
- **Legal Document** - Terms of service and legal docs
- **Custom Request** - Your own prompt

### **Print Features**
- Print-optimized formatting
- Clean typography
- Professional layout
- `Ctrl + P` shortcut for quick printing

## 🔧 **Configuration**

### **Environment Variables**
```env
WEB_PORT=3001                    # Web server port
ANTHROPIC_API_KEY=your-key      # Claude API key
SUPABASE_URL=your-url           # Optional: Supabase URL
SUPABASE_SERVICE_ROLE_KEY=your-key # Optional: Supabase key
```

### **Customization**
- Modify `index.html` for UI changes
- Update `server.js` for backend logic
- Add new document types in the dropdown
- Customize styling with Tailwind CSS

## 🌐 **API Endpoints**

### **POST /generate**
Generate a new document
```json
{
  "prompt": "Generate business proposal",
  "useSupabase": true
}
```

### **GET /health**
Health check endpoint
```json
{
  "status": "healthy",
  "timestamp": "2026-02-09T09:00:00.000Z",
  "version": "1.0.0"
}
```

## 🎨 **Design System**

### **Colors**
- Primary: `#86100E` (Medical Red)
- Secondary: `#0B0F1A` (Deep Blue-Black)
- Accent: `#F43F5E` (Bright Red)
- Background: Gradient from Medical Red to Deep Blue

### **Typography**
- Font: Inter (Apple system font fallback)
- Hierarchy: Clear heading and body sizes
- Spacing: Professional line height

### **Animations**
- Floating elements for visual interest
- Pulse effects for CTA buttons
- Smooth transitions between states

## 🚀 **Deployment**

### **Local Development**
```bash
npm start
# Server runs on http://localhost:3001
```

### **Production**
```bash
# Use PM2 for process management
pm2 start server.js

# Or deploy to Vercel/Netlify with serverless functions
```

## 📱 **Mobile Support**

- Fully responsive design
- Touch-friendly buttons
- Optimized for mobile browsers
- Print functionality works on mobile

## 🎉 **Enjoy!**

Generate beautiful, professional documents with the power of Claude AI and iVisit's design excellence!
