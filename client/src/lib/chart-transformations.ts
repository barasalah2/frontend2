import { ChartConfig } from '@/components/charts/chart-renderer';

// Main transformation function that orchestrates all transformations
export const transformData = (data: any[], config: ChartConfig): any => {
  let transformedData = [...data];

  // Apply x-axis transformations
  if (config.transform_x) {
    transformedData = applyTransform(transformedData, config,"x");
  }
  else{
    config.transform_x = "topk:20";
    transformedData = applyTransform(transformedData, config,"x");
  }

  // Apply y-axis transformations
  if (config.transform_y) {
    transformedData = applyTransform(transformedData, config,"y");
  }else{
    config.transform_x = "topk:20";
    transformedData = applyTransform(transformedData, config,"y");
  }


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
    data: transformedData.map(item => {
      return {
        x: item[config.x],
        x2: config.x2 ? item[config.x2] : null,
        y:  item[config.y],
        series: config.series ? item[config.series] : null
      };
    })
  };
};

// X-axis transformation dispatcher
const applyTransform = (data: any[], config: ChartConfig, type: string): any[] => {
  let transform = config.transform_x;
  let column: string | null = config.x;
  if (type == "y") {
    transform = config.transform_y;
    column = config.y;
  }
  if (!transform) return data;
  if (!column) return data;
  if (transform.startsWith('date_group:')) {
    const dateType = transform.split(':')[1];
    return applyDateGrouping(data, column, dateType);
  }

  if (transform.startsWith('bin:')) {
    const binType = transform.split(':')[1];
    return applyBinning(data, column, binType);
  }

  if (transform.startsWith('topk:')) {
    const k = parseInt(transform.split(':')[1]);
    return applyTopK(data, column, k);
  }

  if (transform.startsWith('bottomk:')) {
    const k = parseInt(transform.split(':')[1]);
    return applyBottomK(data, column, k);
  }

  if (transform.startsWith('other_group:')) {
    const threshold = parseFloat(transform.split(':')[1]);
    return applyOtherGrouping(data, column, threshold);
  }

  if (transform === 'alphabetical') {
    return [...data].sort((a, b) => String(a[column]).localeCompare(String(b[column])));
  }

  if (transform === 'frequency') {
    return applyFrequencySort(data, column);
  }

  if (transform === 'log_scale') {
    return applyLogScale(data, column);
  }

  if (transform === 'normalize') {
    return applyNormalize(data, column);
  }

  if (transform === 'z_score') {
    return applyZScore(data, column);
  }
  if (config.y === null || transform === 'count') {
    return applyCountTransform(data, column);
  }

  if (['sum', 'mean', 'median', 'min', 'max'].includes(transform)) {
    return applyAggregation(data, column, transform);
  }

  if (transform === 'cumulative') {
    // Use config.y as the value field, or 'count' as fallback
    return applyCumulativeTransform(data, column, column || 'count');
  }

  return data;
};

// Date grouping transformations
export const applyDateGrouping = (data: any[], xField: string, dateType: string): any[] => {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item[xField]);
    let groupKey = '';

    switch (dateType) {
      case 'year':
        groupKey = date.getFullYear().toString();
        break;
      case 'month_year':
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'month':
        groupKey = date.toLocaleDateString('en-US', { month: 'long' });
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        groupKey = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'day_of_week':
        groupKey = date.toLocaleDateString('en-US', { weekday: 'long' });
        break;
      case 'hour':
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
  }, {} as Record<string, any[]>);

  return Object.entries(grouped).map(([key, items]) => {
    // Return the first item with the updated x field
    const firstItem = items[0] || {};
    return {
      ...firstItem,
      [xField]: key
    };
  });
};

