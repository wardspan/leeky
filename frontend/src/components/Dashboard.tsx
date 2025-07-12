import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, Clock, TrendingUp, Building, X } from 'lucide-react';
import { type Scan, scansAPI } from '../lib/api';

interface DashboardProps {
  user: { username: string };
  scans: Scan[];
  onScanClick: (scanId: number) => void;
  onScanUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, scans, onScanClick, onScanUpdate }) => {
  const [loading] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'cancelled': return <X className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 9) return 'text-red-600 bg-red-100';
    if (score >= 7) return 'text-orange-600 bg-orange-100';
    if (score >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const cancelScan = async (scanId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering onScanClick
    try {
      await scansAPI.cancel(scanId);
      onScanUpdate(); // Refresh scans
    } catch (error) {
      console.error('Failed to cancel scan:', error);
    }
  };

  const stats = {
    totalScans: scans.length,
    completedScans: scans.filter(s => s.status === 'completed').length,
    highRiskFindings: scans.filter(s => s.risk_score >= 7).length,
    totalFindings: scans.reduce((sum, scan) => sum + scan.findings_count, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {user.username}!</h2>
        <p className="text-primary-100">Ready to investigate? Start a new domain scan below.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.totalScans}</p>
              <p className="text-gray-600">Total Scans</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.completedScans}</p>
              <p className="text-gray-600">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.highRiskFindings}</p>
              <p className="text-gray-600">High Risk</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Building className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">{stats.totalFindings}</p>
              <p className="text-gray-600">Total Findings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Investigations</h3>
        </div>
        <div className="divide-y">
          {scans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No investigations yet. Start your first scan above.</p>
            </div>
          ) : (
            scans.slice(0, 5).map((scan) => (
              <div 
                key={scan.id} 
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onScanClick(scan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(scan.status)}
                    <div>
                      <h4 className="font-medium text-gray-900 hover:text-primary-600">{scan.domain}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(scan.created_at).toLocaleDateString()} at{' '}
                        {new Date(scan.created_at).toLocaleTimeString()}
                        {scan.status === 'completed' && scan.completed_at && (
                          <span className="ml-2 text-gray-400">
                            • {formatDuration(scan.created_at, scan.completed_at)}
                          </span>
                        )}
                        {scan.status === 'running' && (
                          <span className="ml-2 text-blue-600">
                            • Running for {formatDuration(scan.created_at)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {scan.status === 'completed' && (
                      <>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(scan.risk_score)}`}>
                          Risk: {scan.risk_score.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-600">
                          {scan.findings_count} findings
                        </span>
                      </>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="capitalize text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {scan.status}
                      </span>
                      {(scan.status === 'running' || scan.status === 'pending') && (
                        <button
                          onClick={(e) => cancelScan(scan.id, e)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Cancel scan"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;