import React from 'react';
import { BubbleChart } from '../components/charts/BubbleChart';

const BubbleTestPage = () => {
  // Test data with categorical x2 values to demonstrate Y-axis functionality
  const testConfig = {
    type: "bubble" as const,
    x: "cwp",
    y: "hours",
    x2: "status",
    series: "discipline",
    title: "Status vs Hours by CWP and Discipline",
    transform_x: "topk:20",
    transform_y: "sum",
    rationale: "Shows work package status (Y-axis) vs actual hours (bubble size) for each Construction Work Package by discipline",
    data: [
      {
        x: "1101000_13215_002",
        x2: "In Progress",
        y: 3200,
        series: "piping",
        count: 1,
        value: 3200
      },
      {
        x: "1101000_17311_002",
        x2: "Completed",
        y: 2400,
        series: "piping",
        count: 1,
        value: 2400
      },
      {
        x: "1101000_13212_002",
        x2: "In Progress",
        y: 2100,
        series: "piping",
        count: 1,
        value: 2100
      },
      {
        x: "1101000_17311_001",
        x2: "Completed",
        y: 1800,
        series: "piping",
        count: 1,
        value: 1800
      },
      {
        x: "1020-QCB2",
        x2: "Planning",
        y: 1250,
        series: "piping",
        count: 1,
        value: 1250
      },
      {
        x: "1040-QCB2",
        x2: "Planning",
        y: 890,
        series: "piping",
        count: 1,
        value: 890
      },
      {
        x: "1101000_13215_001",
        x2: "In Progress",
        y: 2800,
        series: "electrical",
        count: 1,
        value: 2800
      },
      {
        x: "1101000_17311_003",
        x2: "Completed",
        y: 1900,
        series: "electrical",
        count: 1,
        value: 1900
      },
      {
        x: "1030-QCB2",
        x2: "Planning",
        y: 1100,
        series: "electrical",
        count: 1,
        value: 1100
      },
      {
        x: "1101000_13215_003",
        x2: "In Progress",
        y: 2600,
        series: "mechanical",
        count: 1,
        value: 2600
      },
      {
        x: "1101000_17311_004",
        x2: "Completed",
        y: 1500,
        series: "mechanical",
        count: 1,
        value: 1500
      },
      {
        x: "1050-QCB2",
        x2: "Planning",
        y: 750,
        series: "mechanical",
        count: 1,
        value: 750
      }
    ]
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Bubble Chart Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Testing the bubble chart implementation with categorical Y-axis (status) vs hours by CWP and discipline.
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Test Configuration:
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div><strong>Type:</strong> bubble</div>
            <div><strong>X Field:</strong> cwp (Construction Work Package)</div>
            <div><strong>Y Field:</strong> hours (Actual Hours - for bubble size)</div>
            <div><strong>X2 Field:</strong> status (Work Package Status - categorical Y-axis)</div>
            <div><strong>Series:</strong> discipline (piping, electrical, mechanical)</div>
            <div><strong>Transform X:</strong> topk:20</div>
            <div><strong>Transform Y:</strong> sum</div>
            <div><strong>Data Points:</strong> 12 work packages across 3 disciplines and 3 status categories</div>
          </div>
        </div>
        
        <BubbleChart config={testConfig} />
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Expected Features:
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Bubble size proportional to hours value</li>
            <li>• Color-coded by discipline (series)</li>
            <li>• Interactive tooltips with details</li>
            <li>• Responsive legend with discipline categories</li>
            <li>• Axis labels for CWP and Hours</li>
            <li>• Labels on larger bubbles showing values</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BubbleTestPage;