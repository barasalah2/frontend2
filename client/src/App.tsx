import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";
import WorkpacksGenie from "@/pages/workpacks-genie-original";
import ChartTestLive from "@/pages/chart-test-live";
import TreemapTestPage from "@/pages/treemap-test";
import BubbleTestPage from "@/pages/bubble-test";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={WorkpacksGenie} />
      <Route path="/chart-test" component={ChartTestLive} />
      <Route path="/treemap-test" component={TreemapTestPage} />
      <Route path="/bubble-test" component={BubbleTestPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
