import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema, insertWorkPackageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat API endpoints - Compatible with original frontend
  app.post("/api/genie", async (req, res) => {
    try {
      const { question, conv_id } = req.body;
      
      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      let conversationId = conv_id;

      // Create new conversation if none exists
      if (!conversationId) {
        const conversation = await storage.createConversation({
          title: question.slice(0, 50) + "...",
          category: "general",
          userId: "default_user",
          metadata: {}
        });
        conversationId = conversation.id;
      }

      // Save user message
      await storage.createMessage({
        conversationId,
        content: question,
        sender: "user",
        messageType: "text"
      });

      // Generate AI response (compatible with original backend)
      let response = generateAIResponse(question);
      
      // Check if response should include work package data
      let data_array = null;
      if (question.toLowerCase().includes("cwa") || question.toLowerCase().includes("work package") || question.toLowerCase().includes("progress")) {
        const workPackages = await storage.getWorkPackagesByCwa("CWA-2301");
        data_array = workPackages.map(wp => ({
          "WP ID": wp.wpId,
          "Description": wp.description,
          "Status": wp.status,
          "Progress": `${wp.progress}%`,
          "Due Date": wp.dueDate?.toISOString().split('T')[0] || "",
          "Assigned Team": wp.assignedTeam || ""
        }));
      }

      // Save bot response
      await storage.createMessage({
        conversationId,
        content: response,
        sender: "bot",
        messageType: data_array ? "table" : "text",
        data: data_array ? { table: data_array } : null
      });

      // Response format compatible with original frontend
      res.json({
        content: response,
        conv_id: conversationId,
        data_array: data_array
      });

    } catch (error) {
      console.error("Error in /api/genie:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DataVisAgent endpoint - Enhanced with chart saving
  app.post("/api/datavis", async (req, res) => {
    try {
      const { columns, data_snippet, conversation_id, save_chart = false } = req.body;
      
      if (!columns || !data_snippet) {
        return res.status(400).json({ error: "Columns and data_snippet are required" });
      }

      // Generate visualization configuration based on data analysis
      const visualizations = generateVisualizationConfig(columns, data_snippet);
      
      // Save chart data as a message if requested and conversation exists
      if (save_chart && conversation_id) {
        await storage.createMessage({
          conversationId: conversation_id,
          content: `Generated ${visualizations.charts.length} interactive visualizations for your data analysis`,
          sender: "bot",
          messageType: "visualization",
          data: {
            charts: visualizations.charts,
            originalData: data_snippet,
            columns: columns,
            title: visualizations.title,
            description: visualizations.description,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      res.json({ visualizations });
    } catch (error) {
      console.error("Error in /api/datavis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Conversation management
  app.get("/api/conversations", async (req, res) => {
    try {
      const { user_id = "default_user", category } = req.query;
      
      let conversations;
      if (category && typeof category === "string") {
        conversations = await storage.getConversationsByCategory(user_id as string, category);
      } else {
        conversations = await storage.getConversations(user_id as string);
      }
      
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid conversation data", details: error.errors });
      }
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const deleted = await storage.deleteConversation(id);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Work package management
  app.get("/api/workpackages", async (req, res) => {
    try {
      const { cwa_id } = req.query;
      
      let workPackages;
      if (cwa_id && typeof cwa_id === "string") {
        workPackages = await storage.getWorkPackagesByCwa(cwa_id);
      } else {
        workPackages = await storage.getWorkPackages();
      }
      
      res.json(workPackages);
    } catch (error) {
      console.error("Error fetching work packages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/workpackages", async (req, res) => {
    try {
      const validatedData = insertWorkPackageSchema.parse(req.body);
      const workPackage = await storage.createWorkPackage(validatedData);
      res.json(workPackage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid work package data", details: error.errors });
      }
      console.error("Error creating work package:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save chart configuration endpoint (local storage)
  app.post("/api/charts/save", async (req, res) => {
    try {
      const { conversation_id, chart_config, chart_data, title } = req.body;
      
      if (!conversation_id || !chart_config) {
        return res.status(400).json({ error: "Conversation ID and chart config are required" });
      }

      // Save chart as a visualization message in memory storage
      const message = await storage.createMessage({
        conversationId: conversation_id,
        content: title || "Saved chart visualization",
        sender: "bot",
        messageType: "visualization",
        data: {
          charts: Array.isArray(chart_config) ? chart_config : [chart_config],
          originalData: chart_data || [],
          savedAt: new Date().toISOString(),
          title: title
        }
      });
      
      res.json({ success: true, message_id: message.id });
    } catch (error) {
      console.error("Error saving chart:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateAIResponse(question: string): string {
  // Simple response generation based on keywords
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes("cwa") && lowerQuestion.includes("progress")) {
    return "Here's the current progress status for CWA-2301. I've analyzed the work packages and found 3 active packages with varying completion rates. The overall progress is 35% complete with one critical issue: CWA-2301-003 is 3 days behind schedule. I recommend reallocating resources from Team Alpha to accelerate concrete pour activities.";
  }
  
  if (lowerQuestion.includes("gantt") || lowerQuestion.includes("schedule")) {
    return "I've generated a Gantt chart visualization showing the project timeline. The chart displays the current status of all work packages with their dependencies and critical path highlighted.";
  }
  
  if (lowerQuestion.includes("resource") && lowerQuestion.includes("allocation")) {
    return "Based on the current work package status, here's the resource allocation analysis. Team Alpha is overallocated with 75% utilization on Foundation Preparation. I recommend redistributing 2 members to Team Gamma to address the concrete pour delays.";
  }
  
  if (lowerQuestion.includes("report")) {
    return "I've generated a comprehensive AWP progress report including work package status, resource utilization, schedule adherence, and recommendations for optimization. The report includes interactive visualizations and is ready for export.";
  }
  
  return "I've analyzed your query and can provide detailed insights about work packages, schedules, resource allocation, and project progress. Please specify what aspect of the AWP system you'd like me to focus on.";
}

function generateVisualizationConfig(columns: any[], data_snippet: any[]) {
  // Analyze column types
  const columnTypes = columns.map(col => {
    const sampleValues = data_snippet.map(row => row[col.name]).filter(v => v != null);
    
    // Check if it's a time/date column
    if (col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('time')) {
      return { ...col, type: 'time' };
    }
    
    // Check if it's numeric
    const numericValues = sampleValues.filter(v => !isNaN(Number(v)));
    if (numericValues.length > sampleValues.length * 0.8) {
      return { ...col, type: 'numeric' };
    }
    
    // Otherwise categorical
    return { ...col, type: 'categorical' };
  });

  const charts = [];
  
  // Find time + numeric combinations for line charts
  const timeColumns = columnTypes.filter(col => col.type === 'time');
  const numericColumns = columnTypes.filter(col => col.type === 'numeric');
  const categoricalColumns = columnTypes.filter(col => col.type === 'categorical');
  
  if (timeColumns.length > 0 && numericColumns.length > 0) {
    charts.push({
      type: 'line',
      x: timeColumns[0].name,
      y: numericColumns[0].name,
      series: null,
      title: `${numericColumns[0].name} over Time`,
      transform_x: 'date_group:month_year',
      transform_y: 'sum',
      rationale: `Shows the trend of ${numericColumns[0].name} over time periods`
    });
  }
  
  // Categorical distributions
  if (categoricalColumns.length > 0) {
    charts.push({
      type: 'pie',
      x: categoricalColumns[0].name,
      y: null,
      series: null,
      title: `Distribution of ${categoricalColumns[0].name}`,
      transform_x: null,
      transform_y: 'count',
      rationale: `Shows the proportion breakdown of ${categoricalColumns[0].name} categories`
    });
  }
  
  // Numeric + categorical for bar charts
  if (numericColumns.length > 0 && categoricalColumns.length > 0) {
    charts.push({
      type: 'bar',
      x: categoricalColumns[0].name,
      y: numericColumns[0].name,
      series: null,
      title: `${numericColumns[0].name} by ${categoricalColumns[0].name}`,
      transform_x: 'topk:10',
      transform_y: 'sum',
      rationale: `Compares ${numericColumns[0].name} values across different ${categoricalColumns[0].name} categories`
    });
  }

  // Add scatter plot if we have multiple numeric columns
  if (numericColumns.length >= 2) {
    charts.push({
      type: 'scatter',
      x: numericColumns[0].name,
      y: numericColumns[1].name,
      series: categoricalColumns.length > 0 ? categoricalColumns[0].name : null,
      title: `${numericColumns[0].name} vs ${numericColumns[1].name}`,
      transform_x: null,
      transform_y: null,
      rationale: `Shows the correlation between ${numericColumns[0].name} and ${numericColumns[1].name}`
    });
  }

  // Add histogram for numeric data distribution
  if (numericColumns.length > 0) {
    charts.push({
      type: 'histogram',
      x: numericColumns[0].name,
      y: null,
      series: null,
      title: `Distribution of ${numericColumns[0].name}`,
      transform_x: 'bin:auto',
      transform_y: 'count',
      rationale: `Shows the frequency distribution of ${numericColumns[0].name} values`
    });
  }

  // Generate multi-chart configuration
  return {
    title: "Data Analysis Dashboard",
    description: `Generated ${charts.length} visualizations from ${columns.length} columns and ${data_snippet.length} data points`,
    charts: charts
  };
}
