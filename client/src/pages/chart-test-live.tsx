import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Info, TestTube, BarChart3, Play } from 'lucide-react';

// Import the chart rendering components
import { ChartRenderer, ChartConfig } from '@/components/charts/chart-renderer';
import { MultiChartRenderer, MultiChartConfig } from '@/components/charts/multi-chart-renderer';
import { transformData } from '@/lib/chart-transformations';

const sampleData = [
  {
    "iwp_id": "1020-QCB2-SPL02-01",
    "cwp_name": "1020-QCB2",
    "iwp_plan_date": "2024-01-15",
    "iwp_plan_finish_date": "2024-02-28",
    "iwp_actual_start_date": "2024-01-20",
    "iwp_actual_finish_date": "2024-03-05",
    "tag_count": 45,
    "bom_count": 0,
    "total_tag_qty": 1250,
    "total_bom_qty": 0,
    "status": "Completed"
  },
  {
    "iwp_id": "1040-QCB2-SPL03-02",
    "cwp_name": "1040-QCB2",
    "iwp_plan_date": "2024-02-01",
    "iwp_plan_finish_date": "2024-03-15",
    "iwp_actual_start_date": "2024-02-05",
    "iwp_actual_finish_date": "2024-03-20",
    "tag_count": 32,
    "bom_count": 0,
    "total_tag_qty": 890,
    "total_bom_qty": 0,
    "status": "In Progress"
  },
  {
    "iwp_id": "1101000-13212-002",
    "cwp_name": "1101000_13212_002",
    "iwp_plan_date": "2024-03-01",
    "iwp_plan_finish_date": "2024-04-10",
    "iwp_actual_start_date": "2024-03-03",
    "iwp_actual_finish_date": "2024-04-15",
    "tag_count": 28,
    "bom_count": 0,
    "total_tag_qty": 2100,
    "total_bom_qty": 0,
    "status": "Planned"
  },
  {
    "iwp_id": "1101000-13215-003",
    "cwp_name": "1101000_13215_002",
    "iwp_plan_date": "2024-04-01",
    "iwp_plan_finish_date": "2024-05-20",
    "iwp_actual_start_date": "2024-04-05",
    "iwp_actual_finish_date": "2024-05-25",
    "tag_count": 55,
    "bom_count": 0,
    "total_tag_qty": 3200,
    "total_bom_qty": 0,
    "status": "Delayed"
  },
  {
    "iwp_id": "1101000-17311-001",
    "cwp_name": "1101000_17311_001",
    "iwp_plan_date": "2024-05-01",
    "iwp_plan_finish_date": "2024-06-30",
    "iwp_actual_start_date": "2024-05-10",
    "iwp_actual_finish_date": "2024-07-05",
    "tag_count": 38,
    "bom_count": 0,
    "total_tag_qty": 1800,
    "total_bom_qty": 0,
    "status": "In Progress"
  },
  {
    "iwp_id": "1101000-17311-002",
    "cwp_name": "1101000_17311_002",
    "iwp_plan_date": "2024-06-01",
    "iwp_plan_finish_date": "2024-07-15",
    "iwp_actual_start_date": "2024-06-05",
    "iwp_actual_finish_date": "2024-07-20",
    "tag_count": 42,
    "bom_count": 0,
    "total_tag_qty": 2400,
    "total_bom_qty": 0,
    "status": "Planned"
  }
];

const sampleConfigs = [
  {
    type: "bar",
    x: "cwp_name",
    y: "total_tag_qty",
    title: "Total Tag Quantity by CWP",
    transform_y: "sum",
    rationale: "Shows the total quantity of tags for each Construction Work Package"
  },
  {
    type: "line",
    x: "iwp_plan_date",
    y: "tag_count",
    title: "Tag Count Over Time",
    transform_x: "date_group:month_year",
    transform_y: "sum",
    rationale: "Displays how tag counts change over planned dates"
  },
  {
    type: "scatter",
    x: "tag_count",
    y: "total_tag_qty",
    title: "Tag Count vs Total Quantity",
    rationale: "Shows the relationship between number of tags and total quantity"
  },
  {
    type: "pie",
    x: "status",
    y: null,
    title: "Distribution of IWPs by Status",
    transform_y: "count",
    rationale: "Shows the proportion of IWPs for each status"
  },
  {
    type: "gantt",
    x: "iwp_plan_date",
    x2: "iwp_plan_finish_date",
    y: "iwp_id",
    title: "IWP Timeline (Planned)",
    rationale: "Shows the planned start and finish dates for each IWP"
  },
  {
    type: "gantt",
    x: "iwp_plan_date",
    x2: "iwp_plan_finish_date",
    y: "iwp_id",
    title: "IWP Timeline (Quarterly)",
    transform_x: "date_group:quarter",
    rationale: "Shows the planned start and finish dates for each IWP grouped by quarter"
  },
  {
    type: "dumbbell",
    x: "iwp_plan_finish_date",
    x2: "iwp_actual_finish_date",
    y: "iwp_id",
    series: "cwp_name",
    title: "Planned vs Actual Finish Dates by IWP",
    transform_x: null,
    transform_y: null,
    rationale: "Highlights the schedule deviation for each IWP."
  },
  {
    type: "histogram",
    x: "total_tag_qty",
    y: null,
    title: "Distribution of Tag Quantities",
    rationale: "Shows the frequency distribution of tag quantities"
  },
  {
    type: "area",
    x: "iwp_plan_date",
    y: "tag_count",
    series: "status",
    title: "Tag Count Over Time by Status",
    transform_x: "date_group:month_year",
    transform_y: "sum",
    rationale: "Shows cumulative tag counts over time grouped by status"
  }
];

