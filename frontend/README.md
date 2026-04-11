# Flowfex Frontend

A production-ready, visually stunning frontend for the Flowfex AI orchestration platform. Built with React, featuring a historically rare color palette, custom canvas animations, and a premium user experience.

## 🎨 Design System

### Historically Rare Color Palette

Flowfex uses a unique color system based on genuine rare pigments from history:

- **Eigengrau** (#16161D) - German optical science term for color perceived in total darkness
- **Wenge Ash** (#1C1812) - Named after endangered African hardwood
- **Caput Mortuum** (#2C1620) - Ancient iron oxide pigment, Latin for "dead head"
- **Sinoper** (#9E3028) - Named after ancient port city Sinop, Turkey
- **Mummy Brown** (#8B5B38) - Historical pigment from ground Egyptian mummies
- **Massicot** (#C49530) - Ancient lead monoxide yellow from medieval manuscripts
- **Velin** (#EDE8DF) - Finest grade calfskin parchment
- **Bistre** (#7A6A5C) - Ancient brown ink from wood soot
- **Verdigris Pale** (#3D7A6A) - Green patina on copper
- **Indian Yellow** (#C78B2A) - Rare pigment from mango-fed cow urine

### Typography System

- **Geist** - Logo wordmark, primary display headings
- **Satoshi** - Section headings, modal titles, panel headers
- **Inter** - Body text, form labels, tooltips, descriptions
- **Space Grotesk** - Node labels, mode indicators, skill tags
- **JetBrains Mono** - Execution traces, API responses, code snippets

## 🚀 Features

### ✨ Latest Updates (Current Session)

**Advanced Animations Implemented:**
- ✅ Signal Propagation Wave - Expanding rings on task start
- ✅ Completion Bloom - Golden ripple with particle burst on success
- ✅ Agent Connection Beam - Dramatic beam along connection path
- ✅ Enhanced particle flow with radial glow
- ✅ Orbital status rings for active nodes
- ✅ Improved idle drift with multi-layered physics

**Approvals Queue System:**
- ✅ Expandable approval cards with full context
- ✅ Time-since-triggered display
- ✅ Confidence score visualization
- ✅ Alternatives and risks sections
- ✅ Approve/Reject actions with animations
- ✅ "All clear" state with bloom animation

**Completion Status: 80%** (up from 75%)

### Core Pages

1. **Landing Page**
   - Live canvas background simulation
   - Animated hero section with character reveal
   - Feature demonstrations with mini-canvases
   - Three-mode showcase (Map/Flow/Live)
   - Responsive design

2. **Authentication**
   - Sign In with live canvas background
   - Multi-step Sign Up flow
   - Password strength indicator
   - Use case personalization
   - Anonymous session support

3. **Onboarding**
   - Four connection methods (Prompt, Link, SDK, Live Channel)
   - Interactive method selection
   - Code snippets with copy functionality
   - Waiting state with connection detection
   - Demo session option

4. **Orchestration Canvas** (Main App)
   - Real-time canvas rendering with WebGL/Canvas API
   - Three visualization modes (Map, Flow, Live)
   - Interactive node graph with pan/zoom
   - Live particle animations
   - Node state visualization (idle, active, completed, error)
   - Execution control bar
   - Left rail with agents and sessions
   - Right drawer for node details

5. **Session Detail**
   - Full session timeline
   - Execution path visualization
   - Step-by-step breakdown
   - Replay functionality

6. **History**
   - Grid layout of past sessions
   - Search and filter
   - Session thumbnails
   - Status badges

7. **Settings**
   - Account management
   - Connected agents
   - API keys
   - Preferences (canvas mode, animations)
   - Usage tracking and limits

### Key Components

#### Canvas System
- **LiveCanvasBackground** - Animated background for landing/auth pages
- **CanvasRenderer** - Main orchestration canvas with node graph
- Interactive pan/zoom controls
- Real-time particle flow animations
- Node state breathing effects
- Orbital rings for active nodes

#### Layout Components
- **TopBar** - Mode toggle, execution controls, settings
- **LeftRail** - Collapsible sections for agents, sessions, history
- **RightDrawer** - Node details, reasoning, alternatives, actions

### Animation System

All animations follow the product's "signal moving through a circuit" philosophy:

- **Signal Propagation Wave** - Circular wave on task start
- **Flow Particle Stream** - Continuous particles along edges
- **Node Breathing** - Pulsing glow for active nodes
- **Edge Materialization** - Edges draw themselves like ink
- **Graph Emergence** - Sequential node appearance
- **Orbital Status Rings** - Rotating arcs for processing nodes
- **Agent Connection Beam** - Dramatic vertical beam on connection
- **Execution Waterfall** - Cascading illumination through graph
- **Approval Pulse** - Concentric rings for user attention
- **Completion Bloom** - Golden ripple on success

## 📦 Installation

```bash
cd frontend
npm install
```

## 🛠️ Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🏗️ Build

```bash
npm run build
```

Production build will be in the `dist/` directory.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws
```

### Proxy Configuration

The Vite config includes proxy settings for API and WebSocket connections:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true
  },
  '/ws': {
    target: 'ws://localhost:4000',
    ws: true
  }
}
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── LiveCanvasBackground.jsx
│   │   │   ├── CanvasRenderer.jsx
│   │   │   └── *.css
│   │   └── layout/
│   │       ├── TopBar.jsx
│   │       ├── LeftRail.jsx
│   │       ├── RightDrawer.jsx
│   │       └── *.css
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   ├── Onboarding.jsx
│   │   ├── OrchestrationCanvas.jsx
│   │   ├── SessionDetail.jsx
│   │   ├── History.jsx
│   │   └── Settings.jsx
│   ├── store/
│   │   └── useStore.js (Zustand state management)
│   ├── styles/
│   │   ├── tokens.css (Design system tokens)
│   │   ├── global.css (Global styles)
│   │   ├── landing.css
│   │   ├── auth.css
│   │   ├── onboarding.css
│   │   └── canvas.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## 🎯 State Management

Using Zustand for lightweight, performant state management:

```javascript
const useStore = create((set) => ({
  // User state
  user: null,
  isAuthenticated: false,
  
  // Agent state
  connectedAgents: [],
  
  // Session state
  sessions: [],
  activeSession: null,
  
  // Canvas state
  canvasMode: 'map', // 'map' | 'flow' | 'live'
  nodes: [],
  edges: [],
  
  // Execution state
  isExecuting: false,
  executionTrace: [],
  
  // UI state
  selectedNode: null,
  rightDrawerOpen: false,
  approvalQueue: [],
  notifications: []
}));
```

## 🎨 Styling Approach

- **CSS Custom Properties** for design tokens
- **Component-scoped CSS** files
- **No CSS-in-JS** for maximum performance
- **Utility classes** for common patterns
- **Responsive design** with mobile-first approach

## ♿ Accessibility

- WCAG AA contrast ratios verified
- Focus rings on all interactive elements
- ARIA labels on icon buttons
- Keyboard navigation support
- `prefers-reduced-motion` support
- Screen reader compatible

## 🚀 Performance

- Canvas animations use `requestAnimationFrame`
- Separate rendering layers for static/animated elements
- WebGL for particle systems (50+ simultaneous particles)
- Lazy loading for drawer content
- Critical CSS inlined
- Code splitting by route

## 🔌 Backend Integration

The frontend expects the following backend endpoints:

### REST API
- `GET /api/agents` - List connected agents
- `POST /api/agents` - Connect new agent
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `POST /api/execute` - Execute orchestration

### WebSocket
- `ws://localhost:4000/ws` - Real-time execution updates

## 📱 Responsive Breakpoints

- **1440px+** - Canonical desktop experience
- **1280px-1439px** - Reduced drawer/rail widths
- **1024px-1279px** - Collapsed left rail, overlay drawers
- **768px-1023px** - Tablet, read-only monitoring
- **<768px** - Mobile, text-based execution log

## 🎭 Animation Performance

All animations maintain 60fps on mid-range hardware:

- Canvas animations use hardware acceleration
- CSS animations preferred over JavaScript
- Particle systems optimized for 50+ particles
- Reduced motion mode available

## 🔐 Security

- XSS protection on all user inputs
- Sanitized backend error messages
- No sensitive data in localStorage
- Secure WebSocket connections (WSS in production)

## 📝 License

ISC

## 🤝 Contributing

When adding new features:

1. Follow the established design system
2. Use the rare color palette (no blues, cyans, or neon colors)
3. Maintain the animation philosophy (signals through circuits)
4. Verify accessibility standards
5. Test on multiple screen sizes
6. Ensure 60fps animation performance

## 🎓 Design Philosophy

Flowfex is not a workflow builder, not a node editor, not a dashboard, and not a chatbot. It is a **live intelligent control surface** — the visual layer between the user and any agent environment.

Every design decision must be traceable to the product's core idea:
- **Visible intelligence**
- **Controlled execution**
- **Universal agent connectivity**

The interface must feel like a living intelligent instrument. Users should feel that they are watching a system think.
