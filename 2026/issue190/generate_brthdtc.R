library(tidyverse)

generate_brthdtc <- function(data, ref_date = Sys.Date(), var_name = "BRTHDTC") {
  ref_date <- as.Date(ref_date)
  n <- nrow(data)

  age_bounds <- tibble(
    stratum = c("other", "early_elderly", "late_elderly"),
    min_age = c(20, 65, 75),
    max_age = c(64, 74, 89),
    prob = c(0.5, 0.25, 0.25)
  )

  stratum <- sample(age_bounds$stratum, n, replace = TRUE, prob = age_bounds$prob)
  bounds <- age_bounds[match(stratum, age_bounds$stratum), ]

  min_days <- bounds$min_age * 365.25
  max_days <- (bounds$max_age + 1) * 365.25 - 1
  age_days <- round(runif(n, min_days, max_days))

  data[[var_name]] <- format(ref_date - age_days, "%Y-%m-%d")
  data
}
