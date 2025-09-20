/**
 * Enhanced parser that extracts creditor information from PDF filenames
 * Creates comprehensive violation mapping with creditor data
 */

const fs = require('fs');
const path = require('path');

// Load creditor mappings
const creditorsPath = path.join(__dirname, '../public/data/config/creditors.json');
const creditors = JSON.parse(fs.readFileSync(creditorsPath, 'utf8'));

// Read all PDF files
const pdfDir = path.join(__dirname, '../public/data/pdfs');
const pdfFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));

// Initialize report structure with page counts
const reportStructure = {
  "2024-04-25": {
    displayDate: "4/25/24",
    bureaus: {
      "EQ": { totalPages: 84, violations: {} },
      "EX": { totalPages: 51, violations: {} },
      "TU": { totalPages: 95, violations: {} }
    }
  },
  "2024-08-19": {
    displayDate: "8/19/24",
    bureaus: {
      "EQ": { totalPages: 41, violations: {} },
      "EX": null,
      "TU": null
    }
  },
  "2025-02-10": {
    displayDate: "2/10/25",
    bureaus: {
      "EQ": { totalPages: 73, violations: {} },
      "EX": { totalPages: 50, violations: {} },
      "TU": { totalPages: 91, violations: {} }
    }
  },
  "2025-03-02": {
    displayDate: "3/2/25",
    bureaus: {
      "EQ": { totalPages: 73, violations: {} },
      "EX": { totalPages: 47, violations: {} },
      "TU": { totalPages: 92, violations: {} }
    }
  },
  "2025-03-13": {
    displayDate: "3/13/25",
    bureaus: {
      "EQ": { totalPages: 64, violations: {} },
      "EX": { totalPages: 48, violations: {} },
      "TU": { totalPages: 94, violations: {} }
    }
  },
  "2025-03-20": {
    displayDate: "3/20/25",
    bureaus: {
      "EQ": { totalPages: 16, violations: {} },
      "EX": { totalPages: 45, violations: {} },
      "TU": null
    }
  },
  "2025-03-22": {
    displayDate: "3/22/25",
    bureaus: {
      "EQ": { totalPages: 63, violations: {} },
      "EX": null,
      "TU": { totalPages: 88, violations: {} }
    }
  },
  "2025-04-02": {
    displayDate: "4/2/25",
    bureaus: {
      "EQ": { totalPages: 65, violations: {} },
      "EX": { totalPages: 44, violations: {} },
      "TU": { totalPages: 91, violations: {} }
    }
  },
  "2025-04-14": {
    displayDate: "4/14/25",
    bureaus: {
      "EQ": { totalPages: 65, violations: {} },
      "EX": { totalPages: 45, violations: {} },
      "TU": { totalPages: 83, violations: {} }
    }
  },
  "2025-05-25": {
    displayDate: "5/25/25",
    bureaus: {
      "EQ": { totalPages: 65, violations: {} },
      "EX": { totalPages: 45, violations: {} },
      "TU": { totalPages: 82, violations: {} }
    }
  },
  "2025-07-09": {
    displayDate: "7/9/25",
    bureaus: {
      "EQ": { totalPages: 22, violations: {} },
      "EX": { totalPages: 44, violations: {} },
      "TU": { totalPages: 81, violations: {} }
    }
  },
  "2025-08-10": {
    displayDate: "8/10/25",
    bureaus: {
      "EQ": { totalPages: 22, violations: {} },
      "EX": null,
      "TU": { totalPages: 81, violations: {} }
    }
  },
  "2025-08-24": {
    displayDate: "8/24/25",
    bureaus: {
      "EQ": null,
      "EX": null,
      "TU": { totalPages: 25, violations: {} }
    }
  }
};

// Parse each PDF filename
console.log('\nParsing PDF files for violations...\n');
let totalViolations = 0;