// Binning transformations
export const applyBinning = (data: any[], xField: string, binType: string): any[] => {
  const values = data.map(item => parseFloat(item[xField])).filter(v => !isNaN(v));
  
  if (values.length === 0) return data;

  const min = Math.min(...values);
  const max = Math.max(...values);
  
  let bins: number[] = [];
  
  if (binType === 'auto') {
    const binCount = Math.ceil(Math.sqrt(values.length));
    const binSize = (max - min) / binCount;
    bins = Array.from({ length: binCount + 1 }, (_, i) => min + i * binSize);
  } else if (binType === 'quartile') {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q2 = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    bins = [min, q1, q2, q3, max];
  } else if (binType.startsWith('custom:')) {
    // Custom binning: bin:custom:10,20,30,40
    const customBins = binType.split(':')[1].split(',').map(Number);
    bins = [min, ...customBins, max].sort((a, b) => a - b);
  }

  const binned = bins.slice(0, -1).map((binStart, i) => {
    const binEnd = bins[i + 1];
    const binData = data.filter(item => {
      const value = parseFloat(item[xField]);
      return value >= binStart && (i === bins.length - 2 ? value <= binEnd : value < binEnd);
    });
    
    // Return the first item with the updated x field
    const firstItem = binData[0] || {};
    return {
      ...firstItem,
      [xField]: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`
    };
  });

  return binned;
};

// Top K and Bottom K transformations
export const applyTopK = (data: any[], xField: string, k: number): any[] => {
  const counts = data.reduce((acc, item) => {
    const key = item[xField];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const topK = sorted.slice(0, k).map(([key]) => key);

  return data.filter(item => topK.includes(item[xField]));
};

export const applyBottomK = (data: any[], xField: string, k: number): any[] => {
  const counts = data.reduce((acc, item) => {
    const key = item[xField];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(counts).sort(([, a], [, b]) => a - b);
  const bottomK = sorted.slice(0, k).map(([key]) => key);

  return data.filter(item => bottomK.includes(item[xField]));
};

// Other grouping transformation
export const applyOtherGrouping = (data: any[], xField: string, threshold: number): any[] => {
  const counts = data.reduce((acc, item) => {
    const key = item[xField];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = data.length;
  const result = data.map(item => {
    const key = item[xField];
    const count = counts[key];
    const percentage = count / total;
    
    return {
      ...item,
      [xField]: percentage < threshold ? 'Other' : key
    };
  });

  return result;
};

// Frequency sorting transformation
export const applyFrequencySort = (data: any[], xField: string): any[] => {
  const counts = data.reduce((acc, item) => {
    const key = item[xField];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return [...data].sort((a, b) => {
    const aCount = counts[a[xField]];
    const bCount = counts[b[xField]];
    return bCount - aCount;
  });
};

// Numeric transformations
export const applyLogScale = (data: any[], field: string): any[] => {
  return data.map(item => {
    const value = parseFloat(item[field]);
    return {
      ...item,
      [field]: value > 0 ? Math.log10(value) : 0
    };
  });
};

export const applyNormalize = (data: any[], field: string): any[] => {
  const values = data.map(item => parseFloat(item[field])).filter(v => !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return data;

  return data.map(item => {
    const value = parseFloat(item[field]);
    return {
      ...item,
      [field]: (value - min) / range
    };
  });
};

export const applyZScore = (data: any[], field: string): any[] => {
  const values = data.map(item => parseFloat(item[field])).filter(v => !isNaN(v));
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return data;

  return data.map(item => {
    const value = parseFloat(item[field]);
    return {
      ...item,
      [field]: (value - mean) / stdDev
    };
  });
};

// Aggregation transformations
export const applyCountTransform = (data: any[], column: string): any[] => {
  const grouped = data.reduce((acc, item) => {
    const key = item[column];
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped).map(([key, count]) => ({
    [column]: key,
    count
  }));
};
export const applyAggregation = (
  data: any[],
  column: string,
  aggregation: string
): any[] => {
  // Group values by unique key in column
  const grouped = data.reduce((acc, item) => {
    const key = item[column];
    const value = parseFloat(item[column]);
    if (!acc[key]) acc[key] = [];
    if (!isNaN(value)) acc[key].push(value);
    return acc;
  }, {} as Record<string, number[]>);

  return Object.entries(grouped).map(([key, values]) => {
    let aggValue = 0;
    switch (aggregation) {
      case 'sum':
        aggValue = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'mean':
        aggValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'median':
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        aggValue = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
        break;
      case 'min':
        aggValue = Math.min(...values);
        break;
      case 'max':
        aggValue = Math.max(...values);
        break;
      default:
        aggValue = values.reduce((sum, val) => sum + val, 0);
    }
    return {
      [column]: key,
      value: aggValue
    };
  });
};

export const applyCumulativeTransform = (
  data: any[],
  column: string,
  valueField: string
): any[] => {
  // Sort by the column (assume date or numeric)
  const sorted = [...data].sort((a, b) => {
    const aVal = isNaN(Date.parse(a[column])) ? parseFloat(a[column]) : new Date(a[column]).getTime();
    const bVal = isNaN(Date.parse(b[column])) ? parseFloat(b[column]) : new Date(b[column]).getTime();
    return aVal - bVal;
  });

  let cumulative = 0;
  return sorted.map(item => {
    const value = parseFloat(item[valueField]);
    if (!isNaN(value)) {
      cumulative += value;
    }
    return {
      ...item,
      [valueField]: cumulative
    };
  });
};

// Histogram-specific data processing
export const processHistogramData = (data: any[], xField: string): any[] => {
  const values = data.map(item => parseFloat(item[xField])).filter(v => !isNaN(v));
  
  if (values.length === 0) return [];

  const binCount = Math.ceil(Math.sqrt(values.length));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / binCount;
  
  const bins = Array.from({ length: binCount }, (_, i) => {
    const binStart = min + i * binSize;
    const binEnd = binStart + binSize;
    const count = values.filter(v => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length;
    
    return {
      bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
      count,
      frequency: count / values.length
    };
  });

  return bins;
};