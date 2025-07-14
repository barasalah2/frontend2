# Workpacks Genie™ - AI Chat Application for Work Package Management

A comprehensive full-stack web application that provides an AI-powered chat interface for managing and analyzing Advanced Work Packages (AWP). The application allows users to have conversations about work packages, generate reports, visualize data, and export information in various formats.

## 🚀 Features

- **AI-Powered Chat Interface**: Interactive conversations with intelligent responses about work packages
- **Advanced Data Visualization**: Dynamic charts including scatter plots, bar charts, line charts, and pie charts
- **Real-time Data Processing**: Live data visualization with external AI integration
- **Conversation Management**: Categorized conversations with persistent storage
- **Excel Export**: Export work package data and reports to Excel format
- **Dark/Light Theme**: Complete theme switching with system preference detection
- **Responsive Design**: Mobile-first design that works on all devices
- **In-Memory Storage**: Fast, reliable data storage with automatic sample data

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Animations**: Framer Motion for smooth UI transitions

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Storage**: In-memory storage (MemStorage) with sample data
- **API Pattern**: RESTful endpoints with JSON responses
- **Session Management**: Express sessions with in-memory storage

### Data Storage

The application uses in-memory storage (MemStorage) for fast, reliable data management:

#### Storage Architecture
- **In-Memory Maps**: Fast data access using JavaScript Map objects
- **Automatic Sample Data**: Pre-loaded work packages and conversations for testing
- **TypeScript Types**: Full type safety with shared schema definitions
- **Session Persistence**: Data persists during application runtime

#### Data Models
- **Users**: Basic user authentication and management
- **Conversations**: Chat sessions with categorization and metadata
- **Messages**: Individual chat messages with support for different content types
- **Work Packages**: Project work items with status tracking and progress monitoring

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+ (automatically provided by Replit)

### Environment Configuration

The application uses the following environment variables:

```bash
# Frontend Environment Variables
VITE_API_URL=http://localhost:5000
VITE_AI_BACKEND_URL=http://localhost:5000/api/datavis

# Server Configuration
NODE_ENV=development
PORT=5000
SESSION_SECRET=your_session_secret_here
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
LOG_LEVEL=info
```

### Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

### Sample Data

The application automatically loads sample work packages and conversations when started:
- Sample work packages with various statuses and progress levels
- Pre-configured conversation categories for testing
- Sample messages demonstrating different content types

## 📊 API Endpoints

### Chat API
- `POST /api/genie` - Send message to AI assistant
  ```json
  {
    "question": "Show me work package progress",
    "conv_id": 123
  }
  ```

