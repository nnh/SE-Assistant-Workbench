# --- functions ---
download_pubmed_xml <- function(pmid_list, save_dir = data_path, batch_size = 100) {
    if (missing(pmid_list) || !is.vector(pmid_list) || length(pmid_list) == 0 || !all(nzchar(pmid_list))) {
        message("pmid_listが空、ベクトルでない、または無効な値を含んでいます")
        return(invisible(NULL))
    }
    pmid_batches <- split(pmid_list, ceiling(seq_along(pmid_list) / batch_size))
    for (i in seq_along(pmid_batches)) {
        pmids <- pmid_batches[[i]]
        pmid_str <- paste(pmids, collapse = ",")
        url <- paste0(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=",
            pmid_str,
            "&retmode=xml"
        )
        date_str <- format(Sys.Date(), "%Y%m%d")
        save_path <- file.path(save_dir, sprintf("pubmed_%s_%03d.xml", date_str, i))
        tryCatch(
            {
                download.file(url, destfile = save_path, mode = "wb", quiet = TRUE)
                message("Saved: ", save_path)
            },
            error = function(e) {
                message("Failed: ", save_path, " - ", e$message)
            }
        )
        Sys.sleep(5)
    }
}

download_pubmed_xml(pmid_list)
