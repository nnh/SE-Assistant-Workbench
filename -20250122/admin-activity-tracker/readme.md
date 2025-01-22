# admin-activity-tracker

## Description

This program consolidates information that has been changed with administrative privileges. It tracks and aggregates activity logs to provide an overview of administrative actions in a given system.

## Installation

To set up the environment and install necessary dependencies, follow these steps:

1. Clone the repository:

   1. click on Download Zip from Code at https://github.com/nnh/SE-Assistant-Workbench.
   2. Right-click on the downloaded file, ‘Extract All’ and save it.

2. Install required libraries in R:

   Open RStudio and run the following command to install the required libraries:

   ```r
   install.packages(c("tidyverse", "googlesheets4", "jsonlite", "here"))
   ```

## Usage

### Configuration Before Running the Scripts

Before running the scripts, create a `config.json` file in the same folder as the script you want to execute.  
The file should contain the following content:

```config.json
{
  "spreadsheet_id": "your_spreadsheet_id_here"
}
```

Replace "your_spreadsheet_id_here" with the ID of the target Google Spreadsheet.

### How to Run the Scripts

1. Open RStudio: Launch RStudio on your computer.
2. Set Up New Project: Open the admin-activity-tracker directory as a New Project.
3. Open `admin_activity_tracker.R`.
4. Run the Script:  
   Click the Source button to execute the script. If prompted for Google authentication, follow the on-screen instructions to grant access to the Google Sheets API.  
   Follow the on-screen prompts or logs for results.

### Features

- Administrative Log Aggregation:  
  Collects and aggregates logs of administrative actions.
- Google Sheets Integration:  
  Outputs the results directly to a specified Google Spreadsheet.
- Customizable Configuration:  
  Easy to update target Spreadsheet ID and other settings via a configuration file.

### Troubleshooting

- Common Errors and Fixes
  Google Authentication:  
  If prompted for Google authentication, follow the on-screen instructions to grant access to the Google Sheets API.

- Missing Libraries:  
  Ensure all required libraries (tidyverse, googlesheets4, jsonlite, here) are installed. Use the installation command provided in the Installation section.

- Invalid Spreadsheet ID:  
  Verify that the spreadsheet_id in config.txt matches the ID of the target spreadsheet.
