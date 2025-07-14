import { ChartConfig } from "@/components/charts/chart-renderer";

// Main transformation function that orchestrates all transformations
export const transformData = (data: any[], config: ChartConfig): any => {
  let transformedData = [...data];

  // Set default transforms if not provided
  if (!config.transform_x) {
    config.transform_x = "topk:20";
  }
  if (!config.transform_y) {
    config.transform_y = "topk:20";
  }

  // Apply combined transformations (grouping + aggregation)
  transformedData = applyCombinedTransform(transformedData, config);

  // Return the complete configuration with transformed data
  return {
    type: config.type,
    x: config.x,
    y: config.y,
    x2: config.x2 || null,
    series: config.series || null,
    title: config.title,
    transform_x: config.transform_x || null,
    transform_y: config.transform_y || null,
    rationale: config.rationale || null,
    data: transformedData.map((item) => {
      return {
        x: item[config.x],
        x2: config.x2 ? item[config.x2] : null,
        y: item[config.y],
        series: config.series ? item[config.series] : null,
        count: item.count || undefined,
        value: item.value || undefined,
      };
    }),
  };
};

// Combined transformation function that handles grouping and aggregation together
const applyCombinedTransform = (data: any[], config: ChartConfig): any[] => {
  const xField = config.x;
  const yField = config.y;
  const seriesField = config.series;
  const xTransform = config.transform_x;
  const yTransform = config.transform_y;

  // Special case: Both x and y transforms are grouping operations - must group simultaneously
  if (
    xTransform &&
    yTransform &&
    isGroupingTransform(xTransform) &&
    isGroupingTransform(yTransform)
  ) {
    return applySimultaneousGrouping(
      data,
      xField,
      yField,
      seriesField,
      xTransform,
      yTransform,
    );
  }

  // If X transform is a grouping operation, apply aggregation to Y during grouping
  if (xTransform && isGroupingTransform(xTransform)) {
    return applyGroupingWithAggregation(
      data,
      xField,
      yField,
      seriesField,
      xTransform,
      yTransform,
    );
  }

  // If Y transform is a grouping operation, apply aggregation to X during grouping
  if (yTransform && isGroupingTransform(yTransform)) {
    return applyGroupingWithAggregation(
      data,
      yField,
      xField,
      seriesField,
      yTransform,
      xTransform,
    );
  }

  // Apply transformations separately for non-grouping operations
  let transformedData = [...data];

  if (xTransform) {
    transformedData = applyTransform(transformedData, config, "x");
  }

  if (yTransform) {
    transformedData = applyTransform(transformedData, config, "y");
  }

  return transformedData;
};

