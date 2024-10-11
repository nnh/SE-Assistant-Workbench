# wos-validator.R - Data Validation for WOS Tools

## Overview

This script performs data validation for the WOS tools project. It extracts and outputs to Google Sheets records where NHO hospital authors are present but not included in the HTML files, as well as records where NHO hospital authors are not present but have been output to the HTML files.

## Prerequisites

- The script requires that `query.ts` exists in the following path:
  ```bash
  "C:\Users\...\Documents\GitHub\wos-tools\example\src\query.ts"
  ```

## Files

- **raw.json**: Contains the raw publication data to be validated.
- **all_papers.json**: Includes a list of all the papers for comparison with raw data.
- **HTML files**: Used for validating specific records and author details.
- **config.json**:Provide the correspondence between the ID, variable name and sheet name in the Google Spreadsheet.

```
{
  "outputSpreadSheetId": "...",
  "sheetNames": [
    {
      "htmlOutputRecords": "NHO所属の著者がいない可能性がある"
    },
    {
      "facilityNameError": "施設名が一致しないためHTML出力されていない"
    },
    {
      "wosDataError": "wosのAPIで取得したデータに問題がある"
    }
  ]
}
```

- **nho_uid.txt**:

### Libraries

- `here`: Used for managing file paths.
- `tidyverse`: Provides functions for data manipulation.
- `googlesheets4`: Handles authentication and interaction with Google Sheets.
- `jsonlite`: Used for reading and parsing JSON files.
- `rvest`: Provides tools for scraping and extracting data from HTML files.
- `V8`: Embeds a JavaScript engine in R, allowing execution of JavaScript code directly within the R environment.

## Script Structure

1. **Constants**:

   - Defines the paths to the relevant files and directories, including JSON files and HTML reports.
   - A specified date constant is set for filtering purposes.

2. **Functions**:

   - Common utility functions are loaded from external files.
   - The script authenticates Google Sheets access using `gs4_auth()`.

3. **Main Process**:

   - **Step 1**: Extracts WOS IDs from HTML reports and reads publication data from `all_papers.json`.
   - **Step 2**: Retrieves and processes raw data, extracting relevant addresses and groups them into target (NHO-related) and non-target groups.
   - **Check 1**: Identifies potential NHO hospital records from non-target data.
   - **Check 2**: Flags unknown hospital names from non-target data for further review.
   - **Check 3**: Verifies that all records in `all_papers.json` are accounted for.
   - **Final Output**: Results are exported to Google Sheets for easy review and analysis.

4. **Google Sheets Integration**:
   - The script creates new sheets or clears and writes results to existing sheets in Google Sheets for validation reporting.

## Validation Process

- **Check 1**: Detects potential NHO hospital entries in non-target data.
- **Check 2**: Identifies unknown institutions within the non-target dataset.
- **Check 3**: Verifies that all expected records are included in the final dataset.

## Warnings

- If unknown institutions are found during Check 2, a warning message is generated: `warning("error:checkTarget2")`.

## Google Sheets Output

Results are output to specified Google Sheets, where each sheet is cleared and updated with the latest data using the functions `CreateSheets()` and `ClearAndWriteSheet()`.

## How to Use

1. Place the relevant JSON and HTML files in the specified directories.
2. Run the script in R. Ensure that you have authenticated access to Google Sheets.
3. Review the results in Google Sheets, paying close attention to flagged records in Check 1 and Check 2.

## Author

- **Author**: Mariko Ohtsuka
- **Date**: 2024.10.11
