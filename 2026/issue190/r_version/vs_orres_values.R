library(tidyverse)

# VSTESTCDごとの基準範囲(成人一般・概算値)。ダミーデータ生成用の目安であり、実臨床の判定には使わない
vs_reference_ranges <- tibble::tribble(
  ~VSTESTCD, ~unit,        ~min_value, ~max_value,
  "HEIGHT",  "cm",         150,        180,
  "WEIGHT",  "kg",         45,         90,
  "TEMP",    "C",          36.0,       37.5,
  "PULSE",   "beats/min",  60,         100,
  "SYSBP",   "mmHg",       100,        140,
  "DIABP",   "mmHg",       60,         90
)

# vstestcdごとに、基準範囲内をベースにランダムな数値を生成する。out_of_range_probの確率で
# 範囲をやや外れた値も混ぜることで、全部同じような値になる不自然さを避ける
generate_vs_value <- function(vstestcd, reference_ranges = vs_reference_ranges, out_of_range_prob = 0.1) {
  bounds <- reference_ranges[match(vstestcd, reference_ranges[["VSTESTCD"]]), ]
  n <- length(vstestcd)

  in_range <- runif(n, bounds[["min_value"]], bounds[["max_value"]])
  range_width <- bounds[["max_value"]] - bounds[["min_value"]]
  out_low <- runif(n, bounds[["min_value"]] - range_width * 0.2, bounds[["min_value"]])
  out_high <- runif(n, bounds[["max_value"]], bounds[["max_value"]] + range_width * 0.2)
  out_value <- if_else(runif(n) < 0.5, out_low, out_high)

  is_out <- runif(n) < out_of_range_prob
  round(if_else(is_out, out_value, in_range), 1)
}

# VSTESTCD/VSORRESが両方ある場合のみ、基準範囲にある検査項目のVSORRESをそれらしい数値に置き換える。
# 基準範囲に無い項目はそのまま(populate_dummy_fields由来のDUMMY)にしておく。
# VSORRESが既にNA(presence_conditionsで空白化された)の行は上書きしない
populate_vs_orres <- function(vs, reference_ranges = vs_reference_ranges) {
  if (!all(c("VSTESTCD", "VSORRES") %in% colnames(vs))) {
    return(vs)
  }
  has_ref <- vs[["VSTESTCD"]] %in% reference_ranges[["VSTESTCD"]] & !is.na(vs[["VSORRES"]])
  vs[["VSORRES"]][has_ref] <- as.character(generate_vs_value(vs[["VSTESTCD"]][has_ref], reference_ranges))
  vs
}
