// Database Status Utility
// This file manages the live database status information

export interface DatabaseStatus {
  isOnline: boolean;
  lastSync: Date;
  jurisdictions: string[];
  totalRecords: number;
}

// Simulated last sync date (in production, this would come from an API or database)
// Updates every 24 hours
export function getLastSyncDate(): Date {
  // Get today's date
  const today = new Date();
  // Set to midnight for consistency
  today.setHours(0, 0, 0, 0);
  return today;
}

// Format date for display
export function formatLastSync(date: Date, language: string = 'EN'): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  if (language === 'TR') {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return date.toLocaleDateString('en-US', options);
}

// Get database status
export function getDatabaseStatus(): DatabaseStatus {
  return {
    isOnline: true,
    lastSync: getLastSyncDate(),
    jurisdictions: ['TR', 'US', 'UK', 'DE'],
    totalRecords: 1200000 // 1.2M+ records
  };
}

