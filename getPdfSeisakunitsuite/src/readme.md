# Get PDF Files from URL

This script retrieves PDF files from a specified URL and saves them to a Google Drive folder.

## Usage

1. Set the `savePdfFolderId` property in the script properties to the ID of the Google Drive folder where you want to save the PDF files.
2. Run the `getPdfFilesMain()` function.

## Functions

### getPdfFilesMain()

This is the main function that retrieves PDF files from the specified URL and saves them to the Google Drive folder.

### GetPdf

This is a class that contains methods for retrieving PDF files from a URL and saving them to a Google Drive folder.

#### Constructor

The constructor takes a `getPdfArg` argument, which is a `Map` object containing the following properties:

- `savePdfFolderId`: The ID of the Google Drive folder where the PDF files will be saved.
- `fqdn`: The fully qualified domain name (FQDN) of the website where the PDF files are located.

#### getPdf(targetUrl, filename)

This method retrieves a PDF file from the specified URL and saves it to the Google Drive folder with the specified filename.

#### getParent(targetUrl)

This method retrieves the contents of the specified URL.

#### getPdfUrls(targetContents)

This method retrieves the URLs and filenames of the PDF files from the specified contents.