// Special function to handle simultaneous grouping operations on both x and y axes
const applySimultaneousGrouping = (
  data: any[],
  xField: string,
  yField: string,
  seriesField: string | null,
  xTransform: string,
  yTransform: string,
): any[] => {
  // Step 1: Apply individual transformations to create transformed values
  let transformedData = [...data];

  // Transform x-axis values
  transformedData = transformedData.map((item) => ({
    ...item,
    [xField]: transformSingleValue(item[xField], xField, xTransform),
  }));

  // Transform y-axis values
  transformedData = transformedData.map((item) => ({
    ...item,
    [yField]: transformSingleValue(item[yField], yField, yTransform),
  }));

  // Step 2: Group by transformed x, y, and series fields to create unique combinations
  const grouped = transformedData.reduce(
    (acc, item) => {
      const xKey = item[xField];
      const yKey = item[yField];
      const seriesKey = seriesField ? item[seriesField] : "no_series";
      const combinedKey = `${xKey}|||${yKey}|||${seriesKey}`;

      if (!acc[combinedKey]) {
        acc[combinedKey] = {
          [xField]: xKey,
          [yField]: yKey,
          ...(seriesField && { [seriesField]: seriesKey }),
          items: [],
        };
      }
      acc[combinedKey].items.push(item);
      return acc;
    },
    {} as Record<string, any>,
  );

  // Step 3: Calculate counts for each combination
  const combinations = Object.values(grouped).map((group: any) => ({
    [xField]: group[xField],
    [yField]: group[yField],
    ...(seriesField && { [seriesField]: group[seriesField] }),
    count: group.items.length,
    value: group.items.length,
    items: group.items,
  }));

  // Step 4: Pre-calculate frequency counts from original combinations for filtering
  const xCounts = combinations.reduce(
    (acc, combo) => {
      const xKey = combo[xField];
      acc[xKey] = (acc[xKey] || 0) + combo.count;
      return acc;
    },
    {} as Record<string, number>,
  );

  const yCounts = combinations.reduce(
    (acc, combo) => {
      const yKey = combo[yField];
      acc[yKey] = (acc[yKey] || 0) + combo.count;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Step 5: Apply filtering based on transform types
  let filteredCombinations = combinations;

  // Handle x-axis filtering
  if (xTransform.startsWith("topk:")) {
    const xK = parseInt(xTransform.split(":")[1]);
    const topXValues = Object.entries(xCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, xK)
      .map(([key]) => key);

    filteredCombinations = filteredCombinations.filter((combo) =>
      topXValues.includes(combo[xField]),
    );
  } else if (xTransform.startsWith("bottomk:")) {
    const xK = parseInt(xTransform.split(":")[1]);
    const bottomXValues = Object.entries(xCounts)
      .sort(([, a], [, b]) => a - b)
      .slice(0, xK)
      .map(([key]) => key);

    filteredCombinations = filteredCombinations.filter((combo) =>
      bottomXValues.includes(combo[xField]),
    );
  }

  // Handle y-axis filtering (only if y-transform requires it)
  if (yTransform.startsWith("topk:")) {
    const yK = parseInt(yTransform.split(":")[1]);
    const topYValues = Object.entries(yCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, yK)
      .map(([key]) => key);

    filteredCombinations = filteredCombinations.filter((combo) =>
      topYValues.includes(combo[yField]),
    );
  } else if (yTransform.startsWith("bottomk:")) {
    const yK = parseInt(yTransform.split(":")[1]);
    const bottomYValues = Object.entries(yCounts)
      .sort(([, a], [, b]) => a - b)
      .slice(0, yK)
      .map(([key]) => key);

    filteredCombinations = filteredCombinations.filter((combo) =>
      bottomYValues.includes(combo[yField]),
    );
  }
  // Note: For other y-transforms like date_group, alphabetical, frequency, etc.
  // no additional filtering is needed - the transformation was already applied in Step 1

  // Step 6: Sort alphabetically by x field, then y field, then series field
  return filteredCombinations.sort((a, b) => {
    const xCompare = String(a[xField]).localeCompare(String(b[xField]));
    if (xCompare !== 0) return xCompare;

    const yCompare = String(a[yField]).localeCompare(String(b[yField]));
    if (yCompare !== 0) return yCompare;

    // If series field exists, sort by series value as well
    if (seriesField) {
      return String(a[seriesField]).localeCompare(String(b[seriesField]));
    }

    return 0;
  });
};

// Helper function to transform a single value based on transform type
const transformSingleValue = (
  value: any,
  field: string,
  transform: string,
): any => {
  if (transform.startsWith("date_group:")) {
    const dateType = transform.split(":")[1];
    const date = new Date(value);

    switch (dateType) {
      case "year":
        return date.getFullYear().toString();
      case "month_year":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      case "month":
        return date.toLocaleDateString("en-US", { month: "long" });
      case "quarter":
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case "day_of_week":
        return date.toLocaleDateString("en-US", { weekday: "long" });
      case "hour":
        return `${date.getHours()}:00`;
      default:
        return value;
    }
  }

  if (transform.startsWith("bin:")) {
    // For binning, we'll need access to the full dataset to calculate bins
    // For now, return the original value - binning will be handled in the grouping step
    return value;
  }

  // For other transforms (topk, bottomk, alphabetical, frequency), return original value
  // The filtering/sorting will be handled in the grouping step
  return value;
};

// Helper function to check if a transform is a grouping operation
const isGroupingTransform = (transform: string): boolean => {
  return (
    transform.startsWith("date_group:") ||
    transform.startsWith("bin:") ||
    transform.startsWith("topk:") ||
    transform.startsWith("bottomk:") ||
    transform.startsWith("other_group:") ||
    transform === "alphabetical" ||
    transform === "frequency"
  );
};

// Apply grouping transformation with simultaneous aggregation
const applyGroupingWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  groupTransform: string,
  aggTransform: string,
): any[] => {
  // First, apply the grouping transformation to create groups
  let groupedData: any[] = [];

  if (groupTransform.startsWith("date_group:")) {
    const dateType = groupTransform.split(":")[1];
    groupedData = applyDateGroupingWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      dateType,
      aggTransform,
    );
  } else if (groupTransform.startsWith("bin:")) {
    const binType = groupTransform.split(":")[1];
    groupedData = applyBinningWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      binType,
      aggTransform,
    );
  } else if (groupTransform.startsWith("topk:")) {
    const k = parseInt(groupTransform.split(":")[1]);
    groupedData = applyTopKWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      k,
      aggTransform,
    );
  } else if (groupTransform.startsWith("bottomk:")) {
    const k = parseInt(groupTransform.split(":")[1]);
    groupedData = applyBottomKWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      k,
      aggTransform,
    );
  } else if (groupTransform.startsWith("other_group:")) {
    const threshold = parseFloat(groupTransform.split(":")[1]);
    groupedData = applyOtherGroupingWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      threshold,
      aggTransform,
    );
  } else if (groupTransform === "alphabetical") {
    groupedData = applyAlphabeticalWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      aggTransform,
    );
  } else if (groupTransform === "frequency") {
    groupedData = applyFrequencyWithAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      aggTransform,
    );
  } else {
    // Default case - just apply basic aggregation
    groupedData = applyBasicAggregation(
      data,
      groupField,
      aggField,
      seriesField,
      aggTransform,
    );
  }

  return groupedData;
};

