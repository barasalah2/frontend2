import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface BubbleChartProps {
  config: {
    type: 'bubble';
    x: string;
    y: string;
    x2: string | null;
    series: string;
    title: string;
    transform_x?: string;
    transform_y?: string;
    rationale?: string;
    data: {
      x: string;
      x2: string | null;
      y: number;
      series: string;
      count?: number;
      value?: number;
    }[];
  };
  height?: number;
}

export const BubbleChart: React.FC<BubbleChartProps> = ({
  config,
  height = 500
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const legendRef = useRef<SVGGElement>(null);
  const [width, setWidth] = useState<number>(800);

  // Observe container width for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Draw chart
  useEffect(() => {
    const { data, x, y, series } = config;
    if (!data.length || !svgRef.current || width < 100) return;

    console.log('BubbleChart: Starting render with config:', { x, y, series, dataLength: data.length });
    console.log('BubbleChart: Sample data item:', data[0]);

    const margin = { top: 20, right: 30, bottom: 80, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Clean up any existing tooltips
    d3.selectAll(".bubble-tooltip").remove();

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "bubble-tooltip")
      .style("position", "absolute")
      .style("padding", "8px 12px")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "#fff")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("line-height", "1.4")
      .style("pointer-events", "none")
      .style("z-index", "10000")
      .style("opacity", 0)
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)")
      .style("border", "1px solid rgba(255,255,255,0.1)");

    // Create scales
    const uniqueX = [...new Set(data.map((d) => d.x))];
    const xScale = d3
      .scalePoint<string>()
      .domain(uniqueX)
      .range([0, innerWidth])
      .padding(0.5);

    // For bubble chart, use x2 for Y-axis if available, otherwise use y
    const yValues = data.map((d) => d.x2 !== null ? d.x2 : d.y);
    
    // Check if Y values are numeric or categorical
    const isNumericY = yValues.every(val => typeof val === 'number' && !isNaN(val));
    
    let yScale: any;
    if (isNumericY) {
      // Numeric Y-axis
      const yExtent = d3.extent(yValues as number[]) as [number, number];
      yScale = d3.scaleLinear()
        .domain([0, yExtent[1]!])
        .range([innerHeight, 0]);
    } else {
      // Categorical Y-axis
      const uniqueY = [...new Set(yValues.map(String))];
      yScale = d3.scalePoint<string>()
        .domain(uniqueY)
        .range([innerHeight, 0])
        .padding(0.5);
    }

    // Bubble size scale - use y value for sizing (not x2)
    const rScale = d3
      .scaleSqrt()
      .domain([0, d3.max(data, (d) => d.y)!])
      .range([4, 40]);

    // Color scale for series
    const colorScale = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain([...new Set(data.map((d) => d.series))]);

    const container = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add axes
    container
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    container
      .append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("font-size", "10px");

    // Add axis labels
    svg
      .append("text")
      .attr("transform", `translate(${margin.left + innerWidth / 2},${height - 20})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "currentColor")
      .text(x.charAt(0).toUpperCase() + x.slice(1));

    // For bubble chart, show x2 label on Y-axis if available, otherwise y
    const yAxisLabel = config.x2 ? config.x2.charAt(0).toUpperCase() + config.x2.slice(1) : y.charAt(0).toUpperCase() + y.slice(1);
    svg
      .append("text")
      .attr("transform", `translate(20,${margin.top + innerHeight / 2}) rotate(-90)`)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "currentColor")
      .text(yAxisLabel);

    // Add bubbles
    container
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.x)!)
      .attr("cy", (d) => {
        const yValue = d.x2 !== null ? d.x2 : d.y;
        return isNumericY ? yScale(yValue) : yScale(String(yValue));
      }) // Use x2 for Y position if available
      .attr("r", (d) => rScale(d.y))
      .attr("fill", (d) => colorScale(d.series)!)
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        console.log('BubbleChart: Mouseover triggered', d.x);
        d3.select(this).attr("opacity", 0.9);
        
        const yAxisValue = d.x2 !== null ? d.x2 : d.y;
        const tooltipContent = `<div style="font-weight: bold; margin-bottom: 6px; color: #fff;">${d.x}</div>
                               <div style="margin-bottom: 3px;"><strong>${series}:</strong> ${d.series}</div>
                               <div style="margin-bottom: 3px;"><strong>${yAxisLabel}:</strong> ${yAxisValue.toLocaleString()}</div>
                               <div style="margin-bottom: 3px;"><strong>Size (${y}):</strong> ${d.y.toLocaleString()}</div>
                               <div style="margin-bottom: 3px;"><strong>Value:</strong> ${(d.value || d.y).toLocaleString()}</div>
                               <div><strong>Count:</strong> ${d.count || 1}</div>`;
        
        tooltip
          .style("opacity", 1)
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 60) + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 60) + "px");
      })
      .on("mouseout", function () {
        console.log('BubbleChart: Mouseout triggered');
        d3.select(this).attr("opacity", 0.7);
        tooltip.style("opacity", 0);
      });

    // Add labels on bubbles for larger ones
    container
      .selectAll("text.bubble-label")
      .data(data.filter(d => rScale(d.y) > 15)) // Only show labels on larger bubbles
      .enter()
      .append("text")
      .attr("class", "bubble-label")
      .attr("x", (d) => xScale(d.x)!)
      .attr("y", (d) => {
        const yValue = d.x2 !== null ? d.x2 : d.y;
        return isNumericY ? yScale(yValue) : yScale(String(yValue));
      }) // Use x2 for Y position if available
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("fill", "#fff")
      .style("pointer-events", "none")
      .text((d) => d.y.toLocaleString());

    // Create legend
    const uniqueSeries = [...new Set(data.map((d) => d.series))].filter(s => s !== null && s !== undefined);
    console.log('BubbleChart: Unique series for legend:', uniqueSeries);
    
    const legend = d3.select(legendRef.current);
    legend.selectAll("*").remove();

    // Create a cleaner horizontal legend layout
    const itemsPerRow = Math.min(4, uniqueSeries.length);
    const legendItemWidth = Math.floor(width / itemsPerRow) - 10;
    const legendItemHeight = 20;
    
    const legendItems = legend
      .selectAll("g.legend-item")
      .data(uniqueSeries)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        return `translate(${col * legendItemWidth + 5}, ${row * legendItemHeight})`;
      });

    legendItems
      .append("circle")
      .attr("cx", 6)
      .attr("cy", 6)
      .attr("r", 6)
      .attr("fill", (d) => colorScale(d)!)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    legendItems
      .append("text")
      .attr("x", 18)
      .attr("y", 9)
      .text((d) => {
        const maxLength = Math.floor(legendItemWidth / 8);
        const text = d || "Unknown";
        return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
      })
      .attr("font-size", "10px")
      .attr("font-weight", "400")
      .attr("fill", "currentColor")
      .style("text-transform", "none");

    // Cleanup function
    return () => {
      tooltip.remove();
    };
  }, [config, width, height]);

  return (
    <div ref={containerRef} className="bubble-chart-container">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {config.title}
        </h3>
        {config.rationale && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {config.rationale}
          </p>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height}
          className="bubble-svg"
        />
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {config.series.charAt(0).toUpperCase() + config.series.slice(1)} Legend:
          </div>
          <svg width={width} height={60} style={{ overflow: 'visible' }}>
            <g ref={legendRef} transform="translate(0, 5)" />
          </svg>
        </div>
      </div>
    </div>
  );
};