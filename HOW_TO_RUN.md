# 🚀 How to Run Flowfex - Complete Guide

## Prerequisites

Before you start, make sure you have:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A code editor (VS Code recommended)

### Check Your Installation

```bash
node --version   # Should show v16.x.x or higher
npm --version    # Should show 8.x.x or higher
```

## 📁 Project Structure

```
flowfex/
├── backend/              # Node.js backend (already exists)
├── frontend/            # React frontend (newly created)
│   ├── src/
│   │   ├── assets/      # Logo component
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # All 8 pages
│   │   ├── store/       # State management
│   │   └── styles/      # Design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── HOW_TO_RUN.md       # This file
```

## 🎯 Quick Start (Frontend Only)

### Step 1: Navigate to Frontend

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- React 18
- React Router 6
- Zustand (state management)
- Vite (build tool)
- Lucide React (icons)
- Framer Motion (animations)
- D3 (data visualization)

**Installation time:** ~30-60 seconds

### Step 3: Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Step 4: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

**🎉 You should now see the Flowfex landing page with the animated logo!**

## 🌐 Explore the Application

### Available Routes

| Route | Description | Features |
|-------|-------------|----------|
| `/` | Landing Page | Live canvas background, feature showcase, animated logo |
| `/signin` | Sign In | Live canvas, password toggle, remember me |
| `/signup` | Sign Up | Multi-step flow, password strength, use case selection |
| `/onboarding` | Onboarding | 4 connection methods, animated logo, code snippets |
| `/canvas` | Main App | Interactive canvas, node graph, pan/zoom, animations |
| `/session/:id` | Session Detail | Session timeline, execution path |
| `/history` | History | Grid of past sessions, search |
| `/settings` | Settings | Account, agents, API keys, preferences |

### 🎨 What to Look For

#### Landing Page (`/`)
- **Animated canvas background** with flowing particles
- **Flowfex logo** in navigation (full variant)
- **Hero section** with character reveal animation
- **Feature sections** with mini-canvas demonstrations
- **Scroll down** to see all features

#### Canvas Page (`/canvas`)
- **Click any node** to open right drawer with details
- **Drag canvas** to pan around
- **Scroll wheel** to zoom in/out
- **Toggle modes** (MAP/FLOW/LIVE) in top bar
- **Click Start** to activate particle animations
- **Left sidebar** shows agents and sessions
- **Animated logo** in top bar

#### Onboarding (`/onboarding`)
- **Animated logo** pulses on welcome screen
- **4 connection methods** with interactive cards
- **Code snippets** with copy functionality
- **Waiting state** with connection detection

## 🎨 Logo Integration

The Flowfex logo is now integrated throughout:

### Where You'll See It

1. **Landing Page Navigation** - Full logo (icon + wordmark)
2. **Landing Page Footer** - Full logo
3. **Sign In Page** - Full logo at top
4. **Sign Up Page** - Full logo at top
5. **Onboarding Welcome** - Animated icon (80px, pulsing nodes)
6. **Main App Top Bar** - Full logo (clickable, returns to home)
7. **Loading States** - Animated icon with pulsing nodes

### Logo Variants

- **Full:** Icon + "FLOWFEX" wordmark
- **Icon:** Just the connected nodes
- **Animated:** Nodes pulse, connections glow

### Logo Colors