// X-axis transformation dispatcher (kept for backward compatibility)
const applyTransform = (
  data: any[],
  config: ChartConfig,
  type: string,
): any[] => {
  let transform = config.transform_x;
  let column: string | null = config.x;
  if (type == "y") {
    transform = config.transform_y;
    column = config.y;
  }
  if (!transform) return data;
  if (!column) return data;
  if (transform.startsWith("date_group:")) {
    const dateType = transform.split(":")[1];
    return applyDateGrouping(data, column, dateType);
  }

  if (transform.startsWith("bin:")) {
    const binType = transform.split(":")[1];
    return applyBinning(data, column, binType);
  }

  if (transform.startsWith("topk:")) {
    const k = parseInt(transform.split(":")[1]);
    return applyTopK(data, column, k);
  }

  if (transform.startsWith("bottomk:")) {
    const k = parseInt(transform.split(":")[1]);
    return applyBottomK(data, column, k);
  }

  if (transform.startsWith("other_group:")) {
    const threshold = parseFloat(transform.split(":")[1]);
    return applyOtherGrouping(data, column, threshold);
  }

  if (transform === "alphabetical") {
    return [...data].sort((a, b) =>
      String(a[column]).localeCompare(String(b[column])),
    );
  }

  if (transform === "frequency") {
    return applyFrequencySort(data, column);
  }

  if (transform === "log_scale") {
    return applyLogScale(data, column);
  }

  if (transform === "normalize") {
    return applyNormalize(data, column);
  }

  if (transform === "z_score") {
    return applyZScore(data, column);
  }
  if (config.y === null || transform === "count") {
    return applyCountTransform(data, column);
  }

  if (["sum", "mean", "median", "min", "max"].includes(transform)) {
    return applyAggregation(data, column, transform);
  }

  if (transform === "cumulative") {
    // Use config.y as the value field, or 'count' as fallback
    return applyCumulativeTransform(data, column, column || "count");
  }

  return data;
};

// New aggregation functions that handle grouping and aggregation together

// Date grouping with aggregation
export const applyDateGroupingWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  dateType: string,
  aggTransform: string,
): any[] => {
  // First transform the date field values to create grouped data
  const transformedData = data.map((item) => {
    const date = new Date(item[groupField]);
    let groupKey = "";

    switch (dateType) {
      case "year":
        groupKey = date.getFullYear().toString();
        break;
      case "month_year":
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "month":
        groupKey = date.toLocaleDateString("en-US", { month: "long" });
        break;
      case "quarter":
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        groupKey = `${date.getFullYear()}-Q${quarter}`;
        break;
      case "day_of_week":
        groupKey = date.toLocaleDateString("en-US", { weekday: "long" });
        break;
      case "hour":
        groupKey = `${date.getHours()}:00`;
        break;
      default:
        groupKey = item[groupField];
    }

    return {
      ...item,
      [groupField]: groupKey,
    };
  });

  // Now apply unified aggregation to the transformed data
  return applyUnifiedAggregation(
    transformedData,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );
};