### Conversation Management
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id/messages` - Get messages for conversation
- `POST /api/conversations` - Create new conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Work Package Management
- `GET /api/workpackages` - List all work packages
- `GET /api/workpackages?cwa_id=CWA-2301` - Get work packages by CWA ID
- `POST /api/workpackages` - Create new work package
- `PUT /api/workpackages/:id` - Update work package
- `DELETE /api/workpackages/:id` - Delete work package

### Data Visualization
- `POST /api/datavis` - Generate visualization configuration
  ```json
  {
    "columns": [{"name": "column1"}, {"name": "column2"}],
    "data_snippet": [{"column1": "value1", "column2": "value2"}]
  }
  ```

## 🎨 UI Components

### Core Components
- **ChatMessage**: Displays individual chat messages with support for text, tables, and visualizations
- **ChatInput**: Message input with validation and submission handling
- **ConversationSidebar**: Navigation and conversation management
- **ChartRenderer**: Renders various chart types with responsive design
  - Standard charts: scatter, bar, line, pie, area, histogram
  - Advanced charts: Gantt (visx-based), dumbbell, fallback rendering
- **GanttChart**: Professional timeline visualization with visx library
  - Interactive tooltips with task details and duration calculations
  - Color-coded series support with legends
  - Responsive width adaptation to window size
- **WorkPackageTable**: Enhanced table with sorting, filtering, and export capabilities

### Conversation Categories
- **General**: Basic conversations and queries
- **Project Planning**: Project-related discussions
- **CWA Analysis**: Construction Work Activity analysis
- **Scheduling**: Timeline and scheduling conversations
- **Resource Planning**: Resource allocation and management

## 📈 Data Visualization Features

### Chart Types Supported
1. **Scatter Plot**: For correlation analysis between two variables
2. **Bar Chart**: For categorical data comparison (including grouped, stacked, and horizontal bars)
3. **Line Chart**: For trend analysis over time with multi-series support
4. **Area Chart**: For filled area visualizations showing trends
5. **Pie Chart**: For percentage distribution and composition analysis
6. **Histogram**: For frequency distribution with connected bars
7. **Gantt Chart**: Professional timeline visualization using visx library with interactive features
8. **Dumbbell Chart**: For comparing two values across categories
9. **Fallback Charts**: Automatic fallback rendering for advanced chart types

### Transform Operations
- **Date Grouping**: Group dates by year, quarter, month_year, month, day_of_week, or hour
- **Aggregation**: Sum, count, mean, median, min, max, std operations
- **Top-K/Bottom-K**: Show top/bottom N results for better focus
- **Binning**: Automatic, quartile, or custom binning for continuous data
- **Statistical**: Log scale, normalize, z-score transformations
- **Categorical**: Alphabetical sorting, frequency sorting, other grouping
- **X2 Field Support**: Dual-axis transformations for charts like Gantt timelines

### Advanced Features
- **Interactive Charts**: Hover tooltips, legends, and responsive design
- **Professional Gantt Charts**: visx-based timeline visualization with series support
- **Responsive Design**: Charts automatically adapt to window width
- **Export Functionality**: Export charts and data to Excel
- **Real-time Updates**: Dynamic chart generation based on live data
- **Multiple Visualizations**: Display multiple charts simultaneously
- **Enhanced Tooltips**: Detailed information on hover with duration calculations
- **Series Support**: Multi-series charts with color-coded legends

### Gantt Chart Implementation

The application features a professional Gantt chart implementation using the visx library:

#### Technical Features
- **visx-based Architecture**: Built with @visx/scale, @visx/group, @visx/axis, @visx/shape
- **Time-based Scaling**: Automatic time domain calculation from data extent
- **Responsive Design**: Automatically adapts to window width (minimum 600px)
- **Date Intelligence**: Robust date parsing with fallback mechanisms
- **Error Handling**: Graceful handling of invalid dates and empty data

#### Interactive Features
- **Hover Tooltips**: Display task details, series, start/end dates, and duration
- **Color-coded Series**: Different series (CWP names) get distinct colors
- **Legend Support**: Right-side legend showing all series with color indicators
- **Professional Styling**: Grid lines, rounded corners, and consistent theming

#### Data Format Support
```json
{
  "type": "gantt",
  "x": "plan_start",      // Start date field
  "x2": "plan_finish",    // End date field  
  "y": "iwp_id",          // Task identifier
  "series": "cwp_name",   // Series for color coding
  "transform_x": "topk:20" // Optional transformations
}
```

## 🗃️ Data Management

### In-Memory Storage
The application uses in-memory storage for fast, reliable data management:

- **Automatic Initialization**: Sample data is loaded when the application starts
- **Runtime Persistence**: Data persists during the application session
- **Type Safety**: Full TypeScript support with shared schema definitions

### Data Types and Relationships

**User Management**
```typescript
type User = {
  id: number;
  username: string;
  password: string;
}
```

**Conversation System**
```typescript
type Conversation = {
  id: number;
  title: string;
  category: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: any;
}

type Message = {
  id: number;
  conversationId: number;
  content: string;
  sender: 'user' | 'bot';
  messageType: 'text' | 'table' | 'visualization';
  data: any;
  createdAt: Date;
}
```

**Work Package Management**
```typescript
type WorkPackage = {
  id: number;
  wpId: string;
  description: string;
  status: string;
  progress: number;
  dueDate?: Date;
  assignedTeam?: string;
  cwaId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔧 Configuration Files

### Key Configuration Files
- `vite.config.ts`: Frontend build configuration with path aliases
- `tailwind.config.ts`: Theme customization and styling configuration
- `tsconfig.json`: TypeScript configuration for client/server/shared code
- `package.json`: Dependencies and build scripts

### Build Scripts
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc"
  }
}
```

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Setup
- **Frontend**: Static assets served from `/dist/public`
- **Backend**: ESM bundle targeting Node.js 20+
- **Storage**: In-memory storage with automatic sample data initialization
- **Static Serving**: Express serves frontend assets in production

## 🔒 Security Features

- **Session Management**: Secure session handling with in-memory storage
- **Input Validation**: Zod schema validation for all API inputs
- **CORS Protection**: Configured CORS policies for frontend-backend communication
- **Environment Isolation**: Separate environment configurations for development/production

## 🧪 Testing & Quality

### Code Quality
- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Code quality and consistency enforcement
- **In-Memory Storage**: Type-safe storage operations with shared schemas
- **Zod**: Runtime type validation for API inputs

### Development Tools
- **Hot Module Replacement**: Vite HMR for fast development
- **File Watching**: Automatic server restarts with tsx
- **Type Safety**: Full TypeScript support across frontend and backend

## 📚 Additional Resources

### External Dependencies
- **UI Components**: Extensive Radix UI primitives for accessibility
- **Data Visualization**: 
  - Recharts for standard chart generation and rendering
  - visx library for advanced Gantt chart timeline visualization
  - d3-time-format for professional date formatting
- **File Processing**: SheetJS (xlsx) for Excel import/export
- **Date Handling**: date-fns for date manipulation and formatting
- **Animation**: Framer Motion for smooth UI transitions

### Development Guidelines
- **Component Structure**: Reusable components following shadcn/ui patterns
- **State Management**: TanStack Query for server state with proper cache invalidation
- **Styling**: Tailwind CSS with custom properties for theme support
- **File Organization**: Clear separation between client, server, and shared code

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ for Advanced Work Package Management**