import React, { useRef, useEffect } from "react";
import * as d3 from "d3";

type TreemapChartProps = {
  config: {
    type: "treemap";
    x: string;
    x2: string | null;
    y: string;
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
  width?: number;
  height?: number;
};

export const TreemapChart: React.FC<TreemapChartProps> = ({
  config,
  width = 900,
  height = 500
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const legendRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !config.data?.length) {
      console.log('TreemapChart: Missing svgRef or data', { 
        hasSvgRef: !!svgRef.current, 
        dataLength: config.data?.length 
      });
      return;
    }

    const { x, x2, y, series, data, title } = config;
    
    console.log('TreemapChart: Starting render with config:', { x, y, series, dataLength: data.length });
    console.log('TreemapChart: Sample data item:', data[0]);
    
    // Create hierarchical data structure for D3 treemap
    const rootData = {
      name: "root",
      children: data.map((d) => ({
        name: d.x,  // Use actual property names
        group: d.series,
        value: d.y,
        details: d
      }))
    };

    console.log('TreemapChart: Root data children:', rootData.children.slice(0, 2));

    // Create D3 hierarchy and calculate treemap layout
    const root = d3
      .hierarchy(rootData, (d: any) => d.children)
      .sum((d: any) => d.value);

    const treemapLayout = d3.treemap()
      .size([width, height - 80])  // Leave space for legend
      .padding(2)
      .round(true);
    
    treemapLayout(root);

    // Color scale for different series
    const color = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain([...new Set(data.map((d) => d[series]))]);

    // Clear previous content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create tooltip - always create a new one
    d3.selectAll(".treemap-tooltip").remove(); // Clean up any existing tooltips
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "treemap-tooltip")
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

    // Create treemap rectangles
    const nodes = svg
      .selectAll("g.treemap-node")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("class", "treemap-node")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    nodes
      .append("rect")
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => color(d.data.group))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        console.log('TreemapChart: Mouseover triggered', d.data.name);
        d3.select(this).attr("opacity", 0.8);
        const totalValue = data.reduce((sum, item) => sum + item.y, 0);
        const percentage = totalValue > 0 ? ((d.data.value / totalValue) * 100).toFixed(1) : '0';
        
        const tooltipContent = `<div style="font-weight: bold; margin-bottom: 6px; color: #fff;">${d.data.name}</div>
                               <div style="margin-bottom: 3px;"><strong>${series}:</strong> ${d.data.group}</div>
                               <div style="margin-bottom: 3px;"><strong>${y}:</strong> ${d.data.value.toLocaleString()}</div>
                               <div style="margin-bottom: 3px;"><strong>Percentage:</strong> ${percentage}%</div>
                               <div><strong>Items:</strong> ${d.data.details.count || 1}</div>`;
        
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
        console.log('TreemapChart: Mouseout triggered');
        d3.select(this).attr("opacity", 1);
        tooltip.style("opacity", 0);
      });

    // Add text labels to rectangles
    nodes
      .append("text")
      .attr("x", 4)
      .attr("y", 16)
      .text((d) => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        // Only show text if rectangle is large enough
        if (rectWidth > 60 && rectHeight > 30) {
          return d.data.name.length > 15 ? d.data.name.substring(0, 12) + "..." : d.data.name;
        }
        return "";
      })
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("fill", "#fff")
      .attr("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)");

    // Add value labels
    nodes
      .append("text")
      .attr("x", 4)
      .attr("y", (d) => {
        const rectHeight = d.y1 - d.y0;
        return rectHeight > 45 ? 32 : 16;
      })
      .text((d) => {
        const rectWidth = d.x1 - d.x0;
        const rectHeight = d.y1 - d.y0;
        // Only show value if rectangle is large enough
        if (rectWidth > 60 && rectHeight > 30) {
          return d.data.value.toLocaleString();
        }
        return "";
      })
      .attr("font-size", "10px")
      .attr("fill", "#fff")
      .attr("opacity", 0.9)
      .attr("pointer-events", "none")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)");

    // Create legend
    const uniqueSeries = [...new Set(data.map((d) => d.series))];  // Use actual property name
    console.log('TreemapChart: Unique series for legend:', uniqueSeries);
    const legend = d3.select(legendRef.current);
    legend.selectAll("*").remove();

    // Create a cleaner horizontal legend layout
    const itemsPerRow = Math.min(4, uniqueSeries.length); // Max 4 items per row
    const legendItemWidth = Math.floor(width / itemsPerRow) - 10; // Dynamic width based on container
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
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (d) => color(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .attr("rx", 1);

    legendItems
      .append("text")
      .attr("x", 18)
      .attr("y", 9)
      .text((d) => {
        // Truncate text based on available width
        const maxLength = Math.floor(legendItemWidth / 8); // Approximate character width
        return d.length > maxLength ? d.substring(0, maxLength - 3) + "..." : d;
      })
      .attr("font-size", "10px")
      .attr("font-weight", "400")
      .attr("fill", "currentColor")
      .style("text-transform", "none");

    // Cleanup function
    return () => {
      d3.selectAll(".treemap-tooltip").remove();
    };
  }, [config, width, height]);

  return (
    <div className="treemap-chart-container">
      {/* Chart Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          {config.title}
        </h3>
        {config.rationale && (
          <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
            {config.rationale}
          </p>
        )}
      </div>

      {/* Main Chart */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <svg 
          ref={svgRef} 
          width={width} 
          height={height}
          className="treemap-svg"
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

      {/* Data Summary */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Showing {config.data.length} items • Total: {config.data.reduce((sum, d) => sum + d.y, 0).toLocaleString()}
      </div>

      {/* Hidden tooltip ref */}
      <div ref={tooltipRef} />
    </div>
  );
};