import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Database, Package, Clock, CheckCircle, XCircle, Loader2, Shield, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SyncLog {
  operation: string;
  status: string;
  message: string;
  records_processed: number;
  created_at: string;
}

interface SyncMetric {
  id: string;
  operation: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  duration_seconds: number | null;
  error_message: string | null;
}

interface SyncStatistics {
  operation: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_duration_seconds: number;
  last_run: string;
  total_records_processed: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [metrics, setMetrics] = useState<SyncMetric[]>([]);
  const [statistics, setStatistics] = useState<SyncStatistics[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access the admin panel",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }
      
      const { data: hasAdminRole, error } = await supabase.rpc("has_role", {
        _user_id: currentUser.id,
        _role: "admin",
      });
      
      if (error) {
        console.error("Error checking admin role:", error);
        toast({
          title: "Permission Error",
          description: "Error verifying permissions",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      setUser(currentUser);
      setIsAdmin(true);
      setAuthLoading(false);
      fetchAllData();
    };
    
    checkAuth();
  }, [navigate, toast]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchLogs(),
      fetchMetrics(),
      fetchStatistics()
    ]);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('elsi_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setLogs(data);
    }
  };

  const fetchMetrics = async () => {
    const { data, error } = await supabase
      .from('sync_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setMetrics(data);
    }
  };

  const fetchStatistics = async () => {
    const { data, error } = await supabase
      .from('sync_statistics')
      .select('*');

    if (!error && data) {
      setStatistics(data);
    }
  };

  const runElsiSync = async () => {
    setIsLoading(true);
    
    try {
      toast({
        title: "Starting ELSI Sync",
        description: "Fetching catalog from FTP...",
      });

      // Step 1: Fetch catalog from FTP
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
        'fetchElsiCatalog',
        {
          body: { manual: true }
        }
      );

      if (fetchError) throw fetchError;

      toast({
        title: "Catalog Fetched",
        description: `${fetchData?.records_processed || 0} products downloaded. Syncing to products table...`,
      });

      // Wait a moment before syncing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Update products from catalog
      const { data: updateData, error: updateError } = await supabase.functions.invoke(
        'updateProductsFromElsi',
        {
          body: { manual: true }
        }
      );

      if (updateError) throw updateError;

      const stats = updateData?.stats || {};
      
      toast({
        title: "Sync Complete ✅",
        description: `Created/Updated: ${stats.created || 0} | Errors: ${stats.errors || 0}`,
      });

      // Refresh all data
      await fetchAllData();

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "An error occurred during sync",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'in_progress') return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    if (status === 'partial_success') return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      success: "default",
      error: "destructive",
      in_progress: "secondary",
      partial_success: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Enterprise secure ELSI catalog management</p>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {statistics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {statistics.map((stat) => (
                <Card key={stat.operation}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      {stat.operation === 'fetch_catalog' ? 'Catalog Fetch Stats' : 'Product Sync Stats'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Runs</span>
                        <span className="font-semibold">{stat.total_runs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Success Rate</span>
                        <span className="font-semibold text-green-600">
                          {stat.total_runs > 0 ? Math.round((stat.successful_runs / stat.total_runs) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stat.total_runs > 0 ? (stat.successful_runs / stat.total_runs) * 100 : 0} 
                        className="h-2"
                      />
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Duration</span>
                        <span className="font-semibold">{Math.round(stat.avg_duration_seconds || 0)}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Records</span>
                        <span className="font-semibold">{stat.total_records_processed?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Run</span>
                        <span className="text-xs">{stat.last_run ? new Date(stat.last_run).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Sync Control Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                ELSI Catalog Sync
              </CardTitle>
              <CardDescription>
                Manually trigger the catalog fetch and product sync process with 5-minute rate limiting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Automatic Schedule</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Catalog fetch: Daily at 2:00 AM (Madrid time)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Product sync: Daily at 3:00 AM (Madrid time)</span>
                </div>
              </div>

              <Button
                onClick={runElsiSync}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Run ELSI Sync Now 🔄
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Metrics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Sync Metrics
              </CardTitle>
              <CardDescription>
                Detailed performance metrics for the last 10 sync operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No metrics available yet. Run a sync to see detailed performance data.
                </p>
              ) : (
                <div className="space-y-3">
                  {metrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-start gap-3 p-4 rounded-lg border"
                    >
                      {getStatusIcon(metric.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-medium">
                            {metric.operation === 'fetch_catalog' ? 'Catalog Fetch' : 'Product Sync'}
                          </p>
                          {getStatusBadge(metric.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Processed:</span> {metric.records_processed}
                          </div>
                          {metric.records_created > 0 && (
                            <div>
                              <span className="font-medium">Created:</span> {metric.records_created}
                            </div>
                          )}
                          {metric.records_updated > 0 && (
                            <div>
                              <span className="font-medium">Updated:</span> {metric.records_updated}
                            </div>
                          )}
                          {metric.duration_seconds !== null && (
                            <div>
                              <span className="font-medium">Duration:</span> {metric.duration_seconds}s
                            </div>
                          )}
                        </div>
                        {metric.error_message && (
                          <p className="text-xs text-red-500 mt-2">{metric.error_message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(metric.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Logs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Sync Logs
              </CardTitle>
              <CardDescription>
                Last 10 sync operations (automatically deleted after 90 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No logs available yet. Run a sync to see results.
                </p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.created_at}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {log.operation === 'fetch_catalog' ? 'Catalog Fetch' : 'Product Sync'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.message}
                        </p>
                        {log.records_processed > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Records: {log.records_processed}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
