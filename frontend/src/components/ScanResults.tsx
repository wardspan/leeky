import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Eye, Copy, ExternalLink, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { scansAPI, type Scan, type ScanResult } from '../lib/api';

interface ScanResultsProps {
  scans: Scan[];
}

const ScanResults: React.FC<ScanResultsProps> = ({ scans }) => {
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsModal, setDetailsModal] = useState<ScanResult | null>(null);
  const { scanId } = useParams();

  const completedScans = scans.filter(scan => scan.status === 'completed');

  useEffect(() => {
    if (scanId) {
      const targetScan = scans.find(scan => scan.id === parseInt(scanId));
      if (targetScan) {
        setSelectedScan(targetScan);
        return;
      }
    }
    
    // If there's a new completed scan, switch to it
    if (completedScans.length > 0) {
      const latestCompleted = completedScans[0]; // Already sorted by created_at desc
      if (!selectedScan || latestCompleted.id !== selectedScan.id) {
        setSelectedScan(latestCompleted);
      }
    }
  }, [scans, scanId]);

  useEffect(() => {
    if (selectedScan) {
      loadResults(selectedScan.id);
    }
  }, [selectedScan]);

  const loadResults = async (scanId: number) => {
    setLoading(true);
    try {
      const response = await scansAPI.getResults(scanId);
      setResults(response.data);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (score: number) => {
    if (score >= 8) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    if (score >= 6) return <AlertTriangle className="w-5 h-5 text-orange-600" />;
    return <Shield className="w-5 h-5 text-yellow-600" />;
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return 'border-red-200 bg-red-50';
    if (score >= 6) return 'border-orange-200 bg-orange-50';
    return 'border-yellow-200 bg-yellow-50';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-800';
    if (score >= 6) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatLocalTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'));
      if (isNaN(date.getTime())) {
        return timestamp;
      }
      return date.toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    try {
      // Parse the ISO string properly, treating server time as UTC
      const start = new Date(startTime + (startTime.endsWith('Z') ? '' : 'Z'));
      const end = endTime ? new Date(endTime + (endTime.endsWith('Z') ? '' : 'Z')) : new Date();
      
      // Validate that dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return '0s';
      }
      
      const durationMs = end.getTime() - start.getTime();
      
      // Handle negative durations (shouldn't happen, but just in case)
      if (durationMs < 0) {
        return '0s';
      }
      
      const totalSeconds = Math.floor(durationMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      // For completed scans, use shorter format
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      console.error('Error formatting duration:', error);
      return '0s';
    }
  };

  if (completedScans.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-gray-600">Complete a scan to see detailed findings and risk analysis.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Investigation Results</h2>
        
        {/* Scan Selector */}
        <div className="flex flex-wrap gap-2">
          {completedScans.map((scan) => (
            <button
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedScan?.id === scan.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {scan.domain}
              <span className="ml-2 text-xs opacity-75">
                ({scan.findings_count} findings)
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedScan && (
        <div className="p-6">
          {/* Scan Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{selectedScan.domain}</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBadge(selectedScan.risk_score)}`}>
                  Risk Score: {selectedScan.risk_score.toFixed(1)}
                </span>
                {results.length > 0 && results[0].github_url && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Real GitHub Data
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Completed: {formatLocalTime(selectedScan.completed_at!)}</p>
              <p>Duration: {formatDuration(selectedScan.created_at, selectedScan.completed_at)}</p>
              <p>Total Findings: {results.length} (Database count: {selectedScan.findings_count})</p>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group findings by classification */}
              {Object.entries(
                results.reduce((groups: Record<string, ScanResult[]>, result) => {
                  const category = result.classification;
                  if (!groups[category]) {
                    groups[category] = [];
                  }
                  groups[category].push(result);
                  return groups;
                }, {})
              ).map(([category, categoryResults]) => (
                <div key={category}>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    {getRiskIcon(Math.max(...categoryResults.map(r => r.risk_score)))}
                    <span className="ml-2">{category}</span>
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({categoryResults.length} finding{categoryResults.length !== 1 ? 's' : ''})
                    </span>
                  </h4>
                  <div className="space-y-3 ml-7">
                    {categoryResults.map((result) => (
                      <div
                        key={result.id}
                        className={`border rounded-lg p-4 ${getRiskColor(result.risk_score)}`}
                      >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      {getRiskIcon(result.risk_score)}
                      <div>
                        <h4 className="font-medium text-gray-900">{result.classification}</h4>
                        <p className="text-sm text-gray-600">
                          {result.repository} • {result.file_path}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadge(result.risk_score)}`}>
                      {result.risk_score.toFixed(1)}
                    </span>
                  </div>

                  <div className="bg-gray-900 rounded-md p-3 mb-3">
                    <code className="text-green-400 text-sm break-all">
                      {result.finding}
                    </code>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(result.finding)}
                      className="flex items-center space-x-1 px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    {result.github_url && (
                      <a
                        href={result.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm hover:bg-blue-100 transition-colors text-blue-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View on GitHub</span>
                      </a>
                    )}
                    <button 
                      onClick={() => setDetailsModal(result)}
                      className="flex items-center space-x-1 px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Details</span>
                    </button>
                      </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Finding Details</h3>
              <button
                onClick={() => setDetailsModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Classification</h4>
                  <div className="flex items-center space-x-2">
                    {getRiskIcon(detailsModal.risk_score)}
                    <span className="font-medium">{detailsModal.classification}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskBadge(detailsModal.risk_score)}`}>
                      Risk: {detailsModal.risk_score.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                  <p className="text-gray-700">
                    <span className="font-medium">Repository:</span> {detailsModal.repository}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">File:</span> {detailsModal.file_path}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Finding</h4>
                  <div className="bg-gray-900 rounded-md p-4">
                    <code className="text-green-400 text-sm whitespace-pre-wrap break-all">
                      {detailsModal.finding}
                    </code>
                  </div>
                </div>

                {detailsModal.raw_content && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Raw Content</h4>
                    <div className="bg-gray-100 rounded-md p-4 max-h-60 overflow-y-auto">
                      <code className="text-sm text-gray-800 whitespace-pre-wrap break-all">
                        {detailsModal.raw_content}
                      </code>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-4 border-t">
                  <button
                    onClick={() => copyToClipboard(detailsModal.finding)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Finding</span>
                  </button>
                  
                  {detailsModal.github_url && (
                    <a
                      href={detailsModal.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View on GitHub</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanResults;