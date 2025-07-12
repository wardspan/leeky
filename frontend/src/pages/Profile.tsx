import React, { useState, useEffect } from 'react'
import { User, Settings, Bell, Github, Trash2, Save, Key, AlertCircle } from 'lucide-react'
import { credentialsAPI } from '../lib/api'

interface ProfileProps {
  user: { username: string; email: string }
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [githubToken, setGithubToken] = useState('')
  const [credentials, setCredentials] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const response = await credentialsAPI.list()
      setCredentials(response.data)
    } catch (error) {
      console.error('Failed to load credentials:', error)
    }
  }

  const saveGithubToken = async () => {
    if (!githubToken.trim()) return

    setLoading(true)
    setMessage('')

    try {
      await credentialsAPI.save('github', githubToken)
      setMessage('GitHub token saved successfully!')
      setGithubToken('')
      loadCredentials()
    } catch (error: any) {
      setMessage('Failed to save GitHub token: ' + (error.response?.data?.detail || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const deleteCredentials = async (service: string) => {
    try {
      await credentialsAPI.delete(service)
      setMessage(`${service} credentials removed`)
      loadCredentials()
    } catch (error) {
      setMessage('Failed to remove credentials')
    }
  }

  const hasGithubToken = credentials.some(cred => cred.service === 'github')

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account and investigation preferences</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* GitHub Integration */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Github className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">GitHub Integration</h2>
            {hasGithubToken && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Configured
              </span>
            )}
          </div>
          
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Why add a GitHub token?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Perform <strong>real GitHub code searches</strong> instead of simulated results</li>
                  <li>Find actual leaked secrets and credentials in public repositories</li>
                  <li>Get direct links to vulnerable files on GitHub</li>
                  <li>Access the full power of GitHub's search API</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Personal Access Token
              </label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={saveGithubToken}
                  disabled={loading || !githubToken.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-2"><strong>How to get a GitHub token:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Settings → Developer settings → Personal access tokens</a></li>
                <li>Click "Generate new token (classic)"</li>
                <li>Select scope: <code className="bg-gray-100 px-1 rounded">public_repo</code></li>
                <li>Copy the token and paste it above</li>
              </ol>
            </div>

            {hasGithubToken && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">GitHub token configured</span>
                </div>
                <button
                  onClick={() => deleteCredentials('github')}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* API Configuration */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Other API Keys</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Future Integrations</h3>
              <p className="text-sm text-gray-600">Additional OSINT tools and APIs will be configurable here:</p>
              <ul className="text-sm text-gray-500 mt-2 list-disc list-inside">
                <li>Shodan API for infrastructure scanning</li>
                <li>SecurityTrails for DNS intelligence</li>
                <li>VirusTotal for malware analysis</li>
                <li>Have I Been Pwned for breach data</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Scan Completion</h3>
                <p className="text-sm text-gray-600">Get notified when scans finish</p>
              </div>
              <input type="checkbox" className="rounded text-green-600" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">High Risk Findings</h3>
                <p className="text-sm text-gray-600">Immediate alerts for critical findings</p>
              </div>
              <input type="checkbox" className="rounded text-green-600" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Weekly Reports</h3>
                <p className="text-sm text-gray-600">Summary of investigation activity</p>
              </div>
              <input type="checkbox" className="rounded text-green-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile