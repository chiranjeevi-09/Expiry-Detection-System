# EDS - Expiry Detection System

Smart supermarket inventory management with automated expiry tracking, barcode scanning, and AI-powered date detection.

## Features

- **Expiry Tracking**: Monitor products approaching their expiry dates.
- **Product Entry**: Easily store food and non-food items with their expiry details.
- **Search**: Quick search for any product in the inventory.
- **History**: View historical data and past detections.
- **Authentication**: Secure access via user accounts.

## Tech Stack

- **Vite** - Build tool
- **TypeScript** - Type safety
- **React** - UI Library
- **shadcn/ui** - Component Library
- **Tailwind CSS** - Styling
- **Supabase** - Backend & Database

## Getting Started

Follow these steps to run the project locally:

1. **Clone the repository**
2. **Install dependencies**
   ```sh
   npm install
   ```
3. **Set up Environment Variables**
   Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
4. **Start the development server**
   ```sh
   npm run dev
   ```

## Development

The application is built with a focus on ease of use and automated detection. Future updates will include enhanced AI capabilities for date extraction from images.
