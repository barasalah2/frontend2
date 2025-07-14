import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Info } from 'lucide-react';
import { transformData, processHistogramData } from '@/lib/chart-transformations';

export interface ChartConfig {
  type: string;
  x: string;
  x2?: string;
  y: string;
  series?: string | null;
  title: string;
  transform_x?: string | null;
  transform_y?: string | null;
  rationale?: string;
}

interface ChartRendererProps {
  data: any[];
  config: ChartConfig;
  height?: number;
  width?: string;
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#f0e68c',
  '#ff6347', '#40e0d0', '#ee82ee', '#90ee90', '#ffd700'
];

// Pure chart rendering functions (no data transformations)
const renderBarChart = (data: any[], config: ChartConfig) => {
  const yKey = 'y'; // Data is already in standardized format
  const series = data.length > 0 && data[0].series ? [...new Set(data.map(item => item.series).filter(Boolean))] : [yKey];
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Legend />
        {series.map((seriesKey, index) => (
          <Bar 
            key={seriesKey} 
            dataKey={seriesKey === yKey ? 'y' : seriesKey} 
            fill={COLORS[index % COLORS.length]}
            name={seriesKey}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderLineChart = (data: any[], config: ChartConfig) => {
  const yKey = 'y'; // Data is already in standardized format
  const series = data.length > 0 && data[0].series ? [...new Set(data.map(item => item.series).filter(Boolean))] : [yKey];
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Legend />
        {series.map((seriesKey, index) => (
          <Line 
            key={seriesKey} 
            type="monotone" 
            dataKey={seriesKey === yKey ? 'y' : seriesKey} 
            stroke={COLORS[index % COLORS.length]}
            strokeWidth={2}
            name={seriesKey}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

const renderAreaChart = (data: any[], config: ChartConfig) => {
  const yKey = 'y'; // Data is already in standardized format
  const series = data.length > 0 && data[0].series ? [...new Set(data.map(item => item.series).filter(Boolean))] : [yKey];
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="x" />
        <YAxis />
        <Tooltip />
        <Legend />
        {series.map((seriesKey, index) => (
          <Area 
            key={seriesKey} 
            type="monotone" 
            dataKey={seriesKey === yKey ? 'y' : seriesKey} 
            stackId="1"
            stroke={COLORS[index % COLORS.length]}
            fill={COLORS[index % COLORS.length]}
            name={seriesKey}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const renderPieChart = (data: any[], config: ChartConfig) => {
  const yKey = 'y'; // Data is already in standardized format
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={yKey}
          nameKey="x"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

const renderScatterChart = (data: any[], config: ChartConfig) => {
  const yKey = config.y || 'count';
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={config.x} />
        <YAxis dataKey={yKey} />
        <Tooltip />
        <Scatter dataKey={yKey} fill={COLORS[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

const renderGanttChart = (data: any[], config: ChartConfig) => {
  // Simple date conversion for display purposes only
  const processedData = data.map(item => {
    const start = new Date(item[config.x]).getTime();
    const end = config.x2 ? new Date(item[config.x2]).getTime() : start;
    const duration = end - start;
    
    return {
      ...item,
      start,
      duration,
      end
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={processedData} 
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={['dataMin', 'dataMax']} />
        <YAxis type="category" dataKey={config.y} />
        <Tooltip 
          formatter={(value, name) => {
            if (name === 'duration') {
              return [new Date(value).toLocaleDateString(), 'Duration'];
            }
            return [new Date(value).toLocaleDateString(), name];
          }}
        />
        <Bar dataKey="start" stackId="gantt" fill="transparent" />
        <Bar dataKey="duration" stackId="gantt" fill={COLORS[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderDumbbellChart = (data: any[], config: ChartConfig) => {
  // Simple value conversion for display purposes only
  const processedData = data.map(item => ({
    ...item,
    value1: parseFloat(item[config.x]) || 0,
    value2: config.x2 ? parseFloat(item[config.x2]) || 0 : 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={processedData} 
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey={config.y} />
        <Tooltip />
        <Bar dataKey="value1" fill={COLORS[0]} />
        <Bar dataKey="value2" fill={COLORS[1]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderHistogram = (data: any[], config: ChartConfig) => {
  // Use preprocessed histogram data
  const histogramData = processHistogramData(data, config.x);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="bin" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill={COLORS[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderFallbackChart = (data: any[], config: ChartConfig) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Chart Type Not Supported</h3>
        <p className="text-gray-600">
          The chart type "{config.type}" is not yet implemented.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Falling back to bar chart representation
        </p>
      </div>
    </div>
  );
};

export function ChartRenderer({ data, config, height = 400, width = "100%" }: ChartRendererProps) {
  const transformedResult = useMemo(() => {
    if (!data || data.length === 0) return { data: [], config };
    return transformData(data, config);
  }, [data, config]);

  const transformedData = transformedResult.data || [];

  const renderChart = () => {
    if (!transformedData || transformedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No data available to display</p>
          </div>
        </div>
      );
    }

    switch (config.type.toLowerCase()) {
      case 'bar':
      case 'grouped_bar':
        return renderBarChart(transformedData, config);
      case 'line':
        return renderLineChart(transformedData, config);
      case 'area':
        return renderAreaChart(transformedData, config);
      case 'pie':
      case 'donut':
        return renderPieChart(transformedData, config);
      case 'scatter':
      case 'bubble':
        return renderScatterChart(transformedData, config);
      case 'gantt':
        return renderGanttChart(transformedData, config);
      case 'dumbbell':
        return renderDumbbellChart(transformedData, config);
      case 'histogram':
        return renderHistogram(data, config); // Use original data for histogram
      case 'stacked_bar':
        return renderBarChart(transformedData, config);
      case 'horizontal_bar':
        return renderBarChart(transformedData, config);
      default:
        return renderFallbackChart(transformedData, config);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{config.title}</CardTitle>
          <Badge variant="outline">{config.type}</Badge>
        </div>
        {config.rationale && (
          <p className="text-sm text-gray-600 mt-2">{config.rationale}</p>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ width, height: `${height}px` }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChartRenderer;