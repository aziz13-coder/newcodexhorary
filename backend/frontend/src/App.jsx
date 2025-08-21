import React, { useState, useEffect, useMemo } from 'react';
import { buildChartPayload } from './utils/buildChartPayload';
import { parseReasoningEntry } from './utils/parseReasoning.mjs';
import { cleanMoonText } from './utils/cleanMoonText';

import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sun, 
  Moon, 
  Star, 
  Settings as SettingsIcon, 
  Search, 
  FileText, 
  Share2, 
  Download, 
  Palette,
  Brain,
  Copy,
  ExternalLink,
  ChevronRight,
  Plus,
  Eye,
  Zap,
  Target,
  BarChart3,
  Book,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Filter,
  SortDesc,
  MessageSquare,
  Edit3,
  Save,
  Play,
  Pause,
  Mic,
  Video,
  Link,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Lightbulb,
  List,
  History,
  BookOpen,
  Globe,
  Loader,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  Shield,
  Sparkles,
  Flame,
  Eye as EyeIcon
} from 'lucide-react';

// API Configuration
function getApiBaseUrl() {
  // Check for Vite environment variable first, then window global, then localhost
  return import.meta.env.VITE_API_BASE_URL || window.API_BASE_URL || 'http://localhost:5000';
}

// API Service Layer
class VoxStellaAPI {
  static async request(endpoint, options = {}) {
    // Use HTTP requests
    const url = `${getApiBaseUrl()}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  static async calculateChart(chartData) {
    return this.request('/api/calculate-chart', {
      method: 'POST',
      body: JSON.stringify(chartData),
    });
  }

  static async getTimezone(location) {
    return this.request('/api/get-timezone', {
      method: 'POST',
      body: JSON.stringify({ location }),
    });
  }

  static async getCurrentTime(location) {
    return this.request('/api/current-time', {
      method: 'POST',
      body: JSON.stringify({ location }),
    });
  }

  static async getHealth() {
    return this.request('/api/health');
  }

  static async getVersion() {
    return this.request('/api/version');
  }
}

// Local Storage Service (Enhanced)
class StorageService {
  static migrateOldData() {
    // Migrate charts from old key
    const oldCharts = localStorage.getItem('horary_charts');
    const newCharts = localStorage.getItem('voxstella_charts');
    if (oldCharts && !newCharts) {
      localStorage.setItem('voxstella_charts', oldCharts);
      console.log('Migrated charts from horary_charts to voxstella_charts');
    }
    
    // Migrate notes from old key
    const oldNotes = localStorage.getItem('horary_notes');
    const newNotes = localStorage.getItem('vox_stella_notes');
    if (oldNotes && !newNotes) {
      localStorage.setItem('vox_stella_notes', oldNotes);
      console.log('Migrated notes from horary_notes to vox_stella_notes');
    }
    
    // Migrate settings from old key
    const oldSettings = localStorage.getItem('horary_settings');
    const newSettings = localStorage.getItem('vox_stella_settings');
    if (oldSettings && !newSettings) {
      localStorage.setItem('vox_stella_settings', oldSettings);
      console.log('Migrated settings from horary_settings to vox_stella_settings');
    }
  }

  static getCharts() {
    // Run migration on first access
    this.migrateOldData();
    
    try {
      const charts = JSON.parse(localStorage.getItem('voxstella_charts') || '[]');
      return charts.map(chart => ({
        ...chart,
        timestamp: new Date(chart.timestamp),
        date: new Date(chart.timestamp).toISOString().split('T')[0]
      }));
    } catch {
      return [];
    }
  }

  static saveChart(chart) {
    const charts = this.getCharts();
    const newChart = {
      ...chart,
      id: Date.now(),
      timestamp: new Date(),
      date: new Date().toISOString().split('T')[0],
      tags: chart.tags && chart.tags.length ? chart.tags : ['general']
    };
    charts.unshift(newChart);
    localStorage.setItem('voxstella_charts', JSON.stringify(charts.slice(0, 100))); // Keep last 100
    return newChart;
  }

  static getNotes() {
    // Run migration on first access
    this.migrateOldData();
    
    try {
      return JSON.parse(localStorage.getItem('vox_stella_notes') || '{}');
    } catch {
      return {};
    }
  }

  static saveNote(chartId, note) {
    const notes = this.getNotes();
    notes[chartId] = note;
    localStorage.setItem('vox_stella_notes', JSON.stringify(notes));
  }

  static getSettings() {
    // Run migration on first access
    this.migrateOldData();
    
    try {
      return JSON.parse(localStorage.getItem('vox_stella_settings') || '{}');
    } catch {
      return {};
    }
  }

  static saveSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    localStorage.setItem('vox_stella_settings', JSON.stringify(settings));
  }
}

// Helper function for sign from degree
const getSignFromDegree = (longitude) => {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  return signs[Math.floor((longitude % 360) / 30)];
};

// NEW: JudgmentBreakdown Component
const JudgmentBreakdown = ({ reasoning, darkMode }) => {
  // Planet symbols and colors for enhanced display
  const planetSymbols = {
    'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 
    'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄',
    // Add traditional colors for planets
  };

  const getPlanetColor = (planet) => {
    const colors = {
      'Sun': 'text-yellow-500 dark:text-yellow-400',
      'Moon': 'text-gray-400 dark:text-gray-300', 
      'Mercury': 'text-orange-500 dark:text-orange-400',
      'Venus': 'text-green-500 dark:text-green-400',
      'Mars': 'text-red-500 dark:text-red-400',
      'Jupiter': 'text-blue-500 dark:text-blue-400',
      'Saturn': 'text-indigo-600 dark:text-indigo-400'
    };
    return colors[planet] || 'text-gray-600 dark:text-gray-400';
  };

  // Simple function to enhance text with planet symbols
  const renderTextWithPlanetSymbols = (text) => {
    // Split text by words and process each one
    const words = text.split(/(\s+)/); // Keep whitespace
    return words.map((word, index) => {
      // Check if this word matches a planet name
      const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation for matching
      if (planetSymbols[cleanWord]) {
        const symbol = planetSymbols[cleanWord];
        const color = getPlanetColor(cleanWord);
        // Keep original punctuation by replacing only the planet name part
        const enhancedWord = word.replace(cleanWord, `${symbol} ${cleanWord}`);
        return (
          <span key={index} className={color}>
            {enhancedWord}
          </span>
        );
      }
      return word;
    });
  };
  const renderReasoningText = (text) => {
    if (typeof text === 'string' && text.startsWith('FLAG: MOON_NEXT_DECISIVE')) {
      return (
        <a
          href="https://example.com/help/moon-next-aspect"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 underline"
        >
          Moon’s next aspect is decisive for the outcome
        </a>
      );
    }
    const content = renderTextWithPlanetSymbols(cleanMoonText(text));
    if (typeof text === 'string') {
      const lower = text.toLowerCase();
      let label = null;
      let color = '';
      if (lower.includes('translates light')) {
        label = 'Translation of Light';
        color = 'text-blue-600 dark:text-blue-400';
      } else if (lower.includes('collects light')) {
        label = 'Collection of Light';
        color = 'text-green-600 dark:text-green-400';
      } else if (lower.includes('before perfection')) {
        label = 'Prohibition';
        color = 'text-red-600 dark:text-red-400';
      }
      if (label) {
        return (
          <span>
            {content}{' '}
            <span className={`ml-1 text-xs ${color}`}>({label})</span>
          </span>
        );
      }
    }
    return content;
  };
  // Transform reasoning if it's still in string format
  const structuredReasoning = useMemo(() => {
    if (!reasoning || reasoning.length === 0) return [];

    const first = reasoning[0];

    // Ledger entries from evaluate_chart
    if (first && typeof first === 'object' && 'key' in first) {
      return reasoning.map(item => {
        const signedWeight = item.polarity === 'NEGATIVE'
          ? -(item.weight || item.delta_no || 0)
          : (item.weight || item.delta_yes || 0);
        return {
          stage: item.stage || item.kind || 'General',
          rule: item.rule || item.key,
          weight: typeof signedWeight === 'number' ? signedWeight : Number(signedWeight) || 0,
        };
      });
    }

    // Already structured: ensure numeric weights
    if (first && typeof first === 'object' && 'stage' in first) {
      return reasoning.map(item => ({
        ...item,
        weight: typeof item.weight === 'number' ? item.weight : Number(item.weight) || 0,
      }));
    }

    // Parse plain text reasoning entries
    return reasoning.map(text => {
      const { rule, weight } = parseReasoningEntry(text);
      return { stage: 'General', rule, weight };
    });
  }, [reasoning]);

  // Determine the maximum absolute weight across all testimonies
  const maxWeight = useMemo(() => {
    return structuredReasoning.reduce((max, item) => {
      const absWeight = Math.abs(item.weight || 0);
      return absWeight > max ? absWeight : max;
      // This ensures bars are scaled relative to the strongest testimony
    }, 0);
  }, [structuredReasoning]);

  // Group by stage
  const groupedByStage = useMemo(() => {
    const groups = {};
    structuredReasoning.forEach(item => {
      if (!groups[item.stage]) {
        groups[item.stage] = [];
      }
      groups[item.stage].push(item);
    });
    return groups;
  }, [structuredReasoning]);

  const getWeightColor = (weight) => {
    if (weight > 0) return 'bg-emerald-500';
    if (weight < 0) return 'bg-red-500';
    return 'bg-amber-500';
  };

  const getStageWeight = (items) => {
    return items.reduce((sum, item) => sum + (item.weight || 0), 0);
  };

  const getStageWeightColor = (items) => {
    const stageWeight = getStageWeight(items);
    if (stageWeight > 0) return 'bg-emerald-500';
    if (stageWeight < 0) return 'bg-red-500';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedByStage).map(([stage, items]) => {
        const stageWeight = getStageWeight(items);
        
        return (
          <details key={stage} open className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 hover:shadow-sm">
                <div className="flex items-center space-x-3">
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-90" />
                  <h5 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{stage}</h5>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStageWeightColor(items)}`}></div>
                  <span className={`text-xs font-medium ${
                    stageWeight > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    stageWeight < 0 ? 'text-red-600 dark:text-red-400' :
                    'text-amber-600 dark:text-amber-400'
                  }`}>
                    {stageWeight > 0 ? '+' : ''}{stageWeight}
                  </span>
                </div>
              </div>
            </summary>
            
            <div className="mt-3 ml-8 space-y-3">
              {items.map((item, index) => {
                // Helper function to get effective weight for display
                const getEffectiveWeight = (item) => {
                  // If weight is 0 and this is a "no perfection" case, treat as negative weight
                  if (item.weight === 0 && (
                    item.rule.toLowerCase().includes('no perfection') || 
                    item.rule.toLowerCase().includes('supportive signals noted') ||
                    (item.rule.toLowerCase().includes('none') && item.rule.toLowerCase().includes('perfection'))
                  )) {
                    return -3; // Assign a meaningful negative weight like other negative testimonies
                  }
                  return item.weight;
                };
                
                const effectiveWeight = getEffectiveWeight(item);
                
                return (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-25 dark:hover:bg-gray-800/30 transition-colors duration-150">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${getWeightColor(effectiveWeight)}`}></div>
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Score bar */}
                    <div className="flex items-center mt-1.5">
                      <div className="w-14 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-500 ease-out shadow-sm ${
                            effectiveWeight > 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 
                            effectiveWeight < 0 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                            'bg-gradient-to-r from-amber-400 to-amber-500'
                          }`}
                          style={{
                            width: maxWeight ? `${(Math.abs(effectiveWeight) / maxWeight) * 100}%` : '0%',
                            marginLeft: effectiveWeight >= 0 ? '0' : 'auto'
                          }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ml-2 min-w-[22px] text-center ${
                        effectiveWeight > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                        effectiveWeight < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-amber-600 dark:text-amber-400'
                      }`}>
                        {effectiveWeight > 0 ? '+' : ''}{effectiveWeight !== 0 ? effectiveWeight : '⚠'}
                      </span>
                    </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1">
                        {renderReasoningText(item.rule)}
                      </span>
                      {item.tooltip && (
                        <div className="relative group">
                          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help flex-shrink-0 mt-0.5" />
                          <div className="absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            {item.tooltip}
                          </div>
                        </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
};

// Main App Component
const VoxStellaApp = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => 
    StorageService.getSettings().darkMode ?? false
  );
  const [charts, setCharts] = useState([]);
  const [currentChart, setCurrentChart] = useState(null);
  const [notes, setNotes] = useState({});
  const [apiStatus, setApiStatus] = useState('checking');

  // Initialize data
  useEffect(() => {
    const savedCharts = StorageService.getCharts();
    const savedNotes = StorageService.getNotes();
    
    setCharts(savedCharts);
    setNotes(savedNotes);

    // Check API health
    checkApiHealth();
  }, []);


  const checkApiHealth = async () => {
    try {
      await VoxStellaAPI.getHealth();
      setApiStatus('connected');
    } catch (error) {
      console.warn('API not available:', error);
      setApiStatus('offline');
    }
  };


  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    StorageService.saveSetting('darkMode', newMode);
  };

  const addNewChart = (chart) => {
    const savedChart = StorageService.saveChart(chart);
    setCharts(prev => [savedChart, ...prev]);
    return savedChart;
  };

  const updateNote = (chartId, note) => {
    StorageService.saveNote(chartId, note);
    setNotes(prev => ({ ...prev, [chartId]: note }));
  };

  const themeClasses = darkMode 
    ? 'bg-gray-900 text-white' 
    : 'bg-gradient-to-br from-slate-50 to-blue-50 text-gray-900';

  return (
    <div className={`min-h-screen transition-all duration-500 ${themeClasses}`}>
      {/* Header */}
      <Header 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode}
        currentView={currentView}
        setCurrentView={setCurrentView}
        apiStatus={apiStatus}
        onRefreshApi={checkApiHealth}
      />

      {/* Main Content */}
      <main className="pt-16 pb-20">
        {currentView === 'dashboard' && (
          <Dashboard 
            charts={charts} 
            setCurrentView={setCurrentView}
            setCurrentChart={setCurrentChart}
            darkMode={darkMode}
            apiStatus={apiStatus}
          />
        )}
        {currentView === 'cast-chart' && (
          <EnhancedChartCasting 
            setCurrentChart={setCurrentChart}
            setCurrentView={setCurrentView}
            darkMode={darkMode}
            apiStatus={apiStatus}
            onChartCreated={addNewChart}
          />
        )}
        {currentView === 'chart-view' && currentChart && (
          <EnhancedChartView
            chart={currentChart}
            darkMode={darkMode}
            notes={notes}
            setNotes={updateNote}
          />
        )}
        {currentView === 'timeline' && (
          <Timeline 
            charts={charts}
            setCurrentChart={setCurrentChart}
            setCurrentView={setCurrentView}
            darkMode={darkMode}
          />
        )}
        {currentView === 'notebook' && (
          <NotebookView 
            charts={charts}
            notes={notes}
            setNotes={updateNote}
            darkMode={darkMode}
            setCurrentChart={setCurrentChart}
            setCurrentView={setCurrentView}
          />
        )}
        {currentView === 'settings' && (
          <Settings
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            setCurrentView={setCurrentView}
            apiStatus={apiStatus}
            onRefreshApi={checkApiHealth}
          />
        )}
      </main>

      {/* Footer */}
      <Footer 
        darkMode={darkMode} 
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
    </div>
  );
};

// Header Component (Preserved)
const Header = ({ darkMode, toggleDarkMode, currentView, setCurrentView, apiStatus, onRefreshApi }) => {
  const headerBg = darkMode 
    ? 'bg-gray-800/90 backdrop-blur-xl border-gray-700' 
    : 'bg-white/90 backdrop-blur-xl border-white/20';

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return 'text-emerald-500';
      case 'offline': return 'text-red-500';
      default: return 'text-amber-500';
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${headerBg} border-b transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/assets/voxstella-logo.png" 
              alt="Vox Stella" 
              className="h-10 w-auto"
            />
            {/* API Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${apiStatus === 'connected' ? 'bg-emerald-500' : apiStatus === 'offline' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className={`text-xs ${getStatusColor()}`}>
                {apiStatus === 'connected' ? 'API Connected' : 
                 apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
              </span>
              {apiStatus === 'offline' && (
                <button onClick={onRefreshApi} className="text-xs text-blue-500 hover:text-blue-700">
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <NavButton 
              active={currentView === 'dashboard'} 
              onClick={() => setCurrentView('dashboard')}
              icon={BarChart3}
              text="Dashboard"
            />
            <NavButton 
              active={currentView === 'cast-chart'} 
              onClick={() => setCurrentView('cast-chart')}
              icon={Plus}
              text="Cast Chart"
            />
            <NavButton 
              active={currentView === 'timeline'} 
              onClick={() => setCurrentView('timeline')}
              icon={History}
              text="Timeline"
            />
            <NavButton 
              active={currentView === 'notebook'} 
              onClick={() => setCurrentView('notebook')}
              icon={BookOpen}
              text="Notebook"
            />
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setCurrentView('settings')}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

// Custom Charts Icon Component for Total Charts
const TotalChartsIcon = ({ className }) => (
  <div className="relative w-5 h-5 flex items-center justify-center">
    <img 
      src="/assets/voxstella-charts.png" 
      alt="Total Charts" 
      className="w-6 h-6 object-contain"
      style={{ 
        filter: 'brightness(0) invert(1)',
        mixBlendMode: 'screen'
      }}
    />
  </div>
);

// Navigation Button Component (Enhanced)
const NavButton = ({ active, onClick, icon: Icon, text, customIcon }) => {
  const activeClasses = active 
    ? 'text-indigo-600 dark:text-indigo-400' 
    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white';

  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-2 py-2 px-3 rounded-lg transition-all duration-200 ${activeClasses}`}
    >
      {customIcon ? customIcon : <Icon className="w-4 h-4" />}
      <span className="font-medium">{text}</span>
    </button>
  );
};

// Dashboard Component (Preserved with enhanced API status)
const Dashboard = ({ charts, setCurrentView, setCurrentChart, darkMode, apiStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');

  const cardBg = darkMode 
    ? 'bg-gray-800/40 backdrop-blur-xl border-gray-700' 
    : 'bg-white/40 backdrop-blur-xl border-white/60';

  const filteredCharts = useMemo(() => {
    return charts.filter(chart => {
      const matchesSearch = chart.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (chart.querent && chart.querent.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterOutcome === 'all' || chart.outcome === filterOutcome;
      return matchesSearch && matchesFilter;
    });
  }, [charts, searchTerm, filterOutcome]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = charts.length;
    const positive = charts.filter(c => c.judgment === 'YES').length;
    const thisMonth = charts.filter(c => {
      const chartDate = new Date(c.timestamp);
      const now = new Date();
      return chartDate.getMonth() === now.getMonth() && chartDate.getFullYear() === now.getFullYear();
    }).length;
    const avgConfidence = total > 0 ? Math.round(charts.reduce((sum, c) => sum + (c.confidence || 0), 0) / total) : 0;

    return { total, positive, thisMonth, avgConfidence };
  }, [charts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Continue your horary practice with enhanced traditional wisdom and modern features.
        </p>
        {apiStatus === 'offline' && (
          <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              API offline - Charts will be saved locally and can be uploaded when connection is restored.
            </p>
          </div>
        )}
        {apiStatus === 'connected' && (
          <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg">
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">
              <Sparkles className="w-4 h-4 inline mr-2" />
              Enhanced Horary Engine connected
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats - Enhanced with new features indicator */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={Target}
          label="Total Charts"
          value={stats.total.toString()}
          change={`+${stats.thisMonth}`}
          darkMode={darkMode}
        />
        <StatCard 
          icon={CheckCircle}
          label="Success Rate"
          value={`${stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%`}
          change="+3%"
          darkMode={darkMode}
        />
        <StatCard 
          icon={TrendingUp}
          label="This Month"
          value={stats.thisMonth.toString()}
          change="+7"
          darkMode={darkMode}
        />
        <StatCard 
          icon={Sparkles}
          label="Enhanced Features"
          value={apiStatus === 'connected' ? 'Active' : 'Demo'}
          change={apiStatus === 'connected' ? 'v2.0' : 'Local'}
          darkMode={darkMode}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <QuickActionCard
          icon={Plus}
          title="Cast New Chart"
          description="Ask a question with enhanced traditional analysis"
          gradient="from-emerald-400 to-teal-600"
          onClick={() => setCurrentView('cast-chart')}
          darkMode={darkMode}
        />
        <QuickActionCard
          icon={History}
          title="Timeline View"
          description="Track patterns and outcomes over time"
          gradient="from-orange-400 to-red-600"
          onClick={() => setCurrentView('timeline')}
          darkMode={darkMode}
        />
      </div>

      {/* Search and Filter */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h3 className="text-2xl font-bold">Recent Charts</h3>
          
          <div className="flex gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search charts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
            
            {/* Filter */}
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white' 
                  : 'bg-white/70 border-gray-200 text-gray-900'
              }`}
            >
              <option value="all">All Outcomes</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="uncertain">Uncertain</option>
            </select>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      {filteredCharts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharts.map((chart) => (
            <ChartCard 
              key={chart.id}
              chart={chart}
              onClick={() => {
                setCurrentChart(chart);
                setCurrentView('chart-view');
              }}
              darkMode={darkMode}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {charts.length === 0 ? 'No charts yet' : 'No charts found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {charts.length === 0 ? 
              'Cast your first horary chart to get started with enhanced traditional astrology.' :
              'Try adjusting your search terms or filters.'
            }
          </p>
          {charts.length === 0 && (
            <button
              onClick={() => setCurrentView('cast-chart')}
              className="bg-gradient-to-r from-teal-400 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-teal-500 hover:to-indigo-700 transition-all duration-300"
            >
              Cast Your First Chart
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Stat Card Component (Enhanced)
const StatCard = ({ icon: Icon, label, value, change, darkMode, customIcon }) => {
  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700' 
    : 'bg-white/60 backdrop-blur-xl border-white/80';

  const isPositive = change.startsWith('+');

  return (
    <div className={`${cardBg} border rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 bg-gradient-to-br from-teal-400 to-indigo-600 rounded-xl flex items-center justify-center overflow-hidden`}>
          {customIcon ? customIcon : <Icon className="w-5 h-5 text-white" />}
        </div>
        <span className={`text-sm font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {change}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
    </div>
  );
};

// Quick Action Card Component (Preserved)
const QuickActionCard = ({ icon: Icon, title, description, gradient, onClick, darkMode }) => {
  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700 hover:bg-gray-800/80' 
    : 'bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80';

  return (
    <button 
      onClick={onClick}
      className={`${cardBg} border rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
    </button>
  );
};

// Chart Card Component (Enhanced with solar conditions indicator)
const ChartCard = ({ chart, onClick, darkMode }) => {
  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700 hover:bg-gray-800/80' 
    : 'bg-white/60 backdrop-blur-xl border-white/80 hover:bg-white/80';

  const getOutcomeColor = (judgment) => {
    switch (judgment) {
      case 'YES': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'NO': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  const getOutcomeEmoji = (judgment) => {
    switch (judgment) {
      case 'YES': return '✅';
      case 'NO': return '❌';
      default: return '❓';
    }
  };

  const getTagColor = (tag) => {
    const colors = {
      'career': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'relationship': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      'finance': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'health': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'travel': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'family': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'property': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'education': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      'gambling': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      'default': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[tag] || colors.default;
  };

  // NEW: Check for enhanced features
  const hasEnhancedFeatures = chart.solar_factors || chart.calculation_metadata?.enhanced_features_used;
  const hasSolarConditions = chart.chart_data?.solar_conditions_summary?.significant_conditions > 0;

  return (
    <button 
      onClick={onClick}
      className={`${cardBg} border rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getOutcomeEmoji(chart.judgment)}</span>
          {/* NEW: Enhanced features indicators */}
          {hasEnhancedFeatures && (
            <div className="flex items-center space-x-1">
              <Sparkles className="w-4 h-4 text-indigo-500" title="Enhanced Analysis" />
            </div>
          )}
          {hasSolarConditions && (
            <div className="flex items-center space-x-1">
              <Sun className="w-4 h-4 text-yellow-500" title="Solar Conditions Present" />
            </div>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOutcomeColor(chart.judgment)}`}>
          {chart.judgment}
        </span>
      </div>
      
      <h4 className="font-semibold mb-2 line-clamp-2">{chart.question}</h4>
      
      <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-3">
        <span>{new Date(chart.timestamp).toLocaleDateString()}</span>
        <span>Confidence: {chart.confidence}%</span>
      </div>

      {/* Tags */}
      {chart.tags && chart.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {chart.tags.slice(0, 2).map(tag => (
            <span key={tag} className={`px-2 py-1 rounded text-xs ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
          {chart.tags.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{chart.tags.length - 2} more
            </span>
          )}
        </div>
      )}
      
      <div className="flex justify-end">
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  );
};

// Enhanced timezone detection using backend API
const getTimezoneFromLocation = async (location) => {
  if (!location) return 'America/New_York'; // Default
  
  try {
    // Use the backend API for accurate timezone detection
    const response = await VoxStellaAPI.getTimezone(location);
    
    if (response.success && response.timezone) {
      console.log(`Backend timezone detection: ${location} → ${response.timezone}`);
      return response.timezone;
    } else {
      console.warn('Backend timezone detection failed, using fallback');
    }
  } catch (error) {
    console.warn('Backend timezone detection error:', error);
  }
  
  // Fallback to simplified mapping for offline/error cases
  return getTimezoneFromLocationFallback(location);
};

// Simplified fallback function (reduced hardcoded list)
const getTimezoneFromLocationFallback = (location) => {
  const locationLower = location.toLowerCase().trim();
  
  // Simplified country-based fallbacks only
  if (locationLower.includes('usa') || locationLower.includes('united states')) {
    return 'America/New_York'; // Default to Eastern (backend will provide accurate detection)
  }
  if (locationLower.includes('uk') || locationLower.includes('united kingdom') || locationLower.includes('england')) {
    return 'Europe/London';
  }
  if (locationLower.includes('israel') || locationLower.includes('ישראל')) {
    return 'Asia/Jerusalem';
  }
  if (locationLower.includes('france')) {
    return 'Europe/Paris';
  }
  if (locationLower.includes('germany')) {
    return 'Europe/Berlin';
  }
  if (locationLower.includes('australia')) {
    return 'Australia/Sydney';
  }
  if (locationLower.includes('canada')) {
    return 'America/Toronto';
  }
  if (locationLower.includes('japan')) {
    return 'Asia/Tokyo';
  }
  if (locationLower.includes('china')) {
    return 'Asia/Shanghai';
  }
  if (locationLower.includes('india')) {
    return 'Asia/Kolkata';
  }
  
  // Default fallback
  return 'America/New_York';
};

// Enhanced Chart Casting Component
const EnhancedChartCasting = ({ setCurrentChart, setCurrentView, darkMode, apiStatus, onChartCreated }) => {
  const [question, setQuestion] = useState('');
  const [location, setLocation] = useState('');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [useManualTimezone, setUseManualTimezone] = useState(false);
  const [useManualHouses, setUseManualHouses] = useState(false);
  const [manualHouses, setManualHouses] = useState('1,7');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // NEW: Enhanced options state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    ignoreRadicality: false,
    ignoreVoidMoon: false,
    ignoreCombustion: false,
    ignoreSaturn7th: false,
    exaltationConfidenceBoost: 15.0
  });

  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700' 
    : 'bg-white/60 backdrop-blur-xl border-white/80';

  // Location suggestions (preserved)
  const commonLocations = [
    'London, UK', 'New York, NY, USA', 'Los Angeles, CA, USA', 'Paris, France',
    'Berlin, Germany', 'Tokyo, Japan', 'Sydney, Australia', 'Toronto, Canada'
  ];

  // Auto-update timezone when location changes (only if not using manual timezone)
  useEffect(() => {
    let timeoutId;
    if (location.trim() && !useManualTimezone) {
      timeoutId = setTimeout(() => {
        getTimezoneFromLocation(location).then(detectedTimezone => {
          if (detectedTimezone !== timezone) {
            setTimezone(detectedTimezone);
          }
        }).catch(error => {
          console.warn('Timezone detection failed:', error);
          // Keep current timezone on error
        });
      }, 300);
    }
    return () => clearTimeout(timeoutId);
  }, [location, useManualTimezone]);

  const handleLocationChange = (value) => {
    setLocation(value);
    if (value.length > 2) {
      const filtered = commonLocations.filter(loc => 
        loc.toLowerCase().includes(value.toLowerCase())
      );
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(filtered.length > 0);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const handleSubmit = async () => {
    if (!question.trim() || !location.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!useCurrentTime && (!date || !time)) {
      setError('Please specify date and time or use current time');
      return;
    }

    if (useManualHouses && !manualHouses.trim()) {
      setError('Please specify manual houses or disable manual house selection');
      return;
    }

    // Validate date/time when not using current time
    if (!useCurrentTime) {
      if (!date) {
        setError('Please enter a date or use current time');
        return;
      }
      if (!time) {
        setError('Please enter a time or use current time');
        return;
      }
    }

    // Convert HTML date input (YYYY-MM-DD) to DD/MM/YYYY format for backend
    const convertDateFormat = (htmlDate) => {
      if (!htmlDate) return null;
      const [year, month, day] = htmlDate.split('-');
      return `${day}/${month}/${year}`;
    };

    setLoading(true);
    setError('');
    
    try {
      const requestBody = {
        question: question.trim(),
        location: location.trim(),
        useCurrentTime,
        ...(date && { date: convertDateFormat(date) }),
        ...(time && { time }),
        ...(timezone && { timezone }),
        ...(useManualHouses && manualHouses && { manualHouses: manualHouses.trim() }),
        // NEW: Include enhanced options if API is connected
        ...(apiStatus === 'connected' && {
          ignoreRadicality: advancedOptions.ignoreRadicality,
          ignoreVoidMoon: advancedOptions.ignoreVoidMoon,
          ignoreCombustion: advancedOptions.ignoreCombustion,
          ignoreSaturn7th: advancedOptions.ignoreSaturn7th,
          exaltationConfidenceBoost: advancedOptions.exaltationConfidenceBoost
        })
      };

      console.log('Sending enhanced request:', requestBody);

      let result;
      if (apiStatus === 'connected') {
        try {
          result = await VoxStellaAPI.calculateChart(requestBody);
          console.log('Enhanced API response:', result);
        } catch (apiError) {
          console.warn('Enhanced API failed, using offline mode:', apiError);
          throw apiError;
        }
      } else {
        throw new Error('API offline');
      }
      
      // Process successful API response
      const category = result?.question_analysis?.question_type
        ? result.question_analysis.question_type.toLowerCase().replace(/_/g, ' ')
        : 'general';

      const processedChart = {
        ...result,
        id: Date.now(),
        timestamp: new Date(),
        tags: [category],
        outcome: result.judgment === 'YES' ? 'positive' :
                result.judgment === 'NO' ? 'negative' : 'uncertain'
      };

      const savedChart = onChartCreated(processedChart);
      setCurrentChart(savedChart);
      setCurrentView('chart-view');

    } catch (error) {
      console.warn('Creating enhanced demo chart due to:', error.message);
      
      // Create enhanced demo chart
      const demoChart = createEnhancedDemoChart(requestBody);
      const savedChart = onChartCreated(demoChart);
      setCurrentChart(savedChart);
      setCurrentView('chart-view');
    } finally {
      setLoading(false);
    }
  };

  const createEnhancedDemoChart = (requestData) => {
    const judgments = ['YES', 'NO', 'UNCLEAR'];
    const randomJudgment = judgments[Math.floor(Math.random() * judgments.length)];
    
    const baseChart = {
      question: requestData.question,
      judgment: randomJudgment,
      confidence: Math.floor(Math.random() * 40) + 60,
      tags: ['general'],
      reasoning: [
        "Chart is radical - Ascendant at 15.3°",
        `Significators identified: ${requestData.manualHouses ? `Manual houses ${requestData.manualHouses}` : 'Traditional house rulers'}`,
        "Enhanced future retrograde protection applied",
        "Enhanced solar conditions analyzed",
        Math.random() > 0.5 ? "Mutual reception strengthens the matter" : "No major impediments found",
        "Enhanced reception weighting considered"
      ],
      chart_data: {
        planets: {
          Sun: { longitude: 67.5, sign: 'Gemini', house: 10, dignity_score: 1 },
          Moon: { longitude: 145.2, sign: 'Leo', house: 1, dignity_score: 3 },
          Mercury: { longitude: 69.1, sign: 'Gemini', house: 10, dignity_score: 4 },
          Venus: { longitude: 45.7, sign: 'Taurus', house: 9, dignity_score: 5 },
          Mars: { longitude: 123.4, sign: 'Leo', house: 1, dignity_score: 2 },
          Jupiter: { longitude: 234.6, sign: 'Scorpio', house: 4, dignity_score: -1 },
          Saturn: { longitude: 298.8, sign: 'Capricorn', house: 6, dignity_score: 4 }
        },
        aspects: [
          { planet1: 'Venus', planet2: 'Mars', aspect: 'Trine', orb: 3.2, applying: true },
          { planet1: 'Sun', planet2: 'Mercury', aspect: 'Conjunction', orb: 1.6, applying: false }
        ],
        ascendant: 67.5,
        houses: Array.from({length: 12}, (_, i) => i * 30),
        // NEW: Enhanced solar conditions
        solar_conditions_summary: {
          cazimi_planets: Math.random() > 0.7 ? [{ planet: 'Mercury', distance_from_sun: 0.2, exact_cazimi: true }] : [],
          combusted_planets: Math.random() > 0.8 ? [{ planet: 'Venus', traditional_exception: false }] : [],
          under_beams_planets: Math.random() > 0.6 ? [{ planet: 'Mars' }] : [],
          free_planets: [
            { planet: 'Sun' }, { planet: 'Moon' }, { planet: 'Jupiter' }, { planet: 'Saturn' }
          ],
          significant_conditions: Math.random() > 0.5 ? 1 : 0
        },
        timezone_info: {
          local_time: new Date().toISOString(),
          timezone: requestData.location || 'Unknown timezone',
          location_name: requestData.location || 'Unknown location',
          coordinates: {
            latitude: 40.7128,
            longitude: -74.0060
          }
        }
      },
      // NEW: Enhanced factors
      solar_factors: {
        significant: Math.random() > 0.5,
        summary: Math.random() > 0.7 ? "Cazimi: Mercury" : "No significant solar conditions",
        cazimi_count: Math.random() > 0.7 ? 1 : 0,
        combustion_count: Math.random() > 0.8 ? 1 : 0,
        under_beams_count: 0
      },
      traditional_factors: {
        perfection_type: Math.random() > 0.5 ? "direct" : "translation",
        reception: Math.random() > 0.6 ? "mutual_reception" : "none"
      },
      // NEW: Enhanced metadata
      calculation_metadata: {
        api_version: '2.0.0',
        enhanced_features_used: {
          future_retrograde_checks: true,
          directional_motion_awareness: true,
          enhanced_solar_conditions: true,
          reception_weighting_nuance: true
        },
        override_flags_applied: requestData.ignoreRadicality ? {
          ignore_radicality: requestData.ignoreRadicality,
          ignore_void_moon: requestData.ignoreVoidMoon,
          ignore_combustion: requestData.ignoreCombustion,
          ignore_saturn_7th: requestData.ignoreSaturn7th
        } : {}
      },
      timezone_info: {
        local_time: new Date().toISOString(),
        timezone: requestData.location || 'Unknown timezone',
        location_name: requestData.location || 'Unknown location'
      },
      location_name: requestData.location || 'Unknown location',
      outcome: randomJudgment === 'YES' ? 'positive' : 
               randomJudgment === 'NO' ? 'negative' : 'uncertain',
      enhanced: true,
      demo: true
    };

    return {
      ...baseChart,
      general_info: deriveGeneralInfo(baseChart),
      considerations: deriveConsiderations(baseChart, requestData)
    };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Cast an Enhanced Horary Chart</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Ask a clear, specific question and let the enhanced traditional wisdom guide your answer.
        </p>
        {apiStatus === 'offline' && (
          <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              API offline - Demo chart will be created with enhanced features. Chart will be saved locally.
            </p>
          </div>
        )}
        {apiStatus === 'connected' && (
          <div className="mt-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-lg">
            <p className="text-emerald-700 dark:text-emerald-300 text-sm">
              <Sparkles className="w-4 h-4 inline mr-2" />
              Enhanced Horary Engine Available
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <div className={`${cardBg} border rounded-2xl p-8`}>
        <div className="space-y-6">
          {/* Question Input (Preserved) */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Your Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will I get the job I interviewed for?"
              className={`w-full p-4 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
              }`}
              rows={3}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Ask a specific, answerable question that matters to you right now.
            </p>
          </div>

          {/* Location Input (Preserved) */}
          <div className="relative">
            <label className="block text-sm font-medium mb-3">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationChange(e.target.value)}
                onFocus={() => location.length > 2 && setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                placeholder="London, UK"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
              
              {/* Location Suggestions (Preserved) */}
              {showLocationSuggestions && (
                <div className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-lg z-10 ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setLocation(suggestion);
                        setShowLocationSuggestions(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      <Globe className="w-4 h-4 inline mr-2 text-gray-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Time Settings (Preserved) */}
          <div>
            <label className="block text-sm font-medium mb-3">Time</label>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={useCurrentTime}
                  onChange={() => setUseCurrentTime(true)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Use current time (recommended)</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!useCurrentTime}
                  onChange={() => setUseCurrentTime(false)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Specify custom time</span>
              </label>

              {!useCurrentTime && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`w-full p-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-white' 
                            : 'bg-white/70 border-gray-200 text-gray-900'
                        }`}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Use the date picker or DD/MM/YYYY format (e.g., 02/03/2004 for March 2, 2004)</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">Time</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={`w-full p-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-white' 
                            : 'bg-white/70 border-gray-200 text-gray-900'
                        }`}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-gray-600 dark:text-gray-300">
                        Timezone 
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          {useManualTimezone ? '(manual)' : '(auto-detected from location)'}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseManualTimezone(!useManualTimezone)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                      >
                        {useManualTimezone ? 'Use Auto-Detect' : 'Manual Override'}
                      </button>
                    </div>
                    
                    {useManualTimezone ? (
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className={`w-full p-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-white' 
                            : 'bg-white/70 border-gray-200 text-gray-900'
                        }`}
                      >
                        <optgroup label="North America">
                          <option value="America/New_York">Eastern Time (EST/EDT)</option>
                          <option value="America/Chicago">Central Time (CST/CDT)</option>
                          <option value="America/Denver">Mountain Time (MST/MDT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                          <option value="America/Phoenix">Arizona Time (MST)</option>
                          <option value="America/Anchorage">Alaska Time (AKST/AKDT)</option>
                          <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                          <option value="America/Toronto">Toronto (EST/EDT)</option>
                          <option value="America/Vancouver">Vancouver (PST/PDT)</option>
                          <option value="America/Edmonton">Edmonton (MST/MDT)</option>
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="Europe/London">London (GMT/BST)</option>
                          <option value="Europe/Paris">Paris (CET/CEST)</option>
                          <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                          <option value="Europe/Rome">Rome (CET/CEST)</option>
                          <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                          <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                          <option value="Europe/Vienna">Vienna (CET/CEST)</option>
                          <option value="Europe/Zurich">Zurich (CET/CEST)</option>
                          <option value="Europe/Stockholm">Stockholm (CET/CEST)</option>
                          <option value="Europe/Copenhagen">Copenhagen (CET/CEST)</option>
                          <option value="Europe/Oslo">Oslo (CET/CEST)</option>
                          <option value="Europe/Helsinki">Helsinki (EET/EEST)</option>
                          <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                          <option value="Europe/Brussels">Brussels (CET/CEST)</option>
                          <option value="Europe/Lisbon">Lisbon (WET/WEST)</option>
                          <option value="Europe/Athens">Athens (EET/EEST)</option>
                          <option value="Europe/Prague">Prague (CET/CEST)</option>
                          <option value="Europe/Budapest">Budapest (CET/CEST)</option>
                          <option value="Europe/Warsaw">Warsaw (CET/CEST)</option>
                          <option value="Europe/Moscow">Moscow (MSK)</option>
                        </optgroup>
                        <optgroup label="Asia">
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Asia/Shanghai">Beijing/Shanghai (CST)</option>
                          <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                          <option value="Asia/Singapore">Singapore (SGT)</option>
                          <option value="Asia/Kolkata">India (IST)</option>
                          <option value="Asia/Bangkok">Bangkok (ICT)</option>
                          <option value="Asia/Seoul">Seoul (KST)</option>
                          <option value="Asia/Manila">Manila (PST)</option>
                          <option value="Asia/Jakarta">Jakarta (WIB)</option>
                          <option value="Asia/Kuala_Lumpur">Kuala Lumpur (MYT)</option>
                          <option value="Asia/Taipei">Taipei (CST)</option>
                          <option value="Asia/Dubai">Dubai (GST)</option>
                          <option value="Asia/Jerusalem">Jerusalem (IST)</option>
                        </optgroup>
                        <optgroup label="Australia & Oceania">
                          <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                          <option value="Australia/Melbourne">Melbourne (AEDT/AEST)</option>
                          <option value="Australia/Brisbane">Brisbane (AEST)</option>
                          <option value="Australia/Perth">Perth (AWST)</option>
                          <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                        </optgroup>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={timezone}
                        readOnly
                        className={`w-full p-3 rounded-xl border transition-all duration-200 ${
                          darkMode 
                            ? 'bg-gray-700/30 border-gray-600 text-white cursor-not-allowed' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 cursor-not-allowed'
                        }`}
                        placeholder="Enter location above to auto-detect timezone"
                      />
                    )}
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {useManualTimezone 
                        ? 'Manually selected timezone' 
                        : 'Timezone is automatically detected based on your location input'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual House Selection (Preserved) */}
          <div>
            <label className="block text-sm font-medium mb-3">House Assignment (Optional)</label>
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!useManualHouses}
                  onChange={() => setUseManualHouses(false)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Automatic (recommended) - Let AI analyze the question</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={useManualHouses}
                  onChange={() => setUseManualHouses(true)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Manual house assignment</span>
              </label>

              {useManualHouses && (
                <div className="mt-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Houses (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={manualHouses}
                    onChange={(e) => setManualHouses(e.target.value)}
                    placeholder="1,7"
                    className={`w-full p-3 rounded-xl border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Example: "1,7" for querent (1st house) and partner/enemy (7th house).<br/>
                    Common patterns: 1,2 (money), 1,5 (children), 1,10 (career), 1,4 (home)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* NEW: Advanced Options (Enhanced Features) */}
          {apiStatus === 'connected' && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center justify-between w-full p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  <div className="text-left">
                    <div className="font-medium">Advanced Options</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Enhanced engine overrides and reception weighting
                    </div>
                  </div>
                </div>
                {showAdvancedOptions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showAdvancedOptions && (
                <div className="mt-4 p-6 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 space-y-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                    <Info className="w-4 h-4" />
                    <span>These options override traditional restrictions. Use with caution and expertise.</span>
                  </div>

                  {/* Override Flags */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <Shield className="w-4 h-4 mr-2" />
                      Warning Overrides & Confidence Restoration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={advancedOptions.ignoreRadicality}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev, ignoreRadicality: e.target.checked
                          }))}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded"
                        />
                        <div>
                          <span className="font-medium">Override Radicality Warnings</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Remove cautions and restore full confidence
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={advancedOptions.ignoreVoidMoon}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev, ignoreVoidMoon: e.target.checked
                          }))}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded"
                        />
                        <div>
                          <span className="font-medium">Override Void Moon Warnings</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Proceed with full confidence despite void status
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={advancedOptions.ignoreCombustion}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev, ignoreCombustion: e.target.checked
                          }))}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded"
                        />
                        <div>
                          <span className="font-medium">Override Combustion Penalties</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Ignore solar condition dignity reductions
                          </div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={advancedOptions.ignoreSaturn7th}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev, ignoreSaturn7th: e.target.checked
                          }))}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded"
                        />
                        <div>
                          <span className="font-medium">Override Saturn 7th Warnings</span>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Ignore traditional astrologer error caution
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Reception Weighting */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Reception Weighting
                    </h4>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Exaltation Confidence Boost (%)
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="range"
                          min="0"
                          max="30"
                          step="5"
                          value={advancedOptions.exaltationConfidenceBoost}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev, exaltationConfidenceBoost: parseFloat(e.target.value)
                          }))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <span className="text-sm font-mono w-12 text-center">
                          {advancedOptions.exaltationConfidenceBoost}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Additional confidence boost for mutual exaltation reception (default: 15%)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !question.trim() || !location.trim()}
            className="w-full bg-gradient-to-r from-teal-400 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 hover:from-teal-500 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Casting Enhanced Chart...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Cast Enhanced Chart</span>
              </>
            )}
          </button>

          {/* Help Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>
              {apiStatus === 'connected' ? 
                'Chart will be calculated using Enhanced Horary Engine with advanced traditional features.' :
                'API offline - Demo chart will be created for testing.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Chart View Component  
const EnhancedChartView = ({ chart, darkMode, notes, setNotes }) => {
  const [activeTab, setActiveTab] = useState('judgment');
  const [noteText, setNoteText] = useState(notes[chart.id] || '');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [toast, setToast] = useState(null);

  // Simple toast system
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700' 
    : 'bg-white/60 backdrop-blur-xl border-white/80';


  const getJudgmentColor = (judgment) => {
    switch (judgment) {
      case 'YES': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'NO': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
    }
  };

  const handleSaveNote = () => {
    setNotes(chart.id, noteText);
    setIsEditingNote(false);
  };


  const handleExportChart = () => {
    const exportData = buildChartPayload(chart, true);
    exportData.chart_data = chart.chart_data;
    exportData.calculation_metadata = chart.calculation_metadata;
    exportData.notes = noteText;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-horary-chart-${chart.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const handleShareChart = async () => {
    try {
      const data = buildChartPayload(chart, true);

      const shareTitle = `Horary: ${data.question}`;
      const shareText = `${shareTitle}\n\nAsked: ${data.asked_at_local} · Where: ${data.location.city}, ${data.location.country} · Houses: ${data.house_system}\n\nVerdict: ${data.verdict.label} (${data.verdict.confidence}%)\n\nKey testimonies:\n${cleanMoonText(data.keyTestimoniesText)}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: window.location.href
          });

          showToast('Shared!');
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            return;
          }
        }
      }

      const fullShareText = `${shareText}\n\n--- Chart Data ---\n${JSON.stringify(data, null, 2)}`;
      await navigator.clipboard.writeText(fullShareText);
      showToast('Copied to clipboard — paste to share');

    } catch (error) {
      console.error('Share failed:', error);
      showToast(`Couldn't share: ${error.message}`, 'error');
    }
  };
  const handleAnalyzeWithAI = async () => {
    try {
      const data = buildChartPayload(chart, false); // Don't include verdict for AI analysis

      const prompt = `Role: You are a traditional horary astrologer using Lilly as baseline (Sahl/Bonatti comparisons welcome). Work strictly from the chart data provided; do not recast unless you detect a blatant inconsistency, in which case note it as a warning.

Task: Judge the question using traditional horary rules and produce a clear, auditable verdict.

Question: "${data.question}"

Asked: ${data.asked_at_local}
Location: ${data.location.city}, ${data.location.country}
Coordinates: ${data.location.lat}°, ${data.location.lon}°
Timezone: ${data.tz}

Chart Data:
${JSON.stringify(data, null, 2)}`;

      // Copy prompt + data to clipboard
      await navigator.clipboard.writeText(prompt);
      showToast('AI analysis prompt copied to clipboard! Paste it into your preferred AI assistant (ChatGPT, Claude, etc.)');
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      showToast(`Couldn't prepare AI analysis: ${error.message}`, 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{chart.question}</h2>
            <div className="flex items-center space-x-4 flex-wrap">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getJudgmentColor(chart.judgment)}`}>
                {chart.judgment}
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                Confidence: {chart.confidence}%
              </span>
              {/* NEW: Enhanced features indicators */}
              {chart.enhanced && (
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Enhanced
                </span>
              )}
              {chart.solar_factors?.significant && (
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs flex items-center">
                  <Sun className="w-3 h-3 mr-1" />
                  Solar Conditions
                </span>
              )}
              {chart.demo && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs">
                  Demo Chart
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <div className="relative group">
              <button 
                onClick={handleShareChart}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Share chart"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Share chart
              </div>
            </div>
            
            <div className="relative group">
              <button 
                onClick={handleAnalyzeWithAI}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Analyze with AI"
              >
                <Brain className="w-5 h-5" />
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Analyze with AI
              </div>
            </div>
            
            <div className="relative group">
              <button 
                onClick={handleExportChart}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Download JSON"
              >
                <Download className="w-5 h-5" />
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Download JSON
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-emerald-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Chart Wheel - Left Panel */}
        <div className="xl:col-span-2">
          <div className={`${cardBg} border rounded-2xl p-6 mb-6`}>
            <h3 className="text-lg font-semibold mb-4">Enhanced Chart Wheel</h3>
            <EnhancedChartWheel chart={chart} darkMode={darkMode} />
          </div>

        </div>

        {/* Analysis Panels - Right Panel */}
        <div className="xl:col-span-2 space-y-6">
          {/* Enhanced Tabs */}
          <div className={`${cardBg} border rounded-2xl p-6`}>
            <div className="flex flex-wrap gap-1 mb-6">
              <TabButton 
                active={activeTab === 'judgment'} 
                onClick={() => setActiveTab('judgment')}
                text="Judgment"
                darkMode={darkMode}
              />
              <TabButton 
                active={activeTab === 'dignities'} 
                onClick={() => setActiveTab('dignities')}
                text="Dignities"
                darkMode={darkMode}
              />
              <TabButton
                active={activeTab === 'aspects'}
                onClick={() => setActiveTab('aspects')}
                text="Aspects"
                darkMode={darkMode}
              />
              <TabButton
                active={activeTab === 'general'}
                onClick={() => setActiveTab('general')}
                text="General Info"
                darkMode={darkMode}
              />
              <TabButton
                active={activeTab === 'considerations'}
                onClick={() => setActiveTab('considerations')}
                text="Considerations"
                darkMode={darkMode}
              />
              <TabButton
                active={activeTab === 'moon-story'}
                onClick={() => setActiveTab('moon-story')}
                text="Moon Story"
                darkMode={darkMode}
              />
              <TabButton 
                active={activeTab === 'notes'} 
                onClick={() => setActiveTab('notes')}
                text="Notes"
                darkMode={darkMode}
              />
            </div>

            {activeTab === 'judgment' && (
              <EnhancedJudgmentPanel chart={chart} darkMode={darkMode} />
            )}
            {activeTab === 'dignities' && (
              <DignityTablePanel chart={chart} darkMode={darkMode} />
            )}
            {activeTab === 'aspects' && (
              <AspectsTablePanel chart={chart} darkMode={darkMode} />
            )}
            {activeTab === 'general' && (
              <GeneralInfoPanel chart={chart} darkMode={darkMode} />
            )}
            {activeTab === 'considerations' && (
              <ConsiderationsPanel chart={chart} darkMode={darkMode} />
            )}
            {activeTab === 'moon-story' && (
              <MoonStoryPanel chart={chart} darkMode={darkMode} />
            )}
            {activeTab === 'notes' && (
              <NotesPanel 
                noteText={noteText}
                setNoteText={setNoteText}
                isEditing={isEditingNote}
                setIsEditing={setIsEditingNote}
                onSave={handleSaveNote}
                darkMode={darkMode}
              />
            )}
          </div>

          {/* Enhanced Solar Conditions */}
          {chart.chart_data?.solar_conditions_summary && (
            <div className={`${cardBg} border rounded-2xl p-6`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Sun className="w-5 h-5 mr-2 text-yellow-500" />
                Enhanced Solar Conditions
              </h3>
              <EnhancedSolarConditionsPanel 
                solarData={chart.chart_data.solar_conditions_summary} 
                solarFactors={chart.solar_factors}
                darkMode={darkMode} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// NEW: Enhanced Tab Button with enhanced indicator
const TabButton = ({ active, onClick, text, darkMode, enhanced = false }) => {
  const activeClasses = active 
    ? 'bg-indigo-600 text-white' 
    : darkMode 
      ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeClasses} ${enhanced ? 'relative' : ''}`}
    >
      {text}
      {enhanced && (
        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-indigo-400" />
      )}
    </button>
  );
};

// NEW: Enhanced Judgment Panel with override clarity
const EnhancedJudgmentPanel = ({ chart, darkMode }) => {
  const overrideFlags = chart.calculation_metadata?.override_flags_applied || {};
  const hasOverrides = Object.values(overrideFlags).some(flag => flag === true);

  return (
    <div className="space-y-4">
      
      {/* Override Warning Banner */}
      {hasOverrides && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Traditional Restrictions Overridden
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                {overrideFlags.ignore_radicality && (
                  <div>• Radicality check bypassed - judgment proceeded despite traditional concerns</div>
                )}
                {overrideFlags.ignore_void_moon && (
                  <div>• Void Moon restriction bypassed - judgment given despite Moon's condition</div>
                )}
                {overrideFlags.ignore_combustion && (
                  <div>• Solar combustion effects ignored - planets treated as free from solar interference</div>
                )}
                {overrideFlags.ignore_saturn_7th && (
                  <div>• Saturn in 7th house warning bypassed - Bonatti's astrologer error warning ignored</div>
                )}
                <div className="mt-2 text-blue-600 dark:text-blue-400">
                  ⚠️ Use override results with expert judgment and traditional knowledge
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Traditional Analysis */}
      <div>
        <h4 className="font-semibold mb-2 flex items-center">
          <Brain className="w-4 h-4 mr-2 text-indigo-500" />
          Traditional Analysis
          {hasOverrides && (
            <span className="ml-2 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
              With Overrides
            </span>
          )}
        </h4>
        <JudgmentBreakdown reasoning={chart.reasoning} darkMode={darkMode} />
      </div>
      
      {/* Enhanced Reasoning Explanation */}
      <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="font-medium mb-2">How to Read This Analysis:</div>
        <ul className="space-y-1">
          <li>• <strong>Radicality:</strong> Chart's validity according to traditional rules</li>
          <li>• <strong>Significators:</strong> Planets representing querent and quesited</li>
          <li>• <strong>Perfection:</strong> How the significators come together for the answer</li>
          <li>• <strong>Reception:</strong> How planets receive each other in their signs</li>
          <li>• <strong>Overrides:</strong> Modern flexibility applied to traditional restrictions</li>
        </ul>
        
        {hasOverrides && (
          <div className="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600">
            <div className="text-amber-600 dark:text-amber-400">
              <strong>Override Notice:</strong> This judgment used modern overrides to bypass some traditional 
              restrictions. While this provides flexibility, traditional astrologers would consider 
              the chart's natural radicality and lunar conditions before proceeding.
            </div>
          </div>
        )}
      </div>

      {/* Timing Analysis */}
      {chart.timing && (
        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-purple-500" />
            Timing Analysis
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">{chart.timing}</p>
          {chart.traditional_factors?.perfection_type && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Perfection Type: {chart.traditional_factors.perfection_type}
            </p>
          )}
        </div>
      )}

      {/* Enhanced Traditional Factors */}
      {chart.traditional_factors && (
        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <Book className="w-4 h-4 mr-2 text-green-500" />
            Traditional Factors
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            {chart.traditional_factors.perfection_type && (
              <div>Perfection: {chart.traditional_factors.perfection_type}</div>
            )}
            {chart.traditional_factors.reception && chart.traditional_factors.reception !== 'none' && (
              <div>Reception: {chart.traditional_factors.reception.replace('_', ' ')}</div>
            )}
            {chart.traditional_factors.querent_strength !== undefined && (
              <div>Querent Strength: {chart.traditional_factors.querent_strength}</div>
            )}
            {chart.traditional_factors.quesited_strength !== undefined && (
              <div>Quesited Strength: {chart.traditional_factors.quesited_strength}</div>
            )}
          </div>
        </div>
      )}

      {/* Chart Technical Details */}
      <div>
        <h4 className="font-semibold mb-2 flex items-center">
          <Info className="w-4 h-4 mr-2 text-blue-500" />
          Technical Details  
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          {/* Ascendant info */}
          {chart.chart_data?.ascendant !== undefined && (
            <div>
              <span className="font-medium">Ascendant:</span> {
                `${(chart.chart_data.ascendant % 30).toFixed(1)}° ${getSignFromDegree(chart.chart_data.ascendant)}`
              }
            </div>
          )}

          {/* Enhanced system info */}
          <div>
            <span className="font-medium">House System:</span> Regiomontanus (Traditional)
          </div>

          <div>
            <span className="font-medium">Engine:</span> {
              chart.calculation_metadata?.engine_version || 'Enhanced Traditional Horary'
            }
            {chart.enhanced && (
              <span className="ml-2 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs">
                v2.0
              </span>
            )}
          </div>

          {chart.demo && (
            <div>
              <span className="font-medium">Chart Type:</span> Demo Chart
              <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                Enhanced Features Simulated
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// NEW: Enhanced Considerations Panel with better radicality explanation
const ConsiderationsPanel = ({ chart, darkMode }) => {
  const c = chart.considerations || {};
  
  // Check if radicality was overridden in judgment
  const radicalityOverridden = chart.calculation_metadata?.override_flags_applied?.ignore_radicality;
  
  // Get detailed radicality reasons
  const getRadicalityDetails = (reason) => {
    if (reason.includes('too early')) {
      return {
        issue: 'Ascendant too early',
        explanation: 'Ascendant under 3° suggests the question is premature or not yet mature enough for judgment.',
        traditional_advice: 'Wait for the matter to develop further before asking again.'
      };
    }
    if (reason.includes('too late')) {
      return {
        issue: 'Ascendant too late',
        explanation: 'Ascendant over 27° suggests the question is too late or the matter is already decided.',
        traditional_advice: 'The opportunity may have passed, or the outcome is already determined.'
      };
    }
    if (reason.includes('Saturn in 7th')) {
      return {
        issue: 'Saturn in 7th house',
        explanation: 'Bonatti warns that Saturn in the 7th house indicates the astrologer may err in judgment.',
        traditional_advice: 'Proceed with extra caution and consider seeking a second opinion.'
      };
    }
    if (reason.includes('Via Combusta')) {
      return {
        issue: 'Moon in Via Combusta',
        explanation: 'Moon in the "Burned Way" (15° Libra to 15° Scorpio) indicates volatile or corrupted matter.',
        traditional_advice: 'The situation may be too chaotic or corrupted for clear judgment.'
      };
    }
    return null;
  };

  const radicalityDetails = c.radical_reason ? getRadicalityDetails(c.radical_reason) : null;

  return (
    <div className="space-y-4 text-sm">
      
      {/* Enhanced Radicality Section */}
      <div className={`p-4 rounded-lg border ${
        c.radical 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' 
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {c.radical ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">
                {c.radical ? 'Chart is Radical' : 'Chart May Not Be Radical'}
              </h4>
              
              {/* Override indicator */}
              {radicalityOverridden && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                  Override Applied
                </span>
              )}
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {c.radical_reason}
            </p>
            
            {/* Enhanced explanation for non-radical charts */}
            {!c.radical && radicalityDetails && (
              <div className="space-y-2">
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Issue:</strong> {radicalityDetails.issue}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Explanation:</strong> {radicalityDetails.explanation}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Traditional Advice:</strong> {radicalityDetails.traditional_advice}
                </div>
              </div>
            )}
            
            {/* Override explanation */}
            {radicalityOverridden && !c.radical && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Note:</strong> Warning overrides were applied to remove cautionary messages 
                  and restore full confidence. The underlying astrological conditions still apply, 
                  but their limiting effects on confidence have been bypassed.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Moon Void of Course Section */}
      <div className={`p-4 rounded-lg border ${
        c.moon_void 
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' 
          : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
      }`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {c.moon_void ? (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium mb-2">
              {c.moon_void ? 'Moon Void of Course' : 'Moon Not Void of Course'}
            </h4>
            
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {c.moon_void_reason}
            </p>
            
            {c.moon_void && (
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Traditional Meaning:</strong> When the Moon is void of course, 
                it typically indicates that "nothing will come of the matter" or that 
                new undertakings will not proceed as planned.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Traditional Context */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="font-medium mb-2">Traditional Horary Considerations:</div>
        <div>• <strong>Radicality:</strong> A chart must be "radical" (valid) to give reliable judgment</div>
        <div>• <strong>Void Moon:</strong> Traditionally prevents reliable outcomes for new matters</div>
        <div>• <strong>Modern Practice:</strong> Some astrologers override these restrictions with experience</div>
        <div>• <strong>Enhanced Engine:</strong> Provides both traditional assessment and modern flexibility</div>
      </div>
    </div>
  );
};

// NEW: Moon Story Panel
const MoonStoryPanel = ({ chart, darkMode }) => {
  const moonData = chart.chart_data?.planets?.Moon;
  const aspects = chart.chart_data?.aspects || [];
  const allPlanets = chart.chart_data?.planets || {};

  // Get current aspects involving the Moon
  const currentMoonAspects = aspects.filter(aspect => 
    aspect.planet1 === 'Moon' || aspect.planet2 === 'Moon'
  );

  // Calculate if Moon is void of course
  const getMoonVoidStatus = () => {
    if (!moonData) return { isVoid: false, reason: "Moon data not available" };

    const moonLongitude = moonData.longitude || 0;
    const currentSign = Math.floor(moonLongitude / 30);
    const nextSignBoundary = (currentSign + 1) * 30;
    const degreesToNextSign = nextSignBoundary - moonLongitude;

    // Check if Moon makes any applying major aspects before leaving current sign
    const applyingAspects = currentMoonAspects.filter(aspect => aspect.applying);
    
    if (applyingAspects.length === 0) {
      return {
        isVoid: true,
        reason: `No applying aspects before leaving ${moonData.sign}`,
        degreesToNextSign: degreesToNextSign.toFixed(2),
        timeToNextSign: moonData.speed ? `~${(degreesToNextSign / moonData.speed).toFixed(1)} days` : "Unknown"
      };
    }

    return {
      isVoid: false,
      reason: `${applyingAspects.length} applying aspect(s) before leaving ${moonData.sign}`,
      degreesToNextSign: degreesToNextSign.toFixed(2),
      timeToNextSign: moonData.speed ? `~${(degreesToNextSign / moonData.speed).toFixed(1)} days` : "Unknown"
    };
  };

  // Generate future aspects (simplified simulation)
  const getFutureAspects = () => {
    if (!moonData || !moonData.speed) return [];

    const futureAspects = [];
    const moonSpeed = moonData.speed; // degrees per day
    const currentLongitude = moonData.longitude || 0;

    // Check aspects Moon will make in next 30 days
    Object.entries(allPlanets).forEach(([planetName, planetData]) => {
      if (planetName === 'Moon') return;

      const planetLongitude = planetData.longitude || 0;
      const aspectOrbs = [0, 60, 90, 120, 180]; // Conjunction, Sextile, Square, Trine, Opposition
      const aspectNames = ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition'];

      aspectOrbs.forEach((aspectDegree, index) => {
        // Calculate when Moon will reach this aspect to the planet
        let targetLongitude = planetLongitude + aspectDegree;
        if (targetLongitude >= 360) targetLongitude -= 360;

        let distanceToAspect = targetLongitude - currentLongitude;
        if (distanceToAspect < 0) distanceToAspect += 360;

        const daysToAspect = distanceToAspect / moonSpeed;

        // Only include aspects within next 30 days
        if (daysToAspect > 0 && daysToAspect <= 30) {
          futureAspects.push({
            planet: planetName,
            aspect: aspectNames[index],
            daysFromNow: daysToAspect.toFixed(1),
            exactDate: new Date(Date.now() + daysToAspect * 24 * 60 * 60 * 1000).toLocaleDateString(),
            orb: 0 // Will be exact when it perfects
          });
        }
      });
    });

    return futureAspects.sort((a, b) => parseFloat(a.daysFromNow) - parseFloat(b.daysFromNow)).slice(0, 10);
  };

  const voidStatus = getMoonVoidStatus();
  const futureAspects = getFutureAspects();

  const getAspectColor = (aspectName) => {
    switch (aspectName) {
      case 'Conjunction': return 'text-yellow-600 dark:text-yellow-400';
      case 'Sextile': return 'text-emerald-600 dark:text-emerald-400';
      case 'Square': return 'text-red-600 dark:text-red-400';
      case 'Trine': return 'text-blue-600 dark:text-blue-400';
      case 'Opposition': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAspectSymbol = (aspectName) => {
    switch (aspectName) {
      case 'Conjunction': return '☌';
      case 'Sextile': return '⚹';
      case 'Square': return '□';
      case 'Trine': return '△';
      case 'Opposition': return '☍';
      default: return '○';
    }
  };

  // Helper function to determine if an aspect is supportive/favorable
  const isAspectSupportive = (aspectName) => {
    // Traditional favorable aspects
    return ['Conjunction', 'Sextile', 'Trine'].includes(aspectName);
  };

  if (!moonData) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <Moon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Moon data not available for this chart</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Moon Current Status */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <Moon className="w-4 h-4 mr-2 text-blue-500" />
          Moon's Current Position
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Position:</span>
            <span className="font-medium">
              {(moonData.longitude % 30).toFixed(1)}° {moonData.sign}
            </span>
          </div>
          <div className="flex justify-between">
            <span>House:</span>
            <span className="font-medium">{moonData.house}</span>
          </div>
          <div className="flex justify-between">
            <span>Daily Motion:</span>
            <span className="font-medium">
              {moonData.speed ? `${moonData.speed.toFixed(2)}°/day` : 'Unknown'}
              {moonData.speed && moonData.speed > 13 ? ' (Fast)' : moonData.speed && moonData.speed < 11 ? ' (Slow)' : ' (Average)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Dignity Score:</span>
            <span className={`font-medium ${
              moonData.dignity_score > 0 ? 'text-emerald-600 dark:text-emerald-400' : 
              moonData.dignity_score < 0 ? 'text-red-600 dark:text-red-400' : 
              'text-gray-600 dark:text-gray-400'
            }`}>
              {moonData.dignity_score > 0 ? '+' : ''}{moonData.dignity_score}
            </span>
          </div>
        </div>
      </div>

      {/* Void of Course Status */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
          Void of Course Status
        </h4>
        <div className={`p-3 rounded-lg border ${
          voidStatus.isVoid 
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
        }`}>
          <div className={`flex items-center mb-2 ${
            voidStatus.isVoid 
              ? 'text-amber-700 dark:text-amber-300' 
              : 'text-emerald-700 dark:text-emerald-300'
          }`}>
            {voidStatus.isVoid ? (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">Moon is Void of Course</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">Moon is NOT Void of Course</span>
              </>
            )}
          </div>
          <p className="text-xs mb-2">{voidStatus.reason}</p>
          <div className="text-xs space-y-1">
            <div>Degrees to next sign: {voidStatus.degreesToNextSign}°</div>
            <div>Time to next sign: {voidStatus.timeToNextSign}</div>
          </div>
          {voidStatus.isVoid && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Traditional advice: Avoid new undertakings during void Moon periods
            </div>
          )}
        </div>
      </div>

      {/* Current Moon Aspects */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <Zap className="w-4 h-4 mr-2 text-purple-500" />
          Current Moon Aspects
        </h4>
        {currentMoonAspects.length > 0 ? (
          <div className="space-y-2">
            {currentMoonAspects.map((aspect, index) => {
              const otherPlanet = aspect.planet1 === 'Moon' ? aspect.planet2 : aspect.planet1;
              // Clean up planet name to avoid duplication (e.g., "Moon Venus" instead of "Moon Moon Venus")
              const cleanOtherPlanet = otherPlanet === 'Moon' ? 'Moon' : otherPlanet;
              const aspectColor = getAspectColor(aspect.aspect);
              const aspectSymbol = getAspectSymbol(aspect.aspect);
              
              return (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg ${aspectColor}`}>{aspectSymbol}</span>
                    <span className="font-medium">Moon {cleanOtherPlanet}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs">{aspect.orb?.toFixed(1)}° orb</div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      aspect.applying 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {aspect.applying ? 'Applying' : 'Separating'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No major aspects involving the Moon found
          </p>
        )}
      </div>

      {/* Future Moon Aspects */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
          Future Moon Aspects (Next 30 days)
        </h4>
        {futureAspects.length > 0 ? (
          <div className="space-y-2">
            {futureAspects.map((aspect, index) => {
              const aspectColor = getAspectColor(aspect.aspect);
              const aspectSymbol = getAspectSymbol(aspect.aspect);
              // Clean up planet name to avoid duplication
              const cleanPlanet = aspect.planet === 'Moon' ? 'Moon' : aspect.planet;
              
              return (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg ${aspectColor}`}>{aspectSymbol}</span>
                    <span className="font-medium">Moon {cleanPlanet}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">{aspect.exactDate}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      in {aspect.daysFromNow} days
                    </div>
                    <div className={`text-xs px-2 py-1 rounded mt-1 ${
                      isAspectSupportive(aspect.aspect)
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {isAspectSupportive(aspect.aspect) ? 'Supportive' : 'Challenging'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No major future aspects calculated for the next 30 days
          </p>
        )}
      </div>

      {/* Moon Story Summary */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Moon's Story Summary</h5>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>
            The Moon at {(moonData.longitude % 30).toFixed(1)}° {moonData.sign} is moving at{' '}
            {moonData.speed ? moonData.speed.toFixed(2) : 'unknown'} degrees per day
            {moonData.speed && moonData.speed > 13 ? ' (unusually fast)' : 
             moonData.speed && moonData.speed < 11 ? ' (slow motion)' : ' (normal speed)'}.
          </p>
          <p>
            {voidStatus.isVoid 
              ? `It is currently void of course with no applying aspects before leaving ${moonData.sign}.`
              : `It has ${currentMoonAspects.filter(a => a.applying).length} applying aspect(s) before leaving ${moonData.sign}.`
            }
          </p>
          <p>
            The next {futureAspects.length} aspects will occur over the coming{' '}
            {futureAspects.length > 0 ? `${Math.ceil(parseFloat(futureAspects[futureAspects.length - 1]?.daysFromNow))} days` : 'period'}.
          </p>
        </div>
      </div>

      {/* Traditional Moon Guidance */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div className="font-medium">Traditional Moon Considerations:</div>
        <ul className="space-y-1">
          <li>• Moon void of course: Avoid starting new projects</li>
          <li>• Fast Moon (&gt;13°/day): Rapid developments expected</li>
          <li>• Slow Moon (&lt;11°/day): Delays and slow progress likely</li>
          <li>• Applying aspects: Future developments and influences</li>
          <li>• Separating aspects: Past influences waning</li>
        </ul>
      </div>
    </div>
  );
};

// NEW: General Info Panel
const GeneralInfoPanel = ({ chart, darkMode }) => {
  const info = chart.general_info || deriveGeneralInfo(chart);
  const moon = info.moon_condition || {};

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
          <div className="font-medium">Planetary Day</div>
          <div>{info.planetary_day || 'N/A'}</div>
        </div>
        <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
          <div className="font-medium">Planetary Hour</div>
          <div>{info.planetary_hour || 'N/A'}</div>
        </div>
        <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
          <div className="font-medium">Moon Phase</div>
          <div>{info.moon_phase || 'N/A'}</div>
        </div>
        <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
          <div className="font-medium">Moon Mansion</div>
          <div>
            {info.moon_mansion ? `${info.moon_mansion.number} - ${info.moon_mansion.name}` : 'N/A'}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50">
        <div className="font-medium mb-1">Moon Condition</div>
        <div>Sign: {moon.sign || 'N/A'}</div>
        {moon.speed !== undefined && (
          <div>Speed: {moon.speed.toFixed(2)}°/day ({moon.speed_category})</div>
        )}
        <div className="flex items-center space-x-2 mt-1">
          {moon.void_of_course ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
          <span>{moon.void_of_course ? moon.void_reason : 'Not void of course'}</span>
        </div>
      </div>
    </div>
  );
};

// NEW: Enhanced Solar Conditions Panel
const EnhancedSolarConditionsPanel = ({ solarData, solarFactors, darkMode }) => {
  return (
    <div className="space-y-4">
      {/* Summary */}
      {solarFactors?.summary && (
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
            {solarFactors.summary}
          </p>
        </div>
      )}

      {/* Cazimi Planets */}
      {solarData.cazimi_planets?.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-3 flex items-center">
            <Flame className="w-4 h-4 mr-2" />
            Cazimi (Heart of Sun) - Ultimate Dignity
          </h5>
          {solarData.cazimi_planets.map((planet, index) => (
            <div key={index} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{planet.planet}</span>
                <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                  {planet.exact_cazimi ? 'Exact Cazimi!' : 'Cazimi'}
                </span>
              </div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Distance from Sun: {planet.distance_from_sun.toFixed(2)}° 
                {planet.exact_cazimi && ' (Within 3 arcminutes - maximum dignity)'}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Dignity Effect: +{planet.dignity_effect || 6} (Heart of the Sun brings ultimate strength)
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Combusted Planets */}
      {solarData.combusted_planets?.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center">
            <Flame className="w-4 h-4 mr-2" />
            Combusted - Severely Weakened
          </h5>
          {solarData.combusted_planets.map((planet, index) => (
            <div key={index} className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{planet.planet}</span>
                <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                  Combusted
                </span>
              </div>
              {planet.traditional_exception && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Traditional Exception: Enhanced engine found visibility exception for this planet
                </div>
              )}
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                Dignity Effect: {planet.dignity_effect || -5} (Burnt by solar rays)
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Under the Beams */}
      {solarData.under_beams_planets?.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center">
            <EyeIcon className="w-4 h-4 mr-2" />
            Under the Beams - Moderately Weakened
          </h5>
          {solarData.under_beams_planets.map((planet, index) => (
            <div key={index} className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{planet.planet}</span>
                <span className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                  Under Beams
                </span>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Dignity Effect: {planet.dignity_effect || -3} (Obscured by solar rays)
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* No Significant Conditions */}
      {solarData.significant_conditions === 0 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <Sun className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No significant solar conditions affecting planets</p>
          <p className="text-xs mt-1">All planets are free from solar interference</p>
        </div>
      )}

      {/* Enhanced Analysis Note */}
      <div className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="font-medium mb-1">Enhanced Solar Analysis:</p>
        <ul className="space-y-1">
          <li>• Cazimi: Within 17 arcminutes (0.28°) of exact Sun conjunction</li>
          <li>• Combustion: Within 8.5° of Sun (traditional orb)</li>
          <li>• Under the Beams: Within 15° of Sun</li>
          <li>• Enhanced engine checks Venus/Mercury visibility exceptions</li>
          <li>• Distance-based dignity gradation applied</li>
        </ul>
      </div>
    </div>
  );
};

// NEW: Enhanced Chart Wheel Component with Planet Filtering
const EnhancedChartWheel = ({ chart, darkMode }) => {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [isolatedPlanet, setIsolatedPlanet] = useState(null); // New state for legend chip isolation
  
  const planets = chart.chart_data?.planets || {};
  const aspects = chart.chart_data?.aspects || [];
  const houses = chart.chart_data?.houses || [];
  const solarConditions = chart.chart_data?.solar_conditions_summary;
  
  const zodiacSigns = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  const planetSymbols = {
    'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 
    'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄'
  };

  const signSymbols = {
    'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
    'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
    'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓'
  };

  // Generate degree ticks (every 10 degrees)
  const degreeTicks = [];
  for (let i = 0; i < 360; i += 10) {
    const angle = i - 90; // Start from Aries (top)
    const radius = i % 30 === 0 ? 175 : 170; // Longer ticks for sign boundaries
    const innerRadius = i % 30 === 0 ? 155 : 165; // Sign boundaries go deeper
    const x1 = Math.cos((angle * Math.PI) / 180) * innerRadius;
    const y1 = Math.sin((angle * Math.PI) / 180) * innerRadius;
    const x2 = Math.cos((angle * Math.PI) / 180) * radius;
    const y2 = Math.sin((angle * Math.PI) / 180) * radius;
    
    degreeTicks.push({
      x1: 192 + x1,
      y1: 192 + y1,
      x2: 192 + x2,
      y2: 192 + y2,
      isSignBoundary: i % 30 === 0,
      degree: i
    });
  }

  // Generate house sectors
  const houseSectors = [];
  if (houses.length === 12) {
    for (let i = 0; i < 12; i++) {
      const currentCusp = (houses[i] - 90) % 360; // Adjust for Aries at top
      const nextCusp = (houses[(i + 1) % 12] - 90) % 360;
      
      // Handle crossing 0 degrees
      let sweepFlag = 0;
      let endAngle = nextCusp;
      
      if (nextCusp < currentCusp) {
        endAngle = nextCusp + 360;
        if (endAngle - currentCusp > 180) {
          sweepFlag = 1;
        }
      } else if (nextCusp - currentCusp > 180) {
        sweepFlag = 1;
      }
      
      const startX = 192 + Math.cos((currentCusp * Math.PI) / 180) * 140;
      const startY = 192 + Math.sin((currentCusp * Math.PI) / 180) * 140;
      const endX = 192 + Math.cos((endAngle * Math.PI) / 180) * 140;
      const endY = 192 + Math.sin((endAngle * Math.PI) / 180) * 140;
      
      houseSectors.push({
        houseNumber: i + 1,
        startAngle: currentCusp,
        endAngle: endAngle,
        pathData: `M 192 192 L ${startX} ${startY} A 140 140 0 ${sweepFlag} 1 ${endX} ${endY} Z`,
        midAngle: currentCusp + ((endAngle - currentCusp) / 2),
        labelX: 192 + Math.cos(((currentCusp + (endAngle - currentCusp) / 2) * Math.PI) / 180) * 125,
        labelY: 192 + Math.sin(((currentCusp + (endAngle - currentCusp) / 2) * Math.PI) / 180) * 125
      });
    }
  }

  // NEW: Get enhanced planet styling based on solar conditions
  const getEnhancedPlanetStyling = (planetName, planetData) => {
    let gradient = 'from-gray-400 to-gray-600'; // Default
    let borderClass = '';
    let effectIcon = null;

    // Check dignity
    if (planetData.dignity_score > 0) {
      gradient = 'from-emerald-400 to-emerald-600';
    } else if (planetData.dignity_score < 0) {
      gradient = 'from-red-400 to-red-600';
    }

    // Check solar conditions (enhanced)
    if (solarConditions) {
      const cazimiPlanet = solarConditions.cazimi_planets?.find(p => p.planet === planetName);
      const combustedPlanet = solarConditions.combusted_planets?.find(p => p.planet === planetName);
      const underBeamsPlanet = solarConditions.under_beams_planets?.find(p => p.planet === planetName);

      if (cazimiPlanet) {
        gradient = 'from-yellow-300 to-yellow-500';
        borderClass = 'ring-2 ring-yellow-300 ring-opacity-75';
        effectIcon = <Flame className="w-2 h-2 text-yellow-600" />;
      } else if (combustedPlanet) {
        gradient = 'from-red-500 to-red-700';
        borderClass = 'ring-2 ring-red-400 ring-opacity-75';
        effectIcon = <Flame className="w-2 h-2 text-red-800" />;
      } else if (underBeamsPlanet) {
        gradient = 'from-orange-400 to-orange-600';
        borderClass = 'ring-2 ring-orange-300 ring-opacity-75';
        effectIcon = <EyeIcon className="w-2 h-2 text-orange-700" />;
      }
    }

    return { gradient, borderClass, effectIcon };
  };

  const handlePlanetClick = (planetName, planetData) => {
    setSelectedPlanet({ name: planetName, data: planetData });
  };

  const handleKeyPress = (event, planetName, planetData) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePlanetClick(planetName, planetData);
    }
  };

  // Chart info data
  const chartData = chart.chart_data;
  const timezoneInfo = chartData?.timezone_info;
  
  // Helper function to check if aspect involves isolated planet
  const isAspectVisible = (aspect) => {
    if (!isolatedPlanet) return true; // Show all if no planet isolated
    return aspect.planet1 === isolatedPlanet || aspect.planet2 === isolatedPlanet;
  };
  
  // Helper function to check if planet should be dimmed
  const isPlanetDimmed = (planetName) => {
    if (!isolatedPlanet) return false; // No dimming if no planet isolated
    return planetName !== isolatedPlanet;
  };

  // Button class names
  const getShowAllButtonClass = () => {
    const baseClasses = 'px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 border-t border-white/20';
    if (isolatedPlanet === null) {
      return `${baseClasses} bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30`;
    } else if (darkMode) {
      return `${baseClasses} bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-gray-200 shadow-md shadow-gray-900/30`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400 text-gray-700 shadow-md shadow-gray-300/50`;
    }
  };

  const getPlanetButtonClass = (isActive) => {
    const baseClasses = 'relative flex items-center space-x-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 border-t border-white/20';
    if (isActive) {
      return `${baseClasses} bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 ring-1 ring-indigo-300`;
    } else if (darkMode) {
      return `${baseClasses} bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 text-gray-200 shadow-md shadow-gray-900/30`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400 text-gray-700 shadow-md shadow-gray-300/50`;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Chart Info Header */}
      <div className={`w-full p-4 rounded-lg border ${
        darkMode ? 'bg-gray-800/30 border-gray-600' : 'bg-gray-50/80 border-gray-200'
      }`}>
        <div className="text-center space-y-1">
          <div className="text-sm font-medium">
            {timezoneInfo?.local_time ? new Date(timezoneInfo.local_time).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            }) : 'Chart Time Not Available'}
          </div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {timezoneInfo?.location_name || 'Location Not Available'}
          </div>
          {timezoneInfo?.coordinates && (
            <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {timezoneInfo.coordinates.latitude.toFixed(4)}°, {timezoneInfo.coordinates.longitude.toFixed(4)}°
            </div>
          )}
        </div>
      </div>

      {/* Chart Wheel */}
      <div 
        className={`w-96 h-96 rounded-full border-4 ${
          darkMode ? 'border-gray-600' : 'border-gray-300'
        } relative bg-gradient-to-br ${
          darkMode ? 'from-gray-800 to-gray-900' : 'from-blue-50 to-indigo-50'
        }`}
        role="img"
        aria-label="Enhanced horary chart wheel with solar conditions"
      >
        
        {/* Main SVG for precise drawing */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 384 384">
          
          {/* Degree ticks and sign boundaries */}
          {degreeTicks.map((tick, index) => (
            <line
              key={index}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={darkMode ? '#6b7280' : '#9ca3af'}
              strokeWidth={tick.isSignBoundary ? '2' : '1'}
              opacity={tick.isSignBoundary ? 0.8 : 0.4}
            />
          ))}
          
          {/* House sectors */}
          {houseSectors.map((sector, index) => (
            <g key={`house-${index}`}>
              <path
                d={sector.pathData}
                fill="none"
                stroke={darkMode ? '#4b5563' : '#d1d5db'}
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity={0.5}
              />
              {/* House numbers */}
              <text
                x={sector.labelX}
                y={sector.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-xs font-medium ${darkMode ? 'fill-gray-400' : 'fill-gray-600'}`}
              >
                {sector.houseNumber}
              </text>
            </g>
          ))}
          
          {/* Zodiac signs ring */}
          <circle
            cx="192"
            cy="192"
            r="160"
            fill="none"
            stroke={darkMode ? '#6b7280' : '#9ca3af'}
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity={0.6}
          />
          
          {/* Enhanced aspect lines with better styling */}
          {aspects.map((aspect, index) => {
            const planet1 = planets[aspect.planet1];
            const planet2 = planets[aspect.planet2];
            
            if (!planet1 || !planet2) return null;
            
            // Skip aspect if planet isolation is active and this aspect doesn't involve the isolated planet
            if (!isAspectVisible(aspect)) return null;
            
            const angle1 = (planet1.longitude || 0) - 90;
            const angle2 = (planet2.longitude || 0) - 90;
            const radius = 120;
            
            const x1 = 192 + Math.cos((angle1 * Math.PI) / 180) * radius;
            const y1 = 192 + Math.sin((angle1 * Math.PI) / 180) * radius;
            const x2 = 192 + Math.cos((angle2 * Math.PI) / 180) * radius;
            const y2 = 192 + Math.sin((angle2 * Math.PI) / 180) * radius;
            
            const aspectColors = {
              'Conjunction': '#fbbf24',
              'Sextile': '#10b981',
              'Square': '#ef4444',
              'Trine': '#3b82f6',
              'Opposition': '#8b5cf6'
            };
            
            const color = aspectColors[aspect.aspect] || '#6b7280';
            
            return (
              <g key={index}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={aspect.applying ? "3" : "2"}
                  strokeDasharray={aspect.applying ? "none" : "5,5"}
                  opacity={aspect.applying ? 0.9 : 0.6}
                />
                {/* Enhanced: Add glow effect for applying aspects */}
                {aspect.applying && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth="6"
                    opacity="0.3"
                  />
                )}
              </g>
            );
          })}
        </svg>
        
        {/* Zodiac Signs */}
        <div className="absolute inset-8 rounded-full">
          {zodiacSigns.map((sign, index) => {
            const angle = index * 30 - 90;
            const radius = 160;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            return (
              <div
                key={sign}
                className="absolute text-lg transform -translate-x-1/2 -translate-y-1/2 select-none font-semibold"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`
                }}
                title={sign}
              >
                {signSymbols[sign]}
              </div>
            );
          })}
        </div>
        
        {/* Enhanced planet positions with solar condition styling */}
        {Object.entries(planets).map(([planetName, planetData], index) => {
          const longitude = planetData.longitude || 0;
          const angle = longitude - 90;
          const radius = 120;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          
          const { gradient, borderClass, effectIcon } = getEnhancedPlanetStyling(planetName, planetData);
          const degreeInSign = (longitude % 30).toFixed(1);
          const planetLabel = `${planetName} at ${degreeInSign}° ${planetData.sign}`;
          const isSelected = selectedPlanet?.name === planetName;
          const isHovered = hoveredPlanet === planetName;
          const isDimmed = isPlanetDimmed(planetName);
          
          return (
            <div key={planetName} className="absolute" style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`
            }}>
              <button
                className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${borderClass} ${
                  isSelected || isHovered ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                onClick={() => handlePlanetClick(planetName, planetData)}
                onKeyDown={(e) => handleKeyPress(e, planetName, planetData)}
                onMouseEnter={() => setHoveredPlanet(planetName)}
                onMouseLeave={() => setHoveredPlanet(null)}
                aria-label={planetLabel}
                title={`${planetLabel}, Dignity: ${planetData.dignity_score}, House: ${planetData.house}`}
                tabIndex={0}
              >
                {planetSymbols[planetName] || planetName.charAt(0)}
                
                {/* NEW: Enhanced solar condition indicator */}
                {effectIcon && (
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5">
                    {effectIcon}
                  </div>
                )}
                
                {/* NEW: Retrograde indicator */}
                {planetData.retrograde && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
        
        {/* Hover labels positioned along radial lines */}
        {hoveredPlanet && (() => {
          const planetData = planets[hoveredPlanet];
          if (!planetData) return null;
          
          const longitude = planetData.longitude || 0;
          const angle = longitude - 90;
          const labelRadius = 170; // Position outside zodiac signs
          const labelX = Math.cos((angle * Math.PI) / 180) * labelRadius;
          const labelY = Math.sin((angle * Math.PI) / 180) * labelRadius;
          
          return (
            <div 
              className={`absolute z-40 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap pointer-events-none transition-all duration-200 ${
                darkMode 
                  ? 'bg-gray-900/95 text-white border border-gray-600 backdrop-blur-sm' 
                  : 'bg-white/95 text-gray-800 border border-gray-300 backdrop-blur-sm'
              } shadow-xl`}
              style={{
                left: `calc(50% + ${labelX}px)`,
                top: `calc(50% + ${labelY}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {hoveredPlanet} {(longitude % 30).toFixed(1)}° {signSymbols[planetData.sign]} (H{planetData.house})
            </div>
          );
        })()}
        
        {/* Center with enhanced styling */}
        <div className="absolute inset-1/2 w-6 h-6 bg-gradient-to-br from-teal-400 to-indigo-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
      </div>

      {/* Enhanced Selected Planet Details */}
      {selectedPlanet && (
        <div className={`mt-4 p-4 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        } max-w-md`}>
          <h4 className="font-semibold mb-2 flex items-center">
            {selectedPlanet.name}
            {selectedPlanet.data.retrograde && (
              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs">
                Retrograde
              </span>
            )}
          </h4>
          <div className="text-sm space-y-1">
            <div>Position: {(selectedPlanet.data.longitude % 30).toFixed(1)}° {selectedPlanet.data.sign}</div>
            <div>House: {selectedPlanet.data.house}</div>
            <div>Dignity Score: {selectedPlanet.data.dignity_score > 0 ? '+' : ''}{selectedPlanet.data.dignity_score}</div>
            {selectedPlanet.data.speed && (
              <div>Daily Motion: {selectedPlanet.data.speed.toFixed(2)}°/day</div>
            )}
            
            {/* NEW: Enhanced solar condition details */}
            {solarConditions && (
              <>
                {solarConditions.cazimi_planets?.find(p => p.planet === selectedPlanet.name) && (
                  <div className="text-yellow-600 dark:text-yellow-400 font-medium">
                    ☀️ Cazimi - Heart of the Sun
                  </div>
                )}
                {solarConditions.combusted_planets?.find(p => p.planet === selectedPlanet.name) && (
                  <div className="text-red-600 dark:text-red-400 font-medium">
                    🔥 Combusted - Severely weakened
                  </div>
                )}
                {solarConditions.under_beams_planets?.find(p => p.planet === selectedPlanet.name) && (
                  <div className="text-orange-600 dark:text-orange-400 font-medium">
                    👁️ Under the Beams - Moderately weakened
                  </div>
                )}
              </>
            )}
          </div>
          <button 
            onClick={() => setSelectedPlanet(null)}
            className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Close
          </button>
        </div>
      )}

      {/* Planetary Legend Chip Row */}
      <div className={`w-full p-4 rounded-lg border ${
        darkMode ? 'bg-gray-800/30 border-gray-600' : 'bg-gray-50/80 border-gray-200'
      }`}>
        <div className="text-center">
          <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Planetary Filter
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {/* Show All Button */}
            <button
              onClick={() => {
                setIsolatedPlanet(null);
                setSelectedPlanet(null);
              }}
              className={getShowAllButtonClass()}
            >
              All
            </button>
            
            {/* Planet Filter Chips */}
            {Object.entries(planets).map(([planetName, planetData]) => {
              const isActive = isolatedPlanet === planetName;
              const { gradient } = getEnhancedPlanetStyling(planetName, planetData);
              
              return (
                <button
                  key={planetName}
                  onClick={() => {
                    if (isActive) {
                      // If already active, deactivate both isolation and selection
                      setIsolatedPlanet(null);
                      setSelectedPlanet(null);
                    } else {
                      // If not active, activate isolation and show planet details
                      setIsolatedPlanet(planetName);
                      setSelectedPlanet({ name: planetName, data: planetData });
                    }
                  }}
                  className={getPlanetButtonClass(isActive)}
                  title={`${isActive ? 'Hide details and show all planets' : `Show ${planetName} details and isolate its aspects`}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                    {planetSymbols[planetName]}
                  </div>
                  <span className="hidden sm:inline">{planetName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Preserve existing components (DignityTablePanel, AspectsTablePanel, NotesPanel, etc.)
const DignityTablePanel = ({ chart, darkMode }) => {
  const planets = chart.chart_data?.planets || {};
  
  const getDignityCategory = (score) => {
    if (score >= 5) return { label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400' };
    if (score >= 3) return { label: 'Strong', color: 'text-green-600 dark:text-green-400' };
    if (score >= 1) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (score >= -1) return { label: 'Neutral', color: 'text-gray-600 dark:text-gray-400' };
    if (score >= -3) return { label: 'Weak', color: 'text-orange-600 dark:text-orange-400' };
    return { label: 'Poor', color: 'text-red-600 dark:text-red-400' };
  };

  const getStrengthBarWidth = (score) => {
    // Use magnitude for width, clamp to reasonable range (-10 to +10)
    const magnitude = Math.abs(score);
    const clampedMagnitude = Math.min(magnitude, 10);
    return Math.max(5, (clampedMagnitude / 10) * 100); // Minimum 5% for visibility
  };

  const getStrengthBarColor = (score) => {
    if (score > 0) {
      return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
    } else if (score < 0) {
      return 'bg-gradient-to-r from-red-400 to-red-600';
    } else {
      return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-2 font-medium">Planet</th>
              <th className="text-left py-2 font-medium">Sign</th>
              <th className="text-left py-2 font-medium">House</th>
              <th className="text-left py-2 font-medium">Dignity</th>
              <th className="text-left py-2 font-medium">Strength</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(planets).map(([planetName, planetData]) => {
              const dignityInfo = getDignityCategory(planetData.dignity_score);
              const strengthWidth = getStrengthBarWidth(planetData.dignity_score);
              
              return (
                <tr key={planetName} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <td className="py-3">
                    <div className="flex items-center">
                      <span className="font-medium">{planetName}</span>
                      {planetData.retrograde && (
                        <span className="ml-2 px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                          R
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-gray-600 dark:text-gray-300">{planetData.sign}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-gray-600 dark:text-gray-300">{planetData.house}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${dignityInfo.color}`}>
                        {dignityInfo.label}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-3">
                      <span className={`font-medium min-w-[2.5rem] text-right ${dignityInfo.color}`}>
                        {planetData.dignity_score > 0 ? '+' : ''}{planetData.dignity_score}
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${getStrengthBarColor(planetData.dignity_score)}`}
                          style={{ width: `${strengthWidth}%` }}
                          role="progressbar"
                          aria-label={`Dignity strength: ${planetData.dignity_score > 0 ? '+' : ''}${planetData.dignity_score}`}
                          aria-valuenow={planetData.dignity_score}
                          aria-valuemin={-10}
                          aria-valuemax={10}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>• R = Retrograde motion</div>
        <div>• Strength bars show relative dignity (-10 to +10 scale)</div>
        <div>• Green bars = positive dignity, Red bars = negative dignity</div>
        
      </div>
    </div>
  );
};

// Enhanced Aspects Table Panel (preserved with minor enhancements)
const AspectsTablePanel = ({ chart, darkMode }) => {
  const aspects = chart.chart_data?.aspects || [];
  
  const getAspectColor = (aspectName) => {
    switch (aspectName) {
      case 'Conjunction': return 'text-yellow-600 dark:text-yellow-400';
      case 'Sextile': return 'text-emerald-600 dark:text-emerald-400';
      case 'Square': return 'text-red-600 dark:text-red-400';
      case 'Trine': return 'text-blue-600 dark:text-blue-400';
      case 'Opposition': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getAspectSymbol = (aspectName) => {
    switch (aspectName) {
      case 'Conjunction': return '☌';
      case 'Sextile': return '⚹';
      case 'Square': return '□';
      case 'Trine': return '△';
      case 'Opposition': return '☍';
      default: return '○';
    }
  };

  const getOrbQuality = (orb) => {
    if (orb <= 1) return { label: 'Exact', color: 'text-emerald-600 dark:text-emerald-400' };
    if (orb <= 3) return { label: 'Close', color: 'text-blue-600 dark:text-blue-400' };
    if (orb <= 6) return { label: 'Moderate', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Wide', color: 'text-gray-600 dark:text-gray-400' };
  };

  return (
    <div className="space-y-4">
      {aspects.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          No major aspects found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left py-2 font-medium">Aspect</th>
                <th className="text-left py-2 font-medium">Orb</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Quality</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((aspect, index) => {
                const aspectColor = getAspectColor(aspect.aspect);
                const aspectSymbol = getAspectSymbol(aspect.aspect);
                const orbQuality = getOrbQuality(aspect.orb);
                
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-lg ${aspectColor}`}>{aspectSymbol}</span>
                        <div>
                          <div className="font-medium">
                            {aspect.planet1} {aspect.aspect} {aspect.planet2}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{aspect.orb?.toFixed(1)}°</span>
                        <span className={`text-xs ${orbQuality.color}`}>
                          {orbQuality.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        aspect.applying 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {aspect.applying ? 'Applying' : 'Separating'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        {aspect.applying ? 'Will perfect' : 'Past perfection'}
                        {aspect.exact_time && (
                          <div className="text-purple-600 dark:text-purple-400">
                            {new Date(aspect.exact_time).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>• Applying aspects are forming and will perfect</div>
        <div>• Separating aspects have already perfected</div>
        <div>• Orb quality: Exact (≤1°), Close (≤3°), Moderate (≤6°), Wide (&gt;6°)</div>
        <div>• Enhanced engine checks for future retrograde frustration</div>
      </div>
    </div>
  );
};

// Notes Panel Component (preserved)
const NotesPanel = ({ noteText, setNoteText, isEditing, setIsEditing, onSave, darkMode }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Chart Notes</h4>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={onSave}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-sm hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add your notes about this enhanced chart... (Markdown supported)"
          className={`w-full h-40 p-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
            darkMode 
              ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
              : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
          }`}
        />
      ) : (
        <div className={`min-h-20 p-3 rounded-lg border ${
          darkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
        }`}>
          {noteText ? (
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {noteText}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              No notes yet. Click Edit to add your observations about this enhanced chart analysis.
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
        <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300">
          <Mic className="w-3 h-3" />
          <span>Voice Note</span>
        </button>
        <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300">
          <Video className="w-3 h-3" />
          <span>Video Link</span>
        </button>
        <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300">
          <Link className="w-3 h-3" />
          <span>External Link</span>
        </button>
      </div>
    </div>
  );
};

// Timeline Component (Preserved with minor enhancements)
const Timeline = ({ charts, setCurrentChart, setCurrentView, darkMode }) => {
  const [selectedTag, setSelectedTag] = useState('all');

  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700' 
    : 'bg-white/60 backdrop-blur-xl border-white/80';

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set(['all']);
    charts.forEach(chart => {
      chart.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [charts]);

  // Filter charts by tag
  const filteredCharts = useMemo(() => {
    let filtered = charts;
    
    if (selectedTag !== 'all') {
      filtered = filtered.filter(chart => chart.tags?.includes(selectedTag));
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [charts, selectedTag]);

  // Group charts by date
  const groupedCharts = useMemo(() => {
    const groups = {};
    filteredCharts.forEach(chart => {
      const date = new Date(chart.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(chart);
    });
    return groups;
  }, [filteredCharts]);

  const getOutcomeEmoji = (judgment) => {
    switch (judgment) {
      case 'YES': return '✅';
      case 'NO': return '❌';
      default: return '❓';
    }
  };

  const getTagColor = (tag) => {
    const colors = {
      'career': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'relationship': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      'finance': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'health': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'travel': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'family': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'property': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'education': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      'gambling': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      'default': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[tag] || colors.default;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Timeline View</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Track patterns and outcomes across your enhanced horary practice.
        </p>
      </div>

      {/* Filters */}
      <div className={`${cardBg} border rounded-2xl p-6 mb-8`}>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag === 'all' ? 'All' : tag.charAt(0).toUpperCase() + tag.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {filteredCharts.length} charts
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {Object.keys(groupedCharts).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedCharts).map(([date, dayCharts]) => (
            <div key={date} className="relative">
              {/* Date Header */}
              <div className="sticky top-20 z-10 mb-4">
                <div className={`inline-block px-4 py-2 rounded-xl text-sm font-medium ${cardBg} border`}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>

              {/* Charts for this date */}
              <div className="space-y-4 pl-8 border-l-2 border-gray-200 dark:border-gray-600 relative">
                {dayCharts.map((chart, index) => (
                  <div key={chart.id} className="relative">
                    {/* Timeline dot with enhanced styling */}
                    <div className={`absolute -left-10 top-4 w-4 h-4 rounded-full border-2 ${
                      chart.judgment === 'YES' ? 'bg-emerald-500 border-emerald-300' :
                      chart.judgment === 'NO' ? 'bg-red-500 border-red-300' :
                      'bg-amber-500 border-amber-300'
                    } ${chart.enhanced ? 'ring-2 ring-indigo-300 ring-opacity-50' : ''}`}></div>

                    {/* Chart Card */}
                    <div 
                      className={`${cardBg} border rounded-xl p-4 hover:scale-[1.01] transition-all duration-200 cursor-pointer`}
                      onClick={() => {
                        setCurrentChart(chart);
                        setCurrentView('chart-view');
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getOutcomeEmoji(chart.judgment)}</span>
                          <div>
                            <h3 className="font-medium line-clamp-1 flex items-center">
                              {chart.question}
                              {chart.enhanced && (
                                <Sparkles className="w-3 h-3 ml-2 text-indigo-500" />
                              )}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <span>{new Date(chart.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              {chart.enhanced && (
                                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs">
                                  Enhanced
                                </span>
                              )}
                              {chart.demo && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                                  Demo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            chart.judgment === 'YES' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            chart.judgment === 'NO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {chart.judgment}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {chart.confidence}%
                          </span>
                        </div>
                      </div>

                      {/* Tags */}
                      {chart.tags && chart.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {chart.tags.map(tag => (
                            <span key={tag} className={`px-2 py-1 rounded text-xs ${getTagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No charts in timeline</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Cast some enhanced charts to see your horary timeline develop.
          </p>
        </div>
      )}

      {/* Enhanced Pattern Analysis */}
      {filteredCharts.length > 0 && (
        <div className={`${cardBg} border rounded-2xl p-6 mt-8`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
            Enhanced Pattern Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round((filteredCharts.filter(c => c.judgment === 'YES').length / filteredCharts.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Positive Outcomes</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(filteredCharts.reduce((sum, c) => sum + (c.confidence || 0), 0) / filteredCharts.length)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Avg Confidence</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {filteredCharts.filter(c => c.enhanced).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Enhanced Charts</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {filteredCharts.filter(c => c.solar_factors?.significant).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Solar Conditions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// NotebookView Component (Preserved)
const NotebookView = ({ charts, notes, setNotes, darkMode, setCurrentChart, setCurrentView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChart, setSelectedChart] = useState(null);
  const [currentNote, setCurrentNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700' 
    : 'bg-white/60 backdrop-blur-xl border-white/80';

  const chartsWithNotes = useMemo(() => {
    return charts.filter(chart => notes[chart.id] && notes[chart.id].trim().length > 0);
  }, [charts, notes]);

  const filteredCharts = useMemo(() => {
    if (!searchTerm) return chartsWithNotes;
    
    return chartsWithNotes.filter(chart => 
      chart.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notes[chart.id]?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [chartsWithNotes, searchTerm, notes]);

  useEffect(() => {
    if (selectedChart) {
      setCurrentNote(notes[selectedChart.id] || '');
    }
  }, [selectedChart, notes]);

  const handleSaveNote = () => {
    if (selectedChart) {
      setNotes(selectedChart.id, currentNote);
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Enhanced Notebook</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Manage notes, observations, and follow-ups for your enhanced horary charts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notes List - Left Panel */}
        <div className="lg:col-span-1">
          <div className={`${cardBg} border rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Notes ({chartsWithNotes.length})</h3>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>

            {/* Notes List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCharts.map(chart => (
                <button
                  key={chart.id}
                  onClick={() => {
                    setSelectedChart(chart);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    selectedChart?.id === chart.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } border`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm line-clamp-1">
                      {chart.question}
                    </div>
                    {chart.enhanced && (
                      <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {new Date(chart.timestamp).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {notes[chart.id]?.substring(0, 100)}...
                  </div>
                </button>
              ))}
              
              {filteredCharts.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  {chartsWithNotes.length === 0 ? 'No notes yet' : 'No matching notes'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note Editor - Right Panel */}
        <div className="lg:col-span-2">
          <div className={`${cardBg} border rounded-2xl p-6`}>
            {selectedChart ? (
              <>
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold line-clamp-1 flex items-center">
                      {selectedChart.question}
                      {selectedChart.enhanced && (
                        <Sparkles className="w-4 h-4 ml-2 text-indigo-500" />
                      )}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(selectedChart.timestamp).toLocaleDateString()} • {selectedChart.judgment} ({selectedChart.confidence}%)
                      {selectedChart.enhanced && ' • Enhanced Analysis'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setCurrentChart(selectedChart);
                        setCurrentView('chart-view');
                      }}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Chart</span>
                    </button>
                    
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center space-x-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-sm hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveNote}
                          className="flex items-center space-x-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-sm hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setCurrentNote(notes[selectedChart.id] || '');
                          }}
                          className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Editor */}
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      placeholder="Write your notes about this enhanced chart... (Markdown supported)"
                      className={`w-full h-80 p-4 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                        darkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white/70 border-gray-200 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    
                    {/* Markdown toolbar */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Markdown supported:</span>
                      <span>**bold**</span>
                      <span>*italic*</span>
                      <span># heading</span>
                      <span>- list</span>
                      <span>[link](url)</span>
                    </div>
                  </div>
                ) : (
                  <div className={`min-h-80 p-4 rounded-lg border ${
                    darkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {currentNote ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {currentNote}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No notes for this enhanced chart yet. Click Edit to add your observations.
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a chart to view its notes
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose an enhanced chart from the list to view and edit its notes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Settings Component
const Settings = ({ darkMode, toggleDarkMode, setCurrentView, apiStatus, onRefreshApi }) => {
  const [apiVersion, setApiVersion] = useState(null);
  const [loading, setLoading] = useState(false);

  const cardBg = darkMode 
    ? 'bg-gray-800/60 backdrop-blur-xl border-gray-700' 
    : 'bg-white/60 backdrop-blur-xl border-white/80';

  useEffect(() => {
    if (apiStatus === 'connected') {
      fetchApiVersion();
    }
  }, [apiStatus]);

  const fetchApiVersion = async () => {
    try {
      const version = await VoxStellaAPI.getVersion();
      setApiVersion(version);
    } catch (error) {
      console.error('Failed to fetch API version:', error);
    }
  };

  const testApiConnection = async () => {
    setLoading(true);
    try {
      await VoxStellaAPI.getHealth();
      onRefreshApi();
    } catch (error) {
      console.error('API test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const settingsOptions = [
    {
      title: "Appearance",
      items: [
        {
          name: "Dark Mode",
          description: "Toggle between light and dark themes",
          type: "toggle",
          value: darkMode,
          onChange: toggleDarkMode
        },
        {
          name: "Theme Color",
          description: "Choose your preferred accent color",
          type: "select",
          options: ["Teal", "Purple", "Blue", "Green"],
          value: "Teal"
        }
      ]
    },
    {
      title: "Enhanced Chart Preferences",
      items: [
        {
          name: "House System",
          description: "Default house system for enhanced calculations",
          type: "select",
          options: ["Regiomontanus", "Placidus", "Whole Sign", "Equal"],
          value: "Regiomontanus"
        },
        {
          name: "Enhanced Orb Settings",
          description: "Default orb allowances for traditional aspects",
          type: "slider",
          value: 8,
          min: 1,
          max: 15
        },
        {
          name: "Reception Weighting",
          description: "Enhanced exaltation confidence boost",
          type: "slider",
          value: 15,
          min: 0,
          max: 30
        }
      ]
    },
    {
      title: "Enhanced Features",
      items: [
        {
          name: "Future Retrograde Protection",
          description: "Enable enhanced retrograde frustration checks",
          type: "toggle",
          value: true
        },
        {
          name: "Enhanced Solar Conditions",
          description: "Use visibility-based combustion exceptions",
          type: "toggle",
          value: true
        },
        {
          name: "Directional Motion Awareness",
          description: "Consider planetary direction for sign boundaries",
          type: "toggle",
          value: true
        }
      ]
    },
    {
      title: "Advanced Horary Configuration",
      description: "Customize traditional horary rules and weights",
      items: [
        {
          name: "Aspect Orbs",
          description: "Traditional aspect orbs (degrees)",
          type: "group",
          items: [
            { name: "Conjunction", type: "slider", value: 8.0, min: 1, max: 15, step: 0.5 },
            { name: "Sextile", type: "slider", value: 6.0, min: 1, max: 12, step: 0.5 },
            { name: "Square", type: "slider", value: 8.0, min: 1, max: 15, step: 0.5 },
            { name: "Trine", type: "slider", value: 8.0, min: 1, max: 15, step: 0.5 },
            { name: "Opposition", type: "slider", value: 8.0, min: 1, max: 15, step: 0.5 }
          ]
        },
        {
          name: "Confidence Levels",
          description: "Base confidence for different perfection types",
          type: "group",
          items: [
            { name: "Direct (Mutual Rulership)", type: "slider", value: 95, min: 50, max: 100, step: 1 },
            { name: "Direct (Mutual Exaltation)", type: "slider", value: 85, min: 50, max: 100, step: 1 },
            { name: "Translation of Light", type: "slider", value: 75, min: 50, max: 95, step: 1 },
            { name: "Collection of Light", type: "slider", value: 70, min: 50, max: 95, step: 1 },
            { name: "Reception Only", type: "slider", value: 65, min: 30, max: 90, step: 1 }
          ]
        },
        {
          name: "Solar Conditions",
          description: "Cazimi and combustion parameters",
          type: "group",
          items: [
            { name: "Cazimi Orb (arcminutes)", type: "slider", value: 17, min: 10, max: 30, step: 1 },
            { name: "Combustion Orb (degrees)", type: "slider", value: 8.5, min: 6, max: 12, step: 0.5 },
            { name: "Under Beams Orb (degrees)", type: "slider", value: 15.0, min: 10, max: 20, step: 0.5 },
            { name: "Cazimi Bonus", type: "slider", value: 15, min: 5, max: 25, step: 1 },
            { name: "Combustion Penalty", type: "slider", value: 10, min: 5, max: 20, step: 1 }
          ]
        },
        {
          name: "Moon Settings",
          description: "Void-of-course and lunar testimony",
          type: "group",
          items: [
            { name: "Void Penalty", type: "slider", value: 10, min: 0, max: 30, step: 1 },
            { name: "Moon in Cancer Exception", type: "toggle", value: true },
            { name: "Moon in Sagittarius Exception", type: "toggle", value: true }
          ]
        },
        {
          name: "Radicality Checks",
          description: "Chart validity parameters",
          type: "group",
          items: [
            { name: "Early Ascendant (degrees)", type: "slider", value: 3.0, min: 1, max: 10, step: 0.5 },
            { name: "Late Ascendant (degrees)", type: "slider", value: 27.0, min: 20, max: 30, step: 0.5 },
            { name: "Check Saturn in 7th", type: "toggle", value: true },
            { name: "Check Via Combusta", type: "toggle", value: true },
            { name: "Radicality Warning Penalty", type: "slider", value: 15, min: 0, max: 30, step: 1 }
          ]
        },
        {
          name: "Dignity Weights",
          description: "Traditional dignity scoring",
          type: "group",
          items: [
            { name: "Rulership", type: "slider", value: 5, min: 1, max: 10, step: 1 },
            { name: "Exaltation", type: "slider", value: 4, min: 1, max: 8, step: 1 },
            { name: "Triplicity", type: "slider", value: 3, min: 1, max: 6, step: 1 },
            { name: "Detriment", type: "slider", value: -5, min: -10, max: -1, step: 1 },
            { name: "Fall", type: "slider", value: -4, min: -8, max: -1, step: 1 },
            { name: "Joy", type: "slider", value: 2, min: 1, max: 5, step: 1 }
          ]
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
        <h2 className="text-3xl font-bold mb-2 flex items-center">
          Enhanced Settings
          <Sparkles className="w-6 h-6 ml-3 text-indigo-500" />
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Customize your enhanced horary astrology experience.
        </p>
      </div>

      {/* Enhanced API Status */}
      <div className={`${cardBg} border rounded-2xl p-6 mb-8`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2" />
          Enhanced API Connection
        </h3>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              apiStatus === 'connected' ? 'bg-emerald-500' : 
              apiStatus === 'offline' ? 'bg-red-500' : 'bg-amber-500'
            }`}></div>
            <span className="font-medium">
              {apiStatus === 'connected' ? 'API Connected' : 
               apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {apiStatus === 'connected' ? 'Enhanced Horary Engine available' :
               'Using demo mode with simulated features'}
            </span>
          </div>
          
          <button
            onClick={testApiConnection}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Test Connection</span>
          </button>
        </div>

        {apiVersion && (
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <div>Enhanced API Version: {apiVersion.api_version}</div>
            <div>Engine: {apiVersion.engine_version}</div>
            <div>Release Date: {apiVersion.release_date}</div>
            {apiVersion.enhanced_features && (
              <div className="mt-2">
                <span className="font-medium">Enhanced Features:</span>
                <ul className="mt-1 space-y-1 text-xs">
                  {Object.entries(apiVersion.enhanced_features).map(([feature, info]) => (
                    <li key={feature} className="flex items-center">
                      <Sparkles className="w-3 h-3 mr-2 text-indigo-500" />
                      {info.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>


      <div className="space-y-8">
        {settingsOptions.map((section, sectionIndex) => (
          <div key={sectionIndex} className={`${cardBg} border rounded-2xl p-6`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              {section.title}
              {section.title.includes('Enhanced') && (
                <Sparkles className="w-4 h-4 ml-2 text-indigo-500" />
              )}
              {section.title.includes('Advanced') && (
                <Sliders className="w-4 h-4 ml-2 text-amber-500" />
              )}
            </h3>
            {section.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{section.description}</p>
            )}
            {section.title.includes('Advanced') && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-2" />
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Advanced Configuration</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  These settings modify traditional horary calculation rules. Changes are saved automatically and affect all new charts.
                  Use "Reset to Defaults" to restore classical values from Lilly, Bonatti, and other traditional sources.
                </p>
                <div className="flex space-x-2 mt-3">
                  <button className="px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-800 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-600 transition-colors">
                    Reset to Defaults
                  </button>
                  <button className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-800 dark:text-blue-200 rounded border border-blue-300 dark:border-blue-600 transition-colors">
                    Export Settings
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className={`py-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                  item.type === 'group' ? 'block' : 'flex justify-between items-center'
                }`}>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                  </div>
                  
                  {item.type !== 'group' && (
                    <div className="ml-4">
                      {item.type === 'toggle' && (
                        <button
                          onClick={item.onChange}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            item.value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              item.value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                      {item.type === 'select' && (
                        <select 
                          defaultValue={item.value}
                          className={`px-3 py-2 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                            darkMode 
                              ? 'bg-gray-700/50 border-gray-600 text-white' 
                              : 'bg-white/70 border-gray-200 text-gray-900'
                          }`}
                        >
                          {item.options?.map((option, optIndex) => (
                            <option key={optIndex} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                      {item.type === 'slider' && (
                        <div className="flex items-center space-x-3">
                          <input
                            type="range"
                            min={item.min || 1}
                            max={item.max || 15}
                            step={item.step || 1}
                            defaultValue={item.value}
                            className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-8">
                            {item.value}{item.max > 20 ? '%' : '°'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {item.type === 'group' && (
                    <div className="mt-4 space-y-3">
                      {item.items?.map((subItem, subIndex) => (
                        <div key={subIndex} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{subItem.name}</span>
                          </div>
                          <div className="ml-4">
                            {subItem.type === 'slider' && (
                              <div className="flex items-center space-x-3">
                                <input
                                  type="range"
                                  min={subItem.min}
                                  max={subItem.max}
                                  step={subItem.step || 1}
                                  defaultValue={subItem.value}
                                  className="w-16 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                  onChange={(e) => {
                                    // Update the display value
                                    const valueSpan = e.target.nextElementSibling;
                                    if (valueSpan) {
                                      valueSpan.textContent = e.target.value + (subItem.max > 50 ? '' : subItem.name.includes('arcminutes') ? '"' : '°');
                                    }
                                  }}
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-300 min-w-8">
                                  {subItem.value}{subItem.max > 50 ? '' : subItem.name.includes('arcminutes') ? '"' : '°'}
                                </span>
                              </div>
                            )}
                            {subItem.type === 'toggle' && (
                              <button
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  subItem.value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                    subItem.value ? 'translate-x-5' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            )}
                            {subItem.type === 'select' && (
                              <select 
                                defaultValue={subItem.value}
                                className={`px-2 py-1 text-sm rounded border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                  darkMode 
                                    ? 'bg-gray-600 border-gray-500 text-white' 
                                    : 'bg-white border-gray-200 text-gray-900'
                                }`}
                              >
                                {subItem.options?.map((option, optIndex) => (
                                  <option key={optIndex} value={option}>{option}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Enhanced About Section */}
        <div className={`${cardBg} border rounded-2xl p-6`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            About Enhanced Vox Stella
            <Sparkles className="w-4 h-4 ml-2 text-indigo-500" />
          </h3>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>App Version</span>
              <span>2.0.0 Enhanced</span>
            </div>
            <div className="flex justify-between">
              <span>Engine</span>
              <span>Enhanced Traditional Horary with Solar Conditions v2.0</span>
            </div>
            <div className="flex justify-between">
              <span>Ephemeris</span>
              <span>Swiss Ephemeris with Enhanced Calculations</span>
            </div>
            <div className="flex justify-between">
              <span>House System</span>
              <span>Regiomontanus (Traditional with Enhanced Motion Awareness)</span>
            </div>
            <div className="flex justify-between">
              <span>Enhanced Features</span>
              <span>9 Advanced Traditional Enhancements</span>
            </div>
            <div className="flex justify-between">
              <span>Classical Sources</span>
              <span>Lilly, Bonatti, Ptolemy, Firmicus, Al-Biruni</span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm flex items-center">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Enhanced Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Footer Component (Preserved)
const Footer = ({ darkMode, currentView, setCurrentView }) => {
  const footerBg = darkMode 
    ? 'bg-gray-800/90 backdrop-blur-xl border-gray-700' 
    : 'bg-white/90 backdrop-blur-xl border-gray-200';

  return (
    <footer className={`fixed bottom-0 left-0 right-0 ${footerBg} border-t md:hidden`}>
      <div className="flex justify-around items-center py-2">
        <FooterButton 
          icon={BarChart3} 
          label="Dashboard" 
          active={currentView === 'dashboard'}
          onClick={() => setCurrentView('dashboard')}
        />
        <FooterButton 
          icon={Plus} 
          label="Cast" 
          active={currentView === 'cast-chart'}
          onClick={() => setCurrentView('cast-chart')}
        />
        <FooterButton 
          icon={History} 
          label="Timeline" 
          active={currentView === 'timeline'}
          onClick={() => setCurrentView('timeline')}
        />
        <FooterButton 
          icon={BookOpen} 
          label="Notes" 
          active={currentView === 'notebook'}
          onClick={() => setCurrentView('notebook')}
        />
        <FooterButton 
          icon={SettingsIcon} 
          label="Settings" 
          active={currentView === 'settings'}
          onClick={() => setCurrentView('settings')}
        />
      </div>
    </footer>
  );
};

// Footer Button Component (Enhanced)
const FooterButton = ({ icon: Icon, label, active, onClick, customIcon }) => {
  const activeClasses = active 
    ? 'text-indigo-600 dark:text-indigo-400' 
    : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400';

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center py-2 px-3 transition-colors ${activeClasses}`}
    >
      {customIcon ? customIcon : <Icon className="w-5 h-5 mb-1" />}
      <span className="text-xs">{label}</span>
    </button>
  );
};

export default VoxStellaApp;
