import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartConfig, ChartRenderer } from './chart-renderer';
import { Info } from 'lucide-react';

export interface MultiChartConfig {
  title: string;
  description?: string;
  charts: ChartConfig[];
}

interface MultiChartRendererProps {
  data: any[];
  config: MultiChartConfig;
  height?: number;
  width?: string;
}

export function MultiChartRenderer({ data, config, height = 400, width = "100%" }: MultiChartRendererProps) {
  // Debug logging
  console.log('MultiChartRenderer received config:', config);
  console.log('MultiChartRenderer received data:', data);
  
  if (!config.charts || config.charts.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No charts configured to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Main header for the chart collection */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold mb-2">{config.title}</CardTitle>
              {config.description && (
                <p className="text-sm text-gray-600 mb-3">{config.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <Badge variant="outline">{config.charts.length} Charts</Badge>
                <Badge variant="outline">{data.length} Data Points</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Render each chart */}
      {config.charts.map((chartConfig, index) => (
        <div key={index} className="w-full">
          <ChartRenderer
            data={data}
            config={chartConfig}
            height={height}
            width={width}
          />
        </div>
      ))}
    </div>
  );
}

export default MultiChartRenderer;