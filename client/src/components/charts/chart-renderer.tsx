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
import { scaleBand, scaleTime, scaleOrdinal, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar as VisxBar, Line as VisxLine, Circle } from "@visx/shape";
import { LegendOrdinal } from "@visx/legend";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { timeParse, timeFormat } from "d3-time-format";
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
  const [dimensions, setDimensions] = React.useState({ width: 800, height: Math.max(400, data.length * itemHeight + 200) });

  React.useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.chart-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const calculatedHeight = Math.max(400, data.length * itemHeight + 200); // Dynamic sizing based on dataset
        setDimensions({
          width: Math.max(800, rect.width - 40), // Minimum 800px to accommodate margins
          height: calculatedHeight
        });
      } else {
        // Fallback to window width - calculate height based on data length
        const calculatedHeight = Math.max(400, data.length * itemHeight + 200); // Dynamic sizing based on dataset
        setDimensions({
          width: Math.max(1000, window.innerWidth - 200), // Account for sidebar/margins - wider for better layout
          height: calculatedHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return <GanttChart data={data} config={config} width={dimensions.width} height={dimensions.height} />;
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

  const margin = { top: 40, left: 300, right: 150, bottom: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Unique Y values (tasks) - sorted for better display
  const tasks = [...new Set(parsedData.map(d => d.y))].sort();
  
  // Debug: log tasks to ensure all are included
  console.log('Gantt Chart - Total tasks:', tasks.length, 'Sample tasks:', tasks.slice(0, 5));

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
    <div style={{ position: 'relative', width: '100%' }}>
      {needsScroll ? (
        // Scrollable layout with sticky x-axis
        <div style={{ position: 'relative', width: '100%', height: '600px' }}>
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
                {/* X-axis */}
                <AxisBottom
                  top={20}
                  scale={xScale}
                  numTicks={8}
                  tickFormat={timeFormat("%b %d")}
                  stroke="var(--border)"
                  strokeWidth={1}
                  tickStroke="var(--border)"
                  tickLength={6}
                  tickLabelProps={() => ({ 
                    fontSize: 11, 
                    dy: "0.33em",
                    fill: "var(--foreground)",
                    textAnchor: "middle",
                    fontWeight: 500
                  })}
                />
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
                          tooltipLeft: startX + barWidth / 2,
                          tooltipTop: barY + barHeight / 2,
                        });
                      }}
                      onMouseLeave={() => hideTooltip()}
                    />
                  );
                })}

                {/* Y-axis */}
                <AxisLeft
                  scale={yScale}
                  stroke="var(--border)"
                  strokeWidth={1}
                  tickStroke="var(--border)"
                  tickLength={6}
                  tickLabelProps={() => ({ 
                    fontSize: 11, 
                    dx: "-0.5em",
                    dy: "0.25em",
                    fill: "var(--foreground)",
                    textAnchor: "end",
                    dominantBaseline: "middle",
                    fontWeight: 500
                  })}
                />
                
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
        <svg width={width} height={height} style={{ display: 'block' }}>
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
                  showTooltip({
                    tooltipData: d,
                    tooltipLeft: startX + barWidth / 2,
                    tooltipTop: barY + barHeight / 2,
                  });
                }}
                onMouseLeave={() => hideTooltip()}
              />
            );
          })}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            numTicks={8}
            tickFormat={timeFormat("%b %d")}
            stroke="var(--border)"
            strokeWidth={1}
            tickStroke="var(--border)"
            tickLength={6}
            tickLabelProps={() => ({
              fill: 'var(--foreground)',
              fontSize: 11,
              textAnchor: 'middle',
              dy: '0.33em',
              fontWeight: 500
            })}
          />
          <AxisLeft 
            scale={yScale} 
            stroke="var(--border)"
            strokeWidth={1}
            tickStroke="var(--border)"
            tickLength={6}
            tickValues={tasks} // Explicitly set tick values to all tasks
            tickLabelProps={() => ({
              fill: 'var(--foreground)',
              fontSize: 8,
              textAnchor: 'end',
              dx: -12,
              dy: '0.32em',
              fontWeight: 500
            })}
            tickFormat={(value) => {
              // Truncate long labels and add ellipsis
              return value.length > 32 ? value.substring(0, 32) + '...' : value;
            }}
          />
        </Group>

        {/* Axis Labels */}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize={12}
          fontWeight={600}
        >
          Timeline
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

        {/* Legend */}
        <Group top={margin.top} left={width - margin.right + 20}>
          <text
            x={0}
            y={0}
            fill="var(--muted-foreground)"
            fontSize={12}
            fontWeight={600}
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
                fill="var(--foreground)"
                fontSize={11}
                textAnchor="start"
                dominantBaseline="middle"
                fontWeight={500}
              >
                {seriesName}
              </text>
            </Group>
          ))}
        </Group>
      </svg>
      )}
      
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
  const [dimensions, setDimensions] = React.useState({ width: 900, height: 500 });

  React.useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.chart-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: Math.max(700, rect.width - 40), 
          height: 500
        });
      } else {
        setDimensions({
          width: Math.max(700, window.innerWidth - 200),
          height: 500
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return <DumbbellChart data={data} config={config} width={dimensions.width} height={dimensions.height} />;
};

const DumbbellChart: React.FC<DumbbellProps> = ({ data, config, width = 900, height = 500 }) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>No data available for Dumbbell chart</p>
      </div>
    );
  }

  // Parse dates - try different formats
  const parseDate = timeParse("%Y-%m-%d");
  const formatDate = timeFormat("%Y-%m-%d");
  
  const rows = data.map(d => {
    let parsedX = parseDate(d.x);
    let parsedX2 = parseDate(d.x2);
    
    // Fallback to direct Date parsing if format doesn't match
    if (!parsedX) parsedX = new Date(d.x);
    if (!parsedX2) parsedX2 = new Date(d.x2);
    
    return {
      ...d,
      x: parsedX,
      x2: parsedX2,
    };
  }).filter(d => d.x && d.x2 && !isNaN(d.x.getTime()) && !isNaN(d.x2.getTime()));

  if (rows.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>Invalid date format in Dumbbell chart data</p>
      </div>
    );
  }

  const margin = { top: 40, right: 40, bottom: 50, left: 120 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Y scale (tasks)
  const tasks = [...new Set(rows.map(d => d.y))];
  const yScale = scaleBand<string>({
    domain: tasks,
    range: [0, innerH],
    padding: 0.5,
  });

  // X scale (dates)
  const minDate = new Date(Math.min(...rows.map(r => r.x.getTime())));
  const maxDate = new Date(Math.max(...rows.map(r => r.x2.getTime())));
  const xScale = scaleTime({
    domain: [minDate, maxDate],
    range: [0, innerW],
  });

  // Color scale (series)
  const seriesSet = [...new Set(rows.map(r => r.series))];
  const color = scaleOrdinal<string, string>({
    domain: seriesSet,
    range: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948"],
  });

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<DumbbellDatum>();

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
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <svg width={width} height={height}>
          <Group left={margin.left} top={margin.top}>
          {/* Dumbbells */}
          {rows.map((d, i) => {
            const y = yScale(d.y)! + yScale.bandwidth() / 2;
            const x1 = xScale(d.x);
            const x2 = xScale(d.x2);
            const col = color(d.series);

            return (
              <Group key={i}>
                {/* connecting line */}
                <VisxLine
                  from={{ x: x1, y }}
                  to={{ x: x2, y }}
                  stroke={col}
                  strokeWidth={2}
                  strokeOpacity={0.7}
                />
                {/* planned dot */}
                <Circle 
                  cx={x1} 
                  cy={y} 
                  r={6} 
                  fill={col}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(event) => {
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: x1,
                      tooltipTop: y,
                    });
                  }}
                  onMouseLeave={() => hideTooltip()}
                />
                {/* actual dot */}
                <Circle
                  cx={x2}
                  cy={y}
                  r={6}
                  fill={col}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(event) => {
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: x2,
                      tooltipTop: y,
                    });
                  }}
                  onMouseLeave={() => hideTooltip()}
                />
              </Group>
            );
          })}

          {/* Axes */}
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickFormat={formatDate}
            stroke="#666"
            tickStroke="#666"
            tickLabelProps={() => ({
              fill: '#666',
              fontSize: 11,
              textAnchor: 'middle',
              dy: "0.25em"
            })}
          />
          <AxisLeft
            scale={yScale}
            stroke="#666"
            tickStroke="#666"
            tickLabelProps={() => ({
              fill: '#666',
              fontSize: 11,
              textAnchor: 'end',
              dx: "-0.25em"
            })}
          />

          {/* Legend - moved to external scrollable div */}
        </Group>
      </svg>

        {/* Tooltip */}
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            top={tooltipTop + margin.top}
            left={tooltipLeft + margin.left}
            style={tooltipStyles}
          >
            <div>
              <div><strong>{tooltipData.y}</strong></div>
              <div>Series: {tooltipData.series}</div>
              <div>Planned: {typeof tooltipData.x === 'string' ? tooltipData.x : tooltipData.x.toLocaleDateString()}</div>
              <div>Actual: {typeof tooltipData.x2 === 'string' ? tooltipData.x2 : tooltipData.x2.toLocaleDateString()}</div>
              <div>Deviation: {Math.ceil((new Date(tooltipData.x2).getTime() - new Date(tooltipData.x).getTime()) / (1000 * 60 * 60 * 24))} days</div>
            </div>
          </TooltipWithBounds>
        )}
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
          Series
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {seriesSet.map((seriesName, index) => (
            <div key={seriesName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: color(seriesName),
                borderRadius: '50%',
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
};

// Pure chart rendering functions (no data transformations)
const renderBarChart = (data: any[], config: ChartConfig) => {
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
                formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
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
                formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
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
                formatter={(value, name) => [value, name === 'y' ? config.y || 'Value' : name]}
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
  const isDonut = config.type.toLowerCase() === 'donut';
  const innerRadius = isDonut ? 50 : 0; // Hollow center for donut charts
  const outerRadius = 100;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="y"
          nameKey="x"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value, name) => [value, config.y || 'Value']}
          labelFormatter={(label) => `${config.x}: ${label}`}
        />
        <Legend />
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
                  if (name === 'y') {
                    return [value, config.y || 'Value'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `${config.x}: ${label}`}
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
  return <ResponsiveGanttChart data={data} config={config} />;
};

const renderDumbbellChart = (data: any[], config: ChartConfig) => {
  return <ResponsiveDumbbellChart data={data} config={config} />;
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
          formatter={(value, name) => [value, name === 'count' ? 'Frequency' : name]}
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
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 500 });

  React.useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.chart-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: Math.max(600, rect.width - 40), // Minimum 600px, subtract padding
          height: Math.max(400, Math.min(600, data.length * 40 + 160)) // Dynamic height based on data
        });
      } else {
        // Fallback to window width
        setDimensions({
          width: Math.max(600, window.innerWidth - 200), // Account for sidebar/margins
          height: Math.max(400, Math.min(600, data.length * 40 + 160))
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [data.length]);

  return <HorizontalBarChart data={data} config={config} width={dimensions.width} height={dimensions.height} />;
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

const renderHorizontalBarChart = (data: HorizontalBarDatum[], config: ChartConfig) => {
  return <ResponsiveHorizontalBarChart data={data} config={config} />;
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
        return renderHorizontalBarChart(transformedData, config);
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
        <div className="chart-container" style={{ width, height: `${height}px`, minHeight: '400px', overflow: 'auto' }}>
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChartRenderer;