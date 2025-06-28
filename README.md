# Permalink - Generative Digital Art Platform

A modern Next.js application for creating, collecting, and trading unique generative digital art on the Etherlink blockchain.

## ✨ Features

- **🎨 Generative Art**: Interactive algorithmic art creation with real-time canvas rendering
- **🔗 Blockchain Integration**: Built for Etherlink mainnet with wallet connectivity
- **📱 Responsive Design**: Fully responsive from mobile (428px) to desktop (1400px+)
- **🖥️ Desktop Optimized**: Multi-column layouts, sidebars, and enhanced UX for larger screens
- **🎭 Artist Profiles**: Showcase drops and collected artworks
- **🛠️ Minting Interface**: Upload and mint artwork directly to blockchain
- **🎮 Interactive Controls**: Play, pause, and randomize generative artworks

## 🏗️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with responsive breakpoints
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Icons**: Lucide React
- **Theme**: Next Themes with dark mode support

## 📱 Responsive Design

### Mobile First (up to 640px)
- **Container**: Max 428px width, mobile-optimized navigation
- **Layout**: Single column, touch-friendly controls
- **Canvas**: Square aspect ratio, touch gestures
- **Navigation**: Dropdown menu, bottom navigation bars

### Tablet & Desktop (641px+)
- **Container**: Up to 1200px width with padding
- **Layout**: Multi-column grids, sidebars, enhanced spacing
- **Canvas**: Larger sizes with high-DPI rendering
- **Navigation**: Horizontal menu items, expanded toolbars

### Large Desktop (1024px+)
- **Container**: Up to 1400px width
- **Layout**: Maximum space utilization
- **Features**: Sticky sidebars, preview panels, enhanced forms

## 📱 Pages

### Landing Page (`/`)
- **Mobile**: Single column with centered content
- **Desktop**: Multi-column feature grid, larger hero section
- Hero section with early access signup
- Feature showcase with icons
- Team member profiles in responsive grid
- Call-to-action for demo app

### Main App (`/main`)
- **Mobile**: Stacked layout with wallet connection
- **Desktop**: 8/4 grid with sidebar featuring stats and quick actions
- Featured drops carousel
- Latest artworks grid (2 columns on desktop)
- Platform statistics and recent activity sidebar
- Wallet connection interface

### Artist Profile (`/artist`)
- **Mobile**: Vertical profile layout
- **Desktop**: 4/8 grid with profile sidebar and content area
- Artist information and bio
- Drops and collected artworks tabs
- Address copying functionality
- Social proof statistics and action buttons

### Artwork Viewer (`/item`)
- **Mobile**: Full-width canvas with bottom controls
- **Desktop**: 7/5 grid with large canvas and detailed info panel
- Interactive generative art canvas (scales to container)
- Real-time animation controls
- Artwork attributes and metadata
- Transaction history and pricing information
- Buy/mint functionality

### Creation Studio (`/create`)
- **Mobile**: Single column form
- **Desktop**: 8/4 grid with form and preview/info panels
- File upload interface with drag & drop
- Artwork metadata forms with validation
- Live preview panel and minting information
- Tips and cost breakdown sidebar

## 🎨 Generative Art Engine

The app features a custom-built generative art engine with:

- **Responsive Canvas**: Automatically scales to container size
- **High-DPI Support**: Device pixel ratio optimization for crisp rendering
- **Scalable Elements**: Shapes and movements scale based on canvas size
- **Algorithmic Generation**: HSL color palettes and shape systems
- **Real-time Animation**: RequestAnimationFrame-based animations
- **Interactive Controls**: Play/pause, randomization, generation tracking

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

3. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📂 Project Structure

```
├── app/                    # Next.js app router pages
│   ├── main/              # Main app interface (responsive grid)
│   ├── artist/            # Artist profile page (desktop sidebar)
│   ├── item/              # Artwork viewer page (large canvas)
│   ├── create/            # Minting interface (form + preview)
│   ├── layout.tsx         # Root layout with dark theme
│   ├── page.tsx           # Landing page (multi-column)
│   └── globals.css        # Responsive container system
├── components/            # Reusable components
│   ├── ui/                # Shadcn UI components
│   ├── drop-card.tsx      # Artwork card component
│   ├── generative-art.tsx # Responsive art generation engine
│   ├── toolbar.tsx        # Responsive navigation toolbar
│   └── wallet-connection-card.tsx
├── lib/                   # Utility functions
│   └── utils.ts          # Tailwind merge utilities
└── hooks/                 # Custom React hooks
    └── use-mobile.ts     # Mobile detection
```

## 🎯 Demo Features

- **Responsive Wallet Connection**: Simulated MetaMask, WalletConnect, and Coinbase wallet integration
- **Scalable Art Generation**: Real-time algorithmic art that adapts to screen size
- **Multi-Layout System**: Optimized layouts for mobile, tablet, and desktop
- **Touch & Mouse Support**: Gesture-optimized interface with hover states
- **Dark Theme**: Consistent dark mode throughout all breakpoints

## 🔗 Navigation

- **Landing → Main**: Access demo app
- **Main → Artist**: View creator profiles  
- **Main → Item**: Interact with artworks
- **Artist → Item**: Browse creator's works
- **Responsive Toolbar**: 
  - Mobile: Dropdown menu with hamburger icon
  - Desktop: Horizontal navigation with direct links

## 🎨 Design System

The app uses a carefully crafted responsive design system:

- **Breakpoints**: 
  - Mobile: `< 640px` (max-width 428px)
  - Tablet: `641px - 1023px` (max-width 1200px)
  - Desktop: `1024px+` (max-width 1400px)
- **Color Palette**: Dark background (#0a0a0a) with accent colors
- **Typography**: Responsive font sizes using `lg:` prefixes
- **Spacing**: Responsive padding and margins
- **Grid Systems**: CSS Grid with responsive columns
- **Border Radius**: 12px standard with responsive variations
- **Animations**: Smooth transitions and micro-interactions

## 🔧 Development

Built with modern development practices:

- **TypeScript**: Full type safety across all components
- **ESLint**: Code quality enforcement
- **Tailwind CSS**: Utility-first responsive styling
- **Component Architecture**: Modular and reusable responsive components
- **Performance**: Optimized with Next.js SSR and responsive images
- **Accessibility**: ARIA labels and keyboard navigation support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This is a demo application showcasing responsive design. Blockchain functionality is simulated for demonstration purposes.
