/**
 * Parse PDF filenames to create violation page mapping
 * This script reads all PDF files and creates a comprehensive data structure
 * showing which pages have violations for each report date and bureau
 */

const fs = require('fs');
const path = require('path');

// Read all PDF files from the directory
const pdfDir = path.join(__dirname, '../public/data/pdfs');
const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));

// Initialize the report structure based on the provided data
const reportStructure = {
  "2024-04-25": {
    displayDate: "4/25/24",
    bureaus: {
      "EQ": { totalPages: 84, violationPages: new Set() },
      "EX": { totalPages: 51, violationPages: new Set() },
      "TU": { totalPages: 95, violationPages: new Set() }
    }
  },
  "2024-08-19": {
    displayDate: "8/19/24",
    bureaus: {
      "EQ": { totalPages: 41, violationPages: new Set() },
      "EX": null,
      "TU": null
    }
  },
  "2025-02-10": {
    displayDate: "2/10/25",
    bureaus: {
      "EQ": { totalPages: 73, violationPages: new Set() },
      "EX": { totalPages: 50, violationPages: new Set() },
      "TU": { totalPages: 91, violationPages: new Set() }
    }
  },
  "2025-03-02": {
    displayDate: "3/2/25",
    bureaus: {
      "EQ": { totalPages: 73, violationPages: new Set() },
      "EX": { totalPages: 47, violationPages: new Set() },
      "TU": { totalPages: 92, violationPages: new Set() }
    }
  },
  "2025-03-13": {
    displayDate: "3/13/25",
    bureaus: {
      "EQ": { totalPages: 64, violationPages: new Set() },
      "EX": { totalPages: 48, violationPages: new Set() },
      "TU": { totalPages: 94, violationPages: new Set() }
    }
  },
  "2025-03-20": {
    displayDate: "3/20/25",
    bureaus: {
      "EQ": { totalPages: 16, violationPages: new Set() },
      "EX": { totalPages: 45, violationPages: new Set() },
      "TU": null
    }
  },
  "2025-03-22": {
    displayDate: "3/22/25",
    bureaus: {
      "EQ": { totalPages: 63, violationPages: new Set() },
      "EX": null,
      "TU": { totalPages: 88, violationPages: new Set() }
    }
  },
  "2025-04-02": {
    displayDate: "4/2/25",
    bureaus: {
      "EQ": { totalPages: 65, violationPages: new Set() },
      "EX": { totalPages: 44, violationPages: new Set() },
      "TU": { totalPages: 91, violationPages: new Set() }
    }
  },
  "2025-04-14": {
    displayDate: "4/14/25",
    bureaus: {
      "EQ": { totalPages: 65, violationPages: new Set() },
      "EX": { totalPages: 45, violationPages: new Set() },
      "TU": { totalPages: 83, violationPages: new Set() }
    }
  },
  "2025-05-25": {
    displayDate: "5/25/25",
    bureaus: {
      "EQ": { totalPages: 65, violationPages: new Set() },
      "EX": { totalPages: 45, violationPages: new Set() },
      "TU": { totalPages: 82, violationPages: new Set() }
    }
  },
  "2025-07-09": {
    displayDate: "7/9/25",
    bureaus: {
      "EQ": { totalPages: 22, violationPages: new Set() },
      "EX": { totalPages: 44, violationPages: new Set() },
      "TU": { totalPages: 81, violationPages: new Set() }
    }
  },
  "2025-08-10": {
    displayDate: "8/10/25",
    bureaus: {
      "EQ": { totalPages: 22, violationPages: new Set() },
      "EX": null,
      "TU": { totalPages: 81, violationPages: new Set() }
    }
  },
  "2025-08-24": {
    displayDate: "8/24/25",
    bureaus: {
      "EQ": null,
      "EX": null,
      "TU": { totalPages: 25, violationPages: new Set() }
    }
  }
};

// Parse each PDF filename to identify violation pages
pdfFiles.forEach(filename => {
  // Format: AL-[Bureau]-[YYYY]-[MM]-[DD]-P[PageNum].pdf
  const match = filename.match(/AL-([A-Z]+)-(\d{4})-(\d{2})-(\d{2})-P(\d+)\.pdf/);

  if (match) {
    const [_, bureau, year, month, day, pageStr] = match;
    const date = `${year}-${month}-${day}`;
    const pageNum = parseInt(pageStr, 10);

    // Add to violation pages if the report exists
    if (reportStructure[date] && reportStructure[date].bureaus[bureau]) {
      reportStructure[date].bureaus[bureau].violationPages.add(pageNum);
    }
  }
});

// Convert Sets to sorted Arrays for JSON serialization
const finalStructure = {};
Object.entries(reportStructure).forEach(([date, report]) => {
  finalStructure[date] = {
    displayDate: report.displayDate,
    bureaus: {}
  };

  Object.entries(report.bureaus).forEach(([bureau, data]) => {
    if (data === null) {
      finalStructure[date].bureaus[bureau] = null;
    } else {
      finalStructure[date].bureaus[bureau] = {
        totalPages: data.totalPages,
        violationPages: Array.from(data.violationPages).sort((a, b) => a - b)
      };
    }
  });
});

// Calculate statistics
let stats = {
  totalReports: Object.keys(finalStructure).length,
  totalPDFs: pdfFiles.length,
  reportsByBureau: {
    EQ: 0,
    EX: 0,
    TU: 0
  },
  violationPagesByBureau: {
    EQ: 0,
    EX: 0,
    TU: 0
  }
};

Object.values(finalStructure).forEach(report => {
  Object.entries(report.bureaus).forEach(([bureau, data]) => {
    if (data !== null) {
      stats.reportsByBureau[bureau]++;
      stats.violationPagesByBureau[bureau] += data.violationPages.length;
    }
  });
});

// Add stats to final structure
finalStructure.statistics = stats;

// Save to JSON file
const outputPath = path.join(__dirname, '../public/data/config/reports-master.json');
fs.writeFileSync(outputPath, JSON.stringify(finalStructure, null, 2));

console.log('Report structure created successfully!');
console.log(`Total reports: ${stats.totalReports}`);
console.log(`Total PDFs processed: ${stats.totalPDFs}`);
console.log(`Reports by bureau: EQ=${stats.reportsByBureau.EQ}, EX=${stats.reportsByBureau.EX}, TU=${stats.reportsByBureau.TU}`);
console.log(`Violation pages by bureau: EQ=${stats.violationPagesByBureau.EQ}, EX=${stats.violationPagesByBureau.EX}, TU=${stats.violationPagesByBureau.TU}`);
console.log(`Output saved to: ${outputPath}`);