export default function ChartTestLive() {
  const [dataInput, setDataInput] = useState(JSON.stringify(sampleData, null, 2));
  const [configInput, setConfigInput] = useState(JSON.stringify(sampleConfigs[0], null, 2));
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parsedConfig, setParsedConfig] = useState<ChartConfig | MultiChartConfig | null>(null);
  const [transformedData, setTransformedData] = useState<any>(null);
  const [showTransformedData, setShowTransformedData] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(() => {
    try {
      setError('');
      setSuccess('');
      
      // Parse data
      const data = JSON.parse(dataInput);
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array of objects');
      }
      
      // Parse config
      const config = JSON.parse(configInput);
      if (!config.type || !config.x || !config.title) {
        throw new Error('Config must have at least type, x, and title fields');
      }
      
      setParsedData(data);
      setParsedConfig(config);
      setSuccess('Chart generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON');
      setParsedData([]);
      setParsedConfig(null);
      setTransformedData(null);
    }
  }, [dataInput, configInput]);

  const handleGenerateChart = useCallback(async () => {
    setIsGenerating(true);
    try {
      setError('');
      setSuccess('');
      
      // Parse data
      const data = JSON.parse(dataInput);
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array of objects');
      }
      
      // Parse config - support both single chart and multi-chart formats
      const config = JSON.parse(configInput);
      
      // Check if it's a multi-chart configuration
      if (config.charts && Array.isArray(config.charts)) {
        // Multi-chart configuration
        if (!config.title || !config.charts.length) {
          throw new Error('Multi-chart config must have title and charts array');
        }
        // Validate each chart in the array
        config.charts.forEach((chart: any, index: number) => {
          if (!chart.type || !chart.x || !chart.title) {
            throw new Error(`Chart ${index + 1} must have at least type, x, and title fields`);
          }
        });
        setParsedData(data);
        setParsedConfig(config);
        setSuccess('Multi-chart configuration generated successfully!');
      } else if (Array.isArray(config)) {
        // Array of single charts - convert to multi-chart format
        config.forEach((chart: any, index: number) => {
          if (!chart.type || !chart.x || !chart.title) {
            throw new Error(`Chart ${index + 1} must have at least type, x, and title fields`);
          }
        });
        // Convert to multi-chart format
        const multiConfig = {
          title: "Chart Dashboard",
          description: `Generated ${config.length} visualizations`,
          charts: config
        };
        setParsedData(data);
        setParsedConfig(multiConfig);
        setSuccess('Multi-chart configuration generated successfully!');
      } else {
        // Single chart configuration
        if (!config.type || !config.x || !config.title) {
          throw new Error('Config must have at least type, x, and title fields');
        }
        
        // Apply transformation for single chart
        const transformed = transformData(data, config);
        setParsedData(data);
        setParsedConfig(config);
        setTransformedData(transformed);
        setSuccess('Chart generated and transformed successfully!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart');
      setParsedData([]);
      setParsedConfig(null);
      setTransformedData(null);
    } finally {
      setIsGenerating(false);
    }
  }, [dataInput, configInput]);

  const handleTransformData = useCallback(() => {
    if (!parsedData.length || !parsedConfig) {
      setError('Please generate the chart first');
      return;
    }

    try {
      const transformed = transformData(parsedData, parsedConfig);
      setTransformedData(transformed);
      setShowTransformedData(true);
      setSuccess('Data transformed successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transform data');
      setTransformedData(null);
    }
  }, [parsedData, parsedConfig]);

  const loadSampleConfig = useCallback((config: any) => {
    setConfigInput(JSON.stringify(config, null, 2));
  }, []);

  const resetToDefaults = useCallback(() => {
    setDataInput(JSON.stringify(sampleData, null, 2));
    setConfigInput(JSON.stringify(sampleConfigs[0], null, 2));
    setError('');
    setSuccess('');
    setParsedData([]);
    setParsedConfig(null);
    setTransformedData(null);
    setShowTransformedData(false);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <TestTube className="h-6 w-6 text-blue-500" />
          <h1 className="text-3xl font-bold">Live Chart Test</h1>
          <Badge variant="outline">JSON Input</Badge>
        </div>

        <Tabs defaultValue="input" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input">Input & Config</TabsTrigger>
            <TabsTrigger value="examples">Sample Configs</TabsTrigger>
            <TabsTrigger value="transform">Data Transform</TabsTrigger>
            <TabsTrigger value="result" className="relative">
              Chart Output
              {parsedConfig && parsedData.length > 0 && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></div>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Input</CardTitle>
                  <CardDescription>
                    Provide your data as a JSON array of objects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="data-input">JSON Data Array</Label>
                      <Textarea
                        id="data-input"
                        value={dataInput}
                        onChange={(e) => setDataInput(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                        placeholder="Enter your data as JSON array..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Config Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Chart Configuration</CardTitle>
                  <CardDescription>
                    Configure your chart properties as JSON
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="config-input">JSON Configuration</Label>
                      <Textarea
                        id="config-input"
                        value={configInput}
                        onChange={(e) => setConfigInput(e.target.value)}
                        className="font-mono text-sm min-h-[300px]"
                        placeholder="Enter your chart configuration..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {/* Primary Generate Chart Button */}
              <div className="flex gap-4">
                <Button 
                  onClick={handleGenerateChart} 
                  className="flex-1 h-12 text-lg"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Generating Chart...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Generate Chart
                    </>
                  )}
                </Button>
              </div>
              
              {/* Secondary Actions */}
              <div className="flex gap-4">
                <Button onClick={handleGenerate} variant="secondary" className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Parse & Validate
                </Button>
                <Button onClick={handleTransformData} variant="secondary" disabled={!parsedData.length || !parsedConfig}>
                  Transform Data
                </Button>
                <Button onClick={resetToDefaults} variant="outline">
                  Reset to Sample
                </Button>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sample Configurations</CardTitle>
                <CardDescription>
                  Click on any sample configuration to load it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sampleConfigs.map((config, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => loadSampleConfig(config)}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">{config.type}</Badge>
                            <Badge variant="outline">{config.x}</Badge>
                          </div>
                          <h4 className="font-medium">{config.title}</h4>
                          <p className="text-sm text-muted-foreground">{config.rationale}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transform">
            <Card>
              <CardHeader>
                <CardTitle>Data Transformation</CardTitle>
                <CardDescription>
                  See how your data is transformed before rendering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button 
                      onClick={handleTransformData} 
                      disabled={!parsedData.length || !parsedConfig}
                      variant="outline"
                    >
                      Run Transformation
                    </Button>
                    <Button 
                      onClick={() => setShowTransformedData(!showTransformedData)} 
                      variant="secondary"
                      disabled={!transformedData}
                    >
                      {showTransformedData ? 'Hide' : 'Show'} Transformed Data
                    </Button>
                  </div>
                  
                  {showTransformedData && transformedData && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Transformation Applied</h3>
                        {transformedData && (
                          <div className="text-sm space-y-1">
                            {transformedData.transform_x && <div><span className="font-medium">X Transform:</span> {transformedData.transform_x}</div>}
                            {transformedData.transform_y && <div><span className="font-medium">Y Transform:</span> {transformedData.transform_y}</div>}
                            {transformedData.series && <div><span className="font-medium">Series:</span> {transformedData.series}</div>}
                            <div><span className="font-medium">Chart Type:</span> {transformedData.type}</div>
                            <div><span className="font-medium">Data Points:</span> {transformedData.data?.length || 0}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-50 p-3 border-b">
                          <h4 className="font-medium">Transformed Data ({transformedData.data?.length || 0} rows)</h4>
                        </div>
                        <div className="p-4 max-h-96 overflow-auto">
                          <pre className="text-sm whitespace-pre-wrap">
                            {JSON.stringify(transformedData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {parsedData.length > 0 && (
                    <div className="border border-gray-200 rounded-lg">
                      <div className="bg-gray-50 p-3 border-b">
                        <h4 className="font-medium">Original Data ({parsedData.length} rows)</h4>
                      </div>
                      <div className="p-4 max-h-96 overflow-auto">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(parsedData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result" className="space-y-4">
            {parsedConfig && parsedData.length > 0 ? (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Generated Chart</h2>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleGenerateChart} 
                      variant="outline" 
                      size="sm"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin h-3 w-3 mr-2 border-2 border-current border-t-transparent rounded-full" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Regenerate Chart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Chart Display */}
                {parsedConfig && 'charts' in parsedConfig ? (
                  <MultiChartRenderer
                    data={parsedData}
                    config={parsedConfig}
                    height={600}
                  />
                ) : (
                  <ChartRenderer
                    data={parsedData}
                    config={parsedConfig as ChartConfig}
                    height={600}
                  />
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Chart Generated</h3>
                    <p className="mb-4">Use the "Generate Chart" button in the Input tab to create your visualization.</p>
                    <Button onClick={handleGenerateChart} disabled={isGenerating}>
                      {isGenerating ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Generate Chart Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Configuration Details */}
            {parsedConfig && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Chart Type:</span>
                      <Badge>{parsedConfig.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">X-Axis:</span>
                      <span className="font-mono text-sm">{parsedConfig.x}</span>
                    </div>
                    {parsedConfig.x2 && (
                      <div className="flex justify-between">
                        <span className="font-medium">X2-Axis:</span>
                        <span className="font-mono text-sm">{parsedConfig.x2}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium">Y-Axis:</span>
                      <span className="font-mono text-sm">{parsedConfig.y || 'null'}</span>
                    </div>
                    {parsedConfig.series && (
                      <div className="flex justify-between">
                        <span className="font-medium">Series:</span>
                        <span className="font-mono text-sm">{parsedConfig.series}</span>
                      </div>
                    )}
                    {parsedConfig.transform_x && (
                      <div className="flex justify-between">
                        <span className="font-medium">X Transform:</span>
                        <span className="font-mono text-sm">{parsedConfig.transform_x}</span>
                      </div>
                    )}
                    {parsedConfig.transform_y && (
                      <div className="flex justify-between">
                        <span className="font-medium">Y Transform:</span>
                        <span className="font-mono text-sm">{parsedConfig.transform_y}</span>
                      </div>
                    )}
                    <Separator className="my-4" />
                    <div className="text-sm text-muted-foreground">
                      <strong>Data Points:</strong> {parsedData.length} records
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Schema Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Schema</CardTitle>
            <CardDescription>
              Expected JSON structure for chart configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "type": "<chart_type>",              // e.g. "bar", "line", "pie", "gantt", "dumbbell"
  "x": "<column_name>",                // X-axis column name
  "x2": "<optional_column_name>",      // For dumbbell/gantt (end date, second value)
  "y": "<column_name | null>",         // Y-axis column name (null for count)
  "series": "<column_name | null>",    // Series grouping column
  "title": "<string>",                 // Chart title
  "transform_x": "<transform | null>", // date_group:year, bin:auto, etc.
  "transform_y": "<transform | null>", // count, sum, mean, etc.
  "rationale": "<string>"              // Optional explanation
}`}
            </pre>
          </CardContent>
        </Card>

        {/* Supported Transformations */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Transformations</CardTitle>
            <CardDescription>
              Available transformation options for data processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">X-Axis Transformations</h4>
                <ul className="text-sm space-y-1">
                  <li><Badge variant="outline">date_group:year</Badge> - Group by year</li>
                  <li><Badge variant="outline">date_group:month_year</Badge> - Group by month and year</li>
                  <li><Badge variant="outline">date_group:quarter</Badge> - Group by quarter</li>
                  <li><Badge variant="outline">bin:auto</Badge> - Automatic binning</li>
                  <li><Badge variant="outline">bin:quartile</Badge> - Quartile binning</li>
                  <li><Badge variant="outline">topk:N</Badge> - Top N categories</li>
                  <li><Badge variant="outline">bottomk:N</Badge> - Bottom N categories</li>
                  <li><Badge variant="outline">alphabetical</Badge> - Sort alphabetically</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Y-Axis Transformations</h4>
                <ul className="text-sm space-y-1">
                  <li><Badge variant="outline">count</Badge> - Count of records</li>
                  <li><Badge variant="outline">sum</Badge> - Sum of values</li>
                  <li><Badge variant="outline">mean</Badge> - Average of values</li>
                  <li><Badge variant="outline">median</Badge> - Median value</li>
                  <li><Badge variant="outline">min</Badge> - Minimum value</li>
                  <li><Badge variant="outline">max</Badge> - Maximum value</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}