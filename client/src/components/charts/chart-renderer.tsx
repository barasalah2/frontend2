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
  // Check if we have series data for multi-series charts
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  if (hasSeries) {
    // Multi-series bar chart: group data by series
    const seriesNames = [...new Set(data.map(item => item.series).filter(Boolean))];
    
    // Restructure data for Recharts multi-series format
    const groupedData = data.reduce((acc, item) => {
      const existing = acc.find(d => d.x === item.x);
      if (existing) {
        existing[item.series] = item.y;
      } else {
        const newItem = { x: item.x };
        newItem[item.series] = item.y;
        acc.push(newItem);
      }
      return acc;
    }, []);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={groupedData} margin={{ top: 20, right: 120, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            layout="vertical"
            iconType="line"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          {seriesNames.map((seriesName, index) => (
            <Bar 
              key={seriesName} 
              dataKey={seriesName} 
              fill={COLORS[index % COLORS.length]}
              name={seriesName}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  } else {
    // Single series bar chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
          />
          <Bar dataKey="y" fill={COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
};

const renderLineChart = (data: any[], config: ChartConfig) => {
  // Check if we have series data for multi-series charts
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  if (hasSeries) {
    // Multi-series line chart: group data by series
    const seriesNames = [...new Set(data.map(item => item.series).filter(Boolean))];
    
    // Restructure data for Recharts multi-series format
    const groupedData = data.reduce((acc, item) => {
      const existing = acc.find(d => d.x === item.x);
      if (existing) {
        existing[item.series] = item.y;
      } else {
        const newItem = { x: item.x };
        newItem[item.series] = item.y;
        acc.push(newItem);
      }
      return acc;
    }, []);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={groupedData} margin={{ top: 20, right: 120, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            layout="vertical"
            iconType="line"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          {seriesNames.map((seriesName, index) => (
            <Line 
              key={seriesName} 
              type="monotone" 
              dataKey={seriesName} 
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              name={seriesName}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  } else {
    // Single series line chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
          />
          <Line 
            type="monotone" 
            dataKey="y" 
            stroke={COLORS[0]}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
};

const renderAreaChart = (data: any[], config: ChartConfig) => {
  // Check if we have series data for multi-series charts
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  if (hasSeries) {
    // Multi-series area chart: group data by series
    const seriesNames = [...new Set(data.map(item => item.series).filter(Boolean))];
    
    // Restructure data for Recharts multi-series format
    const groupedData = data.reduce((acc, item) => {
      const existing = acc.find(d => d.x === item.x);
      if (existing) {
        existing[item.series] = item.y;
      } else {
        const newItem = { x: item.x };
        newItem[item.series] = item.y;
        acc.push(newItem);
      }
      return acc;
    }, []);
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={groupedData} margin={{ top: 20, right: 120, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            layout="vertical"
            iconType="line"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          {seriesNames.map((seriesName, index) => (
            <Area 
              key={seriesName} 
              type="monotone" 
              dataKey={seriesName} 
              stackId="1"
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              name={seriesName}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  } else {
    // Single series area chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
          />
          <Area 
            type="monotone" 
            dataKey="y" 
            stackId="1"
            stroke={COLORS[0]}
            fill={COLORS[0]}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
};

const renderPieChart = (data: any[], config: ChartConfig) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="y"
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
        <Tooltip 
          formatter={(value, name) => [value, config.y || 'Value']}
          labelFormatter={(label) => `${config.x}: ${label}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

const renderScatterChart = (data: any[], config: ChartConfig) => {
  // Check if we have series data for multi-series scatter plots
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  if (hasSeries) {
    // Multi-series scatter chart
    const seriesNames = [...new Set(data.map(item => item.series).filter(Boolean))];
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={data} margin={{ top: 20, right: 120, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            dataKey="y" 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            formatter={(value, name, props) => {
              if (name === 'y') {
                return [value, config.y || 'Value'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `${config.x}: ${label}`}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            layout="vertical"
            iconType="line"
            wrapperStyle={{ paddingBottom: '20px' }}
          />
          {seriesNames.map((seriesName, index) => (
            <Scatter 
              key={seriesName}
              data={data.filter(item => item.series === seriesName)}
              dataKey="y" 
              fill={COLORS[index % COLORS.length]}
              name={seriesName}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  } else {
    // Single series scatter chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          />
          <YAxis 
            dataKey="y" 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            formatter={(value, name, props) => {
              if (name === 'y') {
                return [value, config.y || 'Value'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `${config.x}: ${label}`}
          />
          <Scatter dataKey="y" fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
};

const renderGanttChart = (data: any[], config: ChartConfig) => {
  // Process data using x and x2 from standardized format
  const processedData = data.map(item => {
    const start = item.x ? new Date(item.x).getTime() : 0;
    const end = item.x2 ? new Date(item.x2).getTime() : start;
    const duration = end - start;
    
    return {
      name: item.y || 'Item', // Use y field for row labels
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
        margin={{ top: 20, right: 30, left: 80, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          domain={['dataMin', 'dataMax']} 
          label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <Tooltip 
          labelFormatter={(label) => `${config.y}: ${label}`}
          formatter={(value, name) => {
            if (name === 'duration') {
              return [new Date(value).toLocaleDateString(), `${config.x} - ${config.x2 || 'End'}`];
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
  // Process data using standardized x, x2, y format
  const processedData = data.map(item => ({
    name: item.y || 'Item', // Use y field for row labels
    value1: parseFloat(item.x) || 0,
    value2: item.x2 ? parseFloat(item.x2) || 0 : 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={processedData} 
        layout="horizontal"
        margin={{ top: 20, right: 30, left: 80, bottom: 40 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <Tooltip 
          labelFormatter={(label) => `${config.y}: ${label}`}
          formatter={(value, name) => {
            if (name === 'value1') return [value, config.x];
            if (name === 'value2') return [value, config.x2 || 'Value 2'];
            return [value, name];
          }}
        />
        <Bar dataKey="value1" fill={COLORS[0]} />
        <Bar dataKey="value2" fill={COLORS[1]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const renderHistogram = (data: any[], config: ChartConfig) => {
  // For histogram, if data is already processed (has bins), use it directly
  // Otherwise, process raw data using the x field
  let histogramData;
  
  if (data.length > 0 && typeof data[0].x === 'string' && data[0].x.includes('-')) {
    // Data is already binned (format like "1.0-2.0")
    histogramData = data.map(item => ({
      bin: item.x,
      count: item.y || item.count || 1,
      frequency: (item.y || item.count || 1) / data.length
    }));
  } else {
    // Need to create bins from raw data - reconstruct original data structure
    const originalData = data.map(item => ({ [config.x]: item.x }));
    histogramData = processHistogramData(originalData, config.x);
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="bin" 
          label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
        />
        <YAxis 
          label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <Tooltip 
          labelFormatter={(label) => `${config.x} Range: ${label}`}
          formatter={(value, name) => [value, name === 'count' ? 'Frequency' : name]}
        />
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
  // Check if data is already transformed (has standardized structure)
  const isAlreadyTransformed = data && data.length > 0 && 
    typeof data[0] === 'object' && 
    ('x' in data[0] && 'y' in data[0]);

  const transformedResult = useMemo(() => {
    if (!data || data.length === 0) return { data: [], config };
    
    // If data is already in the standardized format, use it directly
    if (isAlreadyTransformed) {
      return { data, config };
    }
    
    // Otherwise, transform the data
    return transformData(data, config);
  }, [data, config, isAlreadyTransformed]);

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
        return renderHistogram(transformedData, config); // Use transformed data
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
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2">{config.title}</CardTitle>
            {config.rationale && (
              <p className="text-sm text-gray-600 mb-3">{config.rationale}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="font-medium">Type:</span>
              <span className="bg-gray-100 px-2 py-1 rounded">{config.type}</span>
              {config.transform_x && (
                <>
                  <span className="font-medium">X Transform:</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">{config.transform_x}</span>
                </>
              )}
              {config.transform_y && (
                <>
                  <span className="font-medium">Y Transform:</span>
                  <span className="bg-green-100 px-2 py-1 rounded">{config.transform_y}</span>
                </>
              )}
              {config.series && (
                <>
                  <span className="font-medium">Series:</span>
                  <span className="bg-purple-100 px-2 py-1 rounded">{config.series}</span>
                </>
              )}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">{config.type}</Badge>
        </div>
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