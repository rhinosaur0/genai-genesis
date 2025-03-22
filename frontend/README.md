# 3D Model Studio

A beautiful interactive website that generates 3D models from images and text prompts with AI assistance.

## Features

- **Dynamic Landing Page**: Foggy, animated background with floating shapes that creates an immersive experience
- **Image and Prompt Upload**: User-friendly interface to upload an image and describe your desired 3D model
- **Interactive 3D Viewer**: Three.js powered viewer that allows you to explore your 3D model from all angles
- **Mode Switching**: Toggle between View, Edit, and Train modes
- **AI Assistant Chat**: Chat with an AI assistant to help understand and interact with your 3D model

## Technologies Used

- React
- Three.js (@react-three/fiber & @react-three/drei)
- Styled Components
- Vite

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
```
cd frontend
```
3. Install dependencies:
```
npm install
```

### Running the Development Server

```
npm run dev
```

This will start the development server at [http://localhost:3000](http://localhost:3000).

### Building for Production

```
npm run build
```

## License

This project is licensed under the ISC License.

## Project Structure

- `/src` - Main source code
  - `/components` - Reusable UI components
  - `/pages` - Page components
  - `/styles` - Global styles
  - `/assets` - Static assets like images 