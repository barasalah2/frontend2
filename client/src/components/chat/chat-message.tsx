import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedWorkPackageTable } from "@/components/tables/enhanced-work-package-table";
import { MultiChartRenderer } from "@/components/charts/multi-chart-renderer";
import { ChartRenderer } from "@/components/charts/chart-renderer";

import { type Message } from "@shared/schema";
import { Bot, User, Download, AlertCircle, BarChart3 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exportToExcel } from "@/lib/excel-export";
import { useToast } from "@/hooks/use-toast";

interface ChatMessageProps {
  message: Message;
  conversationId?: number;
}

export function ChatMessage({ message, conversationId }: ChatMessageProps) {

  const isBot = message.sender === "bot";
  
  // Debug conversation ID
  console.log('ChatMessage - conversationId:', conversationId, 'for message:', message.id);
  const hasTableData = message.data && 
    message.data.table && 
    Array.isArray(message.data.table) && 
    message.data.table.length > 0;

  const hasVisualizationData = message.messageType === "visualization" && 
    message.data && 
    message.data.charts && 
    Array.isArray(message.data.charts) && 
    message.data.charts.length > 0;






  const { toast } = useToast();

  const formatTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(dateObj);
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const handleExportTable = () => {
    if (hasTableData) {
      const tableData = message.data.table;
      const headers = Object.keys(tableData[0] || {});
      const rows = tableData.map((row: any) => Object.values(row));
      exportToExcel([headers, ...rows], `workpack_data_${message.id}`);
    }
  };





  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start space-x-3 ${isBot ? '' : 'justify-end'}`}
    >
      {isBot && (
        <div className="w-8 h-8 bg-workpack-blue rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="text-white h-4 w-4" />
        </div>
      )}

     <div className={`flex-1 ${isBot ? '' : 'flex justify-end'}`}>
  <div className={`max-w-4xl ${isBot ? '' : 'max-w-2xl'}`}>
    {/* Message Bubble */}
    <div
      className={`rounded-xl p-4 shadow-sm ${
        isBot
          ? "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-tl-none"
          : "bg-workpack-blue text-white rounded-tr-none"
      }`}
    >
      {/* 🔄 Force Markdown for both bot and user */}
      <div
        className={`prose prose-sm dark:prose-invert max-w-none ${
          !isBot ? "text-white prose-p:text-white prose-strong:text-white" : ""
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
    </div>

          {/* Data Table */}
          {hasTableData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold workpack-text dark:text-white flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-workpack-orange" />
                    Work Package Analysis
                  </h4>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleExportTable}
                      size="sm"
                      className="bg-workpack-green hover:bg-green-700 text-white"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export Excel
                    </Button>
                  </div>
                </div>
                <EnhancedWorkPackageTable 
                  data={message.data.table} 
                  conversationId={conversationId}
                />
              </div>
            </motion.div>
          )}

          {/* Multi-Chart Visualization */}
          {hasVisualizationData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold workpack-text dark:text-white flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-workpack-blue" />
                    Data Visualization
                  </h4>
                  <Badge variant="secondary" className="text-workpack-blue">
                    {message.data.charts.length} Chart{message.data.charts.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {/* Always use MultiChartRenderer for consistency */}
                <MultiChartRenderer
                  data={message.data.originalData || []}
                  config={{
                    title: message.data.title || "Data Analysis Dashboard",
                    description: message.data.description || `Generated ${message.data.charts.length} visualization${message.data.charts.length > 1 ? 's' : ''}`,
                    charts: message.data.charts
                  }}
                  height={400}
                />
              </div>
            </motion.div>
          )}

          {/* Analysis Summary */}
          {isBot && hasTableData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 p-3 bg-blue-50 dark:bg-slate-700 rounded-lg border-l-4 border-workpack-blue"
            >
              <div className="flex items-start space-x-2">
                <AlertCircle className="text-workpack-blue mt-1 h-4 w-4" />
                <div>
                  <h5 className="font-medium workpack-text dark:text-white mb-1">
                    Analysis Summary
                  </h5>
                  <p className="text-sm workpack-slate dark:text-slate-300">
                    Based on the work package data, I've identified key insights and recommendations 
                    for optimizing project performance and resource allocation.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Timestamp */}
          <div className={`flex items-center space-x-2 mt-2 text-xs workpack-slate dark:text-slate-400 ${
            isBot ? '' : 'justify-end mr-11'
          }`}>
            <span>{isBot ? 'Workpacks Genie' : 'You'}</span>
            <span>•</span>
            <span>{formatTime(message.createdAt)}</span>
            {isBot && hasTableData && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-workpack-green">
                  Generated analysis
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {!isBot && (
        <div className="w-8 h-8 bg-workpack-orange rounded-full flex items-center justify-center flex-shrink-0">
          <User className="text-white h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}
