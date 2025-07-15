import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
import { scaleBand, scaleTime, scaleOrdinal, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar as VisxBar, Line as VisxLine, Circle } from "@visx/shape";
import { LegendOrdinal } from "@visx/legend";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { timeParse, timeFormat } from "d3-time-format";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Info, Maximize2, Minimize2 } from 'lucide-react';
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

// visx-based GanttChart Component
type GanttData = {
  x: string;     // Start date
  x2: string;    // End date
  y: string;     // IWP ID
  series: string; // CWP Name
};

type GanttProps = {
  data: GanttData[];
  config: ChartConfig;
  width?: number;
  height?: number;
};

// visx-based DumbbellChart Component
type DumbbellDatum = {
  x: string;   // plan_finish
  x2: string;  // actual_finish
  y: string;   // iwp_id
  series: string; // cwp_name
};

type DumbbellProps = {
  data: DumbbellDatum[];
  config: ChartConfig;
  width?: number;
  height?: number;
};

const parseDate = timeParse("%Y-%m-%d");
const formatDate = timeFormat("%Y-%m-%d");

const ResponsiveGanttChart: React.FC<Omit<GanttProps, 'width' | 'height'>> = ({ data, config }) => {
  // Dynamic sizing based on dataset size
  const getItemHeight = (dataLength: number) => {
    if (dataLength <= 20) return 30;
    if (dataLength <= 50) return 25;
    if (dataLength <= 100) return 20;
    return 15; // Very large datasets
  };
  
  const itemHeight = getItemHeight(data.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const height = Math.max(400, data.length * itemHeight + 200);

  // Resize observer callback
  const measure = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      // Calculate responsive width with min/max constraints
      const calculatedWidth = Math.min(containerWidth - 40, 1200); // Max width 1200px, padding 40px
      setWidth(Math.max(400, calculatedWidth)); // Minimum 400px width
    }
  }, []);

  useEffect(() => {
    // Initial measurement
    measure();
    
    // Re-measure on window resize
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  if (width === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />;
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <GanttChart data={data} config={config} width={width} height={height} />
    </div>
  );
};

const GanttChart: React.FC<GanttProps> = ({ data, config, width = 800, height = 500 }) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>No data available for Gantt chart</p>
      </div>
    );
  }

  // Parse dates with error handling and fallback for missing dates
  let nullCount = 0;
  let invalidDateCount = 0;
  
  // Debug: Check raw input data format first
  console.log('Gantt Chart - Raw input data sample:', data.slice(0, 2));
  
  const parsedData = data.map((d, index) => {

    
    // Handle empty or invalid date strings
    let startDate = null;
    let endDate = null;
    
    if (d.x && d.x.trim() !== '') {
      // Parse the date ensuring we use the exact date provided
      const parts = d.x.split('-');
      if (parts.length === 3) {
        // Create date using local time (not UTC) to preserve exact date
        startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(startDate.getTime())) startDate = null;
      } else {
        // Fallback to d3 parsing
        startDate = parseDate(d.x);
        if (!startDate) {
          startDate = new Date(d.x);
          if (isNaN(startDate.getTime())) startDate = null;
        }
      }
    }
    
    if (d.x2 && d.x2.trim() !== '') {
      // Parse the date ensuring we use the exact date provided
      const parts = d.x2.split('-');
      if (parts.length === 3) {
        // Create date using local time (not UTC) to preserve exact date
        endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(endDate.getTime())) endDate = null;
      } else {
        // Fallback to d3 parsing
        endDate = parseDate(d.x2);
        if (!endDate) {
          endDate = new Date(d.x2 + 'T00:00:00');
          if (isNaN(endDate.getTime())) endDate = null;
        }
      }
      

    }
    

    
    // If both dates are missing, skip this item
    if (!startDate && !endDate) {
      nullCount++;
      return null;
    }
    
    // Handle missing dates - use the actual date provided, don't create synthetic dates
    if (!startDate && endDate) {
      // If no start date, use the same date as end date to show as a milestone/point
      startDate = new Date(endDate.getTime());
    }
    
    if (!endDate && startDate) {
      // If no end date, use the same date as start date to show as a milestone/point
      endDate = new Date(startDate.getTime());
    }
    
    // Handle cases where start date is after end date (data error)
    if (startDate && endDate && startDate > endDate) {
      // Swap the dates to make logical sense
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }
    

    
    return {
      ...d,
      startDate: startDate,
      endDate: endDate,
    };
  }).filter(d => {
    const isValid = d !== null && d.startDate && d.endDate && !isNaN(d.startDate.getTime()) && !isNaN(d.endDate.getTime());
    if (!isValid) {
      invalidDateCount++;
    }
    return isValid;
  });

  // Debug info if needed
  if (nullCount > 0 || invalidDateCount > 0) {
    console.log('Gantt Chart - Items filtered out:', { nullCount, invalidDateCount });
  }

  // Handle case where all dates failed to parse
  if (parsedData.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>Invalid date format in data</p>
      </div>
    );
  }

  const margin = { top: 40, left: 300, right: 210, bottom: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Unique Y values (tasks) - sorted for better display
  const tasks = [...new Set(parsedData.map(d => d.y))].sort();
  
  // Debug: log tasks to ensure all are included
  console.log('Gantt Chart - Total tasks:', tasks.length, 'Sample tasks:', tasks.slice(0, 5));
  
  // Debug: Check first few data items to see what dates we're working with
  console.log('Gantt Chart Debug - Config:', { x: config.x, x2: config.x2, y: config.y, series: config.series });
  console.log('Gantt Chart Debug - Sample parsed data:', parsedData.slice(0, 3).map(d => ({
    y: d.y,
    originalX: d.x,
    originalX2: d.x2,
    startDate: d.startDate?.toISOString(),
    endDate: d.endDate?.toISOString(),
    series: d.series
  })));

  // Dynamic padding based on dataset size
  const getPadding = (dataLength: number) => {
    if (dataLength <= 20) return 0.3;
    if (dataLength <= 50) return 0.15;
    if (dataLength <= 100) return 0.1;
    return 0.05; // Very large datasets
  };

  const yScale = scaleBand<string>({
    domain: tasks,
    range: [0, innerHeight],
    padding: getPadding(data.length),
  });

  // Get valid dates for x-axis extent
  const validStartDates = parsedData.filter(d => d.startDate).map(d => d.startDate.getTime());
  const validEndDates = parsedData.filter(d => d.endDate).map(d => d.endDate.getTime());
  const allValidDates = [...validStartDates, ...validEndDates];
  
  if (allValidDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500">No valid dates found for Gantt chart</p>
        </div>
      </div>
    );
  }

  const xExtent: [Date, Date] = [
    new Date(Math.min(...allValidDates)),
    new Date(Math.max(...allValidDates)),
  ];
  const xScale = scaleTime({
    domain: xExtent,
    range: [0, innerWidth],
  });

  const seriesNames = [...new Set(parsedData.map(d => d.series))];
  const colorScale = scaleOrdinal<string, string>({
    domain: seriesNames,
    range: COLORS,
  });

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<any>();

  const tooltipStyles = {
    ...defaultStyles,
    background: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '12px',
  };

  // Check if scrolling is needed
  const needsScroll = height > 600; // If chart height exceeds 600px, we need scroll
  
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {needsScroll ? (
        // Scrollable layout with sticky x-axis
        <div style={{ flex: 1, minWidth: 0, position: 'relative', width: '100%', height: '600px' }}>
          {/* Sticky X-axis container */}
          <div style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10, 
            backgroundColor: 'var(--background)',
            borderBottom: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <svg width={width} height={margin.top + 40} style={{ display: 'block' }}>
              <Group top={margin.top} left={margin.left}>
                {/* X-axis grid lines */}
                {xScale.ticks().map((tick, i) => (
                  <line
                    key={`sticky-grid-x-${i}`}
                    x1={xScale(tick)}
                    x2={xScale(tick)}
                    y1={0}
                    y2={30}
                    stroke="var(--border)"
                    strokeDasharray="3,3"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                ))}
                {/* Custom X-axis with rotated labels */}
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={20}
                  y2={20}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                {xScale.ticks(6).map((tick, i) => {
                  const x = xScale(tick);
                  const label = timeFormat("%b %Y")(tick);
                  return (
                    <g key={`sticky-x-tick-${i}`}>
                      <line
                        x1={x}
                        x2={x}
                        y1={20}
                        y2={26}
                        stroke="var(--border)"
                        strokeWidth={1}
                      />
                      <text
                        x={x}
                        y={40}
                        fill="var(--foreground)"
                        fontSize={9}
                        textAnchor="start"
                        fontWeight={500}
                        transform={`rotate(-45, ${x}, 40)`}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
                {/* X-axis Label */}
                <text
                  x={innerWidth / 2}
                  y={55}
                  fill="var(--muted-foreground)"
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  Timeline
                </text>
              </Group>
            </svg>
          </div>
          
          {/* Scrollable content area */}
          <div style={{ 
            height: '540px', 
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <svg width={width} height={height - margin.top - 40} style={{ display: 'block' }}>
              <Group top={0} left={margin.left}>
                {/* Grid lines */}
                {xScale.ticks().map((tick, i) => (
                  <line
                    key={`grid-x-${i}`}
                    x1={xScale(tick)}
                    x2={xScale(tick)}
                    y1={0}
                    y2={innerHeight}
                    stroke="#e0e0e0"
                    strokeDasharray="3,3"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                ))}
                
                {/* Bars */}
                {parsedData.map((d, i) => {
                  const barY = yScale(d.y);
                  const barHeight = yScale.bandwidth();
                  
                  if (barY === undefined || barHeight === undefined || !d.startDate || !d.endDate) {
                    return null;
                  }
                  
                  const startX = xScale(d.startDate);
                  const endX = xScale(d.endDate);
                  
                  if (startX === undefined || endX === undefined) {
                    return null;
                  }
                  
                  const barWidth = Math.max(2, endX - startX);
                  
                  return (
                    <VisxBar
                      key={`gantt-bar-${i}`}
                      x={startX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={colorScale(d.series)}
                      rx={3}
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(event) => {
                        showTooltip({
                          tooltipData: d,
                          tooltipLeft: event.clientX,
                          tooltipTop: event.clientY - 20,
                        });
                      }}
                      onMouseMove={(event) => {
                        showTooltip({
                          tooltipData: d,
                          tooltipLeft: event.clientX,
                          tooltipTop: event.clientY - 20,
                        });
                      }}
                      onMouseLeave={() => hideTooltip()}
                    />
                  );
                })}

                {/* Custom Y-axis with better distribution */}
                <line
                  x1={0}
                  x2={0}
                  y1={60}
                  y2={height - 60}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                {/* Show ALL task labels - full length in scrollable view */}
                {tasks.map((task, i) => {
                  const y = yScale(task);
                  if (y === undefined) return null;
                  
                  return (
                    <g key={`sticky-y-tick-${i}`}>
                      <line
                        x1={-6}
                        x2={0}
                        y1={y + yScale.bandwidth() / 2}
                        y2={y + yScale.bandwidth() / 2}
                        stroke="var(--border)"
                        strokeWidth={1}
                      />
                      <text
                        x={-10}
                        y={y + yScale.bandwidth() / 2}
                        fill="var(--foreground)"
                        fontSize={10}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontWeight={500}
                      >
                        {task}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y-axis Label */}
                <text
                  x={-margin.left + 20}
                  y={innerHeight / 2}
                  fill="var(--muted-foreground)"
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                  transform={`rotate(-90, ${-margin.left + 20}, ${innerHeight / 2})`}
                >
                  {config.y || 'Tasks'}
                </text>
              </Group>
            </svg>
          </div>
        </div>
      ) : (
        // Normal layout for smaller charts
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <svg width={width - 140} height={height} style={{ display: 'block' }}>
            <Group top={margin.top} left={margin.left}>
              {/* Grid lines */}
              {xScale.ticks().map((tick, i) => (
                <line
                  key={`grid-x-${i}`}
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={0}
                  y2={innerHeight}
                  stroke="var(--border)"
                  strokeDasharray="3,3"
                  strokeWidth={1}
                  opacity={0.6}
                />
              ))}
              
              {/* Bars */}
              {parsedData.map((d, i) => {
                const barY = yScale(d.y);
                const barHeight = yScale.bandwidth();
                
                if (barY === undefined || barHeight === undefined || !d.startDate || !d.endDate) {
                  return null;
                }
                
                const startX = xScale(d.startDate);
                const endX = xScale(d.endDate);
                
                if (startX === undefined || endX === undefined) {
                  return null;
                }
                
                const barWidth = Math.max(2, endX - startX); // Minimum width of 2px
                
                return (
                  <VisxBar
                    key={`gantt-bar-${i}`}
                    x={startX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={colorScale(d.series)}
                    rx={3}
                    stroke="#fff"
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      showTooltip({
                        tooltipData: d,
                        tooltipLeft: rect.left + rect.width / 2,
                        tooltipTop: rect.top - 10,
                      });
                    }}
                    onMouseLeave={() => hideTooltip()}
                  />
                );
              })}

              {/* Custom X-axis with rotated labels */}
              <line
                x1={0}
                x2={innerWidth}
                y1={innerHeight}
                y2={innerHeight}
                stroke="var(--border)"
                strokeWidth={1}
              />
              {xScale.ticks(6).map((tick, i) => {
                const x = xScale(tick);
                const label = timeFormat("%b %Y")(tick);
                return (
                  <g key={`x-tick-${i}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={innerHeight}
                      y2={innerHeight + 6}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={innerHeight + 20}
                      fill="var(--foreground)"
                      fontSize={9}
                      textAnchor="start"
                      fontWeight={500}
                      transform={`rotate(-45, ${x}, ${innerHeight + 20})`}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              
              {/* Custom Y-axis with better label distribution */}
              <line
                x1={0}
                x2={0}
                y1={0}
                y2={innerHeight}
                stroke="var(--border)"
                strokeWidth={1}
              />
              {/* Show ALL task labels - full length */}
              {tasks.map((task, i) => {
                const y = yScale(task);
                if (y === undefined) return null;
                
                return (
                  <g key={`y-tick-${i}`}>
                    <line
                      x1={-6}
                      x2={0}
                      y1={y + yScale.bandwidth() / 2}
                      y2={y + yScale.bandwidth() / 2}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={-10}
                      y={y + yScale.bandwidth() / 2}
                      fill="var(--foreground)"
                      fontSize={10}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontWeight={500}
                    >
                      {task}
                    </text>
                  </g>
                );
              })}
            </Group>

            {/* Axis Labels */}
            <text
              x={(width - 200) / 2}
              y={height - 10}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize={12}
              fontWeight={600}
            >
              {config.x || 'Timeline'}
            </text>
            <text
              x={15}
              y={height / 2}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize={12}
              fontWeight={600}
              transform={`rotate(-90, 15, ${height / 2})`}
            >
              {config.y || 'Tasks'}
            </text>
          </svg>
        </div>
      )}

      {/* Scrollable Legend Panel */}
      <div style={{ 
        width: '200px', 
        borderLeft: '1px solid var(--border)', 
        padding: '16px 12px',
        backgroundColor: 'var(--background)',
        overflowY: 'auto',
        maxHeight: '100%'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--muted-foreground)',
          marginBottom: '12px'
        }}>
          {config.series || 'Series'}
        </div>
        {seriesNames.map((seriesName, i) => (
          <div key={seriesName} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 500
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: colorScale(seriesName),
              borderRadius: '2px',
              marginRight: '8px',
              flexShrink: 0
            }} />
            <span style={{
              color: 'var(--foreground)',
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}>
              {seriesName}
            </span>
          </div>
        ))}
      </div>
      
      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div>
            <div><strong>{tooltipData.y}</strong></div>
            <div>Series: {tooltipData.series}</div>
            <div>Start: {tooltipData.startDate ? formatDate(tooltipData.startDate) : 'N/A'}</div>
            <div>End: {tooltipData.endDate ? formatDate(tooltipData.endDate) : 'N/A'}</div>
            <div>Duration: {tooltipData.startDate && tooltipData.endDate ? Math.ceil((tooltipData.endDate.getTime() - tooltipData.startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0} days</div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

const ResponsiveDumbbellChart: React.FC<Omit<DumbbellProps, 'width' | 'height'>> = ({ data, config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const height = Math.max(500, data.length * 20 + 150); // Dynamic height based on data

  // Resize observer callback
  const measure = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      // Calculate responsive width with min/max constraints  
      const calculatedWidth = Math.min(containerWidth - 40, 1200); // Max width 1200px, padding 40px
      setWidth(Math.max(600, calculatedWidth)); // Minimum 600px width for better labels
    }
  }, []);

  useEffect(() => {
    // Initial measurement
    measure();
    
    // Re-measure on window resize
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  if (width === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />;
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <DumbbellChart data={data} config={config} width={width} height={height} />
    </div>
  );
};

const DumbbellChart: React.FC<DumbbellProps> = ({ data, config, width = 800, height = 500 }) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>No data available for Dumbbell chart</p>
      </div>
    );
  }

  // Parse dates with error handling and fallback for missing dates (same as Gantt)
  let nullCount = 0;
  let invalidDateCount = 0;
  
  const parsedData = data.map((d, index) => {
    // Handle empty or invalid date strings
    let startDate = null;
    let endDate = null;
    
    if (d.x && d.x.trim() !== '') {
      // Parse the date ensuring we use the exact date provided
      const parts = d.x.split('-');
      if (parts.length === 3) {
        // Create date using local time (not UTC) to preserve exact date
        startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(startDate.getTime())) startDate = null;
      } else {
        // Fallback to d3 parsing
        startDate = parseDate(d.x);
        if (!startDate) {
          startDate = new Date(d.x);
          if (isNaN(startDate.getTime())) startDate = null;
        }
      }
    }
    
    if (d.x2 && d.x2.trim() !== '') {
      // Parse the date ensuring we use the exact date provided
      const parts = d.x2.split('-');
      if (parts.length === 3) {
        // Create date using local time (not UTC) to preserve exact date
        endDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (isNaN(endDate.getTime())) endDate = null;
      } else {
        // Fallback to d3 parsing
        endDate = parseDate(d.x2);
        if (!endDate) {
          endDate = new Date(d.x2 + 'T00:00:00');
          if (isNaN(endDate.getTime())) endDate = null;
        }
      }
    }
    
    // If both dates are missing, skip this item
    if (!startDate && !endDate) {
      nullCount++;
      return null;
    }
    
    // Handle missing dates - use the actual date provided, don't create synthetic dates
    if (!startDate && endDate) {
      // If no start date, use the same date as end date to show as a milestone/point
      startDate = new Date(endDate.getTime());
    }
    
    if (!endDate && startDate) {
      // If no end date, use the same date as start date to show as a milestone/point
      endDate = new Date(startDate.getTime());
    }
    
    // Handle cases where start date is after end date (data error)
    if (startDate && endDate && startDate > endDate) {
      // Swap the dates to make logical sense
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }
    
    return {
      ...d,
      startDate: startDate,
      endDate: endDate,
    };
  }).filter(d => {
    const isValid = d !== null && d.startDate && d.endDate && !isNaN(d.startDate.getTime()) && !isNaN(d.endDate.getTime());
    if (!isValid) {
      invalidDateCount++;
    }
    return isValid;
  });

  // Handle case where all dates failed to parse
  if (parsedData.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>Invalid date format in data</p>
      </div>
    );
  }

  const margin = { top: 40, left: 350, right: 210, bottom: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Unique Y values (tasks) - sorted for better display
  const tasks = [...new Set(parsedData.map(d => d.y))].sort();
  
  // Dynamic padding based on dataset size
  const getPadding = (dataLength: number) => {
    if (dataLength <= 20) return 0.3;
    if (dataLength <= 50) return 0.2;
    if (dataLength <= 100) return 0.15;
    return 0.1; // Very large datasets
  };

  const yScale = scaleBand<string>({
    domain: tasks,
    range: [0, innerHeight],
    padding: getPadding(data.length),
  });

  // Get valid dates for x-axis extent
  const validStartDates = parsedData.filter(d => d.startDate).map(d => d.startDate.getTime());
  const validEndDates = parsedData.filter(d => d.endDate).map(d => d.endDate.getTime());
  const allValidDates = [...validStartDates, ...validEndDates];
  
  if (allValidDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500">No valid dates found for Dumbbell chart</p>
        </div>
      </div>
    );
  }

  const xExtent: [Date, Date] = [
    new Date(Math.min(...allValidDates)),
    new Date(Math.max(...allValidDates)),
  ];
  const xScale = scaleTime({
    domain: xExtent,
    range: [0, innerWidth],
  });

  const seriesNames = [...new Set(parsedData.map(d => d.series))];
  const colorScale = scaleOrdinal<string, string>({
    domain: seriesNames,
    range: COLORS,
  });

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<any>();

  const tooltipStyles = {
    ...defaultStyles,
    background: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '12px',
  };

  // Check if scrolling is needed
  const needsScroll = height > 600; // If chart height exceeds 600px, we need scroll
  
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {needsScroll ? (
        // Scrollable layout with sticky x-axis
        <div style={{ flex: 1, minWidth: 0, position: 'relative', width: '100%', height: '600px' }}>
          {/* Sticky X-axis container */}
          <div style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10, 
            backgroundColor: 'var(--background)',
            borderBottom: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <svg width={width} height={margin.top + 40} style={{ display: 'block' }}>
              <Group top={margin.top} left={margin.left}>
                {/* X-axis grid lines */}
                {xScale.ticks().map((tick, i) => (
                  <line
                    key={`sticky-grid-x-${i}`}
                    x1={xScale(tick)}
                    x2={xScale(tick)}
                    y1={0}
                    y2={30}
                    stroke="var(--border)"
                    strokeDasharray="3,3"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                ))}
                {/* Custom X-axis with rotated labels */}
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={20}
                  y2={20}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                {xScale.ticks(6).map((tick, i) => {
                  const x = xScale(tick);
                  const label = timeFormat("%b %Y")(tick);
                  return (
                    <g key={`sticky-x-tick-${i}`}>
                      <line
                        x1={x}
                        x2={x}
                        y1={20}
                        y2={26}
                        stroke="var(--border)"
                        strokeWidth={1}
                      />
                      <text
                        x={x}
                        y={40}
                        fill="var(--foreground)"
                        fontSize={9}
                        textAnchor="start"
                        fontWeight={500}
                        transform={`rotate(-45, ${x}, 40)`}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
                {/* X-axis Label */}
                <text
                  x={innerWidth / 2}
                  y={55}
                  fill="var(--muted-foreground)"
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                >
                  Timeline
                </text>
              </Group>
            </svg>
          </div>
          
          {/* Scrollable content area */}
          <div style={{ 
            height: '540px', 
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <svg width={width} height={height - margin.top - 40} style={{ display: 'block' }}>
              <Group top={0} left={margin.left}>
                {/* Vertical Grid lines */}
                {xScale.ticks().map((tick, i) => (
                  <line
                    key={`grid-x-${i}`}
                    x1={xScale(tick)}
                    x2={xScale(tick)}
                    y1={0}
                    y2={innerHeight}
                    stroke="var(--border)"
                    strokeDasharray="2,2"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                ))}
                
                {/* Horizontal Grid lines */}
                {tasks.map((task, i) => {
                  const y = yScale(task);
                  if (y === undefined) return null;
                  return (
                    <line
                      key={`grid-y-${i}`}
                      x1={0}
                      x2={innerWidth}
                      y1={y + yScale.bandwidth() / 2}
                      y2={y + yScale.bandwidth() / 2}
                      stroke="var(--border)"
                      strokeDasharray="1,3"
                      strokeWidth={1}
                      opacity={0.3}
                    />
                  );
                })}
                
                {/* Dumbbells */}
                {parsedData.map((d, i) => {
                  const barY = yScale(d.y);
                  const barHeight = yScale.bandwidth();
                  
                  if (barY === undefined || barHeight === undefined || !d.startDate || !d.endDate) {
                    return null;
                  }
                  
                  const startX = xScale(d.startDate);
                  const endX = xScale(d.endDate);
                  
                  if (startX === undefined || endX === undefined) {
                    return null;
                  }
                  
                  const centerY = barY + barHeight / 2;
                  const color = colorScale(d.series);
                  
                  return (
                    <Group key={`dumbbell-${i}`}>
                      {/* Connecting line */}
                      <VisxLine
                        from={{ x: startX, y: centerY }}
                        to={{ x: endX, y: centerY }}
                        stroke={color}
                        strokeWidth={2}
                        strokeOpacity={0.7}
                      />
                      {/* Start dot (planned) */}
                      <Circle
                        cx={startX}
                        cy={centerY}
                        r={6}
                        fill={color}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(event) => {
                          showTooltip({
                            tooltipData: d,
                            tooltipLeft: event.clientX,
                            tooltipTop: event.clientY - 20,
                          });
                        }}
                        onMouseMove={(event) => {
                          showTooltip({
                            tooltipData: d,
                            tooltipLeft: event.clientX,
                            tooltipTop: event.clientY - 20,
                          });
                        }}
                        onMouseLeave={() => hideTooltip()}
                      />
                      {/* End dot (actual) */}
                      <Circle
                        cx={endX}
                        cy={centerY}
                        r={6}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={1.5}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(event) => {
                          showTooltip({
                            tooltipData: d,
                            tooltipLeft: event.clientX,
                            tooltipTop: event.clientY - 20,
                          });
                        }}
                        onMouseMove={(event) => {
                          showTooltip({
                            tooltipData: d,
                            tooltipLeft: event.clientX,
                            tooltipTop: event.clientY - 20,
                          });
                        }}
                        onMouseLeave={() => hideTooltip()}
                      />
                    </Group>
                  );
                })}

                {/* Custom Y-axis with better distribution */}
                <line
                  x1={0}
                  x2={0}
                  y1={60}
                  y2={height - 60}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                {/* Show ALL task labels - full length in scrollable view */}
                {tasks.map((task, i) => {
                  const y = yScale(task);
                  if (y === undefined) return null;
                  
                  return (
                    <g key={`sticky-y-tick-${i}`}>
                      <line
                        x1={-6}
                        x2={0}
                        y1={y + yScale.bandwidth() / 2}
                        y2={y + yScale.bandwidth() / 2}
                        stroke="var(--border)"
                        strokeWidth={1}
                      />
                      <text
                        x={-10}
                        y={y + yScale.bandwidth() / 2}
                        fill="var(--foreground)"
                        fontSize={10}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fontWeight={500}
                      >
                        {task}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y-axis Label */}
                <text
                  x={-margin.left + 20}
                  y={innerHeight / 2}
                  fill="var(--muted-foreground)"
                  fontSize={12}
                  fontWeight={600}
                  textAnchor="middle"
                  transform={`rotate(-90, ${-margin.left + 20}, ${innerHeight / 2})`}
                >
                  {config.y || 'Tasks'}
                </text>
              </Group>
            </svg>
          </div>
        </div>
      ) : (
        // Normal layout for smaller charts
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <svg width={width - 140} height={height} style={{ display: 'block' }}>
            <Group top={margin.top} left={margin.left}>
              {/* Grid lines */}
              {xScale.ticks().map((tick, i) => (
                <line
                  key={`grid-x-${i}`}
                  x1={xScale(tick)}
                  x2={xScale(tick)}
                  y1={0}
                  y2={innerHeight}
                  stroke="var(--border)"
                  strokeDasharray="3,3"
                  strokeWidth={1}
                  opacity={0.6}
                />
              ))}
              
              {/* Dumbbells */}
              {parsedData.map((d, i) => {
                const barY = yScale(d.y);
                const barHeight = yScale.bandwidth();
                
                if (barY === undefined || barHeight === undefined || !d.startDate || !d.endDate) {
                  return null;
                }
                
                const startX = xScale(d.startDate);
                const endX = xScale(d.endDate);
                
                if (startX === undefined || endX === undefined) {
                  return null;
                }
                
                const centerY = barY + barHeight / 2;
                const color = colorScale(d.series);
                
                return (
                  <Group key={`dumbbell-${i}`}>
                    {/* Connecting line */}
                    <VisxLine
                      from={{ x: startX, y: centerY }}
                      to={{ x: endX, y: centerY }}
                      stroke={color}
                      strokeWidth={2}
                      strokeOpacity={0.7}
                    />
                    {/* Start dot (planned) */}
                    <Circle
                      cx={startX}
                      cy={centerY}
                      r={6}
                      fill={color}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        showTooltip({
                          tooltipData: d,
                          tooltipLeft: rect.left + rect.width / 2,
                          tooltipTop: rect.top - 10,
                        });
                      }}
                      onMouseLeave={() => hideTooltip()}
                    />
                    {/* End dot (actual) */}
                    <Circle
                      cx={endX}
                      cy={centerY}
                      r={6}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        showTooltip({
                          tooltipData: d,
                          tooltipLeft: rect.left + rect.width / 2,
                          tooltipTop: rect.top - 10,
                        });
                      }}
                      onMouseLeave={() => hideTooltip()}
                    />
                  </Group>
                );
              })}

              {/* Custom X-axis with rotated labels */}
              <line
                x1={0}
                x2={innerWidth}
                y1={innerHeight}
                y2={innerHeight}
                stroke="var(--border)"
                strokeWidth={1}
              />
              {xScale.ticks(6).map((tick, i) => {
                const x = xScale(tick);
                const label = timeFormat("%b %Y")(tick);
                return (
                  <g key={`x-tick-${i}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={innerHeight}
                      y2={innerHeight + 6}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={x}
                      y={innerHeight + 20}
                      fill="var(--foreground)"
                      fontSize={9}
                      textAnchor="start"
                      fontWeight={500}
                      transform={`rotate(-45, ${x}, ${innerHeight + 20})`}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
              
              {/* Custom Y-axis with better label distribution */}
              <line
                x1={0}
                x2={0}
                y1={0}
                y2={innerHeight}
                stroke="var(--border)"
                strokeWidth={1}
              />
              {/* Show ALL task labels - full length */}
              {tasks.map((task, i) => {
                const y = yScale(task);
                if (y === undefined) return null;
                
                return (
                  <g key={`y-tick-${i}`}>
                    <line
                      x1={-6}
                      x2={0}
                      y1={y + yScale.bandwidth() / 2}
                      y2={y + yScale.bandwidth() / 2}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={-10}
                      y={y + yScale.bandwidth() / 2}
                      fill="var(--foreground)"
                      fontSize={10}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontWeight={500}
                    >
                      {task}
                    </text>
                  </g>
                );
              })}
            </Group>

            {/* Axis Labels */}
            <text
              x={(width - 200) / 2}
              y={height - 10}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize={12}
              fontWeight={600}
            >
              {config.x || 'Timeline'}
            </text>
            <text
              x={15}
              y={height / 2}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize={12}
              fontWeight={600}
              transform={`rotate(-90, 15, ${height / 2})`}
            >
              {config.y || 'Tasks'}
            </text>
          </svg>
        </div>
      )}

      {/* Scrollable Legend Panel */}
      <div style={{ 
        width: '200px', 
        borderLeft: '1px solid var(--border)', 
        padding: '16px 12px',
        backgroundColor: 'var(--background)',
        overflowY: 'auto',
        maxHeight: '100%'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--muted-foreground)',
          marginBottom: '12px'
        }}>
          {config.series || 'Series'}
        </div>
        {seriesNames.map((seriesName, i) => (
          <div key={seriesName} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 500
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: colorScale(seriesName),
              borderRadius: '2px',
              marginRight: '8px',
              flexShrink: 0
            }} />
            <span style={{
              color: 'var(--foreground)',
              lineHeight: 1.2,
              wordBreak: 'break-word'
            }}>
              {seriesName}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div>
            <div><strong>{tooltipData.y}</strong></div>
            <div>Series: {tooltipData.series}</div>
            <div>Planned: {tooltipData.startDate?.toLocaleDateString()}</div>
            <div>Actual: {tooltipData.endDate?.toLocaleDateString()}</div>
            <div>Deviation: {Math.ceil((tooltipData.endDate.getTime() - tooltipData.startDate.getTime()) / (1000 * 60 * 60 * 24))} days</div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};



// Pure chart rendering functions (no data transformations)
const renderBarChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  // Check if we have series data for multi-series charts
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  // Calculate if we need to rotate labels based on number of categories
  const uniqueCategories = [...new Set(data.map(item => item.x))].length;
  const needsRotation = uniqueCategories > 6;
  const bottomMargin = needsRotation ? 80 : 40;
  
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
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedData} margin={{ top: 20, right: 20, left: 20, bottom: bottomMargin }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
                tick={{ fontSize: 12, textAnchor: needsRotation ? 'end' : 'middle' }}
                angle={needsRotation ? -45 : 0}
                interval={0}
                height={needsRotation ? 60 : 40}
              />
              <YAxis 
                label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip 
                labelFormatter={(label) => `${config.x}: ${label}`}
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value, 
                  name === 'y' ? config.y || 'Value' : name
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
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
        </div>
        
        {/* Scrollable Legend */}
        <div style={{ 
          width: '140px', 
          maxHeight: '100%', 
          overflowY: 'auto', 
          paddingLeft: '10px',
          borderLeft: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>
            {config.series || 'Series'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seriesNames.map((seriesName, index) => (
              <div key={seriesName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS[index % COLORS.length],
                  borderRadius: '2px',
                  flexShrink: 0
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}>
                  {seriesName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } else {
    // Single series bar chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="x" 
            label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
            tick={{ fontSize: 12, textAnchor: needsRotation ? 'end' : 'middle' }}
            angle={needsRotation ? -45 : 0}
            interval={0}
            height={needsRotation ? 60 : 40}
          />
          <YAxis 
            label={{ value: config.y, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
          />
          <Tooltip 
            labelFormatter={(label) => `${config.x}: ${label}`}
            formatter={(value, name) => [
              typeof value === 'number' ? value.toLocaleString() : value, 
              name === 'y' ? config.y || 'Value' : name
            ]}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px'
            }}
          />
          <Bar dataKey="y" fill={COLORS[0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
};

const renderLineChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
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
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={groupedData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
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
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value, 
                  name === 'y' ? config.y || 'Value' : name
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
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
        </div>
        
        {/* Scrollable Legend */}
        <div style={{ 
          width: '140px', 
          maxHeight: '100%', 
          overflowY: 'auto', 
          paddingLeft: '10px',
          borderLeft: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>
            {config.series || 'Series'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seriesNames.map((seriesName, index) => (
              <div key={seriesName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS[index % COLORS.length],
                  borderRadius: '2px',
                  flexShrink: 0
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}>
                  {seriesName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
            formatter={(value, name) => [
              typeof value === 'number' ? value.toLocaleString() : value, 
              name === 'y' ? config.y || 'Value' : name
            ]}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px'
            }}
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

const renderAreaChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
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
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={groupedData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
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
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toLocaleString() : value, 
                  name === 'y' ? config.y || 'Value' : name
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
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
        </div>
        
        {/* Scrollable Legend */}
        <div style={{ 
          width: '140px', 
          maxHeight: '100%', 
          overflowY: 'auto', 
          paddingLeft: '10px',
          borderLeft: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>
            {config.series || 'Series'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seriesNames.map((seriesName, index) => (
              <div key={seriesName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS[index % COLORS.length],
                  borderRadius: '2px',
                  flexShrink: 0
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}>
                  {seriesName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
            formatter={(value, name) => [
              typeof value === 'number' ? value.toLocaleString() : value, 
              name === 'y' ? config.y || 'Value' : name
            ]}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px'
            }}
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

const renderPieChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  const isDonut = config.type.toLowerCase() === 'donut';
  const innerRadius = isDonut ? 0.5 : 0; // 50% of outerRadius if donut
  const outerRadius = 100;               // treated as relative by Recharts

  const total = data.reduce((sum, d) => sum + d.y, 0);

  /** Custom tooltip for richer context */
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    const item = payload[0];
    const { name, value } = item;
    // Calculate percentage manually since Recharts might not provide it
    const percentage = total > 0 ? (value / total) * 100 : 0;
    
    return (
      <div className="rounded-lg bg-gray-900/90 p-3 text-xs text-white shadow-lg backdrop-blur-md">
        <p className="font-semibold">{name}</p>
        <p>
          {config.y}: <span className="font-medium">{value.toLocaleString()}</span>
        </p>
        <p>
          % of total:{' '}
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </p>
        <p className="pt-1 text-[10px] text-gray-300">
          Total {config.y.toLowerCase()}: {total.toLocaleString()}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer
      width={dimensions?.width ?? '100%'}
      height={dimensions?.height ?? '100%'}
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="y"
          nameKey="x"
          cx="50%"
          cy="50%"
          innerRadius={`${innerRadius * 100}%`}
          outerRadius={outerRadius}
          paddingAngle={2}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-sm text-gray-700 dark:text-gray-200">
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

const renderScatterChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  // Check if we have series data for multi-series scatter plots
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  if (hasSeries) {
    // Multi-series scatter chart
    const seriesNames = [...new Set(data.map(item => item.series).filter(Boolean))];
    
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
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
                  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
                  if (name === 'y') {
                    return [displayValue, config.y || 'Value'];
                  }
                  return [displayValue, name];
                }}
                labelFormatter={(label) => `${config.x}: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '12px'
                }}
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
        </div>
        
        {/* Scrollable Legend */}
        <div style={{ 
          width: '140px', 
          maxHeight: '100%', 
          overflowY: 'auto', 
          paddingLeft: '10px',
          borderLeft: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>
            {config.series || 'Series'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seriesNames.map((seriesName, index) => (
              <div key={seriesName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: COLORS[index % COLORS.length],
                  borderRadius: '2px',
                  flexShrink: 0
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}>
                  {seriesName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
              const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
              if (name === 'y') {
                return [displayValue, config.y || 'Value'];
              }
              return [displayValue, name];
            }}
            labelFormatter={(label) => `${config.x}: ${label}`}
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px'
            }}
          />
          <Scatter dataKey="y" fill={COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
};

const renderGanttChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  return <ResponsiveGanttChart data={data} config={config} />;
};

const renderDumbbellChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  return <ResponsiveDumbbellChart data={data} config={config} />;
};

const renderHistogram = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  console.log('Histogram Debug - Input data:', data.slice(0, 3));
  console.log('Histogram Debug - Config:', config);
  
  // Check if this is a degenerate case (single aggregated value)
  if (data.length === 1 && config.transform_x === 'count') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">Cannot create histogram</div>
          <div className="text-sm text-gray-500">Count transform aggregated all data into single value: {data[0].x}</div>
          <div className="text-xs text-gray-400 mt-2">Histogram needs raw data distribution, not aggregated counts</div>
        </div>
      </div>
    );
  }
  
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
    // For date fields, convert dates to numeric values (timestamps)
    const originalData = data.map(item => {
      let value = item.x;
      // If it's a date field, convert to timestamp
      if (config.x.toLowerCase().includes('date') || config.x.toLowerCase().includes('finish')) {
        const date = new Date(value);
        value = isNaN(date.getTime()) ? null : date.getTime();
      }
      return { [config.x]: value };
    }).filter(item => item[config.x] !== null && item[config.x] !== undefined && item[config.x] !== '');
    
    console.log('Histogram Debug - Processed data for binning:', originalData.slice(0, 3));
    
    if (originalData.length === 0) {
      console.log('Histogram Debug - No valid data for histogram');
      histogramData = [];
    } else {
      histogramData = processHistogramData(originalData, config.x);
    }
  }
  
  console.log('Histogram Debug - Final histogram data:', histogramData);

  if (!histogramData || histogramData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">No valid data for histogram</div>
          <div className="text-sm text-gray-500">Check if {config.x} contains numeric or date values</div>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={histogramData} 
        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        categoryGap="0%"
        barGap={0}
        barCategoryGap="0%"
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="bin" 
          label={{ value: config.x, position: 'insideBottom', offset: -10, style: { textAnchor: 'middle' } }}
          tick={{ fontSize: 12 }}
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <Tooltip 
          labelFormatter={(label) => `${config.x} Range: ${label}`}
          formatter={(value, name) => [
            typeof value === 'number' ? value.toLocaleString() : value, 
            name === 'count' ? 'Frequency' : name
          ]}
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontSize: '12px'
          }}
        />
        <Bar 
          dataKey="count" 
          fill={COLORS[0]} 
          stroke="none"
          strokeWidth={0}
          radius={0}
          minPointSize={0}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// visx-based Horizontal Bar Chart Component
type HorizontalBarDatum = {
  x: number;  // tag_qty
  y: string;  // iwp_id
  value: number;
  count: number;
  series?: string; // Optional series for multi-series support
};

// Responsive Horizontal Bar Chart Component
const ResponsiveHorizontalBarChart: React.FC<{ data: HorizontalBarDatum[], config: ChartConfig }> = ({ data, config }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const height = Math.max(400, Math.min(600, data.length * 40 + 160)); // Dynamic height based on data

  // Resize observer callback
  const measure = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      // Calculate responsive width with min/max constraints
      const calculatedWidth = Math.min(containerWidth - 40, 1200); // Max width 1200px, padding 40px
      setWidth(Math.max(400, calculatedWidth)); // Minimum 400px width
    }
  }, []);

  useEffect(() => {
    // Initial measurement
    measure();
    
    // Re-measure on window resize
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  if (width === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: `${height}px` }} />;
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <HorizontalBarChart data={data} config={config} width={width} height={height} />
    </div>
  );
};

// Horizontal Bar Chart Component (separate component to use hooks properly)
const HorizontalBarChart: React.FC<{ data: HorizontalBarDatum[], config: ChartConfig, width?: number, height?: number }> = ({ 
  data, 
  config, 
  width = 800, 
  height = 500 
}) => {
  // Dynamic margins based on chart width
  const margin = { 
    top: 40, 
    right: width > 600 ? 150 : 80, 
    bottom: 80, 
    left: Math.max(120, width * 0.15) // 15% of width or minimum 120px
  };
  
  // Check if we have series data for multi-series charts
  const hasSeries = data.length > 0 && data[0].series !== null && data[0].series !== undefined;
  
  // Sort data descending by x (quantity)
  const sorted = [...data].sort((a, b) => b.x - a.x);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Scales
  const yScale = scaleBand<string>({
    domain: sorted.map(d => d.y),
    range: [0, innerH],
    padding: 0.2,
  });

  const maxX = Math.max(...sorted.map(d => d.x));
  const xScale = scaleLinear<number>({
    domain: [0, maxX],
    range: [0, innerW],
    nice: true,
  });

  // Color scale for series
  const seriesNames = hasSeries ? [...new Set(sorted.map(d => d.series).filter(Boolean))] : [];
  const colorScale = scaleOrdinal<string, string>({
    domain: seriesNames,
    range: COLORS,
  });

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<HorizontalBarDatum>();

  const tooltipStyles = {
    ...defaultStyles,
    background: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '12px',
  };

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
        <Group left={margin.left} top={margin.top}>
          {/* Grid lines */}
          {xScale.ticks(5).map((tickValue) => (
            <line
              key={tickValue}
              x1={xScale(tickValue)}
              x2={xScale(tickValue)}
              y1={0}
              y2={innerH}
              stroke="#e0e0e0"
              strokeDasharray="3,3"
              strokeWidth={1}
              opacity={0.6}
            />
          ))}
          
          {/* Bars */}
          {sorted.map((d, i) => {
            const barY = yScale(d.y)!;
            const barW = xScale(d.x);
            const barH = yScale.bandwidth();
            const barColor = hasSeries ? colorScale(d.series || '') : COLORS[0];

            return (
              <VisxBar
                key={i}
                x={0}
                y={barY}
                width={barW}
                height={barH}
                fill={barColor}
                rx={4}
                stroke="#fff"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(event) => {
                  const mouseX = event.clientX;
                  const mouseY = event.clientY;
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: mouseX,
                    tooltipTop: mouseY - 10, // Position above mouse cursor
                  });
                }}
                onMouseMove={(event) => {
                  const mouseX = event.clientX;
                  const mouseY = event.clientY;
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: mouseX,
                    tooltipTop: mouseY - 10, // Follow mouse movement
                  });
                }}
                onMouseLeave={hideTooltip}
              />
            );
          })}

          {/* Axes */}
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickFormat={n => n.toString()}
            stroke="#666"
            tickStroke="#666"
            tickLabelProps={() => ({ 
              fontSize: 12, 
              dy: "0.75em",
              fill: "#666",
              textAnchor: "middle"
            })}
          />
          <AxisLeft
            scale={yScale}
            stroke="#666"
            tickStroke="#666"
            tickLabelProps={() => ({ 
              fontSize: 12, 
              dx: "-0.5em",
              dy: "0.25em",
              fill: "#666",
              textAnchor: "end",
              dominantBaseline: "middle"
            })}
          />

          {/* Axis Labels */}
          <text
            x={innerW / 2}
            y={innerH + 60}
            fill="#666"
            fontSize={14}
            fontWeight="bold"
            textAnchor="middle"
          >
            {config.x || 'Value'}
          </text>
          <text
            x={-margin.left + 20}
            y={innerH / 2}
            fill="#666"
            fontSize={14}
            fontWeight="bold"
            textAnchor="middle"
            transform={`rotate(-90, ${-margin.left + 20}, ${innerH / 2})`}
          >
            {config.y || 'Category'}
          </text>
        </Group>

        {/* Legend - only show if we have series data */}
        {hasSeries && seriesNames.length > 0 && (
          <Group top={margin.top} left={width - margin.right + 20}>
            <text
              x={0}
              y={0}
              fill="#666"
              fontSize={14}
              fontWeight="bold"
              textAnchor="start"
            >
              {config.series || 'Series'}
            </text>
            {seriesNames.map((seriesName, i) => (
              <Group key={seriesName} top={20 + i * 20}>
                <rect
                  x={0}
                  y={-8}
                  width={12}
                  height={12}
                  fill={colorScale(seriesName)}
                  rx={2}
                />
                <text
                  x={18}
                  y={0}
                  fill="#666"
                  fontSize={12}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {seriesName}
                </text>
              </Group>
            ))}
          </Group>
        )}
      </svg>
      
      {/* Enhanced Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div>
            <div><strong>{tooltipData.y}</strong></div>
            {tooltipData.series && (
              <div>Series: {tooltipData.series}</div>
            )}
            <div>{config.x || 'Value'}: {tooltipData.x}</div>
            <div>Count: {tooltipData.count || tooltipData.value}</div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

const renderHorizontalBarChart = (data: HorizontalBarDatum[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
  return <ResponsiveHorizontalBarChart data={data} config={config} />;
};

const renderFallbackChart = (data: any[], config: ChartConfig, dimensions?: { width: number, height: number }) => {
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: height });
  
  // Update chart dimensions based on window size
  useEffect(() => {
    const updateDimensions = () => {
      const windowWidth = window.innerWidth;
      const containerWidth = Math.min(windowWidth - 100, 1200); // Max width 1200px, min padding 100px
      const calculatedHeight = isFullscreen ? Math.min(window.innerHeight * 0.7, 800) : height;
      
      setChartDimensions({
        width: Math.max(400, containerWidth), // Minimum 400px width
        height: calculatedHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height, isFullscreen]);
  
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
        return renderBarChart(transformedData, config, chartDimensions);
      case 'line':
        return renderLineChart(transformedData, config, chartDimensions);
      case 'area':
        return renderAreaChart(transformedData, config, chartDimensions);
      case 'pie':
      case 'donut':
        return renderPieChart(transformedData, config, chartDimensions);
      case 'scatter':
      case 'bubble':
        return renderScatterChart(transformedData, config, chartDimensions);
      case 'gantt':
        return renderGanttChart(transformedData, config, chartDimensions);
      case 'dumbbell':
        return renderDumbbellChart(transformedData, config, chartDimensions);
      case 'histogram':
        return renderHistogram(transformedData, config, chartDimensions); // Use transformed data
      case 'stacked_bar':
        return renderBarChart(transformedData, config, chartDimensions);
      case 'horizontal_bar':
        return renderHorizontalBarChart(transformedData, config, chartDimensions);
      default:
        return renderFallbackChart(transformedData, config, chartDimensions);
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="p-2 h-8 w-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Badge variant="outline" className="shrink-0">{config.type}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="chart-container" style={{ width: '100%', height: `${chartDimensions.height}px`, minHeight: '400px', overflow: 'auto' }}>
          {renderChart()}
        </div>
      </CardContent>
      
      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{config.title}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="p-2 h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
            {config.rationale && (
              <p className="text-sm text-gray-600 mt-2">{config.rationale}</p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="chart-container" style={{ width: '100%', height: `${chartDimensions.height}px`, minHeight: '500px', overflow: 'auto' }}>
              {renderChart()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ChartRenderer;