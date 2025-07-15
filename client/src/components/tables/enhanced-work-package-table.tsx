import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Search, Filter, X, BarChart3, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MultiChartRenderer } from "@/components/charts/multi-chart-renderer";


interface EnhancedWorkPackageTableProps {
  data: any[];
  conversationId?: number;
}

type SortDirection = "asc" | "desc" | null;

export function EnhancedWorkPackageTable({ data, conversationId }: EnhancedWorkPackageTableProps) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterField, setFilterField] = useState<string>("all");
  const [filterValue, setFilterValue] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  const { toast } = useToast();
  const [generatedCharts, setGeneratedCharts] = useState<any>(null);
  const [isGeneratingCharts, setIsGeneratingCharts] = useState(false);
  const [visualizationMessage, setVisualizationMessage] = useState("");
  const [showVisualizationDialog, setShowVisualizationDialog] = useState(false);

  // Debug logging for chart state
  console.log("Table component render - generatedCharts:", generatedCharts);

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  // Get unique values for filter dropdown
  const getUniqueValues = (field: string) => {
    if (!data || field === "all") return [];
    const values = [...new Set(data.map(row => row[field]))].filter(Boolean);
    return values.sort();
  };

  const filteredAndSortedData = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filter
    if (filterField !== "all" && filterValue !== "all") {
      filtered = filtered.filter(row => 
        String(row[filterField]).toLowerCase() === filterValue.toLowerCase()
      );
    }

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue === bValue) return 0;

        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, filterField, filterValue, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterField("all");
    setFilterValue("all");
    setSortField(null);
    setSortDirection(null);
  };

  const generateVisualization = async () => {
    if (!data || data.length === 0) {
      toast({
        title: "No data available",
        description: "Please ensure there is data to visualize.",
        variant: "destructive",
      });
      return;
    }

    setShowVisualizationDialog(false);
    setIsGeneratingCharts(true);
    try {
      const columns = Object.keys(data[0]);
      const dataSnippet = data.slice(0, 100); // Use first 100 rows for analysis
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/datavis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: columns,
          data_snippet: dataSnippet,
          total_rows: data.length,
          message: visualizationMessage.trim() || undefined
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("API Response from external app:", result);

      // Handle different response formats from external app
      console.log("Raw result:", result);
      console.log("Type of result:", typeof result);
      console.log("Result keys:", Object.keys(result));
      
      let charts = [];
      
      // The response is a JSON string, we need to parse it first
      let parsedResult = result;
      if (typeof result === 'string') {
        try {
          parsedResult = JSON.parse(result);
        } catch (e) {
          console.error("Failed to parse result as JSON:", e);
        }
      }
      
      console.log("Parsed result:", parsedResult);
      
      if (Array.isArray(parsedResult.visualizations)) {
        charts = parsedResult.visualizations;
      } else if (parsedResult.visualizations?.charts && Array.isArray(parsedResult.visualizations.charts)) {
        charts = parsedResult.visualizations.charts;
      } else if (parsedResult.charts && Array.isArray(parsedResult.charts)) {
        charts = parsedResult.charts;
      }
      
      console.log("Final parsed charts:", charts);
      
      if (charts && charts.length > 0) {
        // Display charts directly under the table
        const chartConfig = {
          title: "Data Analysis Dashboard",
          description: `Generated ${charts.length} visualization${charts.length > 1 ? 's' : ''} from table data`,
          charts: charts
        };
        
        console.log("Setting generated charts:", chartConfig);
        setGeneratedCharts(chartConfig);
        
        toast({
          title: "Visualization Generated",
          description: `Created ${charts.length} charts from your data.`,
        });
      } else {
        toast({
          title: "No charts generated",
          description: "The AI couldn't generate charts from this data.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating visualization:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast({
        title: "Error",
        description: `Failed to generate visualization: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCharts(false);
    }
  };






  const hasActiveFilters = searchTerm || filterField !== "all" || filterValue !== "all" || sortField;

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No work package data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}

          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullscreenModal(true)}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            New Window
          </Button>
          
          <Button 
            size="sm"
            className="bg-workpack-blue hover:bg-blue-700 text-white transition-all duration-150"
            disabled={isGeneratingCharts}
            onClick={() => setShowVisualizationDialog(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {isGeneratingCharts ? "Generating..." : "Generate Charts"}
          </Button>
          
          <Dialog open={showVisualizationDialog} onOpenChange={setShowVisualizationDialog}>
            <DialogContent className="sm:max-w-[500px] animate-in fade-in-0 zoom-in-95 duration-200">
              <DialogHeader>
                <DialogTitle>Generate Data Visualizations</DialogTitle>
                <DialogDescription>
                  Describe what specific charts or insights you want to see from your data, or leave blank for automatic chart generation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Custom Message (Optional)
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Example: 'Show progress trends by status', 'Create timeline charts for project phases', 'Compare performance metrics across teams'"
                    value={visualizationMessage}
                    onChange={(e) => setVisualizationMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total rows to analyze: {data?.length || 0}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowVisualizationDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={generateVisualization}
                  className="bg-workpack-blue hover:bg-blue-700 text-white"
                  disabled={isGeneratingCharts}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Charts
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Filter by Column</label>
              <Select value={filterField} onValueChange={setFilterField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Columns</SelectItem>
                  {columns.map(column => (
                    <SelectItem key={column} value={column}>{column}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {filterField !== "all" && (
              <div>
                <label className="block text-sm font-medium mb-2">Filter Value</label>
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Values</SelectItem>
                    {getUniqueValues(filterField).map(value => (
                      <SelectItem key={String(value)} value={String(value)}>
                        {String(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredAndSortedData.length} of {data.length} records
        {hasActiveFilters && " (filtered)"}
      </div>

      {/* Table Container */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-auto table-scroll max-h-96">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column}</span>
                      {getSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedData.map((row, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                    >
                      <div className="max-w-xs truncate" title={String(row[column])}>
                        {row[column]}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={showFullscreenModal} onOpenChange={setShowFullscreenModal}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader>
            <DialogTitle>Work Package Data - New Window</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {/* Table Section */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
              <div className="overflow-auto max-h-[40vh] table-scroll">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column}
                          onClick={() => handleSort(column)}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                        >
                          <div className="flex items-center space-x-1">
                            <span>{column}</span>
                            {getSortIcon(column)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAndSortedData.map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        {columns.map((column) => (
                          <td
                            key={column}
                            className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                          >
                            <div className="max-w-xs truncate" title={String(row[column])}>
                              {row[column]}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Charts Section */}
            {generatedCharts && (
              <div className="max-h-[50vh] overflow-auto">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Generated Visualizations</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {generatedCharts.charts?.length || 0} charts generated from your table data
                  </p>
                </div>
                <MultiChartRenderer
                  data={data}
                  config={generatedCharts}
                  height={400}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {filteredAndSortedData.length === 0 && data.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No records match your current filters
        </div>
      )}

      {/* Generated Charts Display */}
      {generatedCharts && (
        <div className="mt-8">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Generated Visualizations</h3>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              {generatedCharts.charts?.length || 0} charts generated from your table data
            </p>
          </div>
          <MultiChartRenderer
            data={data}
            config={generatedCharts}
            height={400}
          />
        </div>
      )}
    </div>
  );
}