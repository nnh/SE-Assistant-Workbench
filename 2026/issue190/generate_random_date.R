library(tidyverse)
library(lubridate)

resolve_date_bound <- function(data, x) {
  if (is.character(x) && length(x) == 1 && x %in% names(data)) {
    ymd(data[[x]])
  } else {
    rep(ymd(x), nrow(data))
  }
}

generate_random_date <- function(data, start_date, end_date, var_name) {
  start_date <- resolve_date_bound(data, start_date)
  end_date <- resolve_date_bound(data, end_date)

  n <- nrow(data)
  random_dates <- as.Date(
    runif(n, as.numeric(start_date), as.numeric(end_date)),
    origin = "1970-01-01"
  )

  data[[var_name]] <- random_dates
  data
}