// Unified aggregation function that handles grouping and aggregation in one step
const applyUnifiedAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  aggTransform: string,
): any[] => {
  // Group data by the grouping field and series field (if present)
  const grouped = data.reduce(
    (acc, item) => {
      const groupKey = item[groupField];
      const seriesKey = seriesField ? item[seriesField] : "no_series";
      const combinedKey = `${groupKey}|||${seriesKey}`;

      if (!acc[combinedKey]) {
        acc[combinedKey] = {
          [groupField]: groupKey,
          ...(seriesField && { [seriesField]: seriesKey }),
          items: [],
        };
      }
      acc[combinedKey].items.push(item);
      return acc;
    },
    {} as Record<string, any>,
  );

  // Process each group with aggregation
  const result = Object.values(grouped).map((group: any) => {
    const groupResult: any = {
      [groupField]: group[groupField],
      ...(seriesField && { [seriesField]: group[seriesField] }),
      count: group.items.length,
    };

    // Apply aggregation to the target field
    if (aggField && aggTransform) {
      const aggregatedValue = calculateAggregation(
        group.items,
        aggField,
        aggTransform,
      );
      groupResult[aggField] = aggregatedValue;
      groupResult.value = aggregatedValue;
    }

    return groupResult;
  });

  // Always sort grouped values alphabetically by group field, then series field
  return result.sort((a, b) => {
    const groupCompare = String(a[groupField]).localeCompare(
      String(b[groupField]),
    );
    if (groupCompare !== 0) return groupCompare;

    // If series field exists, sort by series value as well
    if (seriesField) {
      return String(a[seriesField]).localeCompare(String(b[seriesField]));
    }

    return 0;
  });
};

// Core aggregation calculation function
const calculateAggregation = (
  items: any[],
  field: string,
  aggTransform: string,
): number => {
  const values = items
    .map((item) => parseFloat(item[field]))
    .filter((v) => !isNaN(v));

  switch (aggTransform) {
    case "sum":
      return values.reduce((sum, val) => sum + val, 0);
    case "mean":
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case "median":
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "count":
      return items.length;
    default:
      return values.reduce((sum, val) => sum + val, 0);
  }
};

// Other grouping functions with aggregation
export const applyTopKWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  k: number,
  aggTransform: string,
): any[] => {
  // Apply unified aggregation to get all groups (already sorted alphabetically)
  const aggregated = applyUnifiedAggregation(
    data,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );

  // Sort by count or aggregated value and take top K
  const sortField = aggField && aggTransform !== "count" ? "value" : "count";
  const sorted = aggregated.sort((a, b) => b[sortField] - a[sortField]);

  return sorted.slice(0, k);
};

export const applyBottomKWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  k: number,
  aggTransform: string,
): any[] => {
  // Apply unified aggregation to get all groups (already sorted alphabetically)
  const aggregated = applyUnifiedAggregation(
    data,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );

  // Sort by count or aggregated value (ascending for bottom K) and take bottom K
  const sortField = aggField && aggTransform !== "count" ? "value" : "count";
  const sorted = aggregated.sort((a, b) => a[sortField] - b[sortField]);

  return sorted.slice(0, k);
};

