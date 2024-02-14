# Get PDF Files from URL

This script retrieves PDF files from a specified URL and saves them to a Google Drive folder.

## Usage

1. Set the `savePdfFolderId` property in the script properties to the ID of the Google Drive folder where you want to save the PDF files.

    - Open the script in the Google Apps Script editor.
    - Click on the "Project settings" menu, then select "Script properties".
    - In the "Script properties" tab, click on the "Add script properties" button to add a new property.
    - Enter `savePdfFolderId` as the property key and the ID of the Google Drive folder as the property value.
    - Click on the "Save" button to save the changes.

2. Run the `getPdfFilesMain()` function.

    - In the Google Apps Script editor, click on the "Run" menu, then select "Run function" and choose `getPdfFilesMain`.
    - Alternatively, you can run the function by clicking on the play button (▶️) in the toolbar.

## Google Apps Script (GAS) Setup

1. Open the Google Apps Script editor.

    - Go to [script.google.com](https://script.google.com) and sign in with your Google account.
    - Click on the "New project" button to create a new project.

2. Copy and paste the script into the editor.

    - Copy the entire script from the provided code block.
    - Paste it into the editor, replacing any existing code.

3. Save the script.

    - Click on the "File" menu, then select "Save" to save the script.

4. Set the script properties.

    - Follow the instructions in the "Usage" section to set the `savePdfFolderId` property in the script properties.

5. Run the script.

    - Follow the instructions in the "Usage" section to run the `getPdfFilesMain()` function.

## License

This script is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
