import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { scansAPI } from '../lib/api';

interface ScanFormProps {
  onScanCreated: () => void;
}

const ScanForm: React.FC<ScanFormProps> = ({ onScanCreated }) => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError('');

    try {
      await scansAPI.create(domain.trim());
      setDomain('');
      onScanCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Search className="w-5 h-5 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Start New Investigation</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        Enter a domain name to scan for exposed secrets, credentials, and sensitive information.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
            Domain
          </label>
          <input
            id="domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter domain (e.g., example.com)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Investigating...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Start Investigation</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">What we scan for:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• API keys and access tokens</li>
          <li>• Database credentials and connection strings</li>
          <li>• Cloud service credentials (AWS, Azure, GCP)</li>
          <li>• Email addresses and user information</li>
          <li>• Configuration files with sensitive data</li>
        </ul>
      </div>
    </div>
  );
};

export default ScanForm;