library(tidyverse)

# TRTESTCD/TRORRESが両方ある場合のみ、EDC仕様の数値バリデーション(min/max)に基づいてTRORRESを
# それらしい数値に置き換える。バリデーションが定義されていないTRTESTCD(未知のTESTCD含む)は
# generate_orres_value()側で0〜100のランダムな整数になる。TRORRESが既にNA(presence_conditionsで
# 空白化された)の行は上書きしない
# (build_testcd_numeric_bounds()/generate_orres_value()はbuild_domain_common.R参照)
populate_tr_orres <- function(tr, cdisc_variable_values, field_numeric_bounds) {
  if (!all(c("TRTESTCD", "TRORRES") %in% colnames(tr))) {
    return(tr)
  }
  testcd_bounds <- build_testcd_numeric_bounds(cdisc_variable_values, field_numeric_bounds, "TRTESTCD", "TRORRES")
  has_value <- !is.na(tr[["TRORRES"]])
  tr[["TRORRES"]][has_value] <- as.character(generate_orres_value(tr[["TRTESTCD"]][has_value], testcd_bounds))
  tr
}