Adapted to Flowfex palette:
- **Primary nodes:** Sinoper (#9E3028) - warm rust-red
- **Secondary nodes:** Massicot (#C49530) - antique gold
- **Tertiary nodes:** Mummy Brown (#8B5B38) - warm brown
- **Wordmark:** Velin (#EDE8DF) - warm off-white

## 🔧 Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📱 Test Responsive Design

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Toggle device toolbar (Ctrl+Shift+M or Cmd+Shift+M)
3. Try different screen sizes:
   - **Desktop:** 1440px - Full experience
   - **Laptop:** 1280px - Reduced widths
   - **Tablet:** 1024px - Collapsed rail
   - **Mobile:** 768px - Mobile mode

## 🎯 Interactive Features to Test

### On Canvas Page

1. **Node Interaction**
   - Click any node → Right drawer opens
   - View confidence score, reasoning, alternatives
   - See inputs/outputs in monospace font

2. **Canvas Controls**
   - Pan: Click and drag
   - Zoom: Scroll wheel
   - Fit to view: Bottom-right button

3. **Mode Switching**
   - Click MAP/FLOW/LIVE in top bar
   - Watch particle animations activate in LIVE mode

4. **Execution Control**
   - Click Start → Particles begin flowing
   - Click Pause → Animations stop
   - Adjust speed slider

5. **Left Sidebar**
   - Expand/collapse sections
   - View connected agents
   - See active sessions

### On Landing Page

1. **Animated Background**
   - Watch particles flow along edges
   - See nodes drift and pulse
   - Observe orbital rings on active nodes

2. **Logo Animation**
   - Hover over logo → Slight opacity change
   - Click logo → Returns to home

3. **Feature Sections**
   - Scroll to see mini-canvas demonstrations
   - Hover over buttons for effects

### On Onboarding

1. **Animated Logo**
   - Watch nodes pulse at different intervals
   - See connections glow
   - Observe staggered timing

2. **Connection Methods**
   - Click each method card
   - View code snippets
   - Test copy-to-clipboard

## 🐛 Troubleshooting

### Port 3000 Already in Use

```bash
# Kill the process
npx kill-port 3000

# Or use a different port
npm run dev -- --port 3001
```

### Dependencies Won't Install

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Canvas Not Rendering

1. Check browser console (F12) for errors
2. Try a different browser (Chrome recommended)
3. Ensure JavaScript is enabled
4. Clear browser cache

### Logo Not Showing

1. Check that `FlowfexLogo.jsx` exists in `src/assets/`
2. Verify imports in page components
3. Check browser console for import errors

### Animations Not Working

1. Check if `prefers-reduced-motion` is enabled in OS
2. Verify `animated={true}` prop is set
3. Check browser supports CSS animations

## 🔌 Connect to Backend (Optional)

The frontend is ready to connect to the backend:

### Start Backend

```bash
# In a new terminal
cd backend
npm install
npm start
```

Backend runs on `http://localhost:4000`

### WebSocket Connection

Already configured in `OrchestrationCanvas.jsx`:
```javascript
const ws = new WebSocket('ws://localhost:4000/ws');
```

### API Proxy

Configured in `vite.config.js`:
```javascript
proxy: {
  '/api': 'http://localhost:4000',
  '/ws': { target: 'ws://localhost:4000', ws: true }
}
```

## 📚 Documentation

- **README.md** - Full frontend documentation
- **QUICKSTART.md** - Quick start guide
- **FRONTEND_IMPLEMENTATION.md** - Implementation details
- **LOGO_INTEGRATION.md** - Logo usage guide
- **HOW_TO_RUN.md** - This file

## 🎨 Customization

### Change Logo Colors

Edit `frontend/src/assets/FlowfexLogo.jsx`:

```javascript
const colors = {
  primary: '#9E3028',      // Change this
  secondary: '#C49530',    // And this
  accent: '#8B5B38',       // And this
  light: '#EDE8DF',        // And this
};
```

### Adjust Animation Speed

In `FlowfexLogo.jsx`, change animation durations:

```javascript
// Slower pulse (more subtle)
animation: nodePulse1 3.6s ease-in-out infinite;

// Faster pulse (more energetic)
animation: nodePulse1 1.8s ease-in-out infinite;
```

### Change Design Tokens

Edit `frontend/src/styles/tokens.css`:

```css
:root {
  --color-sinoper: #9E3028;  /* Main accent */
  --color-massicot: #C49530; /* Highlight */
  /* ... other colors */
}
```

## 🚀 Build for Production

```bash
# Build
npm run build

# Output will be in dist/ folder
# Deploy dist/ to your hosting service
```

## 📊 Performance

The frontend is optimized for:
- **60fps animations** on mid-range hardware
- **Fast initial load** with code splitting
- **Smooth interactions** with optimized rendering
- **Efficient state management** with Zustand

## ✅ Checklist

Before considering the setup complete:

- [ ] Node.js installed (v16+)
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)
- [ ] Landing page loads at `http://localhost:3000`
- [ ] Logo visible in navigation
- [ ] Canvas page interactive (`/canvas`)
- [ ] Animations working (nodes pulse, particles flow)
- [ ] All routes accessible
- [ ] No console errors

## 🎉 Success!

If you can see:
- ✅ Landing page with animated canvas background
- ✅ Flowfex logo in navigation (with connected nodes)
- ✅ Interactive canvas with node graph
- ✅ Smooth animations and transitions
- ✅ All pages accessible

**You're all set! The Flowfex frontend is running perfectly.**

## 💡 Next Steps

1. **Explore the code** - Open files in your editor
2. **Customize the design** - Edit colors, fonts, spacing
3. **Add features** - Follow existing patterns
4. **Connect backend** - Start backend server
5. **Deploy** - Build and deploy to production

## 🆘 Need Help?

- Check browser console (F12) for errors
- Review documentation in `README.md`
- Check `LOGO_INTEGRATION.md` for logo usage
- Verify all dependencies installed correctly

## 🎓 Learning Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

**Enjoy building with Flowfex!** 🚀

The logo now perfectly represents the flow of intelligence through connected nodes, embodying the core concept of visible AI orchestration.
