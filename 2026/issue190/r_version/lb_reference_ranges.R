library(tidyverse)

# LBTESTCD/LBORRESが両方ある場合のみ、EDC仕様の数値バリデーション(min/max)に基づいてLBORRESを
# それらしい数値に置き換える。バリデーションが定義されていないLBTESTCD(未知のTESTCD含む)は
# generate_orres_value()側で0〜100のランダムな整数になる。LBORRESが既にNA(NOT DONEなどの
# presence_conditionsで空白化された)の行は上書きしない
# (build_testcd_numeric_bounds()/generate_orres_value()はbuild_domain_common.R参照)
populate_lb_orres <- function(lb, cdisc_variable_values, field_numeric_bounds) {
  if (!all(c("LBTESTCD", "LBORRES") %in% colnames(lb))) {
    return(lb)
  }
  testcd_bounds <- build_testcd_numeric_bounds(cdisc_variable_values, field_numeric_bounds, "LBTESTCD", "LBORRES")
  has_value <- !is.na(lb[["LBORRES"]])
  lb[["LBORRES"]][has_value] <- as.character(generate_orres_value(lb[["LBTESTCD"]][has_value], testcd_bounds))
  lb
}
