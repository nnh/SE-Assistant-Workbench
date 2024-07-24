# WHO-DD IDF Update

## Description

This repository contains scripts to manage and update the WHO-DD (World Health Organization Drug Dictionary) and IDF (Integrated Data File). These scripts help in unzipping files, handling password-protected files, uploading files to AWS S3, and saving files to Box.

## Installation

To set up the environment and install necessary dependencies, follow these steps:

1. Clone the repository:

   1. click on Download Zip from Code at https://github.com/nnh/SE-Assistant-Workbench.
   2. Right-click on the downloaded file, ‘Extract All’ and save it.

2. Install required libraries in R
3. Add 7-Zip to Environment Variables: Ensure `C:\Program Files\7-Zip;` is added to your system's environment variables.

## Usage

### Configuration Before Running the Scripts

Before running the scripts, set up the config.txt file in the ext folder with the following content:

```config.txt
"itemname", "item"
"kCodingDirId", "BOX folder ID"
"kAwsDefaultRegion", "AWS region"
"kAwsBucketName", "AWS bucket name"
```

### How to Run the Scripts

1. Open RStudio: Launch RStudio on your computer.
2. Set Up New Project: Open the WHO-DD_IDF_Update directory as a New Project.
3. Open the Script.
4. Run the Script: Click on the source button to execute the script.

### Steps to Upload a Downloaded ZIP File to BOX

1. Open `programs/box-authentication.R`.
   You may need to enter your BOX Secret ID and AWS Access Key; refer to section 15 of the WHODrug Data Storage Manual in the D013-4 SE Assistance Manual.
2. Run the Script: Click the source button to execute the script.
3. Open `programs/upload-box.R`.
4. Run the Script: Click the source button to execute the script.

### Steps to Upload a ZIP File from Box to AWS

1. Ensure that the latest WHO-DD and IDF are saved in Box.
2. Open `programs/box-authentication.R`.
3. Run the Script: Click the source button to execute the script.
4. Open `programs/upload-s3.R`.
5. Run the Script: Click the source button to execute the script.

### Test

1. Open `tools/test-main.R`.
2. Run the Script: Click the source button to execute the script.
