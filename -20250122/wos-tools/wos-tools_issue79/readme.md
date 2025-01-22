# wos-validator.R - Data Validation for WOS Tools

## Overview

This script performs data validation for the WOS tools project. It extracts and outputs to Google Sheets records where NHO hospital authors are present but not included in the HTML files, as well as records where NHO hospital authors are not present but have been output to the HTML files.

## Prerequisites

- The script requires that `query.ts` exists in the following path:
  ```bash
  "C:\Users\...\Documents\GitHub\wos-tools\example\src\query.ts"
  ```
- Set a closing date.  
  `wos-validator.R`
  ```
  kSpecifiedDate <- "20240901" |> as.POSIXct(specified_date, format = "%Y%m%d", tz = "UTC")
  ```
- Set input directory path.  
  `wos-validator.R`

  ```
  kParentPath <- "Box\Projects\NHO 臨床研究支援部\英文論文\wos-tools\result\result_20240925100939\"
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

### Libraries

- `here`: Used for managing file paths.
- `tidyverse`: Provides functions for data manipulation.
- `googlesheets4`: Handles authentication and interaction with Google Sheets.
- `jsonlite`: Used for reading and parsing JSON files.
- `rvest`: Provides tools for scraping and extracting data from HTML files.
- `V8`: Embeds a JavaScript engine in R, allowing execution of JavaScript code directly within the R environment.

## Output to Google Sheets

When `OutputGoogleSpreadSheet.R` is executed by clicking `Source`, the result is output to the specified Google Sheets, and each sheet is cleared using the functions `CreateSheets()` and `ClearAndWriteSheet()`, updated with the latest data.

## How to use

1. refer to the prerequisites and configure the settings.
2. Run `wos-validator.R`.
3. Modify the program as necessary.
4. Run `outputGoogleSpreadSheet.R`.