pdfFiles.forEach(filename => {
  // Format: [CreditorCode]-[Bureau]-[YYYY]-[MM]-[DD]-P[PageNum].pdf
  const match = filename.match(/([A-Z0-9]+)-([A-Z]+)-(\d{4})-(\d{2})-(\d{2})-P(\d+)\.pdf/);

  if (match) {
    const [_, creditorCode, bureau, year, month, day, pageStr] = match;
    const date = `${year}-${month}-${day}`;
    const pageNum = parseInt(pageStr, 10);

    // Get creditor info
    const creditorInfo = creditors.creditorCodes[creditorCode] || {
      code: creditorCode,
      displayName: creditorCode.toLowerCase(),
      severity: "unknown"
    };

    // Add violation to report structure
    if (reportStructure[date] && reportStructure[date].bureaus[bureau]) {
      reportStructure[date].bureaus[bureau].violations[pageNum] = {
        page: pageNum,
        creditor: creditorInfo.displayName,
        creditorCode: creditorCode,
        severity: creditorInfo.severity,
        pdfFile: filename
      };
      totalViolations++;
    } else {
      console.warn(`⚠️  Unknown date or bureau: ${filename}`);
    }
  } else {
    console.warn(`⚠️  Could not parse: ${filename}`);
  }
});

// Create final structure with arrays and statistics
const finalStructure = {
  reports: {},
  statistics: {
    totalReports: 0,
    totalViolations: totalViolations,
    totalPDFs: pdfFiles.length,
    violationsByCreditor: {},
    violationsByBureau: { EQ: 0, EX: 0, TU: 0 },
    violationsBySeverity: { extreme: 0, severe: 0, warning: 0, unknown: 0 }
  }
};

// Process and convert to final structure
Object.entries(reportStructure).forEach(([date, report]) => {
  finalStructure.reports[date] = {
    displayDate: report.displayDate,
    bureaus: {}
  };

  Object.entries(report.bureaus).forEach(([bureau, data]) => {
    if (data === null) {
      finalStructure.reports[date].bureaus[bureau] = null;
    } else {
      // Get violation pages and creditor mapping
      const violationPages = Object.keys(data.violations).map(p => parseInt(p)).sort((a, b) => a - b);

      // Create page metadata for ALL pages
      const pageMetadata = {};
      for (let i = 1; i <= data.totalPages; i++) {
        if (data.violations[i]) {
          pageMetadata[i] = {
            hasViolation: true,
            creditor: data.violations[i].creditor,
            creditorCode: data.violations[i].creditorCode,
            severity: data.violations[i].severity,
            pdfFile: data.violations[i].pdfFile
          };

          // Update statistics
          finalStructure.statistics.violationsByBureau[bureau]++;
          finalStructure.statistics.violationsBySeverity[data.violations[i].severity]++;

          const credName = data.violations[i].creditor;
          finalStructure.statistics.violationsByCreditor[credName] =
            (finalStructure.statistics.violationsByCreditor[credName] || 0) + 1;
        } else {
          pageMetadata[i] = {
            hasViolation: false,
            creditor: "no violations on this page",
            creditorCode: null,
            severity: "none"
          };
        }
      }

      finalStructure.reports[date].bureaus[bureau] = {
        totalPages: data.totalPages,
        violationPages: violationPages,
        violationCount: violationPages.length,
        pageMetadata: pageMetadata
      };
    }
  });

  if (report.bureaus.EQ || report.bureaus.EX || report.bureaus.TU) {
    finalStructure.statistics.totalReports++;
  }
});

// Save enhanced report structure
const outputPath = path.join(__dirname, '../public/data/config/reports-enhanced.json');
fs.writeFileSync(outputPath, JSON.stringify(finalStructure, null, 2));

// Create summary
console.log('\n' + '='.repeat(60));
console.log('VIOLATION PARSING COMPLETE');
console.log('='.repeat(60));
console.log(`📊 Total Reports: ${finalStructure.statistics.totalReports}`);
console.log(`📄 Total PDFs Processed: ${finalStructure.statistics.totalPDFs}`);
console.log(`⚠️  Total Violations Found: ${finalStructure.statistics.totalViolations}`);
console.log('\n📈 Violations by Bureau:');
Object.entries(finalStructure.statistics.violationsByBureau).forEach(([bureau, count]) => {
  console.log(`   ${bureau}: ${count} violations`);
});
console.log('\n🏦 Top Creditors by Violations:');
const sortedCreditors = Object.entries(finalStructure.statistics.violationsByCreditor)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);
sortedCreditors.forEach(([creditor, count]) => {
  console.log(`   ${creditor}: ${count} violations`);
});
console.log('\n🎯 Violations by Severity:');
Object.entries(finalStructure.statistics.violationsBySeverity).forEach(([severity, count]) => {
  if (count > 0) {
    console.log(`   ${severity}: ${count} violations`);
  }
});
console.log('\n✅ Output saved to:', outputPath);
console.log('='.repeat(60));