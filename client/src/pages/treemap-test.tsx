import React from 'react';
import { TreemapChart } from '@/components/charts/TreemapChart';

const TreemapTestPage: React.FC = () => {
  const testConfig = {
    type: "treemap" as const,
    x: "cwp",
    x2: null,
    y: "hours",
    series: "discipline", 
    title: "Total Tag Quantity by CWP",
    transform_x: "topk:20",
    transform_y: "sum",
    rationale: "Shows the total quantity of tags for each Construction Work Package",
    data: [
      {
        x: "1101000_13215_002",
        x2: null,
        y: 3200,
        series: "piping",
        count: 1,
        value: 3200
      },
      {
        x: "1101000_17311_002",
        x2: null,
        y: 2400,
        series: "piping",
        count: 1,
        value: 2400
      },
      {
        x: "1101000_13212_002",
        x2: null,
        y: 2100,
        series: "piping",
        count: 1,
        value: 2100
      },
      {
        x: "1101000_17311_001",
        x2: null,
        y: 1800,
        series: "piping",
        count: 1,
        value: 1800
      },
      {
        x: "1020-QCB2",
        x2: null,
        y: 1250,
        series: "piping",
        count: 1,
        value: 1250
      },
      {
        x: "1040-QCB2",
        x2: null,
        y: 890,
        series: "piping",
        count: 1,
        value: 890
      },
      {
        x: "1050-QCB3",
        x2: null,
        y: 750,
        series: "electrical",
        count: 1,
        value: 750
      },
      {
        x: "1060-QCB4",
        x2: null,
        y: 650,
        series: "electrical",
        count: 1,
        value: 650
      },
      {
        x: "1070-QCB5",
        x2: null,
        y: 500,
        series: "mechanical",
        count: 1,
        value: 500
      },
      {
        x: "1080-QCB6",
        x2: null,
        y: 420,
        series: "mechanical",
        count: 1,
        value: 420
      }
    ]
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Treemap Chart Test</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Testing the new D3-based treemap chart component with sample work package data.
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <TreemapChart config={testConfig} width={1000} height={600} />
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Test Configuration:</h3>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li><strong>Chart Type:</strong> treemap</li>
          <li><strong>X Field:</strong> {testConfig.x} (CWP names)</li>
          <li><strong>Y Field:</strong> {testConfig.y} (Hours/Values)</li>
          <li><strong>Series Field:</strong> {testConfig.series} (Discipline categories)</li>
          <li><strong>Data Points:</strong> {testConfig.data.length} items</li>
          <li><strong>Total Value:</strong> {testConfig.data.reduce((sum, item) => sum + item.y, 0).toLocaleString()}</li>
        </ul>
      </div>
    </div>
  );
};

export default TreemapTestPage;