export const applyBinningWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  binType: string,
  aggTransform: string,
): any[] => {
  const values = data
    .map((item) => parseFloat(item[groupField]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  let bins: number[] = [];

  if (binType === "auto") {
    const binCount = Math.ceil(Math.sqrt(values.length));
    const binSize = (max - min) / binCount;
    bins = Array.from({ length: binCount + 1 }, (_, i) => min + i * binSize);
  } else if (binType === "quartile") {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q2 = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    bins = [min, q1, q2, q3, max];
  } else if (binType.startsWith("custom:")) {
    const customBins = binType.split(":")[1].split(",").map(Number);
    bins = [min, ...customBins, max].sort((a, b) => a - b);
  }

  // Transform data to assign bin labels
  const transformedData = data.map((item) => {
    const value = parseFloat(item[groupField]);
    if (isNaN(value)) return item;

    for (let i = 0; i < bins.length - 1; i++) {
      const binStart = bins[i];
      const binEnd = bins[i + 1];
      if (
        value >= binStart &&
        (i === bins.length - 2 ? value <= binEnd : value < binEnd)
      ) {
        return {
          ...item,
          [groupField]: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        };
      }
    }
    return item;
  });

  // Apply unified aggregation to the transformed data
  return applyUnifiedAggregation(
    transformedData,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );
};

export const applyOtherGroupingWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  threshold: number,
  aggTransform: string,
): any[] => {
  // First, calculate group sizes to determine which should be "Other"
  const groupCounts = data.reduce(
    (acc, item) => {
      const key = item[groupField];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = data.length;

  // Transform data by replacing small groups with "Other"
  const transformedData = data.map((item) => {
    const key = item[groupField];
    const count = groupCounts[key];
    const percentage = count / total;

    return {
      ...item,
      [groupField]: percentage < threshold ? "Other" : key,
    };
  });

  // Apply unified aggregation to the transformed data
  return applyUnifiedAggregation(
    transformedData,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );
};

export const applyAlphabeticalWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  aggTransform: string,
): any[] => {
  // Apply unified aggregation (already sorted alphabetically)
  return applyUnifiedAggregation(
    data,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );
};

export const applyFrequencyWithAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  aggTransform: string,
): any[] => {
  // Apply unified aggregation (already sorted alphabetically)
  const aggregated = applyUnifiedAggregation(
    data,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );

  // Sort by frequency (count) in descending order
  return aggregated.sort((a, b) => b.count - a.count);
};

export const applyBasicAggregation = (
  data: any[],
  groupField: string,
  aggField: string,
  seriesField: string | null,
  aggTransform: string,
): any[] => {
  // Simply apply unified aggregation - this is the base case
  return applyUnifiedAggregation(
    data,
    groupField,
    aggField,
    seriesField,
    aggTransform,
  );
};

// Date grouping transformations (kept for backward compatibility)
export const applyDateGrouping = (
  data: any[],
  xField: string,
  dateType: string,
): any[] => {
  const grouped = data.reduce(
    (acc, item) => {
      const date = new Date(item[xField]);
      let groupKey = "";

      switch (dateType) {
        case "year":
          groupKey = date.getFullYear().toString();
          break;
        case "month_year":
          groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "month":
          groupKey = date.toLocaleDateString("en-US", { month: "long" });
          break;
        case "quarter":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          groupKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "day_of_week":
          groupKey = date.toLocaleDateString("en-US", { weekday: "long" });
          break;
        case "hour":
          groupKey = `${date.getHours()}:00`;
          break;
        default:
          groupKey = item[xField];
      }

      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  return Object.entries(grouped).map(([key, items]) => {
    // Return the first item with the updated x field
    const firstItem = items[0] || {};
    return {
      ...firstItem,
      [xField]: key,
    };
  });
};

// Binning transformations
export const applyBinning = (
  data: any[],
  xField: string,
  binType: string,
): any[] => {
  const values = data
    .map((item) => parseFloat(item[xField]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return data;

  const min = Math.min(...values);
  const max = Math.max(...values);

  let bins: number[] = [];

  if (binType === "auto") {
    const binCount = Math.ceil(Math.sqrt(values.length));
    const binSize = (max - min) / binCount;
    bins = Array.from({ length: binCount + 1 }, (_, i) => min + i * binSize);
  } else if (binType === "quartile") {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q2 = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    bins = [min, q1, q2, q3, max];
  } else if (binType.startsWith("custom:")) {
    // Custom binning: bin:custom:10,20,30,40
    const customBins = binType.split(":")[1].split(",").map(Number);
    bins = [min, ...customBins, max].sort((a, b) => a - b);
  }

  const binned = bins.slice(0, -1).map((binStart, i) => {
    const binEnd = bins[i + 1];
    const binData = data.filter((item) => {
      const value = parseFloat(item[xField]);
      return (
        value >= binStart &&
        (i === bins.length - 2 ? value <= binEnd : value < binEnd)
      );
    });

    // Return the first item with the updated x field
    const firstItem = binData[0] || {};
    return {
      ...firstItem,
      [xField]: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
    };
  });

  return binned;
};

// Top K and Bottom K transformations
export const applyTopK = (data: any[], xField: string, k: number): any[] => {
  const counts = data.reduce(
    (acc, item) => {
      const key = item[xField];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const topK = sorted.slice(0, k).map(([key]) => key);

  return data.filter((item) => topK.includes(item[xField]));
};

export const applyBottomK = (data: any[], xField: string, k: number): any[] => {
  const counts = data.reduce(
    (acc, item) => {
      const key = item[xField];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const sorted = Object.entries(counts).sort(([, a], [, b]) => a - b);
  const bottomK = sorted.slice(0, k).map(([key]) => key);

  return data.filter((item) => bottomK.includes(item[xField]));
};

// Other grouping transformation
export const applyOtherGrouping = (
  data: any[],
  xField: string,
  threshold: number,
): any[] => {
  const counts = data.reduce(
    (acc, item) => {
      const key = item[xField];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = data.length;
  const result = data.map((item) => {
    const key = item[xField];
    const count = counts[key];
    const percentage = count / total;

    return {
      ...item,
      [xField]: percentage < threshold ? "Other" : key,
    };
  });

  return result;
};

// Frequency sorting transformation
export const applyFrequencySort = (data: any[], xField: string): any[] => {
  const counts = data.reduce(
    (acc, item) => {
      const key = item[xField];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return [...data].sort((a, b) => {
    const aCount = counts[a[xField]];
    const bCount = counts[b[xField]];
    return bCount - aCount;
  });
};

// Numeric transformations
export const applyLogScale = (data: any[], field: string): any[] => {
  return data.map((item) => {
    const value = parseFloat(item[field]);
    return {
      ...item,
      [field]: value > 0 ? Math.log10(value) : 0,
    };
  });
};

export const applyNormalize = (data: any[], field: string): any[] => {
  const values = data
    .map((item) => parseFloat(item[field]))
    .filter((v) => !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return data;

  return data.map((item) => {
    const value = parseFloat(item[field]);
    return {
      ...item,
      [field]: (value - min) / range,
    };
  });
};

export const applyZScore = (data: any[], field: string): any[] => {
  const values = data
    .map((item) => parseFloat(item[field]))
    .filter((v) => !isNaN(v));
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return data;

  return data.map((item) => {
    const value = parseFloat(item[field]);
    return {
      ...item,
      [field]: (value - mean) / stdDev,
    };
  });
};

// Aggregation transformations
export const applyCountTransform = (data: any[], column: string): any[] => {
  const grouped = data.reduce(
    (acc, item) => {
      const key = item[column];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return Object.entries(grouped).map(([key, count]) => ({
    [column]: key,
    count,
  }));
};
export const applyAggregation = (
  data: any[],
  column: string,
  aggregation: string,
): any[] => {
  // Group values by unique key in column
  const grouped = data.reduce(
    (acc, item) => {
      const key = item[column];
      const value = parseFloat(item[column]);
      if (!acc[key]) acc[key] = [];
      if (!isNaN(value)) acc[key].push(value);
      return acc;
    },
    {} as Record<string, number[]>,
  );

  return Object.entries(grouped).map(([key, values]) => {
    let aggValue = 0;
    switch (aggregation) {
      case "sum":
        aggValue = values.reduce((sum, val) => sum + val, 0);
        break;
      case "mean":
        aggValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case "median":
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        aggValue =
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        break;
      case "min":
        aggValue = Math.min(...values);
        break;
      case "max":
        aggValue = Math.max(...values);
        break;
      default:
        aggValue = values.reduce((sum, val) => sum + val, 0);
    }
    return {
      [column]: key,
      value: aggValue,
    };
  });
};

export const applyCumulativeTransform = (
  data: any[],
  column: string,
  valueField: string,
): any[] => {
  // Sort by the column (assume date or numeric)
  const sorted = [...data].sort((a, b) => {
    const aVal = isNaN(Date.parse(a[column]))
      ? parseFloat(a[column])
      : new Date(a[column]).getTime();
    const bVal = isNaN(Date.parse(b[column]))
      ? parseFloat(b[column])
      : new Date(b[column]).getTime();
    return aVal - bVal;
  });

  let cumulative = 0;
  return sorted.map((item) => {
    const value = parseFloat(item[valueField]);
    if (!isNaN(value)) {
      cumulative += value;
    }
    return {
      ...item,
      [valueField]: cumulative,
    };
  });
};

// Histogram-specific data processing
export const processHistogramData = (data: any[], xField: string): any[] => {
  const values = data
    .map((item) => parseFloat(item[xField]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return [];

  const binCount = Math.ceil(Math.sqrt(values.length));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / binCount;

  const bins = Array.from({ length: binCount }, (_, i) => {
    const binStart = min + i * binSize;
    const binEnd = binStart + binSize;
    const count = values.filter(
      (v) => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd),
    ).length;

    return {
      bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
      count,
      frequency: count / values.length,
    };
  });

  return bins;
};
