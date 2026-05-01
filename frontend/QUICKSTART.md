# Flowfex Frontend - Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
cd frontend
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

### 2. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### 3. Explore the App

Navigate through:
- **Landing Page** (`/`) - See the live canvas background and feature showcase
- **Sign In** (`/signin`) - Try the authentication flow
- **Onboarding** (`/onboarding`) - Explore connection methods
- **Canvas** (`/canvas`) - The main orchestration interface
- **Settings** (`/settings`) - Configuration options

## 📂 Key Files to Know

### Entry Points
- `src/main.jsx` - Application entry point
- `src/App.jsx` - Route configuration
- `index.html` - HTML template with font imports

### State Management
- `src/store/useStore.js` - Zustand store with all app state

### Design System
- `src/styles/tokens.css` - Design tokens (colors, typography, spacing)
- `src/styles/global.css` - Global styles and component base classes

### Core Components
- `src/components/canvas/CanvasRenderer.jsx` - Main orchestration canvas
- `src/components/canvas/LiveCanvasBackground.jsx` - Animated background
- `src/components/layout/TopBar.jsx` - Top navigation bar
- `src/components/layout/LeftRail.jsx` - Left sidebar
- `src/components/layout/RightDrawer.jsx` - Node details drawer

### Pages
- `src/pages/LandingPage.jsx` - Marketing landing page
- `src/pages/OrchestrationCanvas.jsx` - Main app interface
- `src/pages/Onboarding.jsx` - Agent connection flow

## 🎨 Customizing the Design

### Change Colors

Edit `src/styles/tokens.css`:

```css
:root {
  --color-sinoper: #9E3028;  /* Main accent color */
  --color-massicot: #C49530; /* Highlight color */
  /* ... other colors */
}
```

### Adjust Typography

Edit font families in `src/styles/tokens.css`:

```css
:root {
  --font-geist: 'General Sans', 'SF Pro Display', system-ui, sans-serif;
  --font-satoshi: 'Satoshi', 'Helvetica Neue', sans-serif;
  /* ... other fonts */
}
```

### Modify Animations

Edit animation durations and easing in `src/styles/tokens.css`:

```css
:root {
  --duration-fast: 120ms;
  --duration-base: 220ms;
  --ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## 🔧 Common Tasks

### Add a New Page

1. Create component in `src/pages/`:
```jsx
// src/pages/NewPage.jsx
import React from 'react';

function NewPage() {
  return <div>New Page</div>;
}

export default NewPage;
```

2. Add route in `src/App.jsx`:
```jsx
<Route path="/new" element={<NewPage />} />
```

### Add State to Store

Edit `src/store/useStore.js`:

```javascript
const useStore = create((set) => ({
  // Add new state
  myNewState: null,
  
  // Add action
  setMyNewState: (value) => set({ myNewState: value })
}));
```

### Use State in Component

```jsx
import useStore from '../store/useStore';

function MyComponent() {
  const myNewState = useStore(state => state.myNewState);
  const setMyNewState = useStore(state => state.setMyNewState);
  
  return (
    <button onClick={() => setMyNewState('new value')}>
      {myNewState}
    </button>
  );
}
```

### Add a New Canvas Animation

Edit `src/components/canvas/CanvasRenderer.jsx`:

```javascript
// In the animate function
const animate = () => {
  // Your animation logic here
  ctx.fillStyle = '#9E3028';
  ctx.fillRect(x, y, width, height);
  
  animationId = requestAnimationFrame(animate);
};
```

## 🔌 Connect to Backend

### WebSocket Connection

Already set up in `src/pages/OrchestrationCanvas.jsx`:

```javascript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:4000/ws');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle incoming data
  };
  
  return () => ws.close();
}, []);
```

### API Calls

Use fetch or axios:

```javascript
// Fetch agents
const response = await fetch('/api/agents');
const agents = await response.json();

// Create session
await fetch('/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'New Session' })
});
```

## 🎯 Testing the Canvas

The canvas has sample nodes for demo purposes. To test:

1. Navigate to `/canvas`
2. Click on any node to open the right drawer
3. Try pan (click and drag) and zoom (scroll wheel)
4. Toggle between Map/Flow/Live modes in the top bar
5. Click Start to see particle animations

## 📱 Test Responsive Design

### Browser DevTools

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different screen sizes:
   - Desktop: 1440px
   - Laptop: 1280px
   - Tablet: 1024px
   - Mobile: 768px

### Breakpoints

- **1440px+** - Full experience
- **1280-1439px** - Reduced widths
- **1024-1279px** - Collapsed rail
- **768-1023px** - Tablet mode
- **<768px** - Mobile mode

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
npm run dev -- --port 3001
```

### Fonts Not Loading

Check `index.html` has font links:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
```

### Canvas Not Rendering

Check browser console for errors. Ensure:
- Canvas ref is attached
- Container has dimensions
- No JavaScript errors

### WebSocket Connection Failed

Ensure backend is running on port 4000:
```bash
cd backend
npm start
```

## 📚 Learn More

### Documentation
- `README.md` - Full documentation
- `FRONTEND_IMPLEMENTATION.md` - Implementation details
- Component files - Inline comments

### External Resources
- [React Docs](https://react.dev)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Vite Docs](https://vitejs.dev)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 🎨 Design Resources

### Color Palette
All colors are in `src/styles/tokens.css` with historical context in comments.

### Typography
Fonts are loaded from:
- Google Fonts (Inter, Space Grotesk, JetBrains Mono)
- Fontshare (Satoshi, General Sans)

### Icons
Using Lucide React:
```jsx
import { Play, Pause, Settings } from 'lucide-react';

<Play size={20} />
```

## 🚀 Build for Production

```bash
# Build
npm run build

# Preview build
npm run preview

# Deploy dist/ folder to your hosting
```

## 💡 Tips

1. **Use the Design Tokens** - Don't hardcode colors or sizes
2. **Follow the Animation Philosophy** - No bouncing, deliberate motion
3. **Maintain Accessibility** - Always add ARIA labels to icon buttons
4. **Test Performance** - Keep canvas animations at 60fps
5. **Stay Consistent** - Follow existing patterns and file structure

## 🎉 You're Ready!

The frontend is fully functional and ready to use. Explore the code, customize it, and connect it to your backend.

For questions or issues, refer to the full README.md or implementation documentation.

Happy coding! 🚀
