library(tidyverse)

# LBTESTCDごとの基準範囲(成人一般・概算値)。ダミーデータ生成用の目安であり、実臨床の判定には使わない。
# 新しい検査項目を追加したい場合は、この表に行を足すだけでよい(コード側の変更は不要)
lb_reference_ranges <- tibble::tribble(
  ~LBTESTCD, ~unit,     ~min_value, ~max_value,
  "HGB",     "g/dL",    11.5,       16.5,
  "PLAT",    "10^3/uL", 150,        350,
  "LYM",     "%",       20,         40,
  "LDH",     "U/L",     120,        245,
  "B2MICG",  "mg/L",    0.8,        2.2,
  "NEUT",    "%",       40,         70,
  "WBC",     "10^3/uL", 3.3,        8.6,
  "RBC",     "10^6/uL", 3.8,        5.5,
  "PROT",    "g/dL",    6.5,        8.0,
  "ALB",     "g/dL",    3.8,        5.2,
  "BILI",    "mg/dL",   0.3,        1.2,
  "AST",     "U/L",     13,         30,
  "ALT",     "U/L",     7,          42,
  "ALP",     "U/L",     38,         113,
  "GGT",     "U/L",     10,         50,
  "UREAN",   "mg/dL",   8,          20,
  "CREAT",   "mg/dL",   0.4,        1.2,
  "SODIUM",  "mmol/L",  138,        145,
  "K",       "mmol/L",  3.6,        4.8,
  "CA",      "mg/dL",   8.5,        10.2,
  "PHOS",    "mg/dL",   2.5,        4.5,
  "CRP",     "mg/dL",   0,          0.3,
  "IL2SR",   "U/mL",    122,        496,
  "INR",     "",        0.9,        1.1,
  "APTT",    "sec",     25,         40,
  "DDIMER",  "ug/mL",   0,          1.0,
  "FIBRINO", "mg/dL",   200,        400,
  "FDP",     "ug/mL",   0,          5,
  "HCT",     "%",       34,         50,
  "CL",      "mmol/L",  98,         108
)

# lbtestcdごとに、基準範囲内をベースにランダムな数値を生成する。out_of_range_probの確率で
# 範囲をやや外れた値(異常値)も混ぜることで、全部正常値になる不自然さを避ける
generate_lab_value <- function(lbtestcd, reference_ranges = lb_reference_ranges, out_of_range_prob = 0.15) {
  bounds <- reference_ranges[match(lbtestcd, reference_ranges[["LBTESTCD"]]), ]
  n <- length(lbtestcd)

  in_range <- runif(n, bounds[["min_value"]], bounds[["max_value"]])
  range_width <- bounds[["max_value"]] - bounds[["min_value"]]
  out_low <- runif(n, bounds[["min_value"]] - range_width * 0.3, bounds[["min_value"]])
  out_high <- runif(n, bounds[["max_value"]], bounds[["max_value"]] + range_width * 0.3)
  out_value <- if_else(runif(n) < 0.5, out_low, out_high)

  is_out <- runif(n) < out_of_range_prob
  round(if_else(is_out, out_value, in_range), 2)
}

# LBTESTCD/LBORRESが両方ある場合のみ、参照範囲にある検査項目のLBORRESをそれらしい数値に置き換える。
# 参照範囲に無い項目(PBTCCEなど)はそのまま(populate_dummy_fields由来のDUMMY)にしておく。
# LBORRESが既にNA(NOT DONEなどのpresence_conditionsで空白化された)の行は上書きしない
populate_lb_orres <- function(lb, reference_ranges = lb_reference_ranges) {
  if (!all(c("LBTESTCD", "LBORRES") %in% colnames(lb))) {
    return(lb)
  }
  has_ref <- lb[["LBTESTCD"]] %in% reference_ranges[["LBTESTCD"]] & !is.na(lb[["LBORRES"]])
  lb[["LBORRES"]][has_ref] <- as.character(generate_lab_value(lb[["LBTESTCD"]][has_ref], reference_ranges))
  lb
}
