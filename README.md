# EV Route Planner PWA 🚗⚡

A modern, mobile-first Progressive Web Application (PWA) designed to help Electric Vehicle (EV) owners confidently plan their road trips. The application calculates driving routes, analyzes your EV's battery profile, intelligently filters charging stations, and even uses AI to suggest optimal charging stops.

![Route Planner Interface Demo]

## ✨ Key Features

### 1. 🔋 Personalized EV Profiles
- **Define your vehicle:** Set your Battery Capacity (kWh), Current State of Charge (SoC), Max Range (km), and Max Charge Power (kW).
- **Connector Filtering:** Filters stations based on your preferred plug type (e.g., CCS Type 2).
- Data persists locally in your browser using `zustand` persist.

### 2. 🗺️ Smart Routing & Interactive Map
- **Mapbox Integration:** Smooth, highly performant vector maps with origin/destination search powered by Mapbox Geocoding.
- **Route Specific Filtering:** Once a route is mapped, the app fetches EV stations from **Google Places API** and uses **Turf.js** to strictly filter and display only stations within a 10km buffer of your driving path.
- **Performance Clustering:** Mapbox GL JS native clustering ensures hundreds of stations render smoothly without lagging the UI.

### 3. 🤔 AI-Powered Charging Plans (Gemini)
- **Auto Plan with AI:** Let Google's **Gemini 2.5 Flash** analyze your route. 
- The AI considers your EV's battery size, current SoC, and the distance to each station.
- **The "Sweet Spot" Rule:** The AI is strictly prompted to select stations where you will arrive with an optimal 20% to 40% battery remaining, mimicking real-world EV road trip strategies.
- Provides 3 tailored plans (e.g., "Fastest Arrival", "Relaxed Journey") with reasoning and estimated extra charging time.

### 4. 📊 Per-Leg Battery Trajectory
- A sophisticated Bottom Sheet ("Route Plan") breaks down your journey stop-by-stop.
- Calculates precise **Arrival and Departure SoC (%)** for every individual leg of the trip.
- Dynamically estimates the **Charge Time (minutes)** needed at each stop based on both the car's maximum input (kW) and the charging station's maximum output (kW).
- Issues visual red warnings if a planned leg will drop the battery below 15%.

### 5. 📍 Map-Click Waypoints & Favorites
- Tap anywhere on the map to drop a pin and set it as your destination via Reverse Geocoding.
- Save frequently visited places as **Favorites** for quick access in future route planning.

### 6. 🔌 Detailed Station Hardware Data
- View deep details for each charging stop, powered by Google Places EV data.
- See available plug types, maximum wattage outputs, and total number of chargers right from the map popup or route summary.

### 7. 🚀 Google Maps Export
- Seamlessly transition from planning to driving.
- One-click export generates a precise Google Maps Navigation URL (`dir/?api=1...`) containing your Origin, Target Destination, and every Charging Stop perfectly ordered as waypoints.

### 8. ⛰️ Elevation & Terrain Penalty
- Predicts battery drain accurately by fetching route elevation profiles via the **Mapbox Tilequery API**.
- Calculates cumulative elevation gain/loss for the journey.
- The AI algorithm applies a "Terrain Penalty Weight" (modeling % loss per 100m climbed) to adjust Arrival SoC on mountainous routes autonomously.

### 9. 💾 Saved "Standard" Routes
- Save and name your frequently traveled long-distance journeys (e.g., "Home -> Pattaya").
- Instantly reloads the origin, destination, and all manually/AI-selected charging waypoints with a single click from the dedicated Saved Routes menu.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS V4
- **State Management:** Zustand (with persist middleware)
- **Maps & Geocoding:** Mapbox GL JS (`react-map-gl`), Mapbox Search JS, Mapbox Tilequery API (Terrain & Elevation)
- **Station Data:** Google Maps Places API (New API supporting `evChargeOptions`)
- **Geospatial Maths:** Turf.js (`@turf/distance`, `@turf/point-to-line-distance`, etc.)
- **AI / LLM:** Google Gen AI SDK (`@google/generative-ai`) targeting Gemini 2.5 Flash
- **PWA Capabilities:** `@ducanh2912/next-pwa`

---

## 🚦 Getting Started (Local Development)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/mydev-ev-route-planner.git
cd mydev-ev-route-planner
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory and add your API keys:

```env
# Mapbox (Required for Map rendering, Geocoding, and Directions)
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your_mapbox_token_here"

# Google Maps (Required for fetching EV Station Data and Reverse Geocoding)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyYourGoogleMapsApiKeyHere"

# Gemini AI (Required for the 'Auto Plan' AI suggestions feature)
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"
```
*(Note: Ensure your Google Maps API Key has the "Places API (New)" and "Geocoding API" enabled).*

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3005](http://localhost:3005) in your browser.

---

## 📱 PWA Features
This app is fully PWA enabled. On supported devices (iOS Safari, Android Chrome/Edge), you can use the "Add to Home Screen" option to install it as a native-feeling standalone application with offline caching capabilities for static assets.

## 📝 License
This project is for demonstration and personal development purposes. Data accuracy depends on third-party APIs (Mapbox, Google). Always double-check routes and station availability in the real world before relying on them for critical journeys.