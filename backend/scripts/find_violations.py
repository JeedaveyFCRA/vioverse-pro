#!/usr/bin/env python3
"""
PDF Violation Extraction Script
Extracts violation coordinates from credit report PDFs using PDFPlumber
Outputs CSV with exact coordinates for web viewer consumption
"""

import pdfplumber
import pandas as pd
import re
import sys
import os
from datetime import datetime
from pathlib import Path

# Import pattern modules
from patterns_tu import VIOLATION_PATTERNS as TU_PATTERNS, COMBINATION_PATTERNS as TU_COMBOS

class ViolationExtractor:
    def __init__(self, pdf_path, bureau="TU"):
        self.pdf_path = pdf_path
        self.bureau = bureau
        self.violations = []
        self.patterns = self._load_patterns(bureau)

    def _load_patterns(self, bureau):
        """Load patterns based on credit bureau"""
        if bureau == "TU":
            return {"violations": TU_PATTERNS, "combos": TU_COMBOS}
        # Future: Add EQ and EX patterns
        return {"violations": {}, "combos": {}}

    def extract_violations(self):
        """Main extraction method"""
        with pdfplumber.open(self.pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                self._process_page(page, page_num)

        return self._create_dataframe()

    def _process_page(self, page, page_num):
        """Process single PDF page for violations"""
        # Extract words with bounding boxes
        words = page.extract_words(
            keep_blank_chars=True,
            use_text_flow=True,
            extra_attrs=['fontname', 'size']
        )

        # Search for violations
        for violation_key, pattern_def in self.patterns["violations"].items():
            self._find_pattern_violations(words, violation_key, pattern_def, page_num)

        # Check for combination violations
        self._check_combinations(page_num)

    def _find_pattern_violations(self, words, violation_key, pattern_def, page_num):
        """Find violations matching specific pattern"""
        label_indices = []
        value_indices = []

        # Find label positions
        for i, word in enumerate(words):
            text = word['text'].strip()
            for label_pattern in pattern_def['label_patterns']:
                if label_pattern.lower() in text.lower():
                    label_indices.append(i)
                    break

        # Find value positions
        for i, word in enumerate(words):
            text = word['text'].strip()
            for value_pattern in pattern_def['value_patterns']:
                if isinstance(value_pattern, str):
                    if value_pattern.lower() in text.lower():
                        value_indices.append(i)
                else:  # regex pattern
                    if re.search(value_pattern, text):
                        value_indices.append(i)

        # Match labels with nearby values (within 50px)
        for label_idx in label_indices:
            label_word = words[label_idx]
            for value_idx in value_indices:
                value_word = words[value_idx]

                # Check proximity
                x_distance = abs(value_word['x0'] - label_word['x1'])
                y_distance = abs(value_word['top'] - label_word['top'])

                if x_distance < 50 and y_distance < 20:
                    # Found a violation
                    self._add_violation(
                        violation_key,
                        pattern_def,
                        value_word,
                        page_num
                    )

    def _add_violation(self, violation_type, pattern_def, word_bbox, page_num):
        """Add violation to list with coordinates"""
        violation = {
            'pdf_filename': os.path.basename(self.pdf_path),
            'rule_id': pattern_def['rule_id'],
            'violation_type': violation_type,
            'severity': pattern_def['severity'],
            'full_text': word_bbox['text'],
            'x': round(word_bbox['x0'], 2),
            'y': round(word_bbox['top'], 2),
            'width': round(word_bbox['x1'] - word_bbox['x0'], 2),
            'height': round(word_bbox['bottom'] - word_bbox['top'], 2),
            'page': page_num
        }
        self.violations.append(violation)

    def _check_combinations(self, page_num):
        """Check for combination violations"""
        page_violations = [v for v in self.violations if v['page'] == page_num]
        violation_types = set([v['violation_type'] for v in page_violations])

        for combo_key, combo_def in self.patterns["combos"].items():
            required = set(combo_def['required_fields'])
            if required.issubset(violation_types):
                # Add combination violation (no coordinates)
                combo_violation = {
                    'pdf_filename': os.path.basename(self.pdf_path),
                    'rule_id': combo_def['rule_id'],
                    'violation_type': combo_key,
                    'severity': combo_def['severity'],
                    'full_text': f"COMBO: {', '.join(required)}",
                    'x': None,
                    'y': None,
                    'width': None,
                    'height': None,
                    'page': page_num
                }
                self.violations.append(combo_violation)

    def _create_dataframe(self):
        """Create pandas DataFrame from violations"""
        if not self.violations:
            # Return empty DataFrame with correct columns
            return pd.DataFrame(columns=[
                'pdf_filename', 'rule_id', 'violation_type',
                'severity', 'full_text', 'x', 'y', 'width', 'height', 'page'
            ])

        return pd.DataFrame(self.violations)

def process_directory(input_dir, output_dir):
    """Process all PDFs in directory"""
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    # Ensure output directory exists
    output_path.mkdir(parents=True, exist_ok=True)

    all_violations = []

    for pdf_file in input_path.glob("*.pdf"):
        print(f"Processing: {pdf_file.name}")

        # Determine bureau from filename
        bureau = "TU"  # Default
        if "EQ" in pdf_file.name.upper():
            bureau = "EQ"
        elif "EX" in pdf_file.name.upper():
            bureau = "EX"

        extractor = ViolationExtractor(str(pdf_file), bureau)
        violations_df = extractor.extract_violations()

        if not violations_df.empty:
            all_violations.append(violations_df)
            print(f"  Found {len(violations_df)} violations")

    # Combine all violations
    if all_violations:
        combined_df = pd.concat(all_violations, ignore_index=True)

        # Generate output filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = output_path / f"violations_{timestamp}.csv"

        # Save to CSV
        combined_df.to_csv(output_file, index=False)
        print(f"\nSaved {len(combined_df)} total violations to: {output_file}")

        return output_file
    else:
        print("No violations found in any PDFs")
        return None

if __name__ == "__main__":
    # Default paths
    input_dir = "../input"
    output_dir = "../output"

    # Override with command line arguments if provided
    if len(sys.argv) > 1:
        input_dir = sys.argv[1]
    if len(sys.argv) > 2:
        output_dir = sys.argv[2]

    # Process PDFs
    output_file = process_directory(input_dir, output_dir)

    if output_file:
        print(f"\nExtraction complete! CSV saved to: {output_file}")
    else:
        print("\nNo violations extracted.")