source("common.r")
# --- functions ---
# --- main ---
rec <- get_rec(config)
publish_data <- get_publish_data(rec)
sheet_write(
    data = publish_data,
    ss = config$spreadsheet_id,
    sheet = config$sheet_name
)
