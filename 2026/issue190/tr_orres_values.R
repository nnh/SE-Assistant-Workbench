library(tidyverse)

# TRTESTCDごとの数値範囲(mm、概算値)。ダミーデータ生成用の目安
tr_diameter_ranges <- tibble::tribble(
  ~TRTESTCD, ~min_value, ~max_value,
  "LDIAM",   10,         150,
  "SDIAM",   10,         80
)

# TRTESTCDがLDIAM/SDIAMの場合のみ、TRORRESをその範囲内のそれらしい数値(mm)に置き換える。
# それ以外のTRTESTCDや、TRORRESが既にNA(presence_conditionsで空白化された)の行は変更しない
populate_tr_orres <- function(tr, diameter_ranges = tr_diameter_ranges) {
  if (!all(c("TRTESTCD", "TRORRES") %in% colnames(tr))) {
    return(tr)
  }
  bounds <- diameter_ranges[match(tr[["TRTESTCD"]], diameter_ranges[["TRTESTCD"]]), ]
  target <- !is.na(bounds[["TRTESTCD"]]) & !is.na(tr[["TRORRES"]])
  tr[["TRORRES"]][target] <- as.character(round(runif(sum(target), bounds[["min_value"]][target], bounds[["max_value"]][target]), 1))
  tr
}
